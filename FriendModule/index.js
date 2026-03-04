import PogObject from "PogData";

// --- SYSTEME DE MISE A JOUR AUTOMATIQUE ---
const VERSION = "6.0"; 
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/FriendModule/";

function checkUpdate() {
    new Thread(() => {
        try {
            let code = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
            if (!code) return;
            let match = code.match(/const VERSION = "([0-9.]+)";/);
            if (match && match[1] !== VERSION) {
                ChatLib.chat("§2[Oblivion] §fMise à jour trouvée (v" + match[1] + ") ! Installation...");
                FileLib.write("GreenFriends", "index.js", code);
                setTimeout(() => ChatLib.command("ct load", true), 2000);
            }
        } catch(e) {}
    }).start();
}
checkUpdate();

// --- CONFIGURATION LOCALE ---
const prefix = "§2[Oblivion] ";
const data = new PogObject("GreenFriends", {
    friends:[],
    pvpEnabled: false,
    chatHighlight: true,
    esp3D: true,
    radar: true,
    proximityAlert: true
}, "data.json");

// --- DONNÉES CLOUD ---
let cloudFriends =[];
let cloudInvincibles = [];
let cloudTargets = [];
let cloudBlacklist =[];
let cloudLegendaries =[]; // NOUVEAU : Les Dieux (JSON)
let cloudMotd = "";
let cloudObjective = "";

let lastUpdate = 0;
let isUpdating = false;

let actionBarMsg = "";
let actionBarTimer = 0;
let alertedTargets =[];

// Variables des Pouvoirs
let isParalyzed = false;
let hpCache = 20;

// --- 1. SYSTÈME DE SYNCHRONISATION CLOUD (10s) ---
register("step", () => {
    if (Date.now() - lastUpdate > 10000 && !isUpdating) {
        isUpdating = true;
        new Thread(() => {
            try {
                let t = "?t=" + Date.now();
                
                // Amis, Invincibles, Targets, Blacklist
                let f = FileLib.getUrlContent(GITHUB_BASE + "default_friend.txt" + t);
                if (f) cloudFriends = f.split("\n").map(s => s.replace(/\r/g, "").trim()).filter(s => s.length >= 3);

                let i = FileLib.getUrlContent(GITHUB_BASE + "invincible.txt" + t);
                if (i) cloudInvincibles = i.split("\n").map(s => s.replace(/\r/g, "").trim()).filter(s => s.length >= 3);

                let tg = FileLib.getUrlContent(GITHUB_BASE + "target.txt" + t);
                if (tg) cloudTargets = tg.split("\n").map(s => s.replace(/\r/g, "").trim()).filter(s => s.length >= 3);

                let b = FileLib.getUrlContent(GITHUB_BASE + "blacklist.txt" + t);
                if (b) cloudBlacklist = b.split("\n").map(s => s.replace(/\r/g, "").trim()).filter(s => s.length >= 3);

                let obj = FileLib.getUrlContent(GITHUB_BASE + "objective.txt" + t);
                if (obj) cloudObjective = obj.replace(/\r/g, "").trim();

                // NOUVEAU : Téléchargement du JSON Légendaire
                let jsonRaw = FileLib.getUrlContent(GITHUB_BASE + "legendary_chars.json" + t);
                if (jsonRaw) {
                    let parsed = JSON.parse(jsonRaw);
                    if (parsed && parsed.admins) {
                        cloudLegendaries = parsed.admins;
                    }
                }

                let m = FileLib.getUrlContent(GITHUB_BASE + "motd.txt" + t);
                if (m) {
                    m = m.replace(/\r/g, "").trim();
                    if (m.length > 0 && m !== cloudMotd) {
                        cloudMotd = m;
                        ChatLib.chat("§6§m---------------------------------------------");
                        ChatLib.chat("§e§lAnnonce Oblivion : §f" + cloudMotd);
                        ChatLib.chat("§6§m---------------------------------------------");
                        World.playSound("random.levelup", 1, 1);
                    }
                }
                lastUpdate = Date.now();
            } catch(e) {}
            isUpdating = false;
        }).start();
    }
}).setFps(1);

// Hiérarchie Absolue des joueurs
function getStatus(name) {
    if (!name) return "NONE";
    let lower = ChatLib.removeFormatting(name).toLowerCase();
    
    // DIEUX > INVINCIBLES > TARGETS > AMIS
    if (cloudLegendaries.some(l => l.pseudo.toLowerCase() === lower)) return "LEGENDARY";
    if (cloudInvincibles.some(i => i.toLowerCase() === lower)) return "INVINCIBLE";
    if (cloudTargets.some(t => t.toLowerCase() === lower)) return "TARGET";
    if (data.friends.some(f => f.toLowerCase() === lower) || cloudFriends.some(f => f.toLowerCase() === lower)) return "FRIEND";
    return "NONE";
}

