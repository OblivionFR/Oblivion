// ==========================================
// SOLUS CLIENT - AUTO-UPDATER
// ==========================================
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
const FILES =["index.js", "solus_core.js", "solus_friend.js", "solus_mute.js", "solus_waypoints.js", "solus_combat.js"];

global.SolusUpdater = {
    isChecking: false, lastCheck: 0,
    check: function(force = false, silent = false) {
        if (this.isChecking) return;
        if (!force && Date.now() - this.lastCheck < 180000) return;
        
        this.isChecking = true; this.lastCheck = Date.now();
        new Thread(() => {
            try {
                let updatedFiles =[];
                FILES.forEach(file => {
                    let remote = FileLib.getUrlContent(GITHUB_BASE + file + "?t=" + Date.now());
                    if (remote && remote.length > 50) {
                        let local = FileLib.read(CLIENT_NAME, file);
                        let cleanRemote = remote.replace(/\r/g, "").trim();
                        let cleanLocal = local ? local.replace(/\r/g, "").trim() : "";
                        if (cleanRemote !== cleanLocal) {
                            FileLib.write(CLIENT_NAME, file, remote);
                            updatedFiles.push(file);
                        }
                    }
                });

                if (updatedFiles.length > 0) {
                    ChatLib.chat("§b[Solus] §fFichiers mis à jour : §a" + updatedFiles.join(", "));
                    ChatLib.chat("§b[Solus] §aInstallation... Rechargement dans 2 secondes.");
                    setTimeout(() => ChatLib.command("ct load", true), 2000);
                } else if (!silent) ChatLib.chat("§b[Solus] §aLe client est déjà à jour !");
            } catch(e) {}
            this.isChecking = false;
        }).start();
    }
};

global.SolusUpdater.check(false, true);
register("worldLoad", () => { setTimeout(() => global.SolusUpdater.check(false, true), 5000); });
register("step", () => { global.SolusUpdater.check(false, true); }).setDelay(300);

try {
    require("./solus_core.js");
    require("./solus_friend.js");
    require("./solus_mute.js");
    require("./solus_waypoints.js");
    require("./solus_combat.js");
} catch(e) {}
