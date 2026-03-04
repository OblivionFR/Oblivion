import PogObject from "PogData";

// --- 1. AUTO-UPDATER (NE PAS TOUCHER) ---
const VERSION = "6.2"; 
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/FriendModule/";

function checkUpdate() {
    new Thread(() => {
        try {
            // Anti-Cache avec timestamp
            let code = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
            if (!code || code.length < 100) return;
            
            // Vérification de version
            let match = code.match(/const VERSION = "([0-9.]+)";/);
            if (match && match[1] !== VERSION) {
                ChatLib.chat("§2[Oblivion] §fMise à jour trouvée (v" + match[1] + ") ! Installation...");
                FileLib.write("GreenFriends", "index.js", code);
                setTimeout(() => {
                    ChatLib.command("ct load", true);
                    ChatLib.chat("§2[Oblivion] §aMise à jour terminée !");
                }, 2000);
            }
        } catch(e) {}
    }).start();
}
// Lancement au démarrage
checkUpdate();

// --- CONFIGURATION ---
const prefix = "§2[Oblivion] ";
const data = new PogObject("GreenFriends", {
    friends: [],
    pvpEnabled: false,
    chatHighlight: true,
    esp3D: true,
    radar: true,
    proximityAlert: true
}, "data.json");

// --- VARIABLES CLOUD ---
let cloudLegendaries = []; // Stocke les objets {pseudo, role}
let cloudFriends = [];
let cloudInvincibles = [];
let cloudTargets = [];
let cloudBlacklist = [];
let cloudMotd = "";
let cloudObjective = "";

let lastUpdate = 0;
let isUpdating = false;

// Variables Jeu
let actionBarMsg = "";
let actionBarTimer = 0;
let alertedTargets = [];
let isParalyzed = false;
let paralysisTimer = 0;
let hpCache = 20;

// --- 2. SYSTÈME DE TÉLÉCHARGEMENT ---
function fetchCloudData(verbose) {
    if (isUpdating) return;
    isUpdating = true;

    new Thread(() => {
        try {
            let t = "?t=" + Date.now();

            // A. CHARGEMENT JSON (ADMINS)
            let jsonUrl = GITHUB_BASE + "legendary_chars.json" + t;
            let jsonRaw = FileLib.getUrlContent(jsonUrl);
            
            if (jsonRaw && jsonRaw.length > 5) {
                try {
                    // Nettoyage des caractères invisibles qui font crash la 1.8.9
                    jsonRaw = jsonRaw.trim(); 
                    let parsed = JSON.parse(jsonRaw);
                    
                    if (parsed && parsed.admins) {
                        cloudLegendaries = parsed.admins;
                        if (verbose) ChatLib.chat(prefix + "§aJSON Admin chargé : " + cloudLegendaries.length + " Légendes.");
                    }
                } catch (e) {
                    if (verbose) ChatLib.chat(prefix + "§cErreur de syntaxe dans le JSON Admin !");
                }
            } else {
                if (verbose) ChatLib.chat(prefix + "§cImpossible de lire le fichier JSON.");
            }

            // B. CHARGEMENT TEXTES SIMPLES
            let f = FileLib.getUrlContent(GITHUB_BASE + "default_friend.txt" + t);
            if (f) cloudFriends = f.split("\n").map(s => s.trim()).filter(s => s.length >= 3);

            let i = FileLib.getUrlContent(GITHUB_BASE + "invincible.txt" + t);
            if (i) cloudInvincibles = i.split("\n").map(s => s.trim()).filter(s => s.length >= 3);

            let tg = FileLib.getUrlContent(GITHUB_BASE + "target.txt" + t);
            if (tg) cloudTargets = tg.split("\n").map(s => s.trim()).filter(s => s.length >= 3);

            let b = FileLib.getUrlContent(GITHUB_BASE + "blacklist.txt" + t);
            if (b) cloudBlacklist = b.split("\n").map(s => s.trim()).filter(s => s.length >= 3);

            let obj = FileLib.getUrlContent(GITHUB_BASE + "objective.txt" + t);
            cloudObjective = obj ? obj.trim() : "";

            let m = FileLib.getUrlContent(GITHUB_BASE + "motd.txt" + t);
            if (m && m.trim().length > 0 && m.trim() !== cloudMotd) {
                cloudMotd = m.trim();
                if (!verbose) {
                    ChatLib.chat("§6§m---------------------------------------------");
                    ChatLib.chat("§e§lAnnonce Oblivion : §f" + cloudMotd);
                    ChatLib.chat("§6§m---------------------------------------------");
                    World.playSound("random.levelup", 1, 1);
                }
            }

            lastUpdate = Date.now();
            if (verbose) ChatLib.chat(prefix + "§aSynchronisation terminée.");

        } catch (e) {
            if (verbose) ChatLib.chat(prefix + "§cErreur réseau : " + e);
        }
        isUpdating = false;
    }).start();
}

