import PogObject from "PogData";

const prefix = "§b[Solus] ";
const clientData = new PogObject("SolusClient", {
    friends: [],
    pvpEnabled: false,
    chatHighlight: true,
    esp3D: true,
    radar: true,
    proximityAlert: true
}, "solus_config.json");

// Variables Cloud
let cLegendaries = [], cFriends = [], cInvincibles = [], cTargets = [], cBlacklist = [], cMotd = "", cObjective = "";
let lastUpdate = 0;
let isUpdating = false;
let paralyzed = false, pTimer = 0, hpCache = 20;
let abMsg = "", abTimer = 0;
let alertedTargets = [];

const DATA_URL = "https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/SolusClient/";

// --- SYNC CLOUD ROBUSTE ---
function syncCloud(verbose) {
    if (isUpdating) return;
    isUpdating = true;
    new Thread(() => {
        try {
            let t = "?t=" + Date.now();
            
            // JSON Dieux
            let json = FileLib.getUrlContent(DATA_URL + "legendary_chars.json" + t);
            if (json && json.length > 5) {
                try {
                    let parsed = JSON.parse(json.trim());
                    if (parsed.admins) cLegendaries = parsed.admins;
                    if (verbose) ChatLib.chat(prefix + "§a" + cLegendaries.length + " Légendes chargées.");
                } catch (e) {}
            }

            // Listes
            let f = FileLib.getUrlContent(DATA_URL + "default_friend.txt" + t);
            if(f) cFriends = f.split("\n").map(s=>s.trim()).filter(s=>s.length>=3);
            
            let i = FileLib.getUrlContent(DATA_URL + "invincible.txt" + t);
            if(i) cInvincibles = i.split("\n").map(s=>s.trim()).filter(s=>s.length>=3);
            
            let tg = FileLib.getUrlContent(DATA_URL + "target.txt" + t);
            if(tg) cTargets = tg.split("\n").map(s=>s.trim()).filter(s=>s.length>=3);

            let b = FileLib.getUrlContent(DATA_URL + "blacklist.txt" + t);
            if(b) cBlacklist = b.split("\n").map(s=>s.trim()).filter(s=>s.length>=3);

            let m = FileLib.getUrlContent(DATA_URL + "motd.txt" + t);
            if(m && m.trim().length > 0 && m.trim() !== cMotd) {
                cMotd = m.trim();
                if(!verbose) {
                    ChatLib.chat("§3§m---------------------------------------------");
                    ChatLib.chat("§b§lAnnonce Solus : §f" + cMotd);
                    ChatLib.chat("§3§m---------------------------------------------");
                    World.playSound("random.levelup", 1, 1);
                }
            }
            
            let obj = FileLib.getUrlContent(DATA_URL + "objective.txt" + t);
            cObjective = obj ? obj.trim() : "";

            lastUpdate = Date.now();
            if(verbose) ChatLib.chat(prefix + "§aSynchronisation terminée.");
        } catch(e) {
            if(verbose) ChatLib.chat(prefix + "§cErreur Cloud: " + e);
        }
        isUpdating = false;
    }).start();
}

register("step", () => { if(Date.now() - lastUpdate > 15000) syncCloud(false); }).setFps(1);

// --- UTILITAIRES ---
function getStatus(name) {
    if(!name) return "NONE";
    let l = ChatLib.removeFormatting(name).toLowerCase().trim();
    for(let k=0; k<cLegendaries.length; k++) if(cLegendaries[k].pseudo.toLowerCase() === l) return "LEGENDARY";
    if(cInvincibles.some(x=>x.toLowerCase()===l)) return "INVINCIBLE";
    if(cTargets.some(x=>x.toLowerCase()===l)) return "TARGET";
    if(clientData.friends.some(x=>x.toLowerCase()===l) || cFriends.some(x=>x.toLowerCase()===l)) return "FRIEND";
    return "NONE";
}

