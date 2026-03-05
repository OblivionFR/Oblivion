const S = global.Solus;

// Commande cachée utilisée par la croix pour supprimer un msg
register("command", (id) => {
    if (id) ChatLib.deleteChat(parseInt(id));
}).setName("solusdel");

register("chat", (event) => {
    // 1. Empêcher la boucle infinie (si le message vient de nous avec déjà la croix)
    let formatted = ChatLib.getChatMessage(event, true);
    if (formatted.includes("§c[✖]")) return; 

    let unformatted = ChatLib.getChatMessage(event, false);
    let cleanMsg = ChatLib.removeFormatting(unformatted);
    let lowerMsg = cleanMsg.toLowerCase();

    // 2. CHECK MUTES (Local + Cloud Blacklist)
    for (let b of S.cloud.blacklist) {
        if (lowerMsg.includes(b.toLowerCase()) && lowerMsg.indexOf(b.toLowerCase()) < 15) { cancel(event); return; }
    }
    for (let k in S.config.muted) {
        if (lowerMsg.includes(k) && lowerMsg.indexOf(k) < 15) { cancel(event); return; }
    }

    // 3. CHECK FILTRES CLOUD (Regex d'insultes/pubs)
    if (S.config.chatFilter && S.cloud.filters.length > 0) {
        // On teste chaque regex du fichier chat_filter.txt
        for (let regexStr of S.cloud.filters) {
            try {
                let regex = new RegExp(regexStr, "i");
                if (regex.test(cleanMsg)) {
                    cancel(event);
                    return; // Message bloqué
                }
            } catch(e) {}
        }
    }

    // 4. MODIFICATION DU MESSAGE (Croix + Couleurs)
    cancel(event); // On annule l'original pour afficher notre version modifiée

    let msgId = 50000 + Math.floor(Math.random() * 10000); // ID unique
    let finalMsg = new Message();

    // Ajouter la croix si activée
    if (S.config.chatDelete) {
        let delComponent = new TextComponent("§c[✖] §r");
        delComponent.setClick("run_command", "/solusdel " + msgId);
        delComponent.setHover("show_text", "§cSupprimer ce message");
        finalMsg.addTextComponent(delComponent);
    }

    // Ajouter le contenu avec Highlight des amis/ennemis
    // On découpe par espace pour colorier les pseudos
    let parts = formatted.split(" ");
    
    // Liste de tous les pseudos spéciaux
    let allSpecial = [...S.config.friends, ...S.cloud.friends, ...S.cloud.invincibles, ...S.cloud.targets];
    S.cloud.legendaries.forEach(l => allSpecial.push(l.pseudo));

    parts.forEach(part => {
        let wordClean = ChatLib.removeFormatting(part).replace(/[^a-zA-Z0-9_]/g, ""); // Nettoyage ponctuation
        let st = S.getStatus(wordClean);
        
        if (st !== "NONE") {
            let col = "§a§l";
            if (st === "TARGET") { col = "§c§l"; if (!part.includes("§c")) World.playSound("note.pling", 1, 2); } // Son si target parle
            else if (st === "INVINCIBLE") col = "§d§l";
            else if (st === "LEGENDARY") col = "§4§l☠ ";
            
            // Remplace la couleur d'origine du pseudo par la nôtre
            // On garde le "part" original pour conserver les grades/symboles collés
            // Mais on injecte la couleur juste avant le pseudo
            part = part.replace(wordClean, col + wordClean + "§r");
        }
        finalMsg.addTextComponent(part + " ");
    });

    finalMsg.setChatLineId(msgId);
    ChatLib.chat(finalMsg);
});
