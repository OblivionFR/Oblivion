const S = global.Solus;

register("tick", () => {
    // Ne s'exécute que si on est en jeu et que l'option customTab est activée
    if (!World.isLoaded() || !S.config.customTab) return;
    
    try {
        let sb = World.getWorld().func_96441_U(); // getScoreboard()
        
        // 1. Définition des Teams du Scoreboard pour forcer le tri alphabétique
        // "000_" sera toujours tout en haut de la liste, devant "001_", etc.
        let tLeg = sb.func_96508_e("000_LEG") || sb.func_96527_f("000_LEG"); 
        tLeg.func_96666_b("§4§lDieu §c"); // Préfixe
        
        let tGod = sb.func_96508_e("001_GOD") || sb.func_96527_f("001_GOD"); 
        tGod.func_96666_b("§d§lGod §d");
        
        let tFri = sb.func_96508_e("002_FRI") || sb.func_96527_f("002_FRI"); 
        tFri.func_96666_b("§b§lSolus §b");
        
        let tTar = sb.func_96508_e("003_TAR") || sb.func_96527_f("003_TAR"); 
        tTar.func_96666_b("§c§lTarget §c");

        // 2. Parcourir tous les joueurs dans le TAB actuel
        let netHandler = Client.getMinecraft().func_147114_u(); // getNetHandler()
        let playerMap = netHandler.func_175106_d(); // getPlayerInfoMap()
        let iterator = playerMap.iterator();
        
        let ChatComponentText = Java.type("net.minecraft.util.ChatComponentText");

        while (iterator.hasNext()) {
            let info = iterator.next();
            let profile = info.func_178845_a(); // getGameProfile()
            if (!profile) continue;

            let name = profile.getName();
            let st = S.getStatus(name);
            
            if (st !== "NONE") {
                // Choix de la team et de la couleur selon le grade
                let teamObj = st === "LEGENDARY" ? tLeg : (st === "INVINCIBLE" ? tGod : (st === "TARGET" ? tTar : tFri));
                let teamName = st === "LEGENDARY" ? "000_LEG" : (st === "INVINCIBLE" ? "001_GOD" : (st === "TARGET" ? "003_TAR" : "002_FRI"));
                let colorPrefix = st === "LEGENDARY" ? "§c" : (st === "INVINCIBLE" ? "§d" : (st === "TARGET" ? "§c" : "§b"));
                
                // A. Forcer le Tri en haut du Tab (Scoreboard Team)
                if (!teamObj.func_96665_g().contains(name)) {
                    sb.func_151392_a(name, teamName);
                }
                
                // B. Modifier visuellement le nom dans la case du Tab
                let currentDisplayName = info.func_178854_k(); // getDisplayName()
                
                // Si le nom n'a pas déjà notre couleur, on le remplace
                if (currentDisplayName == null || currentDisplayName.func_150254_d().indexOf(colorPrefix) === -1) {
                     info.func_178859_a(new ChatComponentText(colorPrefix + name)); // setDisplayName()
                }
            }
        }
    } catch(e) {
        // Capture d'erreur silencieuse (Empêche le spam console en cas de chargement de monde)
    }
});