function getRole(name) {
    let l = ChatLib.removeFormatting(name).toLowerCase().trim();
    for(let k=0; k<cLegendaries.length; k++) if(cLegendaries[k].pseudo.toLowerCase()===l) return cLegendaries[k].role || "Dieu";
    return "Dieu";
}

// --- COMMANDES (/solus) ---
register("command", (...args) => {
    if(!args || args.length === 0) {
        ChatLib.chat("§3§m---------------------------------------------");
        ChatLib.chat("§b§lSolus Client §7v1.0");
        ChatLib.chat("§3/sf add <pseudo>    §7- Ajouter ami");
        ChatLib.chat("§3/sf remove <pseudo> §7- Retirer ami");
        ChatLib.chat("§3/sf list            §7- Voir le Cloud");
        ChatLib.chat("§3/sf force           §7- §eDebug Cloud");
        ChatLib.chat("§3/sf toggle <opt>    §7- pvp/radar/esp/alert");
        ChatLib.chat("§3§m---------------------------------------------");
        return;
    }
    let a = args[0].toLowerCase();
    if(a==="force") { ChatLib.chat(prefix + "§eForçage..."); syncCloud(true); }
    else if(a==="add" && args[1]) {
        if(!clientData.friends.includes(args[1])) { clientData.friends.push(args[1]); clientData.save(); ChatLib.chat(prefix + "§aAjouté: " + args[1]); }
    }
    else if(a==="remove" && args[1]) {
        clientData.friends = clientData.friends.filter(x => x.toLowerCase() !== args[1].toLowerCase()); clientData.save(); ChatLib.chat(prefix + "§cRetiré: " + args[1]);
    }
    else if(a==="list") {
        ChatLib.chat("§6Cloud Solus: §cDieux:" + cLegendaries.length + " §aAmis:" + cFriends.length + " §dInv:" + cInvincibles.length + " §cCibles:" + cTargets.length);
        ChatLib.chat("§3Local: " + clientData.friends.join(", "));
    }
    else if(a==="toggle" && args[1]) {
        let o = args[1].toLowerCase();
        if(o=="pvp") clientData.pvpEnabled = !clientData.pvpEnabled;
        if(o=="radar") clientData.radar = !clientData.radar;
        if(o=="esp") clientData.esp3D = !clientData.esp3D;
        if(o=="alert") clientData.proximityAlert = !clientData.proximityAlert;
        clientData.save(); ChatLib.chat(prefix + "Option " + o + " changée.");
    }
}).setName("solus").setAliases("sf");

register("command", () => {
    clientData.pvpEnabled = !clientData.pvpEnabled; clientData.save();
    ChatLib.chat(prefix + "PvP Ami: " + (clientData.pvpEnabled ? "§cON (Danger)" : "§aOFF (Sûr)"));
}).setName("soluspvp").setAliases("friendpvp");

// --- GAMEPLAY (PVP & FREEZE) ---
register("tick", () => {
    if(!World.isLoaded()) return;
    let hp = Player.getHP();
    if(hp < hpCache && hp > 0) {
        let godNear = false;
        World.getAllPlayers().forEach(p => {
            if(p.getName()!==Player.getName() && getStatus(p.getName())==="LEGENDARY" && Player.asPlayerMP().distanceTo(p)<6) godNear = true;
        });
        if(godNear && !paralyzed) {
            paralyzed = true; pTimer = 80;
            World.playSound("ambient.weather.thunder", 100, 0.5);
            Client.showTitle("§4§lPARALYSÉ", "§cUn Dieu t'a frappé !", 0, 40, 10);
        }
    }
    hpCache = hp;
    if(paralyzed) {
        if(pTimer > 0 && Player.getHP() > 0) {
            pTimer--;
            let p = Player.getPlayer();
            p.field_70159_w = 0; p.field_70179_y = 0; if(p.field_70181_x>0) p.field_70181_x = 0;
            Client.getMinecraft().field_71439_g.field_70702_br = 0; Client.getMinecraft().field_71439_g.field_70701_bs = 0;
            abMsg = "§4§lGELÉ PAR UN DIEU..."; abTimer = 5;
        } else paralyzed = false;
    }
});

