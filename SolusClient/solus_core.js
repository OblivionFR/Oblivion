// --- 1. GESTION DES SAUVEGARDES (Natif, 0 Crash) ---
const CONFIG_FILE = "solus_config.json";
const DATA_FILE = "solus_data.json";

const defaultConfig = { pvpEnabled: false, chatHighlight: true, esp3D: true, radar: true, proximityAlert: true, targetHud: true, chatFilter: true, chatDelete: true, timestamps: true, showWaypoints: true, friendHud: true, comboCounter: true };
const defaultData = { friends: [], muted: {}, filters: ["ez"] }; // Retrait du "L" qui faisait buguer

function loadSettings() {
    let cRaw = FileLib.read("SolusClient", CONFIG_FILE);
    let dRaw = FileLib.read("SolusClient", DATA_FILE);
    let c = cRaw ? JSON.parse(cRaw) : defaultConfig;
    let d = dRaw ? JSON.parse(dRaw) : defaultData;
    // Auto-réparation
    for (let k in defaultConfig) if (c[k] === undefined) c[k] = defaultConfig[k];
    for (let k in defaultData) if (d[k] === undefined) d[k] = defaultData[k];
    FileLib.write("SolusClient", CONFIG_FILE, JSON.stringify(c, null, 2));
    FileLib.write("SolusClient", DATA_FILE, JSON.stringify(d, null, 2));
    return { config: c, data: d };
}

let loaded = loadSettings();

if (!global.Solus) {
    global.Solus = {
        prefix: "§b[Solus] ",
        config: loaded.config,
        data: loaded.data,
        cloud: { legendaries:[], friends: [], invincibles: [], targets: [], blacklist: [], filters:[], motd: "", objective: "" }
    };
    
    // Fonctions de sauvegarde
    global.Solus.saveConfig = function() { FileLib.write("SolusClient", CONFIG_FILE, JSON.stringify(global.Solus.config, null, 2)); };
    global.Solus.saveData = function() { FileLib.write("SolusClient", DATA_FILE, JSON.stringify(global.Solus.data, null, 2)); };
}

const S = global.Solus;
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
let lastSync = 0;

function clean(str) { return str ? str.replace(/[^a-zA-Z0-9_]/g, "").trim() : ""; }
function fetchList(filename, t) {
    try {
        let c = FileLib.getUrlContent(GITHUB_BASE + filename + t);
        return c ? c.split("\n").map(s => s.trim()).filter(s => s.length > 1) :[];
    } catch (e) { return[]; }
}

function syncCloudData(verbose) {
    new Thread(() => {
        try {
            let t = "?t=" + Date.now();
            let cl = S.cloud;

            let jsonRaw = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
            if (jsonRaw && jsonRaw.includes("{")) {
                try { let p = JSON.parse(jsonRaw.substring(jsonRaw.indexOf("{"), jsonRaw.lastIndexOf("}") + 1)); if (p.admins) cl.legendaries = p.admins; } catch(e){}
            }

            cl.friends = fetchList("default_friend.txt", t);
            cl.invincibles = fetchList("invincible.txt", t);
            cl.targets = fetchList("target.txt", t);
            cl.blacklist = fetchList("blacklist.txt", t);
            cl.filters = fetchList("chat_filter.txt", t);

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
        } catch (e) {}
    }).start();
}
register("step", () => { if (Date.now() - lastSync > 30000) syncCloudData(false); }).setDelay(1);

global.Solus.getStatus = function(name) {
    if (!name) return "NONE";
    let l = clean(ChatLib.removeFormatting(name)).toLowerCase();
    for (let k of S.cloud.legendaries) if (clean(k.pseudo).toLowerCase() === l) return "LEGENDARY";
    if (S.cloud.invincibles.some(x => clean(x).toLowerCase() === l)) return "INVINCIBLE";
    if (S.cloud.targets.some(x => clean(x).toLowerCase() === l)) return "TARGET";
    if (S.data.friends.some(x => clean(x).toLowerCase() === l) || S.cloud.friends.some(x => clean(x).toLowerCase() === l)) return "FRIEND";
    return "NONE";
};

global.Solus.getRole = function(name) {
    let l = clean(ChatLib.removeFormatting(name)).toLowerCase();
    for (let k of S.cloud.legendaries) if (clean(k.pseudo).toLowerCase() === l) return k.role || "Dieu";
    return "Dieu";
};

// COMMANDES HUB
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Client");
        ChatLib.chat("§3/sf friend <add|remove|list> §7- Amis");
        ChatLib.chat("§3/sf toggle <opt>             §7- pvp/esp/radar/filter/delete");
        ChatLib.chat("§3/sf force                    §7- MAJ Cloud");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }
    let a = args[0].toLowerCase();
    if (a === "force") { ChatLib.chat(S.prefix + "§eForçage..."); syncCloudData(true); }
    else if (a === "add" && args[1]) {
        if (!S.data.friends.includes(args[1])) { S.data.friends.push(args[1]); S.saveData(); ChatLib.chat(S.prefix + "§aAjouté."); }
    }
    else if (a === "remove" && args[1]) {
        S.data.friends = S.data.friends.filter(x => x.toLowerCase() !== args[1].toLowerCase()); S.saveData(); ChatLib.chat(S.prefix + "§cRetiré.");
    }
    else if (a === "list") ChatLib.chat("§6Cloud: " + S.cloud.friends.length + " Amis / " + S.cloud.filters.length + " Filtres");
    else if (a === "toggle" && args[1]) {
        let o = args[1].toLowerCase();
        if(o=="pvp") S.config.pvpEnabled = !S.config.pvpEnabled;
        if(o=="radar") S.config.radar = !S.config.radar;
        if(o=="esp") S.config.esp3D = !S.config.esp3D;
        if(o=="filter") S.config.chatFilter = !S.config.chatFilter;
        if(o=="delete") S.config.chatDelete = !S.config.chatDelete;
        S.saveConfig(); ChatLib.chat(S.prefix + "Option " + o + " changée.");
    }
}).setName("solus").setAliases("sf");

register("command", () => {
    S.config.pvpEnabled = !S.config.pvpEnabled; S.saveConfig();
    ChatLib.chat(S.prefix + "PvP Ami: " + (S.config.pvpEnabled ? "§cON" : "§aOFF"));
}).setName("soluspvp").setAliases("friendpvp");
