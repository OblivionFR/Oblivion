import PogObject from "PogData";

// --- INITIALISATION DE L'ESPACE GLOBAL ---
// Permet aux autres fichiers d'accéder aux données du Core
if (!global.solus) {
    global.solus = {
        prefix: "§b[Solus] ",
        cloud: { legendaries: [], friends: [], invincibles: [], targets:[], blacklist:[], motd: "", objective: "" },
        config: new PogObject("SolusClient", {
            friends:[], pvpEnabled: false, chatHighlight: true, esp3D: true, radar: true, proximityAlert: true
        }, "solus_config.json")
    };
}

const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/SolusClient/";
let lastUpdate = 0;
let isUpdating = false;

// --- FONCTIONS UTILITAIRES GLOBALES ---
global.solus.getStatus = function(name) {
    if(!name) return "NONE";
    let l = ChatLib.removeFormatting(name).toLowerCase().trim();
    for(let k=0; k<global.solus.cloud.legendaries.length; k++) {
        if(global.solus.cloud.legendaries[k].pseudo.toLowerCase() === l) return "LEGENDARY";
    }
    if(global.solus.cloud.invincibles.some(x=>x.toLowerCase()===l)) return "INVINCIBLE";
    if(global.solus.cloud.targets.some(x=>x.toLowerCase()===l)) return "TARGET";
    if(global.solus.config.friends.some(x=>x.toLowerCase()===l) || global.solus.cloud.friends.some(x=>x.toLowerCase()===l)) return "FRIEND";
    return "NONE";
};

global.solus.getRole = function(name) {
    let l = ChatLib.removeFormatting(name).toLowerCase().trim();
    for(let k=0; k<global.solus.cloud.legendaries.length; k++) {
        if(global.solus.cloud.legendaries[k].pseudo.toLowerCase()===l) return global.solus.cloud.legendaries[k].role || "Dieu";
    }
    return "Dieu";
};

// --- SYNCHRONISATION CLOUD ---
function syncCloud(verbose) {
    if (isUpdating) return;
    isUpdating = true;
    new Thread(() => {
        try {
            let t = "?t=" + Date.now();
            let cl = global.solus.cloud;
            
            let json = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
            if (json && json.length > 5) {
                try {
                    let parsed = JSON.parse(json.trim());
                    if (parsed.admins) cl.legendaries = parsed.admins;
                    if (verbose) ChatLib.chat(global.solus.prefix + "§a" + cl.legendaries.length + " Légendes chargées.");
                } catch (e) {}
            }

            let f = FileLib.getUrlContent(GITHUB_BASE + "default_friend.txt" + t);
            if(f) cl.friends = f.split("\n").map(s=>s.trim()).filter(s=>s.length>=3);
            
            let i = FileLib.getUrlContent(GITHUB_BASE + "invincible.txt" + t);
            if(i) cl.invincibles = i.split("\n").map(s=>s.trim()).filter(s=>s.length>=3);
            
            let tg = FileLib.getUrlContent(GITHUB_BASE + "target.txt" + t);
            if(tg) cl.targets = tg.split("\n").map(s=>s.trim()).filter(s=>s.length>=3);

            let b = FileLib.getUrlContent(GITHUB_BASE + "blacklist.txt" + t);
            if(b) cl.blacklist = b.split("\n").map(s=>s.trim()).filter(s=>s.length>=3);

            let m = FileLib.getUrlContent(GITHUB_BASE + "motd.txt" + t);
            if(m && m.trim().length > 0 && m.trim() !== cl.motd) {
                cl.motd = m.trim();
                if(!verbose) {
                    ChatLib.chat("§3§m---------------------------------------------");
                    ChatLib.chat("§b§lAnnonce Solus : §f" + cl.motd);
                    ChatLib.chat("§3§m---------------------------------------------");
                    World.playSound("random.levelup", 1, 1);
                }
            }
            
            let obj = FileLib.getUrlContent(GITHUB_BASE + "objective.txt" + t);
            cl.objective = obj ? obj.trim() : "";

            lastUpdate = Date.now();
            if(verbose) ChatLib.chat(global.solus.prefix + "§aSynchronisation terminée.");
        } catch(e) {}
        isUpdating = false;
    }).start();
}

register("step", () => { if(Date.now() - lastUpdate > 15000) syncCloud(false); }).setFps(1);

// --- COMMANDE GLOBALE /SOLUS ---
register("command", (...args) => {
    let conf = global.solus.config;
    let cl = global.solus.cloud;
    let pre = global.solus.prefix;

    if(!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Client §7- Hub Global");
        ChatLib.chat("§3/solus add/remove <pseudo> §7- Gérer un ami local");
        ChatLib.chat("§3/solus list                §7- Voir stats du Cloud");
        ChatLib.chat("§3/solus force               §7- §eForcer Synchro Cloud");
        ChatLib.chat("§3/solus toggle <opt>        §7- pvp/radar/esp/alert");
        ChatLib.chat("§3/soluspvp                  §7- Autoriser de taper un ami");
        ChatLib.chat("");
        ChatLib.chat("§b§lModule Mute :");
        ChatLib.chat("§3/smutegui                  §7- Menu des mutes");
        ChatLib.chat("§3/smute <pseudo> [tps]      §7- Muter (ex: 10m, 2h)");
        ChatLib.chat("§3/sunmute <pseudo>          §7- Démuter");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }
    let a = args[0].toLowerCase();
    if(a==="force") { ChatLib.chat(pre + "§eForçage..."); syncCloud(true); }
    else if(a==="add" && args[1]) {
        if(!conf.friends.includes(args[1])) { conf.friends.push(args[1]); conf.save(); ChatLib.chat(pre + "§aAjouté: " + args[1]); }
    }
    else if(a==="remove" && args[1]) {
        conf.friends = conf.friends.filter(x => x.toLowerCase() !== args[1].toLowerCase()); conf.save(); ChatLib.chat(pre + "§cRetiré: " + args[1]);
    }
    else if(a==="list") {
        ChatLib.chat("§6Cloud Solus: §cDieux:" + cl.legendaries.length + " §aAmis:" + cl.friends.length + " §dInv:" + cl.invincibles.length + " §cCibles:" + cl.targets.length);
        ChatLib.chat("§3Local: " + conf.friends.join(", "));
    }
    else if(a==="toggle" && args[1]) {
        let o = args[1].toLowerCase();
        if(o=="pvp") conf.pvpEnabled = !conf.pvpEnabled;
        if(o=="radar") conf.radar = !conf.radar;
        if(o=="esp") conf.esp3D = !conf.esp3D;
        if(o=="alert") conf.proximityAlert = !conf.proximityAlert;
        conf.save(); ChatLib.chat(pre + "Option " + o + " changée.");
    }
}).setName("solus").setAliases("sc");

register("command", () => {
    global.solus.config.pvpEnabled = !global.solus.config.pvpEnabled; global.solus.config.save();
    ChatLib.chat(global.solus.prefix + "PvP Ami: " + (global.solus.config.pvpEnabled ? "§cON (Danger)" : "§aOFF (Sûr)"));
}).setName("soluspvp").setAliases("friendpvp");

// Rendu Objectif HUD (Géré par le core)
register("renderOverlay", () => {
    if(global.solus.cloud.objective.length > 0) {
        Renderer.drawStringWithShadow("§3§l📌 Objectif: §b" + global.solus.cloud.objective, 5, 5);
    }
});
