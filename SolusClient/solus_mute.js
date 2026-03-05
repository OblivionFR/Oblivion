const S = global.Solus;
const muteGui = new Gui();

function parseTime(s) {
    let m = s.match(/^(\d+)([smhd])$/i); if (!m) return 0;
    let v = parseInt(m[1]), u = m[2].toLowerCase();
    return v * (u==='s'?1000 : u==='m'?60000 : u==='h'?3600000 : 86400000);
}

// Fonction pour afficher la liste (Demandée)
function showMuteList() {
    ChatLib.chat("§3§m---------------------------------------------");
    ChatLib.chat("§bMutes Locaux ("+Object.keys(S.config.muted).length+"):");
    Object.keys(S.config.muted).forEach(x => ChatLib.chat(" §7- §e" + S.config.muted[x].name));
    
    ChatLib.chat("§cMutes Cloud ("+(S.cloud.blacklist.length)+"):");
    S.cloud.blacklist.forEach(x => ChatLib.chat(" §7- §c" + x));
    ChatLib.chat("§3§m---------------------------------------------");
}

// GUI
register("command", () => muteGui.open()).setName("smutegui");

muteGui.registerDraw((mx, my) => {
    let w = Renderer.screen.getWidth(), h = Renderer.screen.getHeight();
    Renderer.drawRect(Renderer.color(20, 20, 25, 240), w/2 - 200, h/2 - 120, 400, 240);
    Renderer.drawRect(Renderer.color(0, 150, 150, 255), w/2 - 200, h/2 - 120, 400, 20);
    Renderer.drawString("§l§fGestion Mute Solus", w/2 - 50, h/2 - 114);

    // Locaux
    Renderer.drawString("§aMutes Locaux :", w/2 - 180, h/2 - 90);
    let keys = Object.keys(S.config.muted);
    if (keys.length === 0) Renderer.drawString("§7Personne.", w/2 - 180, h/2 - 75);
    else {
        let y = h/2 - 75;
        keys.slice(0, 10).forEach((k, i) => {
            let inf = S.config.muted[k];
            let left = inf.expire ? Math.ceil((inf.expire - Date.now())/60000)+"m" : "∞";
            Renderer.drawString(`§b${inf.name} §8| §c${left}`, w/2 - 180, y + (i * 15));
            // Unmute Btn
            let bx = w/2 - 40, by = y + (i*15) - 2;
            Renderer.drawRect(Renderer.color((mx>=bx && mx<=bx+40 && my>=by && my<=by+10)?200:150, 50, 50, 255), bx, by, 40, 10);
            Renderer.drawString("§fUnmute", bx+2, by+1);
        });
    }

    // Cloud
    Renderer.drawRect(Renderer.color(255, 255, 255, 50), w/2, h/2 - 90, 1, 200);
    Renderer.drawString("§cMutes Cloud (Blacklist) :", w/2 + 20, h/2 - 90);
    if (S.cloud.blacklist.length === 0) Renderer.drawString("§7Aucun.", w/2 + 20, h/2 - 75);
    else {
        let y = h/2 - 75;
        S.cloud.blacklist.slice(0, 12).forEach((name, i) => { Renderer.drawString(`§c☠ ${name}`, w/2 + 20, y + (i * 15)); });
    }
});

muteGui.registerClicked((mx, my, b) => {
    if(b !== 0) return;
    let y = Renderer.screen.getHeight()/2 - 75;
    Object.keys(S.config.muted).slice(0, 10).forEach((k, i) => {
        let bx = Renderer.screen.getWidth()/2 - 40, by = y + (i*15) - 2;
        if(mx>=bx && mx<=bx+40 && my>=by && my<=by+10) {
            delete S.config.muted[k]; S.config.save(); World.playSound("random.click", 1, 1);
        }
    });
});

// Commandes Chat
register("command", (...args) => {
    // Si pas d'arguments, affiche l'aide Mute (comme demandé)
    if (!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Mute §7- Aide");
        ChatLib.chat("§3/smutegui                 §7- Interface");
        ChatLib.chat("§3/smute <pseudo> [tps]     §7- Muter (10m, 1h)");
        ChatLib.chat("§3/sunmute <pseudo>         §7- Démuter");
        ChatLib.chat("§3/smute list               §7- Liste des mutes");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }
    
    let p = args[0], low = p.toLowerCase();
    
    if (low === "list") return showMuteList(); // Commande liste

    if(S.cloud.blacklist.some(x => x.toLowerCase() === low)) return ChatLib.chat(S.prefix + "§cDéjà blacklisté par le Cloud !");

    let ms = 0, rStart = 1, dur = "Définitif";
    if (args[1] && /^\d+[smhd]$/i.test(args[1])) { ms = parseTime(args[1]); rStart = 2; dur = args[1]; }
    
    S.config.muted[low] = { name: p, reason: args.slice(rStart).join(" ") || "Aucune", expire: ms > 0 ? Date.now() + ms : null };
    S.config.save();
    ChatLib.chat(S.prefix + "§e"+p+" §amuté. Durée: §f"+dur);
}).setName("smute").setAliases("solusmute");

register("command", (p) => {
    if(!p) return ChatLib.chat(S.prefix + "§cUsage: /sunmute <pseudo>");
    if(S.config.muted[p.toLowerCase()]) { delete S.config.muted[p.toLowerCase()]; S.config.save(); ChatLib.chat(S.prefix + "§e"+p+" §adémuté !"); }
    else ChatLib.chat(S.prefix + "§cJoueur introuvable.");
}).setName("sunmute").setAliases("solusunmute");

// Auto-Unmute Timer
register("step", () => {
    let now = Date.now(), ch = false;
    for(let k in S.config.muted) {
        if(S.config.muted[k].expire && S.config.muted[k].expire <= now) {
            ChatLib.chat(S.prefix + "Mute expiré pour §e"+S.config.muted[k].name);
            delete S.config.muted[k]; ch = true;
        }
    }
    if(ch) S.config.save();
}).setDelay(5);