// Update automatique (15s)
register("step", () => {
    if (Date.now() - lastUpdate > 15000) fetchCloudData(false);
}).setFps(1);

// Helpers
function getStatus(name) {
    if (!name) return "NONE";
    let lower = ChatLib.removeFormatting(name).toLowerCase().trim();

    // Priorité JSON
    for (let k = 0; k < cloudLegendaries.length; k++) {
        if (cloudLegendaries[k].pseudo && cloudLegendaries[k].pseudo.toLowerCase() === lower) return "LEGENDARY";
    }

    if (cloudInvincibles.some(i => i.toLowerCase() === lower)) return "INVINCIBLE";
    if (cloudTargets.some(t => t.toLowerCase() === lower)) return "TARGET";
    if (data.friends.some(f => f.toLowerCase() === lower) || cloudFriends.some(f => f.toLowerCase() === lower)) return "FRIEND";
    return "NONE";
}

function getLegendaryRole(name) {
    let lower = ChatLib.removeFormatting(name).toLowerCase().trim();
    for (let k = 0; k < cloudLegendaries.length; k++) {
        if (cloudLegendaries[k].pseudo && cloudLegendaries[k].pseudo.toLowerCase() === lower) {
            return cloudLegendaries[k].role || "Dieu";
        }
    }
    return "Dieu";
}

// --- 3. COMMANDES ---
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§2§m---------------------------------------------");
        ChatLib.chat("§2§lOblivion Manager §7(v" + VERSION + ")");
        ChatLib.chat("§a/lf add <pseudo>    §7- Ajouter ami");
        ChatLib.chat("§a/lf remove <pseudo> §7- Retirer ami");
        ChatLib.chat("§a/lf list            §7- Voir le Cloud");
        ChatLib.chat("§a/lf force           §7- §eDebug Chargement");
        ChatLib.chat("§a/friendpvp          §7- Sécurité PvP");
        ChatLib.chat("§2§m---------------------------------------------");
        return;
    }
    let act = args[0].toLowerCase();

    if (act === "force") {
        ChatLib.chat(prefix + "§eTéléchargement forcé...");
        fetchCloudData(true);
    } 
    else if (act === "list") {
        ChatLib.chat("§6État du Cloud:");
        ChatLib.chat(" §cAdmin Dieux: " + cloudLegendaries.length);
        if (cloudLegendaries.length > 0) ChatLib.chat(" §7-> " + cloudLegendaries[0].pseudo);
        ChatLib.chat(" §aAmis: " + cloudFriends.length);
        ChatLib.chat(" §dInvincibles: " + cloudInvincibles.length);
        ChatLib.chat(" §cTargets: " + cloudTargets.length);
    }
    else if (act === "add" && args[1]) {
        if (!data.friends.includes(args[1])) {
            data.friends.push(args[1]); data.save();
            ChatLib.chat(prefix + "§a" + args[1] + " ajouté.");
        }
    }
    else if (act === "remove" && args[1]) {
        data.friends = data.friends.filter(f => f.toLowerCase() !== args[1].toLowerCase());
        data.save();
        ChatLib.chat(prefix + "§c" + args[1] + " retiré.");
    }
    else if (act === "toggle" && args[1]) {
        let opt = args[1].toLowerCase();
        if (opt === "pvp") data.pvpEnabled = !data.pvpEnabled;
        if (opt === "radar") data.radar = !data.radar;
        if (opt === "esp") data.esp3D = !data.esp3D;
        data.save();
        ChatLib.chat(prefix + "Option " + opt + " changée.");
    }
}).setName("localfriend").setAliases("lf");

register("command", () => {
    data.pvpEnabled = !data.pvpEnabled; data.save();
    ChatLib.chat(prefix + "PvP Ami: " + (data.pvpEnabled ? "§cON" : "§aOFF"));
}).setName("friendpvp");

