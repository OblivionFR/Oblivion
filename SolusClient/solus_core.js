import PogObject from "PogData";

const VERSION = "9.0";

if (!global.Solus) {
    global.Solus = {
        prefix: "§b[Solus] ",
        config: new PogObject("SolusClient", {
            friends:[], muted: {}, pvpEnabled: false, chatHighlight: true, esp3D: true, radar: true, proximityAlert: true, showWaypoints: true, friendHud: true
        }, "solus_data.json"),
        cloud: { legendaries:[], friends: [], invincibles: [], targets: [], blacklist:[], waypoints:[], motd: "", objective: "" }
    };
}

const S = global.Solus;
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
let lastSync = 0, isSyncing = false;

// --- UTILITAIRES ---
global.Solus.getStatus = function(name) {
    if (!name) return "NONE";
    let l = ChatLib.removeFormatting(name).toLowerCase().trim();
    for (let k = 0; k < S.cloud.legendaries.length; k++) if (S.cloud.legendaries[k].pseudo && S.cloud.legendaries[k].pseudo.toLowerCase() === l) return "LEGENDARY";
    if (S.cloud.invincibles.some(x => x.toLowerCase() === l)) return "INVINCIBLE";
    if (S.cloud.targets.some(x => x.toLowerCase() === l)) return "TARGET";
    if (S.config.friends.some(x => x.toLowerCase() === l) || S.cloud.friends.some(x => x.toLowerCase() === l)) return "FRIEND";
    return "NONE";
};

global.Solus.getRole = function(name) {
    let l = ChatLib.removeFormatting(name).toLowerCase().trim();
    for (let k = 0; k < S.cloud.legendaries.length; k++) if (S.cloud.legendaries[k].pseudo && S.cloud.legendaries[k].pseudo.toLowerCase() === l) return S.cloud.legendaries[k].role || "Dieu";
    return "Dieu";
};

// --- SYNCHRONISATION ---
function syncCloudData(verbose) {
    if (isSyncing) return;
    isSyncing = true;
    new Thread(() => {
        try {
            let t = "?t=" + Date.now();
            let cl = S.cloud;
            
            let jsonRaw = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
            if (jsonRaw) { try { let p = JSON.parse(jsonRaw.substring(jsonRaw.indexOf("{"), jsonRaw.lastIndexOf("}")+1)); if (p.admins) cl.legendaries = p.admins; } catch(e){} }

            let wpRaw = FileLib.getUrlContent(GITHUB_BASE + "waypoints.json" + t);
            if (wpRaw) { try { let p = JSON.parse(wpRaw.substring(wpRaw.indexOf("["), wpRaw.lastIndexOf("]")+1)); if (p) cl.waypoints = p; } catch(e){} }

            let fetchTxt = (file) => { let res = FileLib.getUrlContent(GITHUB_BASE + file + t); return res ? res.split("\n").map(s => s.trim()).filter(s => s.length >= 3) :[]; };
            cl.friends = fetchTxt("default_friend.txt");
            cl.invincibles = fetchTxt("invincible.txt");
            cl.targets = fetchTxt("target.txt");
            cl.blacklist = fetchTxt("blacklist.txt");

            let obj = FileLib.getUrlContent(GITHUB_BASE + "objective.txt" + t);
            cl.objective = obj ? obj.trim() : "";

            let m = FileLib.getUrlContent(GITHUB_BASE + "motd.txt" + t);
            if (m && m.trim().length > 0 && m.trim() !== cl.motd) {
                cl.motd = m.trim();
                if (!verbose) {
                    ChatLib.chat("§3§m---------------------------------------------");
                    ChatLib.chat("§b§lAnnonce Solus : §f" + cl.motd);
                    ChatLib.chat("§3§m---------------------------------------------");
                    World.playSound("random.levelup", 1, 1);
                }
            }
            lastSync = Date.now();
            if (verbose) ChatLib.chat(S.prefix + "§aCloud Synchronisé !");
        } catch(e) {}
        isSyncing = false;
    }).start();
}
register("step", () => { if (Date.now() - lastSync > 15000) syncCloudData(false); }).setFps(1);

