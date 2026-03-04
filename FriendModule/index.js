import PogObject from "PogData";

// --- CONFIGURATION ---
const prefix = "§2[LocalFriends] ";
const data = new PogObject("GreenFriends", {
    friends: [],
    pvpEnabled: false,
    chatHighlight: true,
    esp3D: true,
    radar: true // NOUVEAU : Radar 2D
}, "data.json");

// Listes en mémoire (Cloud)
let cloudFriends = [];
let cloudInvincibles = [];
let lastUpdate = 0;
let isUpdating = false;

// Variables GUI & Alertes
const gui = new Gui();
let actionBarMsg = "";
let actionBarTimer = 0;
let guiInput = "";

// --- 1. SYSTÈME DE SYNCHRONISATION (10s) ---
register("step", () => {
    // On vérifie toutes les 10 secondes (10000 ms)
    if (Date.now() - lastUpdate > 10000 && !isUpdating) {
        isUpdating = true;
        new Thread(() => {
            try {
                // Astuce : On ajoute ?t=Time pour éviter que le jeu garde le fichier en cache
                let timeParam = "?t=" + Date.now();
                
                // 1. Liste Amis par défaut
                let fRaw = FileLib.getUrlContent("https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/FriendModule/default_friend.txt" + timeParam);
                if (fRaw) {
                    cloudFriends = fRaw.replace(/\r/g, "").split("\n").map(s => s.trim()).filter(s => s.length > 1);
                }

                // 2. Liste Invincibles
                let iRaw = FileLib.getUrlContent("https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/FriendModule/invincible.txt" + timeParam);
                if (iRaw) {
                    cloudInvincibles = iRaw.replace(/\r/g, "").split("\n").map(s => s.trim()).filter(s => s.length > 1);
                }

                lastUpdate = Date.now();
            } catch(e) {
                // Erreur silencieuse (pas de connexion)
            }
            isUpdating = false;
        }).start();
    }
}).setFps(1);

// Fonction utilitaire pour avoir TOUS les amis (Locaux + Cloud)
function isFriend(name) {
    let lower = name.toLowerCase();
    return data.friends.some(f => f.toLowerCase() === lower) || cloudFriends.some(f => f.toLowerCase() === lower);
}

function isInvincible(name) {
    return cloudInvincibles.some(f => f.toLowerCase() === name.toLowerCase());
}

// --- 2. COMMANDES & GUI ---
register("command", (...args) => {
    if (!args || args.length === 0) {
        gui.open(); // Ouvre le GUI par défaut
    } else {
        let action = args[0].toLowerCase();
        if (action === "toggle") {
             // Commande rapide pour toggle des trucs
             if (args[1] === "radar") { data.radar = !data.radar; data.save(); ChatLib.chat(prefix + "Radar: " + data.radar); }
        } else {
            ChatLib.chat(prefix + "Ouvre le menu avec /localfriend ou /friendgui");
        }
    }
}).setName("localfriend");

register("command", () => gui.open()).setName("friendgui");

// Rendu du GUI
register("renderOverlay", () => {
    if (!gui.isOpen()) return;

    let w = Renderer.screen.getWidth();
    let h = Renderer.screen.getHeight();
    let cx = w / 2;
    let cy = h / 2;

    // Fond Noir
    Renderer.drawRect(Renderer.color(20, 20, 20, 230), cx - 100, cy - 150, 200, 300);
    
    // Titre
    Renderer.drawStringWithShadow("§2§lLocalFriends §7v3.0", cx - 40, cy - 140);
    
    // Liste des amis locaux
    Renderer.drawString("§aTes Amis (" + data.friends.length + ") :", cx - 90, cy - 120);
    
    let y = cy - 110;
    // On affiche max 8 amis pour que ça rentre, sinon ça dépasse (simple scroll non implémenté pour stabilité)
    let displayList = data.friends.slice(0, 8); 
    
    displayList.forEach((f, i) => {
        Renderer.drawString("§f- " + f, cx - 80, y);
        // Bouton Supprimer (Petit carré rouge)
        Renderer.drawRect(Renderer.color(200, 50, 50, 255), cx + 60, y, 20, 9);
        Renderer.drawString("X", cx + 66, y + 1);
        y += 12;
    });

    if (data.friends.length > 8) Renderer.drawString("§7...et " + (data.friends.length - 8) + " autres", cx - 80, y);

    // Zone d'ajout
    y = cy + 20;
    Renderer.drawString("§aAjouter un ami :", cx - 90, y);
    // Barre de texte
    Renderer.drawRect(Renderer.color(255, 255, 255, 50), cx - 90, y + 12, 140, 12);
    Renderer.drawString(guiInput + (Date.now() % 1000 < 500 ? "_" : ""), cx - 88, y + 14);
    // Bouton Add
    Renderer.drawRect(Renderer.color(50, 200, 50, 255), cx + 55, y + 12, 35, 12);
    Renderer.drawString("ADD", cx + 60, y + 14);

    // Options (Boutons)
    y += 40;
    Renderer.drawString("§aOptions :", cx - 90, y);
    
    // Toggle PvP
    let colorPvP = data.pvpEnabled ? Renderer.color(200, 50, 50, 200) : Renderer.color(50, 200, 50, 200);
    Renderer.drawRect(colorPvP, cx - 90, y + 15, 85, 15);
    Renderer.drawString("PvP: " + (data.pvpEnabled ? "ON" : "OFF"), cx - 70, y + 19);

    // Toggle ESP
    let colorESP = data.esp3D ? Renderer.color(50, 200, 50, 200) : Renderer.color(200, 50, 50, 200);
    Renderer.drawRect(colorESP, cx + 5, y + 15, 85, 15);
    Renderer.drawString("ESP: " + (data.esp3D ? "ON" : "OFF"), cx + 25, y + 19);

    // Toggle Radar
    let colorRadar = data.radar ? Renderer.color(50, 200, 50, 200) : Renderer.color(200, 50, 50, 200);
    Renderer.drawRect(colorRadar, cx - 90, y + 35, 180, 15);
    Renderer.drawString("Radar 2D: " + (data.radar ? "ON" : "OFF"), cx - 20, y + 39);

    // Infos Cloud
    Renderer.drawString("§7Cloud: " + cloudFriends.length + " amis, " + cloudInvincibles.length + " invincibles.", cx - 90, cy + 135);
});

