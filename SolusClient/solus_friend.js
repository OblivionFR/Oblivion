const S = global.Solus;

let paralyzed = false, pTimer = 0, hpCache = 20;
let abMsg = "", abTimer = 0, alertedTargets =[];

register("tick", () => {
    if (!World.isLoaded()) return;
    let hp = Player.getHP();
    if (hp < hpCache && hp > 0) {
        let godNear = false;
        World.getAllPlayers().forEach(p => { if (p.getName() !== Player.getName() && S.getStatus(p.getName()) === "LEGENDARY" && Player.asPlayerMP().distanceTo(p) < 6) godNear = true; });
        if (godNear && !paralyzed) { paralyzed = true; pTimer = 80; World.playSound("ambient.weather.thunder", 100, 0.5); Client.showTitle("§4§lPARALYSÉ", "§cUn Dieu t'a frappé !", 0, 40, 10); }
    }
    hpCache = hp;
    if (paralyzed) {
        if (pTimer > 0 && Player.getHP() > 0) {
            pTimer--; let p = Player.getPlayer();
            p.field_70159_w = 0; p.field_70179_y = 0; if (p.field_70181_x > 0) p.field_70181_x = 0;
            Client.getMinecraft().field_71439_g.field_70702_br = 0; Client.getMinecraft().field_71439_g.field_70701_bs = 0;
            abMsg = "§4§lGELÉ PAR UN DIEU..."; abTimer = 5;
        } else paralyzed = false;
    }
});

register("attackEntity", (e, ev) => {
    let st = S.getStatus(ChatLib.removeFormatting(e.getName()));
    if (st === "LEGENDARY") { cancel(ev); World.playSound("mob.wither.idle", 100, 0.5); Player.getPlayer().field_70125_A = 90; Player.getPlayer().field_70177_z += 180; abMsg = "§4§l☠ RESPECTE LES DIEUX ☠"; abTimer = 60; }
    else if (st === "INVINCIBLE") { cancel(ev); World.playSound("mob.enderdragon.hit", 100, 0.5); abMsg = "§c§l🛡 INTUABLE 🛡"; abTimer = 40; }
    else if (st === "FRIEND" && !S.config.pvpEnabled) { cancel(ev); World.playSound("random.anvil_land", 100, 0.5); abMsg = "§a§l✔ AMI - COUP BLOQUÉ"; abTimer = 40; }
});

register("renderOverlay", () => {
    if (abTimer > 0) { Renderer.drawStringWithShadow(abMsg, Renderer.screen.getWidth()/2 - Renderer.getStringWidth(abMsg)/2, Renderer.screen.getHeight() - 60); abTimer--; }
    if (paralyzed) Renderer.drawRect(Renderer.color(50,0,0,80), 0,0, Renderer.screen.getWidth(), Renderer.screen.getHeight());
    
    let w = Renderer.screen.getWidth();
    World.getAllPlayers().forEach(p => {
        let d = Player.asPlayerMP().distanceTo(p);
        if (S.getStatus(p.getName()) === "LEGENDARY" && d < 20) {
            let op = Math.abs(Math.sin(Date.now()/300))*80;
            Renderer.drawRect(Renderer.color(255,0,0,op), 0,0, w, Renderer.screen.getHeight());
            Renderer.drawStringWithShadow("§4§l☠ PRÉSENCE DIVINE ☠", w/2 - 60, 40);
        }
        if (S.config.proximityAlert && S.getStatus(p.getName()) === "TARGET") {
            if (d < 15 && !alertedTargets.includes(p.getName())) {
                Client.showTitle("§c§l⚠ CIBLE PROCHE ⚠", "§f"+p.getName()+" est à "+Math.round(d)+"m", 0, 40, 10);
                World.playSound("note.bass", 1, 0.5); alertedTargets.push(p.getName());
            } else if (d >= 20) alertedTargets = alertedTargets.filter(x => x !== p.getName());
        }
    });
    
    if (S.cloud.objective.length > 0) Renderer.drawStringWithShadow("§3§l📌 Objectif: §b" + S.cloud.objective, 5, 5);

    if (S.config.friendHud) {
        let hudY = 25;
        Renderer.drawStringWithShadow("§b§lAlliés proches :", 5, hudY);
        let found = false;
        World.getAllPlayers().forEach(p => {
            let n = ChatLib.removeFormatting(p.getName());
            let st = S.getStatus(n);
            if (n !== Player.getName() && (st === "FRIEND" || st === "INVINCIBLE" || st === "LEGENDARY")) {
                let dist = Math.round(Player.asPlayerMP().distanceTo(p));
                let col = st === "LEGENDARY" ? "§c" : (st === "INVINCIBLE" ? "§d" : "§b");
                hudY += 10;
                Renderer.drawStringWithShadow(col + n + " §7[" + dist + "m]", 5, hudY);
                found = true;
            }
        });
        if (!found) Renderer.drawStringWithShadow("§7Aucun.", 5, hudY + 10);
    }

    if (!S.config.radar) return;
    let rx = 70, ry = S.config.friendHud ? 120 : 70, s = 50; 
    if (S.cloud.objective.length > 0) ry += 15;
    Renderer.drawRect(Renderer.color(0,0,0,150), rx-s, ry-s, s*2, s*2);
    Renderer.drawRect(Renderer.color(255,255,255,255), rx-1, ry-1, 2, 2);
    
    let yaw = Player.getYaw();
    World.getAllPlayers().forEach(p => {
        let n = ChatLib.removeFormatting(p.getName());
        if (n === Player.getName()) return;
        let st = S.getStatus(n);
        if (st === "NONE") return;
        
        let dx = p.getX()-Player.getX(), dz = p.getZ()-Player.getZ();
        let cos = Math.cos(yaw*(Math.PI/180)), sin = Math.sin(yaw*(Math.PI/180));
        let rotX = -(dx*cos - dz*sin), rotY = -(dx*sin + dz*cos);
        if (Math.sqrt(rotX*rotX+rotY*rotY)*1.5 < s) {
            let c = st==="TARGET"?Renderer.color(255,0,0) : st==="INVINCIBLE"?Renderer.color(170,0,255) : st==="LEGENDARY"?Renderer.color(0,0,0) : Renderer.color(0,255,255);
            Renderer.drawRect(c, rx+rotX*1.5-1, ry+rotY*1.5-1, 3, 3);
        }
    });
});

register("renderWorld", () => {
    if (!S.config.esp3D) return;
    World.getAllPlayers().forEach(p => {
        let n = ChatLib.removeFormatting(p.getName());
        if (n === Player.getName()) return;
        let st = S.getStatus(n);
        if (st === "NONE") return;
        if (Player.asPlayerMP().distanceTo(p) < 60) {
            let txt = "§b★ Solus ★", h = 0.5, sc = 0.03;
            if (st === "TARGET") txt = "§c⚠ CIBLE ⚠";
            else if (st === "INVINCIBLE") txt = "§d§l🛡 GOD 🛡";
            else if (st === "LEGENDARY") { txt = "§4§l☠ "+S.getRole(n).toUpperCase()+" ☠"; h = 0.8; sc = 0.04; }
            Tessellator.drawString(txt, p.getRenderX(), p.getRenderY()+p.getHeight()+h, p.getRenderZ(), 0, true, sc, false);
        }
    });
});
