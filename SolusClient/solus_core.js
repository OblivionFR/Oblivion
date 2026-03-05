import PogObject from "PogData";

if (!global.Solus) {
    global.Solus = {
        prefix: "§b[Solus] ",
        config: new PogObject("SolusClient", {
            friends: [], muted: {}, pvpEnabled: false, chatHighlight: true, esp3D: true, radar: true, proximityAlert: true, targetHud: true
        }, "solus_data_v3.json"),
        cloud: { legendaries: [], friends: [], invincibles: [], targets: [], blacklist: [], motd: "", objective: "" }
    };
}

const S = global.Solus;
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
let lastSync = 0;

// --- FONCTION DE NETTOYAGE NUCLÉAIRE ---
// Enlève les espaces, les retours à la ligne, les tabulations... TOUT sauf les lettres/chiffres/_
function cleanString(str) {
    return str.replace(/[^a-zA-Z0-9_]/g, ""); 
}

function fetchList(filename, time) {
    try {
        let content = FileLib.getUrlContent(GITHUB_BASE + filename + time);
        if (!content) return [];
        // On découpe par ligne et on nettoie chaque pseudo
        return content.split("\n")
            .map(s => cleanString(s)) // Nettoyage agressif
            .filter(s => s.length >= 3); // Garde uniquement les pseudos valides (>3 lettres)
    } catch (e) { return []; }
}

function syncCloudData(verbose) {
    new Thread(() => {
        try {
            let t = "?t=" + Date.now();
            let cl = S.cloud;

            // 1. JSON
            let jsonRaw = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
            if (jsonRaw) {
                let start = jsonRaw.indexOf("{");
                let end = jsonRaw.lastIndexOf("}");
                if (start !== -1 && end !== -1) {
                    let parsed = JSON.parse(jsonRaw.substring(start, end + 1));
                    if (parsed.admins) cl.legendaries = parsed.admins;
                }
            }

            // 2. LISTES (Avec nettoyage)
            cl.friends = fetchList("default_friend.txt", t);
            cl.invincibles = fetchList("invincible.txt", t);
            cl.targets = fetchList("target.txt", t);
            cl.blacklist = fetchList("blacklist.txt", t);

            // 3. TEXTES
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
            if (verbose) {
                ChatLib.chat(S.prefix + "§aCloud Synchronisé !");
                ChatLib.chat("§7Amis chargés : " + cl.friends.join(", ")); // Affiche la liste pour debug
            }
        } catch (e) {
            if (verbose) ChatLib.chat(S.prefix + "§cErreur Synchro: " + e);
        }
    }).start();
}

register("step", () => { if (Date.now() - lastSync > 30000) syncCloudData(false); }).setDelay(1);

// --- UTILITAIRES ---
global.Solus.getStatus = function(name) {
    if (!name) return "NONE";
    // On nettoie aussi le nom du joueur in-game pour comparer proprement
    let l = cleanString(ChatLib.removeFormatting(name)).toLowerCase();
    
    for (let k = 0; k < S.cloud.legendaries.length; k++) {
        if (S.cloud.legendaries[k].pseudo && cleanString(S.cloud.legendaries[k].pseudo).toLowerCase() === l) return "LEGENDARY";
    }
    
    if (S.cloud.invincibles.some(x => x.toLowerCase() === l)) return "INVINCIBLE";
    if (S.cloud.targets.some(x => x.toLowerCase() === l)) return "TARGET";
    
    // Comparaison Amis (Local + Cloud)
    if (S.config.friends.some(x => x.toLowerCase() === l)) return "FRIEND";
    if (S.cloud.friends.some(x => x.toLowerCase() === l)) return "FRIEND";
    
    return "NONE";
};

global.Solus.getRole = function(name) {
    let l = cleanString(ChatLib.removeFormatting(name)).toLowerCase();
    for (let k = 0; k < S.cloud.legendaries.length; k++) {
        if (S.cloud.legendaries[k].pseudo && cleanString(S.cloud.legendaries[k].pseudo).toLowerCase() === l) 
            return S.cloud.legendaries[k].role || "Dieu";
    }
    return "Dieu";
};

// --- COMMANDES ---
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Client §7(v12.0)");
        ChatLib.chat("§3/solus friend <add|remove|list>");
        ChatLib.chat("§3/solus mute <pseudo> / list");
        ChatLib.chat("§3/solus force §7(Debug Cloud)");
        ChatLib.chat("§3/solus toggle <pvp|esp|radar|alert|hud>");
        return;
    }
    let a = args[0].toLowerCase();

    if (a === "force") {
        ChatLib.chat(S.prefix + "§eTéléchargement forcé...");
        syncCloudData(true);
    }
    else if (a === "friend") {
        if (args[1] === "add" && args[2]) {
            if (!S.config.friends.includes(args[2])) { S.config.friends.push(args[2]); S.config.save(); ChatLib.chat(S.prefix + "§aAmi ajouté."); }
        }
        else if (args[1] === "remove" && args[2]) {
            S.config.friends = S.config.friends.filter(x => x.toLowerCase() !== args[2].toLowerCase()); S.config.save(); ChatLib.chat(S.prefix + "§cAmi retiré.");
        }
        else if (args[1] === "list") {
            ChatLib.chat("§6Cloud: §a" + S.cloud.friends.length + " Amis / §c" + S.cloud.legendaries.length + " Dieux");
            // Affiche les pseudos pour vérifier
            if(S.cloud.friends.length > 0) ChatLib.chat("§7(Cloud): " + S.cloud.friends.join(", "));
            ChatLib.chat("§3Local: " + S.config.friends.join(", "));
        }
    }
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
