import PogObject from "PogData";

const S = global.Solus; // On récupère le style du client

// --- CONFIGURATION SÉPARÉE ---
// Ce fichier sera créé dans .minecraft/config/ChatTriggers/modules/SolusClient/solus_filter_config.json
const filterData = new PogObject("SolusClient", {
    enabled: true,
    filters: [
        "ez",                 // Mot simple
        "L",                  // Mot simple
        "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}", // Regex pour IP
        "discord\\.gg\\/\\w+" // Regex pour lien Discord
    ]
}, "solus_filter_config.json");

// --- LOGIQUE DE FILTRAGE ---
register("chat", (event) => {
    if (!filterData.enabled) return;

    let msg = ChatLib.getChatMessage(event, false); // Message sans couleur
    let cleanMsg = ChatLib.removeFormatting(msg);

    // On parcourt tous les filtres
    for (let f of filterData.filters) {
        if (checkFilter(cleanMsg, f)) {
            cancel(event);
            // Optionnel : Afficher un petit message discret dans la console pour savoir qu'un truc a été bloqué
            print("[Solus Filter] Message bloqué : " + cleanMsg);
            return;
        }
    }
});

// Vérifie si un message correspond à un filtre (Regex ou Texte)
function checkFilter(message, filterStr) {
    try {
        // Essai en mode Regex (Insensible à la casse 'i')
        let regex = new RegExp(filterStr, "i");
        if (regex.test(message)) return true;
    } catch (e) {
        // Si la regex est invalide, on fait une recherche de texte simple
        if (message.toLowerCase().includes(filterStr.toLowerCase())) return true;
    }
    return false;
}

// --- COMMANDES (/sfilter) ---
register("command", (...args) => {
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Filter §7- Gestionnaire");
        ChatLib.chat("§3/sfilter add <mot/regex>   §7- Ajouter un filtre");
        ChatLib.chat("§3/sfilter remove <mot>      §7- Retirer un filtre");
        ChatLib.chat("§3/sfilter list              §7- Voir les filtres");
        ChatLib.chat("§3/sfilter toggle            §7- ON/OFF (" + (filterData.enabled ? "§aON" : "§cOFF") + ")");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }

    let action = args[0].toLowerCase();
    
    if (action === "toggle") {
        filterData.enabled = !filterData.enabled;
        filterData.save();
        ChatLib.chat(S.prefix + "Filtre Chat : " + (filterData.enabled ? "§aACTIVÉ" : "§cDÉSACTIVÉ"));
    }
    
    else if (action === "add") {
        let toAdd = args.slice(1).join(" ");
        if (!toAdd) return ChatLib.chat(S.prefix + "§cIl faut écrire un mot ou une regex !");
        
        if (!filterData.filters.includes(toAdd)) {
            filterData.filters.push(toAdd);
            filterData.save();
            ChatLib.chat(S.prefix + "§aFiltre ajouté : §f" + toAdd);
        } else {
            ChatLib.chat(S.prefix + "§cCe filtre existe déjà.");
        }
    }
    
    else if (action === "remove") {
        let toRemove = args.slice(1).join(" ");
        let index = filterData.filters.indexOf(toRemove);
        
        if (index !== -1) {
            filterData.filters.splice(index, 1);
            filterData.save();
            ChatLib.chat(S.prefix + "§cFiltre retiré : §f" + toRemove);
        } else {
            ChatLib.chat(S.prefix + "§cImpossible de trouver ce filtre.");
        }
    }
    
    else if (action === "list") {
        ChatLib.chat("§3Liste des Filtres (" + filterData.filters.length + ") :");
        filterData.filters.forEach(f => {
            ChatLib.chat(" §7- §c" + f);
        });
    }

}).setName("solusfilter").setAliases("sfilter");
