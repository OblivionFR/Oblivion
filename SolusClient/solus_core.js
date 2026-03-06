import PogObject from "PogData";

// Paramètres par défaut de la Config
const defaultConfig = {
    pvpEnabled: false, chatHighlight: true, esp3D: true, radar: true, 
    proximityAlert: true, targetHud: true, chatFilter: true, 
    chatDelete: true, timestamps: true, showWaypoints: true, 
    friendHud: true, comboCounter: true
};

// Paramètres par défaut des Données
const defaultData = {
    friends: [],
    muted: {},
    filters: ["ez", "L"] // Filtres locaux par défaut
};

if (!global.Solus) {
    global.Solus = {
        prefix: "§b[Solus] ",
        config: new PogObject("SolusClient", defaultConfig, "solus_config.json"),
        data: new PogObject("SolusClient", defaultData, "solus_data.json"),
        cloud: { legendaries: [], friends: [], invincibles: [], targets: [], blacklist:[], filters:[], motd: "", objective: "" }
    };

    // 1. AUTO-RÉPARATION DE LA CONFIG (Ajoute les options manquantes sans reset)
    let cChanged = false;
    for (let k in defaultConfig) {
        if (!(k in global.Solus.config)) {
            global.Solus.config[k] = defaultConfig[k];
            cChanged = true;
        }
    }
    if (cChanged) global.Solus.config.save();

    // 2. AUTO-RÉPARATION DES DONNÉES (Ajoute les listes manquantes sans reset)
    let dChanged = false;
    for (let k in defaultData) {
        if (!(k in global.Solus.data)) {
            global.Solus.data[k] = defaultData[k];
            dChanged = true;
        }
    }
    if (dChanged) global.Solus.data.save();
}

const S = global.Solus;
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
let lastSync = 0;

function clean(str) { return str ? str.replace(/[^a-zA-Z0-9_]/g, "").trim() : ""; }
function fetchList(filename, t) {
    try {
        let c = FileLib.getUrlContent(GITHUB_BASE + filename + t);
        return c ? c.split("\n").map(s => s.trim()).filter(s => s.length > 1) : [];
    } catch (e) { return[]; }
}

function syncCloudData(verbose) {
    new Thread(() => {
        try {
            let t = "?t=" + Date.now();
            let cl = S.cloud;

            let jsonRaw = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
            if (jsonRaw && jsonRaw.includes("{")) {
                try {
                    let p = JSON.parse(jsonRaw.substring(jsonRaw.indexOf("{"), jsonRaw.lastIndexOf("}") + 1));
                    if (p.admins) cl.legendaries = p.admins;
                } catch(e){}
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

register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Client §7- Hub");
        ChatLib.chat("§3/sf friend <add|remove|list> §7- Amis");
        ChatLib.chat("§3/sf toggle <opt>             §7- pvp/esp/radar/hud/time");
        ChatLib.chat("§3/sf force                    §7- Force Update Cloud");
        ChatLib.chat("§3/smute <pseudo>              §7- Mute un joueur");
        ChatLib.chat("§3/sfilter                     §7- Filtres de mots");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }
    
    let cat = args[0].toLowerCase();

    if (cat === "friend") {
        let act = args[1]; let target = args[2];
        if (act === "add" && target) { if (!S.data.friends.includes(target)) { S.data.friends.push(target); S.data.save(); ChatLib.chat(S.prefix + "§aAmi ajouté : " + target); } }
        else if (act === "remove" && target) { S.data.friends = S.data.friends.filter(x => x.toLowerCase() !== target.toLowerCase()); S.data.save(); ChatLib.chat(S.prefix + "§cAmi retiré : " + target); }
        else if (act === "list") { ChatLib.chat("§6Cloud: §a" + S.cloud.friends.length + " Amis. §3Local: " + S.data.friends.join(", ")); }
    }
    else if (cat === "mute") { if (args[1]) ChatLib.command("smute " + args.slice(1).join(" "), true); }
    else if (cat === "unmute") { if (args[1]) ChatLib.command("sunmute " + args[1], true); }
    else if (cat === "toggle" && args[1]) {
        let o = args[1].toLowerCase();
        if(o=="pvp") S.config.pvpEnabled = !S.config.pvpEnabled;
        if(o=="radar") S.config.radar = !S.config.radar;
        if(o=="esp") S.config.esp3D = !S.config.esp3D;
        if(o=="hud") S.config.targetHud = !S.config.targetHud;
        if(o=="wp") S.config.showWaypoints = !S.config.showWaypoints;
        if(o=="filter") S.config.chatFilter = !S.config.chatFilter;
        if(o=="delete") S.config.chatDelete = !S.config.chatDelete;
        if(o=="time") S.config.timestamps = !S.config.timestamps; 
        if(o=="tab") S.config.customTab = !S.config.customTab;
        S.config.save(); ChatLib.chat(S.prefix + "Option §e" + o + " §fmise à jour.");
    }
    else if (cat === "force") { ChatLib.chat(S.prefix + "§eForçage..."); syncCloudData(true); }
}).setName("solus").setAliases("sf");

register("command", () => {
    S.config.pvpEnabled = !S.config.pvpEnabled; S.config.save();
    ChatLib.chat(S.prefix + "PvP Ami: " + (S.config.pvpEnabled ? "§cON" : "§aOFF"));
}).setName("soluspvp").setAliases("friendpvp");