// --- 4. GAMEPLAY (PVP & FREEZE) ---
register("tick", () => {
    if (!World.isLoaded()) return;
    
    // Détection Freeze (Reçoit un coup d'un Dieu)
    let hp = Player.getHP();
    if (hp < hpCache && hp > 0) {
        let godNearby = false;
        World.getAllPlayers().forEach(p => {
            if (p.getName() !== Player.getName() && getStatus(p.getName()) === "LEGENDARY") {
                if (Player.asPlayerMP().distanceTo(p) < 6) godNearby = true;
            }
        });
        if (godNearby && !isParalyzed) {
            isParalyzed = true;
            paralysisTimer = 80; // 4 secondes
            World.playSound("ambient.weather.thunder", 100, 0.5);
            Client.showTitle("§4§lPARALYSÉ", "§cUn Dieu t'a frappé !", 0, 40, 10);
        }
    }
    hpCache = hp;

    // Effet Freeze
    if (isParalyzed) {
        if (paralysisTimer > 0 && Player.getHP() > 0) {
            paralysisTimer--;
            let p = Player.getPlayer();
            p.field_70159_w = 0; 
            p.field_70179_y = 0; 
            if (p.field_70181_x > 0) p.field_70181_x = 0;
            Client.getMinecraft().field_71439_g.field_70702_br = 0;
            Client.getMinecraft().field_71439_g.field_70701_bs = 0;
            actionBarMsg = "§4§lTU ES GELÉ..."; actionBarTimer = 5;
        } else {
            isParalyzed = false;
        }
    }
});

// Protection Attaque
register("attackEntity", (entity, event) => {
    let name = ChatLib.removeFormatting(entity.getName());
    let st = getStatus(name);

    if (st === "LEGENDARY") {
        cancel(event);
        World.playSound("mob.wither.idle", 100, 0.5);
        // Force regard au sol
        Player.getPlayer().field_70125_A = 90;
        Player.getPlayer().field_70177_z += 180;
        actionBarMsg = "§4§l☠ RESPECTE LES DIEUX ☠"; actionBarTimer = 40;
    } 
    else if (st === "INVINCIBLE") {
        cancel(event);
        World.playSound("mob.enderdragon.hit", 100, 0.5);
        actionBarMsg = "§c§l🛡 PROTECTION OBLIVION 🛡"; actionBarTimer = 40;
    }
    else if (st === "FRIEND" && !data.pvpEnabled) {
        cancel(event);
        World.playSound("random.anvil_land", 100, 0.5);
        actionBarMsg = "§a§l✔ C'est un ami !"; actionBarTimer = 40;
    }
});

// --- 5. RENDU VISUEL ---
register("renderOverlay", () => {
    if (actionBarTimer > 0) {
        let w = Renderer.screen.getWidth();
        Renderer.drawStringWithShadow(actionBarMsg, w/2 - Renderer.getStringWidth(actionBarMsg)/2, Renderer.screen.getHeight() - 60);
        actionBarTimer--;
    }
    
    // Aura de Peur Rouge (Si Dieu proche)
    let godNear = false;
    World.getAllPlayers().forEach(p => {
        if(getStatus(p.getName()) === "LEGENDARY" && Player.asPlayerMP().distanceTo(p) < 20) godNear = true;
    });
    if(godNear) {
        let op = Math.abs(Math.sin(Date.now()/300))*80;
        Renderer.drawRect(Renderer.color(255,0,0,op), 0,0, Renderer.screen.getWidth(), Renderer.screen.getHeight());
        Renderer.drawStringWithShadow("§4§l☠ PRÉSENCE DIVINE ☠", Renderer.screen.getWidth()/2 - 60, 40);
    }

    if (cloudObjective.length > 0) Renderer.drawStringWithShadow("§6§l📌 Objectif : §e" + cloudObjective, 5, 5);

    // Radar
    if (!data.radar) return;
    let rx = 70, ry = 70, s = 50;
    if (cloudObjective.length > 0) ry += 15;
    
    Renderer.drawRect(Renderer.color(0,0,0,150), rx-s, ry-s, s*2, s*2);
    Renderer.drawRect(Renderer.color(255,255,255,255), rx-1, ry-1, 2, 2);

    let yaw = Player.getYaw();
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (name === Player.getName()) return;
        let st = getStatus(name);
        if (st === "NONE") return;

        let dx = p.getX()-Player.getX(); let dz = p.getZ()-Player.getZ();
        let cos = Math.cos(yaw*(Math.PI/180)); let sin = Math.sin(yaw*(Math.PI/180));
        let rotX = -(dx*cos - dz*sin); let rotY = -(dx*sin + dz*cos);
        
        if (Math.sqrt(rotX*rotX + rotY*rotY)*1.5 < s) {
            let col = Renderer.color(0,255,0);
            if (st==="TARGET") col = Renderer.color(255,0,0);
            if (st==="INVINCIBLE") col = Renderer.color(170,0,255);
            if (st==="LEGENDARY") col = Renderer.color(0,0,0);
            Renderer.drawRect(col, rx + rotX*1.5 -1, ry + rotY*1.5 -1, 3, 3);
        }
    });
});

