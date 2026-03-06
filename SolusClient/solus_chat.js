const S = global.Solus;

register("command", (id) => { if (id) ChatLib.deleteChat(parseInt(id)); }).setName("solusdel");

function getTime() {
    let d = new Date();
    return `§8[${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}] `;
}

register("chat", (event) => {
    let formatted = ChatLib.getChatMessage(event, true);
    if (formatted.includes("§c[✖]") || formatted.includes("§8[")) return; 

    let unformatted = ChatLib.getChatMessage(event, false);
    let cleanMsg = ChatLib.removeFormatting(unformatted);
    let lowerMsg = cleanMsg.toLowerCase();

    // On récupère juste le début du message (celui qui l'envoie) pour éviter de muter s'il est cité
    let prefixChat = lowerMsg.split(":")[0] || lowerMsg.split(">")[0] || lowerMsg;

    // MUTES CLOUD & LOCAL
    for (let b of S.cloud.blacklist) { if (prefixChat.includes(b.toLowerCase())) { cancel(event); return; } }
    for (let k in S.data.muted) { if (prefixChat.includes(k)) { cancel(event); return; } }

    // FILTRES CLOUD & LOCAL (Mots exacts uniquement, pour pas bloquer "L" dans "Salut")
    if (S.config.chatFilter) {
        let allFilters =[...S.cloud.filters, ...S.data.filters];
        for (let f of allFilters) {
            try {
                let regex = new RegExp("\\b" + f + "\\b", "i"); // \b = mot exact
                if (regex.test(cleanMsg)) { cancel(event); return; }
            } catch(e) {}
        }
    }

    // RECONSTRUCTION DU MESSAGE
    cancel(event); 
    let msgId = 40000 + Math.floor(Math.random() * 50000); 
    let finalMsg = new Message();

    if (S.config.chatDelete) {
        let del = new TextComponent("§c[✖] ");
        del.setClick("run_command", "/solusdel " + msgId).setHover("show_text", "§cSupprimer");
        finalMsg.addTextComponent(del);
    }
    if (S.config.timestamps) finalMsg.addTextComponent(new TextComponent(getTime()));

    // Ajout du texte original
    let finalString = formatted;
    
    // Highlight des pseudos
    if (S.config.chatHighlight) {
        let allSpecial =[...S.data.friends, ...S.cloud.friends, ...S.cloud.invincibles, ...S.cloud.targets];
        S.cloud.legendaries.forEach(l => allSpecial.push(l.pseudo));
        
        allSpecial.forEach(f => {
            if (f.length > 2 && cleanMsg.toLowerCase().includes(f.toLowerCase())) {
                let st = S.getStatus(f);
                if (st !== "NONE") {
                    let col = st==="TARGET"?"§c§l" : st==="INVINCIBLE"?"§d§l" : st==="LEGENDARY"?"§4§l☠ " : "§b§l";
                    let regex = new RegExp(f, "gi"); // Remplace sans faire attention aux majuscules
                    finalString = finalString.replace(regex, col + f + "§r");
                    if (st === "TARGET") World.playSound("note.pling", 1, 2);
                }
            }
        });
    }

    finalMsg.addTextComponent(finalString);
    finalMsg.setChatLineId(msgId);
    ChatLib.chat(finalMsg);
});
