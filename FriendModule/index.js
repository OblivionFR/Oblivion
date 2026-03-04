import PogObject from "PogData";

// --- SYSTEME DE MISE A JOUR AUTOMATIQUE ---
const VERSION = "4.5"; // À changer sur Github lors des prochaines MAJ
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

// --- CONFIGURATION ---
const prefix = "§2[Oblivion] ";
const data = new PogObject("GreenFriends", {
    friends:[],
    pvpEnabled: false,
    chatHighlight: true,
    esp3D: true,
    radar: true,
    proximityAlert: true,
    targetEsp: true // NOUVEAU: Encadre les ennemis en rouge
}, "data.json");

// --- DONNÉES CLOUD ---
let cloudFriends = [];
let cloudInvincibles = [];
let cloudTargets =[];
let cloudMotd = "";

let lastUpdate = 0;
let isUpdating = false;

let actionBarMsg = "";
let actionBarTimer = 0;
let alertedTargets =[];

// --- 1. SYSTÈME DE SYNCHRONISATION (10s) ---
register("step", () => {
    if (Date.now() - lastUpdate > 10000 && !isUpdating) {
        isUpdating = true;
        new Thread(() => {
            try {
                let t = "?t=" + Date.now();
                
                // On récupère et on FILTRE STRICTEMENT (>= 3 lettres) pour éviter les joueurs fantômes
                let f = FileLib.getUrlContent(GITHUB_BASE + "default_friend.txt" + t);
                if (f) cloudFriends = f.split("\n").map(s => s.replace(/\r/g, "").trim()).filter(s => s.length >= 3);

                let i = FileLib.getUrlContent(GITHUB_BASE + "invincible.txt" + t);
                if (i) cloudInvincibles = i.split("\n").map(s => s.replace(/\r/g, "").trim()).filter(s => s.length >= 3);

                let tg = FileLib.getUrlContent(GITHUB_BASE + "target.txt" + t);
                if (tg) cloudTargets = tg.split("\n").map(s => s.replace(/\r/g, "").trim()).filter(s => s.length >= 3);

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

// Fonction de vérification de grade
function getStatus(name) {
    if (!name) return "NONE";
    let lower = ChatLib.removeFormatting(name).toLowerCase();
    
    // Priorité absolue : Invincibles > Targets > Friends
    if (cloudInvincibles.some(i => i.toLowerCase() === lower)) return "INVINCIBLE";
    if (cloudTargets.some(t => t.toLowerCase() === lower)) return "TARGET";
    if (data.friends.some(f => f.toLowerCase() === lower) || cloudFriends.some(f => f.toLowerCase() === lower)) return "FRIEND";
    return "NONE";
}

// --- 2. COMMANDES (FINI LE GUI !) ---
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
        if (!data.friends.includes(pseudo)) {
            data.friends.push(pseudo); data.save();
            ChatLib.chat(prefix + "§a" + pseudo + " ajouté !");
            World.playSound("random.orb", 1, 1);
        } else {
            ChatLib.chat(prefix + "§cDéjà dans la liste.");
        }
    } 
    else if (action === "remove" && pseudo) {
        data.friends = data.friends.filter(f => f.toLowerCase() !== pseudo.toLowerCase());
        data.save();
        ChatLib.chat(prefix + "§c" + pseudo + " retiré.");
        World.playSound("random.break", 1, 1);
    } 
    else if (action === "list") {
        ChatLib.chat("§2Amis Locaux: §f" + (data.friends.length > 0 ? data.friends.join(", ") : "Aucun"));
        ChatLib.chat("§6Serveur Cloud:");
        ChatLib.chat(" §a- Amis: §f" + cloudFriends.length);
        ChatLib.chat(" §d- Invincibles (GOD): §f" + cloudInvincibles.length);
        ChatLib.chat(" §c- Cibles (Targets): §f" + cloudTargets.length);
    } 
    else if (action === "toggle" && pseudo) {
        let opt = pseudo.toLowerCase();
        if (opt === "pvp") { data.pvpEnabled = !data.pvpEnabled; ChatLib.chat(prefix + "PvP: " + data.pvpEnabled); }
        else if (opt === "radar") { data.radar = !data.radar; ChatLib.chat(prefix + "Radar: " + data.radar); }
        else if (opt === "esp") { data.esp3D = !data.esp3D; ChatLib.chat(prefix + "ESP: " + data.esp3D); }
        else if (opt === "alert") { data.proximityAlert = !data.proximityAlert; ChatLib.chat(prefix + "Alerte: " + data.proximityAlert); }
        else ChatLib.chat("§cOptions valides : pvp, radar, esp, alert");
        data.save();
    }
}).setName("localfriend").setAliases("lf");

// Retour du /friendpvp officiel
register("command", () => {
    data.pvpEnabled = !data.pvpEnabled;
    data.save();
    ChatLib.chat(prefix + (data.pvpEnabled ? "§cPvP Ami ACTIVÉ §7(Danger)" : "§aPvP Ami DÉSACTIVÉ §7(Sécurisé)"));
}).setName("friendpvp");

// --- 3. PROTECTION PVP ABSOLUE ---
register("attackEntity", (entity, event) => {
    let name = ChatLib.removeFormatting(entity.getName());
    let st = getStatus(name);

    if (st === "INVINCIBLE") {
        cancel(event);
        World.playSound("mob.enderdragon.hit", 100, 0.5);
        actionBarMsg = "§4§l🛡 JOUEUR INVINCIBLE (OBLIVION) 🛡";
        actionBarTimer = 40;
    } else if (st === "FRIEND" && !data.pvpEnabled) {
        cancel(event);
        World.playSound("random.anvil_land", 100, 0.5);
        actionBarMsg = "§c§l❌ NE TAPE PAS TON AMI ❌";
        actionBarTimer = 40;
    }
});

// --- 4. VISUELS (RADAR, ESP, ALERTE PROXIMITÉ) ---
register("renderOverlay", () => {
    // Action Bar
    if (actionBarTimer > 0) {
        Renderer.drawStringWithShadow(actionBarMsg, (Renderer.screen.getWidth()/2) - (Renderer.getStringWidth(actionBarMsg)/2), Renderer.screen.getHeight() - 60);
        actionBarTimer--;
    }

    // Radar 2D
    if (!data.radar) return;
    let rx = 70, ry = 70, s = 50;
    Renderer.drawRect(Renderer.color(0, 0, 0, 150), rx - s, ry - s, s * 2, s * 2);
    Renderer.drawRect(Renderer.color(255, 255, 255, 255), rx - 1, ry - 1, 2, 2);

    let yaw = Player.getYaw();
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (name === Player.getName()) return;
        
        let st = getStatus(name);
        if (st === "NONE") return;

        let dx = p.getX() - Player.getX();
        let dz = p.getZ() - Player.getZ();
        
        let cos = Math.cos(yaw * (Math.PI / 180));
        let sin = Math.sin(yaw * (Math.PI / 180));
        
        let rotX = -(dx * cos - dz * sin);
        let rotY = -(dx * sin + dz * cos);
        
        let drawX = rotX * 1.5;
        let drawY = rotY * 1.5;
        
        if (Math.sqrt(drawX*drawX + drawY*drawY) < s) {
            let isBlinking = (Date.now() % 600 < 300);
            let color = Renderer.color(0, 255, 0);
            if (st === "INVINCIBLE") color = Renderer.color(180, 0, 255);
            if (st === "TARGET") color = isBlinking ? Renderer.color(255, 0, 0) : Renderer.color(0, 0, 0, 0);

            if (st !== "TARGET" || isBlinking) {
                Renderer.drawRect(color, rx + drawX - 1.5, ry + drawY - 1.5, 3, 3);
            }
        }
    });
    Renderer.drawStringWithShadow("§7Radar Oblivion", rx - 35, ry + s + 2);
});

// Alerte Proximité
register("step", () => {
    if (!data.proximityAlert) return;
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (getStatus(name) === "TARGET") {
            let dist = Player.asPlayerMP().distanceTo(p);
            if (dist < 15 && !alertedTargets.includes(name)) {
                Client.showTitle("§c§l⚠ ENNEMI PROCHE ⚠", "§f" + name + " est à " + Math.round(dist) + "m !", 0, 40, 10);
                World.playSound("note.bass", 1, 0.5);
                alertedTargets.push(name);
            } else if (dist >= 20 && alertedTargets.includes(name)) {
                alertedTargets = alertedTargets.filter(n => n !== name);
            }
        }
    });
}).setFps(2);

