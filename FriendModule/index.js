import PogObject from "PogData";

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

// --- DONNÉES CLOUD ---
let cloudLegendaries = []; // Les Dieux (JSON)
let cloudFriends = [];
let cloudInvincibles = [];
let cloudTargets = [];
let cloudBlacklist = [];
let cloudMotd = "";
let cloudObjective = "";

// Variables système
let lastUpdate = 0;
let isUpdating = false;
let actionBarMsg = "";
let actionBarTimer = 0;
let alertedTargets = [];

// Variables Pouvoirs
let isParalyzed = false;
let paralysisTimer = 0;
let hpCache = 20;

// URL DE BASE (Change bien ton lien si besoin)
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/FriendModule/";

// --- 1. SYSTÈME DE SYNCHRONISATION (ROBUSTE) ---
function fetchCloudData(verbose) {
    if (isUpdating) return;
    isUpdating = true;

    new Thread(() => {
        try {
            let t = "?t=" + Date.now(); // Anti-cache

            // 1. CHARGEMENT DU JSON LÉGENDAIRE (La partie importante)
            let jsonRaw = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
            
            if (jsonRaw) {
                // Nettoyage brutal du JSON pour éviter les erreurs de format
                jsonRaw = jsonRaw.trim(); 
                try {
                    let parsed = JSON.parse(jsonRaw);
                    if (parsed && parsed.admins) {
                        cloudLegendaries = parsed.admins;
                        if (verbose) ChatLib.chat(prefix + "§aJSON Chargé ! " + cloudLegendaries.length + " Légendes trouvées.");
                    } else {
                        if (verbose) ChatLib.chat(prefix + "§cErreur JSON: Pas de liste 'admins' trouvée.");
                    }
                } catch (e) {
                    if (verbose) ChatLib.chat(prefix + "§cErreur de lecture JSON (Syntaxe invalide). Vérifie les virgules !");
                }
            } else {
                if (verbose) ChatLib.chat(prefix + "§cImpossible de télécharger le JSON (404 ou Pas d'internet).");
            }

            // 2. Autres fichiers (Listes simples)
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
            if (verbose) ChatLib.chat(prefix + "§aTout est à jour !");

        } catch (e) {
            if (verbose) ChatLib.chat(prefix + "§cCrash update: " + e);
        }
        isUpdating = false;
    }).start();
}

// Auto-Update toutes les 15s
register("step", () => {
    if (Date.now() - lastUpdate > 15000) fetchCloudData(false);
}).setFps(1);

// --- 2. FONCTIONS DE VÉRIFICATION ---
function getStatus(name) {
    if (!name) return "NONE";
    let lower = ChatLib.removeFormatting(name).toLowerCase().trim();

    // Check Légendaires (JSON)
    for (let k = 0; k < cloudLegendaries.length; k++) {
        if (cloudLegendaries[k].pseudo.toLowerCase() === lower) return "LEGENDARY";
    }

    if (cloudInvincibles.some(i => i.toLowerCase() === lower)) return "INVINCIBLE";
    if (cloudTargets.some(t => t.toLowerCase() === lower)) return "TARGET";
    if (data.friends.some(f => f.toLowerCase() === lower) || cloudFriends.some(f => f.toLowerCase() === lower)) return "FRIEND";
    
    return "NONE";
}

function getLegendaryRole(name) {
    let lower = ChatLib.removeFormatting(name).toLowerCase().trim();
    for (let k = 0; k < cloudLegendaries.length; k++) {
        if (cloudLegendaries[k].pseudo.toLowerCase() === lower) {
            return cloudLegendaries[k].role;
        }
    }
    return "Dieu";
}

// --- 3. COMMANDES ---
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§2§m---------------------------------------------");
        ChatLib.chat("§2§lOblivion Manager §7(v6.0)");
        ChatLib.chat("§a/lf add <pseudo>    §7- Ajouter ami");
        ChatLib.chat("§a/lf remove <pseudo> §7- Retirer ami");
        ChatLib.chat("§a/lf list            §7- Voir listes");
        ChatLib.chat("§a/lf force           §7- §eForcer Synchro (Debug)");
        ChatLib.chat("§a/friendpvp          §7- Toggle PvP");
        ChatLib.chat("§2§m---------------------------------------------");
        return;
    }
    let act = args[0].toLowerCase();
    
    if (act === "force") {
        ChatLib.chat(prefix + "§eForçage de la mise à jour Cloud...");
        fetchCloudData(true);
    } 
    else if (act === "list") {
        ChatLib.chat("§6Cloud Stats:");
        ChatLib.chat(" §cDieux (JSON): " + cloudLegendaries.length);
        if (cloudLegendaries.length > 0) ChatLib.chat(" §7-> " + cloudLegendaries[0].pseudo + "...");
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
}).setName("localfriend").setAliases("lf");

register("command", () => {
    data.pvpEnabled = !data.pvpEnabled; data.save();
    ChatLib.chat(prefix + "PvP Ami: " + (data.pvpEnabled ? "§cON" : "§aOFF"));
}).setName("friendpvp");

