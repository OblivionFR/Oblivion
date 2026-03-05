import PogObject from "PogData";

if (!global.Solus) {
    global.Solus = {
        prefix: "§b[Solus] ",
        config: new PogObject("SolusClient", {
            friends: [], muted: {}, pvpEnabled: false, chatHighlight: true, esp3D: true, radar: true, proximityAlert: true, targetHud: true, 
            chatFilter: true, // Nouvelle option
            chatDelete: true  // Nouvelle option (Croix)
        }, "solus_data_v4.json"),
        cloud: { legendaries: [], friends: [], invincibles: [], targets: [], blacklist: [], filters: [], motd: "", objective: "" }
    };
}

const S = global.Solus;
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
let lastSync = 0;

function fetchList(filename, time) {
    try {
        let content = FileLib.getUrlContent(GITHUB_BASE + filename + time);
        if (!content) return [];
        return content.split("\n").map(s => s.trim()).filter(s => s.length > 1); // Accepte les regex courtes
    } catch (e) { return []; }
}

function syncCloudData(verbose) {
    new Thread(() => {
        try {
            let t = "?t=" + Date.now();
            let cl = S.cloud;

            // JSON Legendaries
            let jsonRaw = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
            if (jsonRaw && jsonRaw.includes("{")) {
                try {
                    let parsed = JSON.parse(jsonRaw.substring(jsonRaw.indexOf("{"), jsonRaw.lastIndexOf("}") + 1));
                    if (parsed.admins) cl.legendaries = parsed.admins;
                } catch(e){}
            }

            // Listes
            cl.friends = fetchList("default_friend.txt", t);
            cl.invincibles = fetchList("invincible.txt", t);
            cl.targets = fetchList("target.txt", t);
            cl.blacklist = fetchList("blacklist.txt", t);
            
            // NOUVEAU : Filtres Chat
            cl.filters = fetchList("chat_filter.txt", t);

            // Textes
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
            if (verbose) ChatLib.chat(S.prefix + "§aCloud Synchronisé (" + cl.filters.length + " filtres) !");
        } catch (e) {}
    }).start();
}

register("step", () => { if (Date.now() - lastSync > 30000) syncCloudData(false); }).setDelay(1);

// Helpers
global.Solus.getStatus = function(name) {
    if (!name) return "NONE";
    let l = ChatLib.removeFormatting(name).replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    for (let k = 0; k < S.cloud.legendaries.length; k++) if (S.cloud.legendaries[k].pseudo && S.cloud.legendaries[k].pseudo.toLowerCase() === l) return "LEGENDARY";
    if (S.cloud.invincibles.some(x => x.toLowerCase() === l)) return "INVINCIBLE";
    if (S.cloud.targets.some(x => x.toLowerCase() === l)) return "TARGET";
    if (S.config.friends.some(x => x.toLowerCase() === l) || S.cloud.friends.some(x => x.toLowerCase() === l)) return "FRIEND";
    return "NONE";
};

// COMMANDES RÉPARÉES
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Client §7(v14.0)");
        ChatLib.chat("§3/sf add/remove <pseudo>   §7- Amis");
        ChatLib.chat("§3/sf toggle <opt>          §7- Options");
        ChatLib.chat("§3/sf filter                §7- §cON/OFF Filtre Chat");
        ChatLib.chat("§3/sf delete                §7- §cON/OFF Croix suppression");
        ChatLib.chat("§3/sf force                 §7- MAJ Cloud");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }
    let a = args[0].toLowerCase();

    if (a === "force") { ChatLib.chat(S.prefix + "§eForçage..."); syncCloudData(true); }
    else if (a === "add" && args[1]) {
        if (!S.config.friends.includes(args[1])) { S.config.friends.push(args[1]); S.config.save(); ChatLib.chat(S.prefix + "§aAjouté."); }
    }
    else if (a === "remove" && args[1]) {
        S.config.friends = S.config.friends.filter(x => x.toLowerCase() !== args[1].toLowerCase()); S.config.save(); ChatLib.chat(S.prefix + "§cRetiré.");
    }
    else if (a === "list") ChatLib.chat("§6Cloud: " + S.cloud.friends.length + " Amis / " + S.cloud.filters.length + " Filtres");
    
    // NOUVELLES OPTIONS
    else if (a === "filter") { S.config.chatFilter = !S.config.chatFilter; S.config.save(); ChatLib.chat(S.prefix + "Filtre Insultes: " + S.config.chatFilter); }
    else if (a === "delete") { S.config.chatDelete = !S.config.chatDelete; S.config.save(); ChatLib.chat(S.prefix + "Croix Suppression: " + S.config.chatDelete); }

    else if (a === "toggle" && args[1]) {
        let o = args[1].toLowerCase();
        if(o=="pvp") S.config.pvpEnabled = !S.config.pvpEnabled;
        if(o=="radar") S.config.radar = !S.config.radar;
        if(o=="esp") S.config.esp3D = !S.config.esp3D;
        if(o=="alert") S.config.proximityAlert = !S.config.proximityAlert;
        if(o=="hud") S.config.targetHud = !S.config.targetHud;
        S.config.save(); ChatLib.chat(S.prefix + "Option " + o + " changée.");
    }
}).setName("solus").setAliases("sf");

register("command", () => {
    S.config.pvpEnabled = !S.config.pvpEnabled; S.config.save();
    ChatLib.chat(S.prefix + "PvP Ami: " + (S.config.pvpEnabled ? "§cON" : "§aOFF"));
}).setName("soluspvp").setAliases("friendpvp");
