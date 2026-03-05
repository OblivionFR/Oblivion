const S = global.Solus;
let currentTarget = null, tTimer = 0;

register("attackEntity", (e) => {
    if (e.getClassName() === "EntityOtherPlayerMP") {
        let n = ChatLib.removeFormatting(e.getName());
        let st = S.getStatus(n);
        if (st === "LEGENDARY" || st === "INVINCIBLE") return;
        
        currentTarget = e; tTimer = 80;
    }
});

register("tick", () => { if (tTimer > 0) tTimer--; });

register("renderOverlay", () => {
    if (!S.config.targetHud || !currentTarget || tTimer <= 0) return;
    
    let w = Renderer.screen.getWidth(), h = Renderer.screen.getHeight();
    let name = currentTarget.getName();
    let hp = Math.round(currentTarget.getHP());
    let dist = Math.round(Player.asPlayerMP().distanceTo(currentTarget));
    
    let st = S.getStatus(ChatLib.removeFormatting(name));
    let col = st === "TARGET" ? "§c" : (st === "FRIEND" ? "§a" : "§e");

    let x = w/2 + 20, y = h/2 + 10;
    
    Renderer.drawRect(Renderer.color(20,20,20,180), x, y, 100, 30);
    Renderer.drawStringWithShadow(col + name, x+5, y+5);
    Renderer.drawStringWithShadow("§c❤ " + hp + " §f| " + dist + "m", x+5, y+15);
});
