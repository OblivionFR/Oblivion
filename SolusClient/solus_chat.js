const S = global.Solus;

// Commande cachée pour supprimer le message
register("command", (id) => {
    if (id) {
        ChatLib.deleteChat(parseInt(id));
    }
}).setName("solusdelmsg");

register("chat", (event) => {
    // 1. Empêcher la boucle infinie (si le message vient de nous-même)
    let formatted = ChatLib.getChatMessage(event, true);
    if (formatted.includes("§c[✖]")) return; 

    let unformatted = ChatLib.getChatMessage(event, false);
    let cleanMsg = ChatLib.removeFormatting(unformatted);

    // 2. FILTRE CLOUD (Regex)
    if (S.config.chatFilter && S.cloud.filters.length > 0) {
        // Vérifie si le message contient une insulte/lien/ip
        // On vérifie si c'est un message de joueur (contient ":") pour ne pas filtrer les messages du serveur
        if (cleanMsg.includes(":")) {
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
    }

    // 3. CROIX DE SUPPRESSION
    if (S.config.chatDelete) {
        cancel(event); // On annule le message original pour le réécrire
        
        let msgId = 42000 + Math.floor(Math.random() * 9999); // ID unique pour la suppression
        
        // Création du composant Croix
        let delComponent = new TextComponent("§c[✖] §r");
        delComponent.setClick("run_command", "/solusdelmsg " + msgId);
        delComponent.setHover("show_text", "§cClique pour supprimer ce message localement.");

        // Création du message complet
        let finalMsg = new Message(delComponent);
        
        // Ajout du message original (avec les couleurs d'origine)
        // On peut aussi en profiter pour appliquer l'Highlight des amis ici !
        let parts = formatted.split(" ");
        parts.forEach(word => {
            let cleanWord = ChatLib.removeFormatting(word);
            // Highlight Amis/Targets (intégré au module chat)
            if (S.config.chatHighlight) {
                let st = S.getStatus(cleanWord.replace(":", "").replace(">", ""));
                if (st !== "NONE") {
                    let col = st==="TARGET"?"§c§l" : st==="INVINCIBLE"?"§d§l" : st==="LEGENDARY"?"§4§l☠ " : "§b§l";
                    word = word.replace(cleanWord, col + cleanWord + "§r");
                }
            }
            finalMsg.addTextComponent(word + " ");
        });

        // Envoi du message modifié avec ID
        finalMsg.setChatLineId(msgId);
        ChatLib.chat(finalMsg);
    }

});