register("renderWorld", () => {
    if (!data.esp3D) return;
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (name === Player.getName()) return;
        let st = getStatus(name);
        
        if (st !== "NONE" && Player.asPlayerMP().distanceTo(p) < 60) {
            let txt = "§a★ AMI ★";
            let h = 0.5;
            if (st === "TARGET") txt = "§c⚠ CIBLE ⚠";
            else if (st === "INVINCIBLE") txt = "§d§l🛡 GOD 🛡";
            else if (st === "LEGENDARY") {
                txt = "§4§l☠ " + getLegendaryRole(name).toUpperCase() + " ☠";
                h = 0.8;
            }
            Tessellator.drawString(txt, p.getRenderX(), p.getRenderY()+p.getHeight()+h, p.getRenderZ(), 0, true, 0.03, false);
        }
    });
});

// --- 6. TABLIST & CHAT (Scoreboard Teams) ---
register("tick", () => {
    if (!World.isLoaded()) return;
    try {
        let sb = World.getWorld().func_96441_U();
        let tLeg = sb.func_96508_e("0_LEG") || sb.func_96527_f("0_LEG"); tLeg.func_96666_b("§4§lDieu §c");
        let tGod = sb.func_96508_e("1_GOD") || sb.func_96527_f("1_GOD"); tGod.func_96666_b("§d§lGod §d");
        let tFri = sb.func_96508_e("2_FRI") || sb.func_96527_f("2_FRI"); tFri.func_96666_b("§a§lFriend §a");
        let tTar = sb.func_96508_e("3_TAR") || sb.func_96527_f("3_TAR"); tTar.func_96666_b("§c§lTarget §c");

        let nh = Client.getMinecraft().func_147114_u();
        let it = nh.func_175106_d().iterator();
        
        while(it.hasNext()) {
            let info = it.next();
            let name = info.func_178845_a().getName();
            let st = getStatus(name);
            
            if (st !== "NONE") {
                let teamName = "2_FRI"; let teamObj = tFri;
                if (st === "LEGENDARY") { teamName = "0_LEG"; teamObj = tLeg; }
                else if (st === "INVINCIBLE") { teamName = "1_GOD"; teamObj = tGod; }
                else if (st === "TARGET") { teamName = "3_TAR"; teamObj = tTar; }

                if (!teamObj.func_96665_g().contains(name)) sb.func_151392_a(name, teamName);
            }
        }
    } catch(e) {}
});

register("chat", (event) => {
    let msg = ChatLib.getChatMessage(event);
    let clean = ChatLib.removeFormatting(msg);

    // Mute Blacklist
    for (let b of cloudBlacklist) {
        if (clean.toLowerCase().indexOf(b.toLowerCase()) !== -1 && clean.toLowerCase().indexOf(b.toLowerCase()) < 15) {
            cancel(event); return;
        }
    }

    if (!data.chatHighlight) return;
    let all = [...data.friends, ...cloudFriends, ...cloudInvincibles, ...cloudTargets];
    cloudLegendaries.forEach(l => all.push(l.pseudo));

    all.forEach(f => {
        if (clean.indexOf(f + ":") != -1 || clean.indexOf(f + ">") != -1) {
            cancel(event);
            let st = getStatus(f);
            let color = "§a§l";
            if (st === "TARGET") color = "§c§l";
            else if (st === "INVINCIBLE") color = "§d§l";
            else if (st === "LEGENDARY") color = "§4§l☠ ";
            ChatLib.chat(msg.replace(f, color + f + "§r"));
            if (st !== "TARGET") World.playSound("note.pling", 1, 2);
        }
    });
});
