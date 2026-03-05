import PogObject from "PogData";

const muteData = new PogObject("SolusClient", { muted: {}, strictMode: false }, "solus_mute.json");
const muteGui = new Gui();

function pad(n) { return n<10?"0"+n:n; }
function parseTime(s) {
    let m = s.match(/^(\d+)([smhd])$/i); if (!m) return 0;
    let v = parseInt(m[1]), u = m[2].toLowerCase();
    return v * (u=='s'?1000 : u=='m'?60000 : u=='h'?3600000 : 86400000);
}
function getPlayers() {
    let p =[]; try{if(World.isLoaded()) World.getAllPlayers().forEach(x => p.push(x.getName()));}catch(e){}
    return [...new Set(p)];
}

register("command", () => muteGui.open()).setName("solusmutegui");

muteGui.registerDraw((mx, my) => {
    let w = Renderer.screen.getWidth(), h = Renderer.screen.getHeight();
    Renderer.drawRect(Renderer.color(20, 20, 25, 240), w/2 - 160, h/2 - 120, 320, 240);
    Renderer.drawRect(Renderer.color(0, 150, 150, 255), w/2 - 160, h/2 - 120, 320, 20); // Header Cyan
    Renderer.drawString("§l§fGestion Mute Solus", w/2 - 50, h/2 - 114);

    let keys = Object.keys(muteData.muted);
    if (keys.length === 0) Renderer.drawString("§7Personne n'est muté.", w/2 - 40, h/2);
    else {
        let y = h/2 - 90;
        keys.slice(0, 10).forEach((k, i) => {
            let inf = muteData.muted[k];
            let left = inf.expire ? Math.ceil((inf.expire - Date.now())/60000)+"m" : "∞";
            Renderer.drawString(`§b${inf.name} §8| §c${left} §8| §7${inf.reason}`, w/2 - 145, y + (i * 20));
            
            let bx = w/2 + 100, by = y + (i*20) - 2;
            let hov = mx>=bx && mx<=bx+45 && my>=by && my<=by+12;
            Renderer.drawRect(Renderer.color(hov?200:150, 50, 50, 255), bx, by, 45, 12);
            Renderer.drawString("§fUnmute", bx+5, by+2);
        });
    }
});

muteGui.registerClicked((mx, my, b) => {
    if(b!==0) return;
    let y = Renderer.screen.getHeight()/2 - 90;
    Object.keys(muteData.muted).slice(0, 10).forEach((k, i) => {
        let bx = Renderer.screen.getWidth()/2 + 100, by = y + (i*20) - 2;
        if(mx>=bx && mx<=bx+45 && my>=by && my<=by+12) {
            delete muteData.muted[k]; muteData.save(); World.playSound("random.click", 1, 1);
        }
    });
});

register("command", (...args) => {
    if (!args.length) return ChatLib.chat("§cUsage: /smute <pseudo> [temps] [raison]");
    let p = args[0], low = p.toLowerCase();
    let ms = 0, rStart = 1, dur = "Définitif";
    if (args[1] && /^\d+[smhd]$/i.test(args[1])) { ms = parseTime(args[1]); rStart = 2; dur = args[1]; }
    
    muteData.muted[low] = {
        name: p, reason: args.slice(rStart).join(" ") || "Aucune",
        expire: ms > 0 ? Date.now() + ms : null
    };
    muteData.save();
    ChatLib.chat("§b[Solus] §e"+p+" §amuté. Durée: §f"+dur);
}).setName("solusmute").setAliases("smute").setTabCompletions((args) => {
    if(!args || args.length===0) return [];
    if(args.length===1) return getPlayers().filter(p => !muteData.muted[p.toLowerCase()] && p.toLowerCase().startsWith(args[0].toLowerCase()));
    if(args.length===2) return ["10m", "1h", "1d"];
    return [];
});

register("command", (p) => {
    if(!p) return;
    if(muteData.muted[p.toLowerCase()]) { delete muteData.muted[p.toLowerCase()]; muteData.save(); ChatLib.chat("§b[Solus] §e"+p+" §adémuté !"); }
}).setName("solusunmute").setAliases("sunmute");

register("step", () => {
    let now = Date.now(), ch = false;
    for(let k in muteData.muted) {
        if(muteData.muted[k].expire && muteData.muted[k].expire <= now) {
            ChatLib.chat("§b[Solus] Mute expiré pour §e"+muteData.muted[k].name);
            delete muteData.muted[k]; ch = true;
        }
    }
    if(ch) muteData.save();
}).setDelay(5);

register("chat", (event) => {
    let m = ChatLib.getChatMessage(event, false);
    let k = Object.keys(muteData.muted);
    for(let i=0; i<k.length; i++) {
        let regex = new RegExp("^.{0,20}(?:^|\\W)" + k[i] + "(?=$|\\W)", "i");
        if(regex.test(m)) { cancel(event); return; }
    }
});