// --- COMMANDE GLOBALE /SOLUS ---
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Client §7- Hub Global (v" + VERSION + ")");
        ChatLib.chat("§3/solus friend <add|remove|list> §7- Gérer les amis");
        ChatLib.chat("§3/solus mute <pseudo> [tps]      §7- Muter");
        ChatLib.chat("§3/solus unmute <pseudo>          §7- Démuter");
        ChatLib.chat("§3/solus gui                      §7- Menu des mutes");
        ChatLib.chat("§3/solus update                   §7- §aVérifier les MAJ du Code");
        ChatLib.chat("§3/solus force                    §7- §eForcer Synchro Cloud");
        ChatLib.chat("§3/solus toggle <opt>             §7- pvp/radar/esp/alert/hud/wp");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }

    let cat = args[0].toLowerCase();
    
    if (cat === "update") { ChatLib.chat(S.prefix + "§eVérification..."); global.SolusUpdater.check(true, false); }
    else if (cat === "force") { ChatLib.chat(S.prefix + "§eForçage du Cloud..."); syncCloudData(true); }
    else if (cat === "gui") { ChatLib.command("smutegui", true); }
    
    // SOUS-CATÉGORIE: FRIEND
    else if (cat === "friend") {
        let act = args[1] ? args[1].toLowerCase() : "";
        let pseudo = args[2] || "";
        if (act === "add" && pseudo) {
            if (!S.config.friends.includes(pseudo)) { S.config.friends.push(pseudo); S.config.save(); ChatLib.chat(S.prefix + "§aAmi ajouté : " + pseudo); }
        }
        else if (act === "remove" && pseudo) {
            S.config.friends = S.config.friends.filter(x => x.toLowerCase() !== pseudo.toLowerCase()); S.config.save(); ChatLib.chat(S.prefix + "§cAmi retiré : " + pseudo);
        }
        else if (act === "list") {
            ChatLib.chat("§6Cloud: §cDieux:" + S.cloud.legendaries.length + " §aAmis:" + S.cloud.friends.length + " §dInv:" + S.cloud.invincibles.length + " §cCibles:" + S.cloud.targets.length);
            ChatLib.chat("§3Local: " + S.config.friends.join(", "));
        } else ChatLib.chat(S.prefix + "§cUsage: /solus friend <add|remove|list> <pseudo>");
    }
    
    // SOUS-CATÉGORIE: MUTE
    else if (cat === "mute") {
        if (!args[1]) ChatLib.chat(S.prefix + "§cUsage: /solus mute <pseudo> [temps]");
        else ChatLib.command("smute " + args.slice(1).join(" "), true);
    }
    else if (cat === "unmute") {
        if (!args[1]) ChatLib.chat(S.prefix + "§cUsage: /solus unmute <pseudo>");
        else ChatLib.command("sunmute " + args[1], true);
    }
    
    // SOUS-CATÉGORIE: TOGGLES
    else if (cat === "toggle" && args[1]) {
        let opt = args[1].toLowerCase();
        if (opt === "pvp") S.config.pvpEnabled = !S.config.pvpEnabled;
        else if (opt === "radar") S.config.radar = !S.config.radar;
        else if (opt === "esp") S.config.esp3D = !S.config.esp3D;
        else if (opt === "alert") S.config.proximityAlert = !S.config.proximityAlert;
        else if (opt === "hud") S.config.friendHud = !S.config.friendHud;
        else if (opt === "wp") S.config.showWaypoints = !S.config.showWaypoints;
        else return ChatLib.chat(S.prefix + "§cOptions: pvp, radar, esp, alert, hud, wp.");
        S.config.save(); ChatLib.chat(S.prefix + "Option §e" + opt + " §fmise à jour.");
    }
    else ChatLib.chat(S.prefix + "§cCommande inconnue. Tape /solus");
}).setName("solus").setAliases("sf");

register("command", () => {
    S.config.pvpEnabled = !S.config.pvpEnabled; S.config.save();
    ChatLib.chat(S.prefix + "PvP Ami: " + (S.config.pvpEnabled ? "§cON (Danger)" : "§aOFF (Sûr)"));
}).setName("soluspvp").setAliases("friendpvp");
