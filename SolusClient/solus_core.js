import PogObject from "PogData";

if (!global.Solus) {
    global.Solus = {
        prefix: "§b[Solus] ",
        config: new PogObject("SolusClient", {
            friends: [], muted: {}, pvpEnabled: false, 
            chatHighlight: true, esp3D: true, radar: true, proximityAlert: true, targetHud: true,
            chatFilter: true, chatDelete: true 
        }, "solus_data_v5.json"),
        cloud: { legendaries: [], friends: [], invincibles: [], targets: [], blacklist: [], filters: [], motd: "", objective: "" }
    };
}

const S = global.Solus;
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
let lastSync = 0;

// Fonctions Utilitaires
function clean(str) { return str ? str.replace(/[^a-zA-Z0-9_]/g, "").trim() : ""; }

function fetchList(filename, time) {
    try {
        let c = FileLib.getUrlContent(GITHUB_BASE + filename + time);
        return c ? c.split("\n").map(s => s.trim()).filter(s => s.length > 1) : [];
    } catch (e) { return []; }
}

// Synchro Cloud
function syncCloudData(verbose) {
    new Thread(() => {
        try {
            let t = "?t=" + Date.now();
            let cl = S.cloud;

            // JSON
            let jsonRaw = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
            if (jsonRaw && jsonRaw.includes("{")) {
                try {
                    let p = JSON.parse(jsonRaw.substring(jsonRaw.indexOf("{"), jsonRaw.lastIndexOf("}") + 1));
                    if (p.admins) cl.legendaries = p.admins;
                } catch(e){}
            }

            // Listes
            cl.friends = fetchList("default_friend.txt", t);
            cl.invincibles = fetchList("invincible.txt", t);
            cl.targets = fetchList("target.txt", t);
            cl.blacklist = fetchList("blacklist.txt", t);
            cl.filters = fetchList("chat_filter.txt", t); // Regex Filtre

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
            if (verbose) ChatLib.chat(S.prefix + "§aCloud Synchronisé (" + cl.legendaries.length + " Dieux) !");
        } catch (e) {}
    }).start();
}
register("step", () => { if (Date.now() - lastSync > 30000) syncCloudData(false); }).setDelay(1);

// Hiérarchie
global.Solus.getStatus = function(name) {
    if (!name) return "NONE";
    let l = clean(ChatLib.removeFormatting(name)).toLowerCase();
    for (let k of S.cloud.legendaries) if (clean(k.pseudo).toLowerCase() === l) return "LEGENDARY";
    if (S.cloud.invincibles.some(x => clean(x).toLowerCase() === l)) return "INVINCIBLE";
    if (S.cloud.targets.some(x => clean(x).toLowerCase() === l)) return "TARGET";
    if (S.config.friends.some(x => clean(x).toLowerCase() === l) || S.cloud.friends.some(x => clean(x).toLowerCase() === l)) return "FRIEND";
    return "NONE";
};

global.Solus.getRole = function(name) {
    let l = clean(ChatLib.removeFormatting(name)).toLowerCase();
    for (let k of S.cloud.legendaries) if (clean(k.pseudo).toLowerCase() === l) return k.role || "Dieu";
    return "Dieu";
};

// COMMANDES GLOBALES
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Client §7(v14.0)");
        ChatLib.chat("§3/solus friend <add|remove|list> §7- Amis");
        ChatLib.chat("§3/solus toggle <opt>             §7- pvp/esp/radar/filter/delete");
        ChatLib.chat("§3/solus force                    §7- MAJ Cloud");
        ChatLib.chat("");
        ChatLib.chat("§b§lMutes & Modération :");
        ChatLib.chat("§3/smute <pseudo> [tps]           §7- Mute local");
        ChatLib.chat("§3/sunmute <pseudo>               §7- Unmute");
        ChatLib.chat("§3/smutegui                       §7- Interface Mute");
        ChatLib.chat("§3/smute list                     §7- Liste des mutes");
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
    
    else if (a === "toggle" && args[1]) {
        let o = args[1].toLowerCase();
        if(o=="pvp") S.config.pvpEnabled = !S.config.pvpEnabled;
        if(o=="radar") S.config.radar = !S.config.radar;
        if(o=="esp") S.config.esp3D = !S.config.esp3D;
        if(o=="filter") S.config.chatFilter = !S.config.chatFilter;
        if(o=="delete") S.config.chatDelete = !S.config.chatDelete;
        S.config.save(); ChatLib.chat(S.prefix + "Option " + o + " changée.");
    }
}).setName("solus").setAliases("sf");

register("command", () => {
    S.config.pvpEnabled = !S.config.pvpEnabled; S.config.save();
    ChatLib.chat(S.prefix + "PvP Ami: " + (S.config.pvpEnabled ? "§cON" : "§aOFF"));
}).setName("soluspvp").setAliases("friendpvp");
