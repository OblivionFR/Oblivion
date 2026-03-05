import PogObject from "PogData";

// --- 1. INITIALISATION GLOBALE ---
// Ce "global.Solus" permet aux autres fichiers de lire ces données !
global.Solus = {
    prefix: "§b[Solus] ",
    config: new PogObject("SolusClient", {
        friends:[],
        muted: {},
        pvpEnabled: false,
        chatHighlight: true,
        esp3D: true,
        radar: true,
        proximityAlert: true
    }, "solus_data.json"),
    cloud: {
        legendaries: [],
        friends: [],
        invincibles: [],
        targets: [],
        blacklist:[],
        motd: "",
        objective: ""
    }
};

const S = global.Solus;
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
let lastUpdate = 0, isUpdating = false;

// --- 2. FONCTIONS DE HIÉRARCHIE GLOBALES ---
global.Solus.getStatus = function(name) {
    if (!name) return "NONE";
    let l = ChatLib.removeFormatting(name).toLowerCase().trim();
    
    for (let k = 0; k < S.cloud.legendaries.length; k++) {
        if (S.cloud.legendaries[k].pseudo && S.cloud.legendaries[k].pseudo.toLowerCase() === l) return "LEGENDARY";
    }
    if (S.cloud.invincibles.some(x => x.toLowerCase() === l)) return "INVINCIBLE";
    if (S.cloud.targets.some(x => x.toLowerCase() === l)) return "TARGET";
    if (S.config.friends.some(x => x.toLowerCase() === l) || S.cloud.friends.some(x => x.toLowerCase() === l)) return "FRIEND";
    return "NONE";
};

global.Solus.getRole = function(name) {
    let l = ChatLib.removeFormatting(name).toLowerCase().trim();
    for (let k = 0; k < S.cloud.legendaries.length; k++) {
        if (S.cloud.legendaries[k].pseudo && S.cloud.legendaries[k].pseudo.toLowerCase() === l) {
            return S.cloud.legendaries[k].role || "Dieu";
        }
    }
    return "Dieu";
};

// --- 3. SYNCHRONISATION CLOUD ---
function syncCloud(verbose) {
    if (isUpdating) return;
    isUpdating = true;
    new Thread(() => {
        try {
            let t = "?t=" + Date.now();
            let cl = S.cloud;
            
            // JSON LÉGENDAIRES
            let jsonRaw = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
            if (jsonRaw) {
                let start = jsonRaw.indexOf("{");
                let end = jsonRaw.lastIndexOf("}");
                if (start !== -1 && end !== -1) {
                    let parsed = JSON.parse(jsonRaw.substring(start, end + 1));
                    if (parsed.admins) cl.legendaries = parsed.admins;
                }
            }

            // LISTES TEXTES
            let f = FileLib.getUrlContent(GITHUB_BASE + "default_friend.txt" + t);
            if (f) cl.friends = f.split("\n").map(s => s.trim()).filter(s => s.length >= 3);
            
            let i = FileLib.getUrlContent(GITHUB_BASE + "invincible.txt" + t);
            if (i) cl.invincibles = i.split("\n").map(s => s.trim()).filter(s => s.length >= 3);
            
            let tg = FileLib.getUrlContent(GITHUB_BASE + "target.txt" + t);
            if (tg) cl.targets = tg.split("\n").map(s => s.trim()).filter(s => s.length >= 3);

            let b = FileLib.getUrlContent(GITHUB_BASE + "blacklist.txt" + t);
            if (b) cl.blacklist = b.split("\n").map(s => s.trim()).filter(s => s.length >= 3);

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

            lastUpdate = Date.now();
            if (verbose) ChatLib.chat(S.prefix + "§aCloud Synchronisé avec succès !");
        } catch(e) {}
        isUpdating = false;
    }).start();
}

register("step", () => { if (Date.now() - lastUpdate > 15000) syncCloud(false); }).setFps(1);

// --- 4. HUB DE COMMANDES GLOBALES ---
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Client §7- Hub Global");
        ChatLib.chat("§3/solus add/remove <pseudo> §7- Gérer un ami");
        ChatLib.chat("§3/solus list                §7- Voir stats du Cloud");
        ChatLib.chat("§3/solus force               §7- §eForcer Synchro Cloud");
        ChatLib.chat("§3/solus toggle <opt>        §7- pvp/radar/esp/alert");
        ChatLib.chat("§3/soluspvp                  §7- Taper un ami");
        ChatLib.chat("");
        ChatLib.chat("§b§lModule Mute :");
        ChatLib.chat("§3/smutegui                  §7- Menu des mutes");
        ChatLib.chat("§3/smute <pseudo> [tps]      §7- Muter (ex: 10m, 2h)");
        ChatLib.chat("§3/sunmute <pseudo>          §7- Démuter");
        ChatLib.chat("§3/smute list                §7- Liste des mutes");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }

    let a = args[0].toLowerCase();
    if (a === "force") { ChatLib.chat(S.prefix + "§eTéléchargement forcé..."); syncCloud(true); }
    else if (a === "add" && args[1]) {
        if (!S.config.friends.includes(args[1])) {
            S.config.friends.push(args[1]); S.config.save();
            ChatLib.chat(S.prefix + "§aAmi ajouté : " + args[1]);
        }
    }
    else if (a === "remove" && args[1]) {
        S.config.friends = S.config.friends.filter(x => x.toLowerCase() !== args[1].toLowerCase()); S.config.save();
        ChatLib.chat(S.prefix + "§cAmi retiré : " + args[1]);
    }
    else if (a === "list") {
        ChatLib.chat("§6Cloud: §cDieux:" + S.cloud.legendaries.length + " §aAmis:" + S.cloud.friends.length + " §dInv:" + S.cloud.invincibles.length + " §cCibles:" + S.cloud.targets.length);
        ChatLib.chat("§3Local: " + S.config.friends.join(", "));
    }
    else if (a === "toggle" && args[1]) {
        let opt = args[1].toLowerCase();
        if (opt === "pvp") S.config.pvpEnabled = !S.config.pvpEnabled;
        else if (opt === "radar") S.config.radar = !S.config.radar;
        else if (opt === "esp") S.config.esp3D = !S.config.esp3D;
        else if (opt === "alert") S.config.proximityAlert = !S.config.proximityAlert;
        S.config.save();
        ChatLib.chat(S.prefix + "Option §e" + opt + " §fmise à jour.");
    }
}).setName("solus").setAliases("sf");

register("command", () => {
    S.config.pvpEnabled = !S.config.pvpEnabled; S.config.save();
    ChatLib.chat(S.prefix + "PvP Ami: " + (S.config.pvpEnabled ? "§cON (Danger)" : "§aOFF (Sûr)"));
}).setName("soluspvp").setAliases("friendpvp");
