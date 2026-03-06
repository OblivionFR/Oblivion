const S = global.Solus;

// Commande suppression
register("command", (id) => {
    if (id) ChatLib.deleteChat(parseInt(id));
}).setName("solusdel");

register("chat", (event) => {
    // Eviter boucle infinie
    let formatted = ChatLib.getChatMessage(event, true);
    if (formatted.includes("§c[✖]")) return; 

    let unformatted = ChatLib.getChatMessage(event, false);
    let cleanMsg = ChatLib.removeFormatting(unformatted);
    let lowerMsg = cleanMsg.toLowerCase();

    // 1. FILTRE CLOUD (Regex)
    if (S.config.chatFilter && S.cloud.filters.length > 0) {
        for (let regexStr of S.cloud.filters) {
            try {
                if (new RegExp(regexStr, "i").test(cleanMsg)) { cancel(event); return; }
            } catch(e) {}
        }
    }

    // 2. CHECK MUTES (Blacklist & Local)
    for (let b of S.cloud.blacklist) {
        if (lowerMsg.includes(b.toLowerCase()) && lowerMsg.indexOf(b.toLowerCase()) < 20) { cancel(event); return; }
    }
    for (let k in S.config.muted) {
        if (lowerMsg.includes(k) && lowerMsg.indexOf(k) < 20) { cancel(event); return; }
    }

    // 3. RECONSTRUCTION DU MESSAGE AVEC LA CROIX
    cancel(event); 
    
    let msgId = 50000 + Math.floor(Math.random() * 50000); 
    let finalMsg = new Message();

    // AJOUT DE LA CROIX (Si option active)
    if (S.config.chatDelete) {
        let delComponent = new TextComponent("§c[✖] §r");
        delComponent.setClick("run_command", "/solusdel " + msgId);
        delComponent.setHover("show_text", "§cSupprimer ce message");
        finalMsg.addTextComponent(delComponent);
    }

    // AJOUT DU CONTENU (Avec couleurs amis/targets)
    let parts = formatted.split(" ");
    
    // On prépare la liste des gens à highlight
    let allSpecial = [];
    if (S.config.chatHighlight) {
        allSpecial = [...S.config.friends, ...S.cloud.friends, ...S.cloud.invincibles, ...S.cloud.targets];
        S.cloud.legendaries.forEach(l => allSpecial.push(l.pseudo));
    }

    parts.forEach(part => {
        // Est-ce qu'on doit colorier ce mot ?
        let wordClean = ChatLib.removeFormatting(part).replace(/[^a-zA-Z0-9_]/g, "");
        if (S.config.chatHighlight && wordClean.length > 2) {
            let st = S.getStatus(wordClean);
            if (st !== "NONE") {
                let col = "§a§l";
                if (st === "TARGET") { col = "§c§l"; if (!part.includes("§c")) World.playSound("note.pling", 1, 2); }
                else if (st === "INVINCIBLE") col = "§d§l";
                else if (st === "LEGENDARY") col = "§4§l☠ ";
                
                // Remplace la couleur
                part = part.replace(wordClean, col + wordClean + "§r");
            }
        }
        finalMsg.addTextComponent(part + " ");
    });

    finalMsg.setChatLineId(msgId);
    ChatLib.chat(finalMsg);
});
