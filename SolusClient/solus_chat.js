const S = global.Solus;

// Commande suppression
register("command", (id) => { if (id) ChatLib.deleteChat(parseInt(id)); }).setName("solusdel");

// Utilitaire pour l'heure
function getTime() {
    let d = new Date();
    let h = d.getHours().toString().padStart(2, '0');
    let m = d.getMinutes().toString().padStart(2, '0');
    return `§8[${h}:${m}] `;
}

// Fonction pour récupérer l'UUID de manière sûre (pour lien NameMC)
function getPlayerUUID(name) {
    // Essayer de trouver le joueur dans le monde pour avoir son UUID
    let p = World.getPlayerByName(name);
    if (p) return p.getUUID().toString();
    // Si pas trouvé (joueur hors range), on ne met pas de lien (trop lourd de fetch API Mojang)
    return null; 
}

register("chat", (event) => {
    // 1. Anti-boucle
    let formatted = ChatLib.getChatMessage(event, true);
    if (formatted.includes("§c[✖]") || formatted.includes("§8[")) return; 

    let unformatted = ChatLib.getChatMessage(event, false);
    let cleanMsg = ChatLib.removeFormatting(unformatted);
    let lowerMsg = cleanMsg.toLowerCase();

    // 2. FILTRES & MUTES
    if (S.config.chatFilter && S.cloud.filters.length > 0) {
        for (let regexStr of S.cloud.filters) {
            try { if (new RegExp(regexStr, "i").test(cleanMsg)) { cancel(event); return; } } catch(e) {}
        }
    }
    for (let b of S.cloud.blacklist) {
        if (lowerMsg.includes(b.toLowerCase()) && lowerMsg.indexOf(b.toLowerCase()) < 20) { cancel(event); return; }
    }
    for (let k in S.config.muted) {
        if (lowerMsg.includes(k) && lowerMsg.indexOf(k) < 20) { cancel(event); return; }
    }

    // 3. RECONSTRUCTION DU MESSAGE
    cancel(event); 
    let msgId = 40000 + Math.floor(Math.random() * 50000); 
    let finalMsg = new Message();

    // A. CROIX DE SUPPRESSION
    if (S.config.chatDelete) {
        let del = new TextComponent("§c[✖] ");
        del.setClick("run_command", "/solusdel " + msgId).setHover("show_text", "§cSupprimer");
        finalMsg.addTextComponent(del);
    }

    // B. HORODATAGE (Timestamp)
    if (S.config.timestamps) {
        finalMsg.addTextComponent(new TextComponent(getTime()));
    }

    // C. ANALYSE ET MODIFICATION DU TEXTE
    // On split par espace pour analyser les mots (pseudos)
    let parts = formatted.split(" ");
    
    parts.forEach((part, index) => {
        // Nettoyage pour trouver le pseudo pur
        let cleanWord = ChatLib.removeFormatting(part).replace(/[^a-zA-Z0-9_]/g, ""); 
        
        // Est-ce un joueur connu du Cloud ou un Ami ?
        let st = S.getStatus(cleanWord);
        let uuid = getPlayerUUID(cleanWord);
        
        if (st !== "NONE") {
            let badge = "";
            let color = "§7";
            let roleName = "Joueur";

            if (st === "TARGET") { 
                badge = "§c[CIBLE] "; color = "§c"; roleName = "Ennemi Faction";
                if (!part.includes("§c")) World.playSound("note.pling", 1, 2); 
            }
            else if (st === "INVINCIBLE") { badge = "§d[GOD] "; color = "§d"; roleName = "Invincible"; }
            else if (st === "LEGENDARY") { badge = "§4[DIEU] "; color = "§4"; roleName = S.getRole(cleanWord); }
            else if (st === "FRIEND") { badge = "§a[AMI] "; color = "§a"; roleName = "Ami"; }

            // Création du composant interactif
            // On enlève la couleur d'origine du serveur pour mettre la notre
            let displayPart = part.replace(cleanWord, color + cleanWord + "§r");
            
            // Si on ajoute un badge, on le met devant
            if (badge !== "") displayPart = badge + displayPart;

            let comp = new TextComponent(displayPart + " ");
            
            // Interaction au survol
            let hoverText = `§b§lSolus Info\n${color}Grade: §f${roleName}`;
            if (uuid) hoverText += `\n§7Clique pour ouvrir NameMC`;
            else hoverText += `\n§8(UUID non trouvé)`;
            
            comp.setHover("show_text", hoverText);

            // Interaction au clic (NameMC)
            if (uuid) {
                comp.setClick("open_url", "https://namemc.com/profile/" + uuid);
            }

            finalMsg.addTextComponent(comp);
        } 
        else {
            // Joueur normal ou texte normal
            // On vérifie quand même si c'est un joueur pour le lien NameMC (optionnel, mais cool)
            if (uuid && cleanWord.length > 2) {
                let comp = new TextComponent(part + " ");
                comp.setHover("show_text", "§7Clique pour ouvrir NameMC de §f" + cleanWord);
                comp.setClick("open_url", "https://namemc.com/profile/" + uuid);
                finalMsg.addTextComponent(comp);
            } else {
                finalMsg.addTextComponent(part + " ");
            }
        }
    });

    finalMsg.setChatLineId(msgId);
    ChatLib.chat(finalMsg);
});