// Interactions GUI
register("guiMouseClick", (x, y, button) => {
    if (!gui.isOpen()) return;
    let w = Renderer.screen.getWidth();
    let h = Renderer.screen.getHeight();
    let cx = w / 2;
    let cy = h / 2;

    // Clic Supprimer Ami
    let listY = cy - 110;
    let displayList = data.friends.slice(0, 8);
    displayList.forEach((f, i) => {
        if (x > cx + 60 && x < cx + 80 && y > listY && y < listY + 9) {
            data.friends.splice(i, 1); data.save(); World.playSound("random.click", 1, 1);
        }
        listY += 12;
    });

    // Clic Ajouter Ami
    if (x > cx + 55 && x < cx + 90 && y > cy + 32 && y < cy + 44) {
        if (guiInput.length > 1 && !data.friends.includes(guiInput)) {
            data.friends.push(guiInput); data.save(); guiInput = ""; World.playSound("random.orb", 1, 1);
        }
    }

    // Clic Options
    // PvP
    if (x > cx - 90 && x < cx - 5 && y > cy + 75 && y < cy + 90) {
        data.pvpEnabled = !data.pvpEnabled; data.save(); World.playSound("random.click", 1, 1);
    }
    // ESP
    if (x > cx + 5 && x < cx + 90 && y > cy + 75 && y < cy + 90) {
        data.esp3D = !data.esp3D; data.save(); World.playSound("random.click", 1, 1);
    }
    // Radar
    if (x > cx - 90 && x < cx + 90 && y > cy + 95 && y < cy + 110) {
        data.radar = !data.radar; data.save(); World.playSound("random.click", 1, 1);
    }
});

register("guiKey", (char, key, gui, event) => {
    if (!gui.isOpen()) return;
    // Gestion input texte basique
    if (key == 14 && guiInput.length > 0) guiInput = guiInput.slice(0, -1); // Backspace
    else if (key == 28 && guiInput.length > 1) { // Entrée
        if (!data.friends.includes(guiInput)) {
            data.friends.push(guiInput); data.save(); guiInput = ""; World.playSound("random.orb", 1, 1);
        }
    }
    else if (key != 14 && key != 28 && key != 42 && key != 15 && char.trim().length > 0 || char == "_") { // Lettres
        guiInput += char;
    }
});

// --- 3. PROTECTION PVP (PRIORITÉ ABSOLUE) ---
register("attackEntity", (entity, event) => {
    let target = ChatLib.removeFormatting(entity.getName());
    
    // 1. Check Invincible (GitHub) - BLOQUE TOUT, TOUT LE TEMPS
    if (isInvincible(target)) {
        cancel(event);
        World.playSound("mob.enderdragon.hit", 100, 0.5); // Son très grave
        actionBarMsg = "§4§l🛡 JOUEUR INVINCIBLE (OBLIVION) 🛡";
        actionBarTimer = 40;
        return;
    }

    // 2. Check Amis (Local + GitHub)
    // Si PvP activé, on laisse passer
    if (data.pvpEnabled) return; 

    if (isFriend(target)) {
        cancel(event);
        World.playSound("random.anvil_land", 100, 0.5);
        actionBarMsg = "§c§l❌ NE TAPE PAS TON AMI ❌";
        actionBarTimer = 40;
    }
});

