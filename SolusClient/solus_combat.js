const S = global.Solus;

let currentTarget = null;
let targetTimer = 0;

// --- 1. HITSOUND & TARGET TRACKER ---
register("attackEntity", (entity, event) => {
    // Vérifier si l'entité est bien un joueur
    if (entity.getClassName() === "EntityOtherPlayerMP") {
        let name = ChatLib.removeFormatting(entity.getName());
        let st = S.getStatus(name);
        
        // Ne pas tracker ou jouer de hitsound sur les Dieux/Invincibles, ou les Amis protégés
        if (st === "LEGENDARY" || st === "INVINCIBLE") return;
        if (st === "FRIEND" && !S.config.pvpEnabled) return;

        // Joue un HitSound satisfaisant
        World.playSound("random.successful_hit", 1, 1.2); 

        // Verrouille la cible pour le HUD
        currentTarget = entity;
        targetTimer = 100; // Reste affiché 5 secondes (100 ticks)
    }
});

register("tick", () => {
    // Fait baisser le timer de la cible
    if (targetTimer > 0) {
        targetTimer--;
        if (targetTimer <= 0 || !currentTarget || currentTarget.isDead()) {
            currentTarget = null;
        }
    }
});

// --- 2. HUD DE COMBAT ---
register("renderOverlay", () => {
    let w = Renderer.screen.getWidth();
    let h = Renderer.screen.getHeight();

    // A. Alerte Vie Faible (Moins de 4 cœurs / 8 HP)
    let hp = Player.getHP();
    if (hp > 0 && hp <= 8) {
        // Crée un clignotement
        let pulse = Math.abs(Math.sin(Date.now() / 200)) * 255;
        Renderer.drawStringWithShadow("§c§l⚠ VIE CRITIQUE - SOIGNE-TOI ⚠", w/2 - 80, h/2 - 40);
    }

    // B. Le Target Tracker (HUD Ennemi)
    if (currentTarget && targetTimer > 0) {
        let name = ChatLib.removeFormatting(currentTarget.getName());
        let dist = Math.round(Player.asPlayerMP().distanceTo(currentTarget));
        let st = S.getStatus(name);
        
        let color = "§e"; // Couleur Neutre (Joueur normal)
        let label = "Neutre";
        
        if (st === "TARGET") { color = "§c"; label = "Cible Cloud"; }
        else if (st === "FRIEND") { color = "§a"; label = "Allié"; }

        // Position à droite du viseur
        let startX = w/2 + 25;
        let startY = h/2 + 10;

        // Fond du HUD
        Renderer.drawRect(Renderer.color(20, 20, 25, 200), startX, startY, 130, 40);
        // Ligne de couleur selon le grade
        Renderer.drawRect(Renderer.color(200, 50, 50, 255), startX, startY, 130, 2); 
        
        // Informations
        Renderer.drawStringWithShadow("§7Cible : " + color + name, startX + 5, startY + 8);
        Renderer.drawStringWithShadow("§7Distance : §f" + dist + "m  §8[" + label + "]", startX + 5, startY + 20);
        
        // Barre de temps restante (se vide)
        let barW = (targetTimer / 100) * 126;
        Renderer.drawRect(Renderer.color(255, 255, 255, 100), startX + 2, startY + 35, barW, 2);
    }
});

// --- 3. KILL CONFIRM (LECTURE DU CHAT) ---
// En 1.8.9, la mort d'une entité multijoueur est parfois dure à capter. Lire le chat est plus fiable.
register("chat", (event) => {
    let msg = ChatLib.removeFormatting(ChatLib.getChatMessage(event, false));
    
    // Si on a une cible verrouillée
    if (currentTarget && targetTimer > 0) {
        let targetName = ChatLib.removeFormatting(currentTarget.getName());
        
        // Si un message de mort contient ton pseudo ET le pseudo de ta cible
        if (msg.includes(targetName) && msg.includes(Player.getName())) {
            // Affiche l'écran d'élimination
            Client.showTitle("§c§lÉLIMINÉ", "§f" + targetName, 0, 40, 10);
            World.playSound("random.levelup", 1, 1.5);
            
            // Réinitialise la cible
            currentTarget = null;
            targetTimer = 0;
        }
    }
});