register("attackEntity", (e, ev) => {
    let st = getStatus(ChatLib.removeFormatting(e.getName()));
    if(st==="LEGENDARY") {
        cancel(ev); World.playSound("mob.wither.idle", 100, 0.5);
        Player.getPlayer().field_70125_A = 90; Player.getPlayer().field_70177_z += 180;
        abMsg = "§4§l☠ RESPECTE LES DIEUX ☠"; abTimer = 60;
    }
    else if(st==="INVINCIBLE") { cancel(ev); World.playSound("mob.enderdragon.hit", 100, 0.5); abMsg = "§c§l🛡 INTUABLE 🛡"; abTimer = 40; }
    else if(st==="FRIEND" && !clientData.pvpEnabled) { cancel(ev); World.playSound("random.anvil_land", 100, 0.5); abMsg = "§a§l✔ AMI - COUP BLOQUÉ"; abTimer = 40; }
});

// --- VISUELS ---
register("renderOverlay", () => {
    if(abTimer > 0) {
        Renderer.drawStringWithShadow(abMsg, Renderer.screen.getWidth()/2 - Renderer.getStringWidth(abMsg)/2, Renderer.screen.getHeight() - 60);
        abTimer--;
    }
    if(paralyzed) Renderer.drawRect(Renderer.color(50,0,0,80), 0,0, Renderer.screen.getWidth(), Renderer.screen.getHeight());
    
    // Alerte God & Target
    let w = Renderer.screen.getWidth();
    World.getAllPlayers().forEach(p => {
        let d = Player.asPlayerMP().distanceTo(p);
        if(getStatus(p.getName())==="LEGENDARY" && d<20) {
            let op = Math.abs(Math.sin(Date.now()/300))*80;
            Renderer.drawRect(Renderer.color(255,0,0,op), 0,0, w, Renderer.screen.getHeight());
            Renderer.drawStringWithShadow("§4§l☠ PRÉSENCE DIVINE ☠", w/2 - 60, 40);
        }
        // Alerte Target
        if(clientData.proximityAlert && getStatus(p.getName())==="TARGET") {
            if(d < 15 && !alertedTargets.includes(p.getName())) {
                Client.showTitle("§c§l⚠ CIBLE PROCHE ⚠", "§f"+p.getName()+" est à "+Math.round(d)+"m", 0, 40, 10);
                World.playSound("note.bass", 1, 0.5); alertedTargets.push(p.getName());
            } else if(d >= 20) alertedTargets = alertedTargets.filter(x => x !== p.getName());
        }
    });
    
    if(cObjective.length > 0) Renderer.drawStringWithShadow("§3§l📌 Objectif: §b" + cObjective, 5, 5);

    if(!clientData.radar) return;
    let rx=70, ry=70, s=50;
    if(cObjective.length>0) ry+=15;
    Renderer.drawRect(Renderer.color(0,0,0,150), rx-s, ry-s, s*2, s*2);
    Renderer.drawRect(Renderer.color(255,255,255,255), rx-1, ry-1, 2, 2);
    let yaw = Player.getYaw();
    World.getAllPlayers().forEach(p => {
        let n = ChatLib.removeFormatting(p.getName());
        if(n===Player.getName()) return;
        let st = getStatus(n);
        if(st==="NONE") return;
        let dx = p.getX()-Player.getX(), dz = p.getZ()-Player.getZ();
        let cos = Math.cos(yaw*(Math.PI/180)), sin = Math.sin(yaw*(Math.PI/180));
        let rotX = -(dx*cos - dz*sin), rotY = -(dx*sin + dz*cos);
        if(Math.sqrt(rotX*rotX+rotY*rotY)*1.5 < s) {
            let c = st==="TARGET"?Renderer.color(255,0,0) : st==="INVINCIBLE"?Renderer.color(170,0,255) : st==="LEGENDARY"?Renderer.color(0,0,0) : Renderer.color(0,255,0);
            Renderer.drawRect(c, rx+rotX*1.5-1, ry+rotY*1.5-1, 3, 3);
        }
    });
});