// --- 4. GESTION DES POUVOIRS (FREEZE & ANTI-HIT) ---
register("tick", () => {
    if (!World.isLoaded()) return;
    
    // 1. Détection Paralysie (Quand on prend un coup)
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
            paralysisTimer = 100; // 5 secondes de freeze renouvelables
            World.playSound("ambient.weather.thunder", 100, 0.5);
            Client.showTitle("§4§lPARALYSÉ", "§cUn Dieu t'a touché !", 0, 40, 10);
        }
    }
    hpCache = hp;

    // 2. Application du Freeze
    if (isParalyzed) {
        if (paralysisTimer > 0 && Player.getHP() > 0) {
            paralysisTimer--;
            let p = Player.getPlayer();
            p.field_70159_w = 0; // MotionX
            p.field_70179_y = 0; // MotionZ
            if (p.field_70181_x > 0) p.field_70181_x = 0; // Jump
            actionBarMsg = "§4§lTu es gelé par la puissance divine...";
            actionBarTimer = 5;
        } else {
            isParalyzed = false;
        }
    }
});

// 3. Protection quand ON tape
register("attackEntity", (entity, event) => {
    let name = ChatLib.removeFormatting(entity.getName());
    let st = getStatus(name);

    if (st === "LEGENDARY") {
        cancel(event);
        World.playSound("mob.wither.idle", 100, 0.5);
        Player.getPlayer().field_70125_A = 90; // Regarde le sol
        Player.getPlayer().field_70177_z += 180; // Tourne le dos
        actionBarMsg = "§4§l☠ IL EST INTUABLE ☠"; actionBarTimer = 40;
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

// --- 5. VISUELS (TAB, ESP, RADAR) ---
register("renderOverlay", () => {
    if (actionBarTimer > 0) {
        let w = Renderer.screen.getWidth();
        Renderer.drawStringWithShadow(actionBarMsg, w/2 - Renderer.getStringWidth(actionBarMsg)/2, Renderer.screen.getHeight() - 70);
        actionBarTimer--;
    }
    if (isParalyzed) {
        Renderer.drawRect(Renderer.color(50, 0, 0, 80), 0, 0, Renderer.screen.getWidth(), Renderer.screen.getHeight());
    }
    
    // Alerte Proximité Dieu
    let w = Renderer.screen.getWidth();
    let godNear = false;
    World.getAllPlayers().forEach(p => {
        if(getStatus(p.getName()) === "LEGENDARY" && Player.asPlayerMP().distanceTo(p) < 25) godNear = true;
    });
    if(godNear) {
        let opacity = Math.abs(Math.sin(Date.now() / 300)) * 100;
        Renderer.drawRect(Renderer.color(255, 0, 0, opacity), 0, 0, w, Renderer.screen.getHeight());
        Renderer.drawStringWithShadow("§4§l⚠ PRÉSENCE DIVINE ⚠", w/2 - 60, 50);
    }
});

register("renderWorld", () => {
    if (!data.esp3D) return;
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (name === Player.getName()) return;
        let st = getStatus(name);
        
        if (st !== "NONE" && Player.asPlayerMP().distanceTo(p) < 60) {
            let txt = "§aAmi";
            let scale = 0.03;
            let h = 0.5;

            if (st === "TARGET") txt = "§c⚠ CIBLE ⚠";
            else if (st === "INVINCIBLE") txt = "§d§l🛡 GOD 🛡";
            else if (st === "LEGENDARY") {
                let role = getLegendaryRole(name);
                txt = "§4§l☠ " + role + " ☠";
                scale = 0.04; // Plus gros
                h = 0.8;
            }
            Tessellator.drawString(txt, p.getRenderX(), p.getRenderY() + p.getHeight() + h, p.getRenderZ(), 0, true, scale, false);
        }
    });
});

register("tick", () => {
    if (!World.isLoaded()) return;
    try {
        let sb = World.getWorld().func_96441_U();
        let tLeg = sb.func_96508_e("00_LEG") || sb.func_96527_f("00_LEG"); tLeg.func_96666_b("§4§lDieu §c");
        let tGod = sb.func_96508_e("01_GOD") || sb.func_96527_f("01_GOD"); tGod.func_96666_b("§d§lGod §d");
        let tFri = sb.func_96508_e("02_FRI") || sb.func_96527_f("02_FRI"); tFri.func_96666_b("§a§lFriend §a");
        let tTar = sb.func_96508_e("03_TAR") || sb.func_96527_f("03_TAR"); tTar.func_96666_b("§c§lTarget §c");

        let nh = Client.getMinecraft().func_147114_u();
        let it = nh.func_175106_d().iterator();
        
        while(it.hasNext()) {
            let info = it.next();
            let name = info.func_178845_a().getName();
            let st = getStatus(name);
            
            if (st !== "NONE") {
                let team = st==="LEGENDARY"?tLeg : st==="INVINCIBLE"?tGod : st==="TARGET"?tTar : tFri;
                let tName = st==="LEGENDARY"?"00_LEG" : st==="INVINCIBLE"?"01_GOD" : st==="TARGET"?"03_TAR" : "02_FRI";
                
                if (!team.func_96665_g().contains(name)) sb.func_151392_a(name, tName);
            }
        }
    } catch(e) {}
});
