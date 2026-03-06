const S = global.Solus;

register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Filter §7- Filtres Locaux");
        ChatLib.chat("§3/sfilter add <mot/regex>   §7- Ajouter");
        ChatLib.chat("§3/sfilter remove <mot>      §7- Retirer");
        ChatLib.chat("§3/sfilter list              §7- Voir les filtres");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }

    let action = args[0].toLowerCase();
    
    if (action === "add" && args[1]) {
        let toAdd = args.slice(1).join(" ");
        if (!S.data.filters.includes(toAdd)) {
            S.data.filters.push(toAdd); S.data.save();
            ChatLib.chat(S.prefix + "§aFiltre ajouté : §f" + toAdd);
        }
    }
    else if (action === "remove" && args[1]) {
        let toRm = args.slice(1).join(" ");
        let i = S.data.filters.indexOf(toRm);
        if (i !== -1) { S.data.filters.splice(i, 1); S.data.save(); ChatLib.chat(S.prefix + "§cFiltre retiré : §f" + toRm); }
    }
    else if (action === "list") {
        ChatLib.chat("§3Filtres (" + S.data.filters.length + ") :");
        S.data.filters.forEach(f => ChatLib.chat(" §7- §c" + f));
    }
}).setName("solusfilter").setAliases("sfilter");