// --- 4. VISUELS (ESP 3D, RADAR, ACTION BAR) ---

// Action Bar
register("renderOverlay", () => {
    if (actionBarTimer > 0) {
        let w = Renderer.screen.getWidth();
        let h = Renderer.screen.getHeight();
        let txtWidth = Renderer.getStringWidth(actionBarMsg);
        Renderer.drawStringWithShadow(actionBarMsg, (w/2) - (txtWidth/2), h - 60);
        actionBarTimer--;
    }
});

// ESP 3D
register("renderWorld", () => {
    if (!data.esp3D) return;
    
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (p.getName() === Player.getName()) return;

        if (isFriend(name) || isInvincible(name)) {
            let dist = Player.asPlayerMP().distanceTo(p);
            if (dist < 50) {
                let txt = isInvincible(name) ? "§4§l🛡 INVINCIBLE 🛡" : "§a§l★ AMI ★";
                Tessellator.drawString(txt, p.getRenderX(), p.getRenderY() + p.getHeight() + 0.5, p.getRenderZ());
            }
        }
    });
});

// NOUVEAU : RADAR 2D
register("renderOverlay", () => {
    if (!data.radar) return;
    
    // Config Radar
    let rx = 60; // Position X (Haut gauche)
    let ry = 60; // Position Y
    let size = 40; // Rayon
    
    // Fond Radar
    Renderer.drawRect(Renderer.color(0, 0, 0, 150), rx - size, ry - size, size * 2, size * 2);
    // Centre (Toi)
    Renderer.drawRect(Renderer.color(255, 255, 255, 255), rx - 1, ry - 1, 2, 2);

    let yaw = Player.getYaw();
    
    World.getAllPlayers().forEach(p => {
        let name = ChatLib.removeFormatting(p.getName());
        if (p.getName() === Player.getName()) return;

        if (isFriend(name) || isInvincible(name)) {
            // Maths pour position relative (On tourne selon où le joueur regarde)
            let dx = p.getX() - Player.getX();
            let dz = p.getZ() - Player.getZ();
            
            let cos = Math.cos(yaw * (Math.PI / 180));
            let sin = Math.sin(yaw * (Math.PI / 180));
            
            let rotX = -(dx * cos - dz * sin);
            let rotY = -(dx * sin + dz * cos);
            
            // Échelle (Zoom)
            let mapScale = 1.5; 
            let drawX = rotX * mapScale;
            let drawY = rotY * mapScale;
            
            // Limiter au cercle (Clamp)
            if (Math.sqrt(drawX*drawX + drawY*drawY) < size) {
                let color = isInvincible(name) ? Renderer.color(200, 0, 0, 255) : Renderer.color(0, 255, 0, 255);
                Renderer.drawRect(color, rx + drawX - 1, ry + drawY - 1, 3, 3);
            }
        }
    });
    
    Renderer.drawStringWithShadow("§7Radar", rx - 10, ry + size + 2);
});

// --- 5. TABLIST & CHAT ---
register("tick", () => {
    if (!World.isLoaded()) return;
    try {
        let sb = World.getWorld().func_96441_U();
        let team = sb.func_96508_e("000_FRIEND") || sb.func_96527_f("000_FRIEND");
        team.func_96666_b("§a§lFriend §r§a");
        
        let netHandler = Client.getMinecraft().func_147114_u();
        let playerMap = netHandler.func_175106_d(); 
        let iterator = playerMap.iterator();

        while (iterator.hasNext()) {
            let info = iterator.next();
            let name = info.func_178845_a().getName();
            
            if (isFriend(name) || isInvincible(name)) {
                if (!team.func_96665_g().contains(name)) sb.func_151392_a(name, "000_FRIEND");
                
                // Update Tab Visual
                let dName = info.func_178854_k();
                let prefix = isInvincible(name) ? "§4§lGOD §c" : "§a§lFriend §r§a";
                if (dName == null || dName.func_150254_d().indexOf(prefix) == -1) {
                     info.func_178859_a(new TextComponent(prefix + name));
                }
            }
        }
    } catch(e) {}
});

register("chat", (event) => {
    if (!data.chatHighlight) return;
    let msg = ChatLib.getChatMessage(event);
    let clean = ChatLib.removeFormatting(msg);
    
    // Check local et cloud
    let all = [...data.friends, ...cloudFriends, ...cloudInvincibles];
    
    all.forEach(f => {
        if (clean.indexOf(f + ":") != -1 || clean.indexOf(f + ">") != -1) {
            cancel(event);
            ChatLib.chat(msg.replace(f, "§a§l" + f + "§r"));
            World.playSound("note.pling", 1, 2);
        }
    });
});