// ESP 3D & HITBOX POUR LES TARGETS
register("renderWorld", () => {
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (name === Player.getName()) return;
        
        let st = getStatus(name);
        if (st === "NONE") return;

        // Si ESP 3D activé, afficher les textes au-dessus de la tête
        if (data.esp3D && Player.asPlayerMP().distanceTo(p) < 60) {
            let txt = "§a★ AMI ★";
            if (st === "INVINCIBLE") txt = "§d§l🛡 GOD 🛡";
            if (st === "TARGET") txt = "§c§l⚠ TARGET ⚠";
            Tessellator.drawString(txt, p.getRenderX(), p.getRenderY() + p.getHeight() + 0.5, p.getRenderZ(), 0, true, 0.03, false);
        }

        // NOUVEAUTÉ : HITBOX ROUGE autour des targets (Cibles)
        if (data.targetEsp && st === "TARGET" && Player.asPlayerMP().distanceTo(p) < 80) {
            Tessellator.begin(3).lineWidth(3).colorize(1, 0, 0, 1);
            RenderLib.drawEspBox(p.getRenderX(), p.getRenderY(), p.getRenderZ(), p.getWidth(), p.getHeight(), 1, 0, 0, 0.3, false);
        }
    });
});

// --- 5. TABLIST & CHAT HIGHLIGHT ---
register("tick", () => {
    if (!World.isLoaded()) return;
    try {
        let sb = World.getWorld().func_96441_U();
        
        let tGod = sb.func_96508_e("0_GOD") || sb.func_96527_f("0_GOD"); tGod.func_96666_b("§d§lGod §r§d");
        let tFriend = sb.func_96508_e("1_FRIEND") || sb.func_96527_f("1_FRIEND"); tFriend.func_96666_b("§a§lFriend §r§a");
        let tTarget = sb.func_96508_e("2_TARGET") || sb.func_96527_f("2_TARGET"); tTarget.func_96666_b("§c§lTarget §r§c");

        let netHandler = Client.getMinecraft().func_147114_u();
        let iterator = netHandler.func_175106_d().iterator();

        let ChatComponentText = Java.type("net.minecraft.util.ChatComponentText");

        while (iterator.hasNext()) {
            let info = iterator.next();
            let name = info.func_178845_a().getName();
            let st = getStatus(name);
            
            if (st !== "NONE") {
                let teamName = st === "INVINCIBLE" ? "0_GOD" : (st === "FRIEND" ? "1_FRIEND" : "2_TARGET");
                let teamObj = st === "INVINCIBLE" ? tGod : (st === "FRIEND" ? tFriend : tTarget);
                let colorPrefix = st === "INVINCIBLE" ? "§d" : (st === "FRIEND" ? "§a" : "§c");

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
    if (!data.chatHighlight) return;
    let msg = ChatLib.getChatMessage(event);
    let clean = ChatLib.removeFormatting(msg);
    let all =[...data.friends, ...cloudFriends, ...cloudInvincibles, ...cloudTargets];
    
    all.forEach(f => {
        if (clean.indexOf(f + ":") != -1 || clean.indexOf(f + ">") != -1) {
            cancel(event);
            let st = getStatus(f);
            let color = st === "TARGET" ? "§c§l" : (st === "INVINCIBLE" ? "§d§l" : "§a§l");
            ChatLib.chat(msg.replace(f, color + f + "§r"));
            if (st !== "TARGET") World.playSound("note.pling", 1, 2);
        }
    });
});
