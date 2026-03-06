const S = global.Solus;

register("command", (id) => { if (id) ChatLib.deleteChat(parseInt(id)); }).setName("solusdel");

function getTime() {
    let d = new Date();
    return `§8[${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}] `;
}

function getPlayerUUID(name) {
    let p = World.getPlayerByName(name);
    return p ? p.getUUID().toString() : null; 
}

function checkFilter(message, filterStr) {
    try { if (new RegExp(filterStr, "i").test(message)) return true; } catch(e) {}
    return message.toLowerCase().includes(filterStr.toLowerCase());
}

register("chat", (event) => {
    let formatted = ChatLib.getChatMessage(event, true);
    if (formatted.includes("§c[✖]") || formatted.includes("§8[")) return; 

    let unformatted = ChatLib.getChatMessage(event, false);
    let cleanMsg = ChatLib.removeFormatting(unformatted);
    let lowerMsg = cleanMsg.toLowerCase();

    // FILTRES CLOUD & LOCAL
    if (S.config.chatFilter) {
        for (let f of S.cloud.filters) { if (checkFilter(cleanMsg, f)) { cancel(event); return; } }
        for (let f of S.data.filters) { if (checkFilter(cleanMsg, f)) { cancel(event); return; } }
    }

    // MUTES CLOUD & LOCAL
    for (let b of S.cloud.blacklist) { if (lowerMsg.includes(b.toLowerCase()) && lowerMsg.indexOf(b.toLowerCase()) < 20) { cancel(event); return; } }
    for (let k in S.data.muted) { if (lowerMsg.includes(k) && lowerMsg.indexOf(k) < 20) { cancel(event); return; } }

    // RECONSTRUCTION DU MESSAGE
    cancel(event); 
    let msgId = 40000 + Math.floor(Math.random() * 50000); 
    let finalMsg = new Message();

    if (S.config.chatDelete) {
        let del = new TextComponent("§c[✖] ");
        del.setClick("run_command", "/solusdel " + msgId).setHover("show_text", "§cSupprimer");
        finalMsg.addTextComponent(del);
    }
    if (S.config.timestamps) {
        finalMsg.addTextComponent(new TextComponent(getTime()));
    }

    let parts = formatted.split(" ");
    parts.forEach((part, index) => {
        let cleanWord = ChatLib.removeFormatting(part).replace(/[^a-zA-Z0-9_]/g, ""); 
        let st = S.getStatus(cleanWord);
        let uuid = getPlayerUUID(cleanWord);
        
        if (st !== "NONE") {
            let badge = "", color = "§7", roleName = "Joueur";
            if (st === "TARGET") { badge = "§c[CIBLE] "; color = "§c"; roleName = "Ennemi Faction"; if (!part.includes("§c")) World.playSound("note.pling", 1, 2); }
            else if (st === "INVINCIBLE") { badge = "§d[GOD] "; color = "§d"; roleName = "Invincible"; }
            else if (st === "LEGENDARY") { badge = "§4[DIEU] "; color = "§4"; roleName = S.getRole(cleanWord); }
            else if (st === "FRIEND") { badge = "§a[AMI] "; color = "§a"; roleName = "Ami"; }

            let displayPart = badge + part.replace(cleanWord, color + cleanWord + "§r");
            let comp = new TextComponent(displayPart + " ");
            
            let hTxt = `§b§lSolus Info\n${color}Grade: §f${roleName}`;
            hTxt += uuid ? `\n§7Clique pour ouvrir NameMC` : `\n§8(UUID non trouvé)`;
            comp.setHover("show_text", hTxt);
            if (uuid) comp.setClick("open_url", "https://namemc.com/profile/" + uuid);

            finalMsg.addTextComponent(comp);
        } else {
            if (uuid && cleanWord.length > 2) {
                let comp = new TextComponent(part + " ");
                comp.setHover("show_text", "§7Ouvrir NameMC de §f" + cleanWord);
                comp.setClick("open_url", "https://namemc.com/profile/" + uuid);
                finalMsg.addTextComponent(comp);
            } else finalMsg.addTextComponent(part + " ");
        }
    });

    finalMsg.setChatLineId(msgId);
    ChatLib.chat(finalMsg);
});