function getLegendaryData(name) {
    let lower = ChatLib.removeFormatting(name).toLowerCase();
    return cloudLegendaries.find(l => l.pseudo.toLowerCase() === lower);
}

// --- 2. COMMANDES ---
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§2§m---------------------------------------------");
        ChatLib.chat("§2§lOblivion Manager §7(v" + VERSION + ")");
        ChatLib.chat("§a/lf add <pseudo>    §7- Ajouter un ami local");
        ChatLib.chat("§a/lf remove <pseudo> §7- Retirer un ami local");
        ChatLib.chat("§a/lf list            §7- Voir toutes les listes");
        ChatLib.chat("§a/lf toggle <option> §7- pvp | radar | esp | alert");
        ChatLib.chat("§a/friendpvp          §7- Bloque/Débloque les coups");
        ChatLib.chat("§2§m---------------------------------------------");
        return;
    }
    
    let action = args[0].toLowerCase();
    let pseudo = args[1];

    if (action === "add" && pseudo) {
        if (!data.friends.includes(pseudo)) { data.friends.push(pseudo); data.save(); ChatLib.chat(prefix + "§a" + pseudo + " ajouté !"); World.playSound("random.orb", 1, 1); }
    } 
    else if (action === "remove" && pseudo) {
        data.friends = data.friends.filter(f => f.toLowerCase() !== pseudo.toLowerCase()); data.save(); ChatLib.chat(prefix + "§c" + pseudo + " retiré."); World.playSound("random.break", 1, 1);
    } 
    else if (action === "list") {
        ChatLib.chat("§2Amis Locaux: §f" + (data.friends.length > 0 ? data.friends.join(", ") : "Aucun"));
        ChatLib.chat("§6Serveur Cloud:");
        ChatLib.chat(" §c☠ Dieux Légendaires: §f" + cloudLegendaries.length);
        ChatLib.chat(" §a- Amis: §f" + cloudFriends.length);
        ChatLib.chat(" §d- Invincibles: §f" + cloudInvincibles.length);
        ChatLib.chat(" §c- Cibles (Targets): §f" + cloudTargets.length);
    } 
    else if (action === "toggle" && pseudo) {
        let opt = pseudo.toLowerCase();
        if (opt === "pvp") { data.pvpEnabled = !data.pvpEnabled; ChatLib.chat(prefix + "PvP: " + data.pvpEnabled); }
        else if (opt === "radar") { data.radar = !data.radar; ChatLib.chat(prefix + "Radar: " + data.radar); }
        else if (opt === "esp") { data.esp3D = !data.esp3D; ChatLib.chat(prefix + "ESP: " + data.esp3D); }
        else if (opt === "alert") { data.proximityAlert = !data.proximityAlert; ChatLib.chat(prefix + "Alerte: " + data.proximityAlert); }
        data.save();
    }
}).setName("localfriend").setAliases("lf");

register("command", () => {
    data.pvpEnabled = !data.pvpEnabled; data.save();
    ChatLib.chat(prefix + (data.pvpEnabled ? "§cPvP Ami ACTIVÉ" : "§aPvP Ami DÉSACTIVÉ"));
}).setName("friendpvp");

// --- 3. GESTION DES POUVOIRS ET DU PVP ---

// A. Détection Paralysie (Quand on se fait taper)
register("tick", () => {
    if (!World.isLoaded()) return;
    let currentHp = Player.getHP();
    
    // Si on a perdu de la vie
    if (currentHp < hpCache && currentHp > 0) {
        let hitByGod = false;
        World.getAllPlayers().forEach(p => {
            if (p.getName() !== Player.getName() && getStatus(p.getName()) === "LEGENDARY") {
                // Si un Dieu est à moins de 6 blocs quand on prend un dégât, c'est sûrement lui.
                if (Player.asPlayerMP().distanceTo(p) < 6) {
                    hitByGod = true;
                }
            }
        });
        
        // POUVOIR 1 : FREEZE INSTANTANÉ
        if (hitByGod && !isParalyzed) {
            isParalyzed = true;
            World.playSound("ambient.weather.thunder", 100, 0.5); // Gros tonnerre
            Client.showTitle("§4§lPARALYSÉ", "§cUn Dieu t'a frappé...", 0, 80, 20);
        }
    }
    hpCache = currentHp;

    // Application du Freeze
    if (isParalyzed) {
        if (Player.getHP() <= 0 || Player.asPlayerMP().isDead()) {
            isParalyzed = false; // Reset si on meurt
        } else {
            let p = Player.getPlayer();
            p.field_70159_w = 0; // Bloque vélocité X
            p.field_70179_y = 0; // Bloque vélocité Z
            if (p.field_70181_x > 0) p.field_70181_x = 0; // Bloque le saut, mais permet de tomber
            Client.getMinecraft().field_71439_g.field_70702_br = 0; // Empêche d'avancer
            Client.getMinecraft().field_71439_g.field_70701_bs = 0; // Empêche de strafe
        }
    }
});