register("renderWorld", () => {
    if(!clientData.esp3D) return;
    World.getAllPlayers().forEach(p => {
        let n = ChatLib.removeFormatting(p.getName());
        if(n===Player.getName()) return;
        let st = getStatus(n);
        if(st==="NONE") return;
        if(Player.asPlayerMP().distanceTo(p)<60) {
            let txt = "§a★ Solus ★", h=0.5, sc=0.03;
            if(st==="TARGET") txt = "§c⚠ CIBLE ⚠";
            else if(st==="INVINCIBLE") txt = "§d§l🛡 GOD 🛡";
            else if(st==="LEGENDARY") { txt="§4§l☠ "+getRole(n).toUpperCase()+" ☠"; h=0.8; sc=0.04; }
            Tessellator.drawString(txt, p.getRenderX(), p.getRenderY()+p.getHeight()+h, p.getRenderZ(), 0, true, sc, false);
        }
    });
});

// --- TABLIST & CHAT ---
register("tick", () => {
    if(!World.isLoaded()) return;
    try {
        let sb = World.getWorld().func_96441_U();
        let tL = sb.func_96508_e("00_L")||sb.func_96527_f("00_L"); tL.func_96666_b("§4§lDieu §c");
        let tG = sb.func_96508_e("01_G")||sb.func_96527_f("01_G"); tG.func_96666_b("§d§lGod §d");
        let tF = sb.func_96508_e("02_F")||sb.func_96527_f("02_F"); tF.func_96666_b("§b§lSolus §b");
        let tT = sb.func_96508_e("03_T")||sb.func_96527_f("03_T"); tT.func_96666_b("§c§lTarget §c");
        let nh = Client.getMinecraft().func_147114_u();
        let it = nh.func_175106_d().iterator();
        let CCT = Java.type("net.minecraft.util.ChatComponentText");
        while(it.hasNext()) {
            let inf = it.next();
            let n = inf.func_178845_a().getName();
            let st = getStatus(n);
            if(st!=="NONE") {
                let tm = st==="LEGENDARY"?tL : st==="INVINCIBLE"?tG : st==="TARGET"?tT : tF;
                let tn = st==="LEGENDARY"?"00_L" : st==="INVINCIBLE"?"01_G" : st==="TARGET"?"03_T" : "02_F";
                let col = st==="LEGENDARY"?"§c" : st==="INVINCIBLE"?"§d" : st==="TARGET"?"§c" : "§b";
                if(!tm.func_96665_g().contains(n)) sb.func_151392_a(n, tn);
                let dn = inf.func_178854_k();
                if(dn==null || dn.func_150254_d().indexOf(col)==-1) inf.func_178859_a(new CCT(col+n));
            }
        }
    } catch(e){}
});

register("chat", (e) => {
    let m = ChatLib.getChatMessage(e);
    let c = ChatLib.removeFormatting(m);
    for(let b of cBlacklist) {
        if(c.toLowerCase().indexOf(b.toLowerCase())!==-1 && c.toLowerCase().indexOf(b.toLowerCase())<15) { cancel(e); return; }
    }
    if(!clientData.chatHighlight) return;
    let all = [...clientData.friends, ...cFriends, ...cInvincibles, ...cTargets];
    cLegendaries.forEach(l => all.push(l.pseudo));
    all.forEach(f => {
        if(c.indexOf(f+":")!=-1 || c.indexOf(f+">")!=-1) {
            cancel(e);
            let st = getStatus(f);
            let col = st==="TARGET"?"§c§l" : st==="INVINCIBLE"?"§d§l" : st==="LEGENDARY"?"§4§l☠ " : "§b§l";
            ChatLib.chat(m.replace(f, col+f+"§r"));
            if(st!=="TARGET") World.playSound("note.pling", 1, 2);
        }
    });
});
