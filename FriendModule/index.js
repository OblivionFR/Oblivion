import PogObject from "PogData";

// --- SYSTEME DE MISE A JOUR AUTOMATIQUE ---
const VERSION = "4.0"; // Change ça sur ton GitHub pour forcer les joueurs à se mettre à jour !
const GITHUB_URL_CODE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/FriendModule/index.js";

function checkUpdate() {
    new Thread(() => {
        try {
            let code = FileLib.getUrlContent(GITHUB_URL_CODE + "?t=" + Date.now());
            if (!code) return;
            let match = code.match(/const VERSION = "([0-9.]+)";/);
            if (match && match[1] !== VERSION) {
                ChatLib.chat("§2[Oblivion] §fMise à jour trouvée (v" + match[1] + ") ! Installation en cours...");
                FileLib.write("GreenFriends", "index.js", code);
                setTimeout(() => ChatLib.command("ct load", true), 2000);
            }
        } catch(e) {}
    }).start();
}
// Lancer la vérification au démarrage
checkUpdate();

// --- CONFIGURATION ---
const prefix = "§2[Oblivion] ";
const data = new PogObject("GreenFriends", {
    friends:[],
    pvpEnabled: false,
    chatHighlight: true,
    esp3D: true,
    radar: true,
    proximityAlert: true // Alerte quand une target s'approche
}, "data.json");

// --- DONNÉES CLOUD (Mémoire) ---
let cloudFriends =[];
let cloudInvincibles = [];
let cloudTargets =[];
let cloudMotd = "";
let lastUpdate = 0;
let isUpdating = false;

// Variables Interface & Alertes
const gui = new Gui();
let actionBarMsg = "";
let actionBarTimer = 0;
let guiInput = "";
let alertedTargets =[]; // Pour ne pas spammer l'alerte de proximité

// --- 1. SYSTÈME DE SYNCHRONISATION (10s) ---
register("step", () => {
    if (Date.now() - lastUpdate > 10000 && !isUpdating) {
        isUpdating = true;
        new Thread(() => {
            try {
                let time = "?t=" + Date.now();
                const baseUrl = "https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/FriendModule/";

                let f = FileLib.getUrlContent(baseUrl + "default_friend.txt" + time);
                if (f) cloudFriends = f.replace(/\r/g, "").split("\n").map(s => s.trim()).filter(s => s.length > 1);

                let i = FileLib.getUrlContent(baseUrl + "invincible.txt" + time);
                if (i) cloudInvincibles = i.replace(/\r/g, "").split("\n").map(s => s.trim()).filter(s => s.length > 1);

                let t = FileLib.getUrlContent(baseUrl + "target.txt" + time);
                if (t) cloudTargets = t.replace(/\r/g, "").split("\n").map(s => s.trim()).filter(s => s.length > 1);

                // NOUVEAU: Cloud MOTD (Message of the day)
                let m = FileLib.getUrlContent(baseUrl + "motd.txt" + time);
                if (m && m !== cloudMotd) {
                    cloudMotd = m;
                    ChatLib.chat("§6§m---------------------------------------------");
                    ChatLib.chat("§e§lAnnonce Oblivion : §f" + cloudMotd);
                    ChatLib.chat("§6§m---------------------------------------------");
                    World.playSound("random.levelup", 1, 1);
                }

                lastUpdate = Date.now();
            } catch(e) {}
            isUpdating = false;
        }).start();
    }
}).setFps(1);

// Fonctions de classification
function getStatus(name) {
    let lower = name.toLowerCase();
    if (cloudInvincibles.some(i => i.toLowerCase() === lower)) return "INVINCIBLE";
    if (cloudTargets.some(t => t.toLowerCase() === lower)) return "TARGET";
    if (data.friends.some(f => f.toLowerCase() === lower) || cloudFriends.some(f => f.toLowerCase() === lower)) return "FRIEND";
    return "NONE";
}

// --- 2. COMMANDES ---
register("command", (...args) => {
    if (!args || args.length === 0) return gui.open();
    let action = args[0].toLowerCase();
    let pseudo = args[1];

    if (action === "add" && pseudo) {
        if (!data.friends.includes(pseudo)) {
            data.friends.push(pseudo); data.save();
            ChatLib.chat(prefix + "§a" + pseudo + " ajouté !");
        }
    } else if (action === "remove" && pseudo) {
        data.friends = data.friends.filter(f => f.toLowerCase() !== pseudo.toLowerCase());
        data.save();
        ChatLib.chat(prefix + "§c" + pseudo + " retiré.");
    } else if (action === "list") {
        ChatLib.chat("§2Amis Locaux: §f" + data.friends.join(", "));
        ChatLib.chat("§6Stats Cloud: §a" + cloudFriends.length + " Amis §7| §d" + cloudInvincibles.length + " GOD §7| §c" + cloudTargets.length + " Cibles");
    } else {
        gui.open();
    }
}).setName("localfriend");