// B. Protection Anti-Hit (Quand on essaie d'attaquer)
register("attackEntity", (entity, event) => {
    let name = ChatLib.removeFormatting(entity.getName());
    let st = getStatus(name);

    // POUVOIR 2 : CHÂTIMENT DE L'ARROGANCE
    if (st === "LEGENDARY") {
        cancel(event);
        World.playSound("mob.wither.spawn", 100, 1); // Son horrible
        // Force le joueur à regarder par terre et à se retourner (S'incliner)
        Player.getPlayer().field_70125_A = 90; // Pitch vers le bas
        Player.getPlayer().field_70177_z += 180; // Retournement à 180 degrés
        actionBarMsg = "§4§l☠ TU NE PEUX PAS DÉFIER UN DIEU ☠";
        actionBarTimer = 60;
        return;
    }

    if (st === "INVINCIBLE") {
        cancel(event);
        World.playSound("mob.enderdragon.hit", 100, 0.5);
        actionBarMsg = "§4§l🛡 JOUEUR INVINCIBLE 🛡"; actionBarTimer = 40;
    } else if (st === "FRIEND" && !data.pvpEnabled) {
        cancel(event);
        World.playSound("random.anvil_land", 100, 0.5);
        actionBarMsg = "§c§l❌ NE TAPE PAS TON AMI ❌"; actionBarTimer = 40;
    }
});

// --- 4. VISUELS (RADAR, ESP, AURA) ---
register("renderOverlay", () => {
    let w = Renderer.screen.getWidth();
    let h = Renderer.screen.getHeight();

    // POUVOIR 3 : AURA DE PEUR (Si un Dieu est proche)
    let godNearby = false;
    World.getAllPlayers().forEach(p => {
        if (p.getName() !== Player.getName() && getStatus(p.getName()) === "LEGENDARY" && Player.asPlayerMP().distanceTo(p) < 20) {
            godNearby = true;
        }
    });

    if (godNearby) {
        // Fait pulser un filtre rouge sang sur l'écran
        let opacity = Math.abs(Math.sin(Date.now() / 400)) * 60;
        Renderer.drawRect(Renderer.color(200, 0, 0, opacity), 0, 0, w, h);
        Renderer.drawStringWithShadow("§4§l☠ UNE PRÉSENCE DIVINE EST PROCHE ☠", w/2 - 110, 25);
    }

    // Overlay Freeze
    if (isParalyzed) {
        Renderer.drawRect(Renderer.color(50, 0, 0, 120), 0, 0, w, h); // Filtre sombre permanent
        Renderer.drawStringWithShadow("§4§l[!] CORPS PARALYSÉ [!]", w/2 - 65, h/2 + 30);
    }

    // Objectif Cloud
    if (cloudObjective.length > 0) Renderer.drawStringWithShadow("§6§l📌 Objectif : §e" + cloudObjective, 5, 5);

    // Action Bar
    if (actionBarTimer > 0) {
        Renderer.drawStringWithShadow(actionBarMsg, (w/2) - (Renderer.getStringWidth(actionBarMsg)/2), h - 60);
        actionBarTimer--;
    }

    // Radar 2D
    if (!data.radar) return;
    let rx = 70, ry = 70, s = 50;
    if (cloudObjective.length > 0) ry += 15; 
    
    Renderer.drawRect(Renderer.color(0, 0, 0, 150), rx - s, ry - s, s * 2, s * 2);
    Renderer.drawRect(Renderer.color(255, 255, 255, 255), rx - 1, ry - 1, 2, 2);

    let yaw = Player.getYaw();
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (name === Player.getName()) return;
        
        let st = getStatus(name);
        if (st === "NONE") return;

        let dx = p.getX() - Player.getX(); let dz = p.getZ() - Player.getZ();
        let cos = Math.cos(yaw * (Math.PI / 180)); let sin = Math.sin(yaw * (Math.PI / 180));
        let rotX = -(dx * cos - dz * sin); let rotY = -(dx * sin + dz * cos);
        let drawX = rotX * 1.5; let drawY = rotY * 1.5;
        
        if (Math.sqrt(drawX*drawX + drawY*drawY) < s) {
            let isBlinking = (Date.now() % 600 < 300);
            let color = Renderer.color(0, 255, 0); 
            if (st === "INVINCIBLE") color = Renderer.color(180, 0, 255);
            if (st === "LEGENDARY") color = isBlinking ? Renderer.color(0, 0, 0) : Renderer.color(255, 0, 0); // Noir/Rouge pour les Dieux
            if (st === "TARGET") color = isBlinking ? Renderer.color(255, 0, 0) : Renderer.color(0, 0, 0, 0);

            if (st !== "TARGET" || isBlinking) {
                Renderer.drawRect(color, rx + drawX - 1.5, ry + drawY - 1.5, 3, 3);
            }
        }
    });
    Renderer.drawStringWithShadow("§7Radar Oblivion", rx - 35, ry + s + 2);
});