register("command", () => gui.open()).setName("friendgui");

// --- 3. INTERFACE GRAPHIQUE (GUI FIXÉ ET RÉPARÉ) ---
register("renderOverlay", () => {
    if (!gui.isOpen()) return;

    let cx = Renderer.screen.getWidth() / 2;
    let cy = Renderer.screen.getHeight() / 2;

    // Fond Principal
    Renderer.drawRect(Renderer.color(15, 15, 15, 240), cx - 120, cy - 140, 240, 280);
    Renderer.drawStringWithShadow("§2§lOblivion Manager §7(v" + VERSION + ")", cx - 60, cy - 130);

    // Section Amis
    Renderer.drawString("§aAmis Locaux:", cx - 110, cy - 100);
    let y = cy - 85;
    let displayList = data.friends.slice(0, 6); // Max 6 pour l'affichage
    displayList.forEach((f, i) => {
        Renderer.drawString("§f" + f, cx - 100, y);
        Renderer.drawRect(Renderer.color(200, 50, 50, 255), cx + 70, y - 2, 40, 11);
        Renderer.drawString("Suppr", cx + 75, y);
        y += 15;
    });

    // Ajout d'ami
    y = cy + 15;
    Renderer.drawString("§aAjouter:", cx - 110, y);
    Renderer.drawRect(Renderer.color(255, 255, 255, 30), cx - 60, y - 2, 120, 12);
    Renderer.drawString(guiInput + (Date.now() % 1000 < 500 ? "_" : ""), cx - 55, y);
    Renderer.drawRect(Renderer.color(50, 200, 50, 255), cx + 70, y - 2, 40, 12);
    Renderer.drawString("ADD", cx + 80, y);

    // Options
    y += 25;
    Renderer.drawString("§aOptions:", cx - 110, y);
    
    // Boutons On/Off (Mieux calculés)
    drawToggleBtn(cx - 110, cy + 50, 105, 15, "PvP Amis", data.pvpEnabled);
    drawToggleBtn(cx + 5, cy + 50, 105, 15, "Radar 2D", data.radar);
    drawToggleBtn(cx - 110, cy + 70, 105, 15, "ESP 3D", data.esp3D);
    drawToggleBtn(cx + 5, cy + 70, 105, 15, "Alerte Ennemi", data.proximityAlert);

    Renderer.drawString("§8Sync: " + cloudFriends.length + "F / " + cloudInvincibles.length + "I / " + cloudTargets.length + "T", cx - 60, cy + 115);
});

function drawToggleBtn(x, y, w, h, text, state) {
    Renderer.drawRect(state ? Renderer.color(50, 200, 50, 200) : Renderer.color(200, 50, 50, 200), x, y, w, h);
    Renderer.drawStringWithShadow("§f" + text + ": " + (state ? "ON" : "OFF"), x + 5, y + 4);
}

// Clics réparés avec les bonnes coordonnées
register("guiMouseClick", (mx, my, button) => {
    if (!gui.isOpen()) return;
    let cx = Renderer.screen.getWidth() / 2;
    let cy = Renderer.screen.getHeight() / 2;

    // Supprimer
    let listY = cy - 85;
    let displayList = data.friends.slice(0, 6);
    displayList.forEach((f, i) => {
        if (mx >= cx + 70 && mx <= cx + 110 && my >= listY - 2 && my <= listY + 9) {
            data.friends.splice(i, 1); data.save(); World.playSound("random.click", 1, 1);
        }
        listY += 15;
    });

    // Ajouter
    if (mx >= cx + 70 && mx <= cx + 110 && my >= cy + 13 && my <= cy + 25) {
        if (guiInput.length > 2 && !data.friends.includes(guiInput)) {
            data.friends.push(guiInput); data.save(); guiInput = ""; World.playSound("random.orb", 1, 1);
        }
    }

    // Toggles Options
    if (mx >= cx - 110 && mx <= cx - 5 && my >= cy + 50 && my <= cy + 65) { data.pvpEnabled = !data.pvpEnabled; data.save(); World.playSound("random.click", 1, 1); }
    if (mx >= cx + 5 && mx <= cx + 110 && my >= cy + 50 && my <= cy + 65) { data.radar = !data.radar; data.save(); World.playSound("random.click", 1, 1); }
    if (mx >= cx - 110 && mx <= cx - 5 && my >= cy + 70 && my <= cy + 85) { data.esp3D = !data.esp3D; data.save(); World.playSound("random.click", 1, 1); }
    if (mx >= cx + 5 && mx <= cx + 110 && my >= cy + 70 && my <= cy + 85) { data.proximityAlert = !data.proximityAlert; data.save(); World.playSound("random.click", 1, 1); }
});