// ESP 3D (Textes purs, 0 Crash)
register("renderWorld", () => {
    if (!data.esp3D) return;
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (name === Player.getName()) return;
        let st = getStatus(name);
        if (st === "NONE") return;

        if (Player.asPlayerMP().distanceTo(p) < 60) {
            let txt = "§a★ AMI ★";
            let scale = 0.03;
            let offset = 0.5;

            if (st === "TARGET") txt = "§c§l⚠ TARGET ⚠";
            else if (st === "INVINCIBLE") txt = "§d§l🛡 GOD 🛡";
            else if (st === "LEGENDARY") {
                let legData = getLegendaryData(name);
                let role = legData ? legData.role : "Dieu Inconnu";
                txt = "§4§l☠ LÉGENDE ☠\n§c§o" + role;
                offset = 0.8;
            }
            Tessellator.drawString(txt, p.getRenderX(), p.getRenderY() + p.getHeight() + offset, p.getRenderZ(), 0, true, scale, false);
        }
    });
});

// --- 5. TABLIST & MUTE GLOBAL ---
register("tick", () => {
    if (!World.isLoaded()) return;
    try {
        let sb = World.getWorld().func_96441_U();
        
        let tLeg = sb.func_96508_e("0_LEG") || sb.func_96527_f("0_LEG"); tLeg.func_96666_b("§4§k|§r §c§lDieu §4§k|§r §c");
        let tGod = sb.func_96508_e("1_GOD") || sb.func_96527_f("1_GOD"); tGod.func_96666_b("§d§lGod §r§d");
        let tFriend = sb.func_96508_e("2_FRIEND") || sb.func_96527_f("2_FRIEND"); tFriend.func_96666_b("§a§lFriend §r§a");
        let tTarget = sb.func_96508_e("3_TARGET") || sb.func_96527_f("3_TARGET"); tTarget.func_96666_b("§c§lTarget §r§c");

        let netHandler = Client.getMinecraft().func_147114_u();
        let iterator = netHandler.func_175106_d().iterator();
        let ChatComponentText = Java.type("net.minecraft.util.ChatComponentText");

        while (iterator.hasNext()) {
            let info = iterator.next();
            let name = info.func_178845_a().getName();
            let st = getStatus(name);
            
            if (st !== "NONE") {
                let teamName = "2_FRIEND"; let teamObj = tFriend; let colorPrefix = "§a";
                if (st === "LEGENDARY") { teamName = "0_LEG"; teamObj = tLeg; colorPrefix = "§c"; }
                else if (st === "INVINCIBLE") { teamName = "1_GOD"; teamObj = tGod; colorPrefix = "§d"; }
                else if (st === "TARGET") { teamName = "3_TARGET"; teamObj = tTarget; colorPrefix = "§c"; }

                if (!teamObj.func_96665_g().contains(name)) sb.func_151392_a(name, teamName);
                
                let dName = info.func_178854_k();
                if (dName == null || dName.func_150254_d().indexOf(colorPrefix) == -1) {
                     info.func_178859_a(new ChatComponentText(colorPrefix + name));
                }
            }
        }
    } catch(e) {}
});

register("chat", (event) => {
    let msg = ChatLib.getChatMessage(event);
    let clean = ChatLib.removeFormatting(msg);

    // CLOUD BLACKLIST (Mute des indésirables)
    for (let badGuy of cloudBlacklist) {
        if (clean.toLowerCase().includes(badGuy.toLowerCase())) {
            // Si le nom est au tout début de la phrase (c'est lui qui parle)
            if (clean.toLowerCase().indexOf(badGuy.toLowerCase()) < 15) {
                cancel(event);
                return;
            }
        }
    }

    if (!data.chatHighlight) return;
    let all =[...data.friends, ...cloudFriends, ...cloudInvincibles, ...cloudTargets, ...cloudLegendaries.map(l=>l.pseudo)];
    
    all.forEach(f => {
        if (clean.indexOf(f + ":") != -1 || clean.indexOf(f + ">") != -1) {
            cancel(event);
            let st = getStatus(f);
            let color = "§a§l";
            if (st === "TARGET") color = "§c§l";
            else if (st === "INVINCIBLE") color = "§d§l";
            else if (st === "LEGENDARY") color = "§4§l☠ "; // Chat exclusif pour les Dieux

            ChatLib.chat(msg.replace(f, color + f + "§r"));
            if (st !== "TARGET") World.playSound("note.pling", 1, 2);
        }
    });
});