register("guiKey", (char, key) => {
    if (!gui.isOpen()) return;
    if (key === 14 && guiInput.length > 0) guiInput = guiInput.slice(0, -1);
    else if (key === 28 && guiInput.length > 2) {
        if (!data.friends.includes(guiInput)) { data.friends.push(guiInput); data.save(); guiInput = ""; World.playSound("random.orb", 1, 1); }
    }
    else if (key !== 14 && key !== 28 && key !== 1 && key !== 42 && char.toString().length === 1) guiInput += char;
});

// --- 4. PROTECTION PVP ---
register("attackEntity", (entity, event) => {
    let name = ChatLib.removeFormatting(entity.getName());
    let status = getStatus(name);

    if (status === "INVINCIBLE") {
        cancel(event);
        World.playSound("mob.enderdragon.hit", 100, 0.5);
        actionBarMsg = "§4§l🛡 JOUEUR INVINCIBLE 🛡"; actionBarTimer = 40;
    } else if (status === "FRIEND" && !data.pvpEnabled) {
        cancel(event);
        World.playSound("random.anvil_land", 100, 0.5);
        actionBarMsg = "§c§l❌ AMI PROTEGÉ ❌"; actionBarTimer = 40;
    }
});

// --- 5. VISUELS (RADAR, ESP, ACTION BAR, PROXIMITÉ) ---
register("renderOverlay", () => {
    // Action Bar
    if (actionBarTimer > 0) {
        let w = Renderer.screen.getWidth();
        Renderer.drawStringWithShadow(actionBarMsg, (w/2) - (Renderer.getStringWidth(actionBarMsg)/2), Renderer.screen.getHeight() - 60);
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
            // Couleur : Vert(Ami), Violet/Or(Invincible), Rouge Clignotant(Target)
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

// Alerte Proximité Ennemi (Targets)
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
                alertedTargets = alertedTargets.filter(n => n !== name); // Reset quand il s'éloigne
            }
        }
    });
}).setFps(2);

// ESP 3D
register("renderWorld", () => {
    if (!data.esp3D) return;
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (name === Player.getName()) return;
        
        let st = getStatus(name);
        if (st === "NONE") return;

        let dist = Player.asPlayerMP().distanceTo(p);
        if (dist < 60) {
            let txt = "§a★ AMI ★";
            if (st === "INVINCIBLE") txt = "§d§l🛡 GOD 🛡";
            if (st === "TARGET") txt = "§c§l⚠ TARGET ⚠";
            Tessellator.drawString(txt, p.getRenderX(), p.getRenderY() + p.getHeight() + 0.5, p.getRenderZ(), 0, true, 0.03, false);
        }
    });
});

// --- 6. TABLIST & CHAT HIGHLIGHT ---
register("tick", () => {
    if (!World.isLoaded()) return;
    try {
        let sb = World.getWorld().func_96441_U();
        
        // Equipe 0: GOD, Equipe 1: Friend, Equipe 2: Target (Tri automatique par nom)
        let tGod = sb.func_96508_e("0_GOD") || sb.func_96527_f("0_GOD"); tGod.func_96666_b("§d§lGod §r§d");
        let tFriend = sb.func_96508_e("1_FRIEND") || sb.func_96527_f("1_FRIEND"); tFriend.func_96666_b("§a§lFriend §r§a");
        let tTarget = sb.func_96508_e("2_TARGET") || sb.func_96527_f("2_TARGET"); tTarget.func_96666_b("§c§lTarget §r§c");

        let netHandler = Client.getMinecraft().func_147114_u();
        let iterator = netHandler.func_175106_d().iterator();

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
                     info.func_178859_a(new TextComponent(colorPrefix + name));
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
