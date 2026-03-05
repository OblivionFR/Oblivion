// ==========================================
// SOLUS CLIENT - SMART AUTO-UPDATER
// ==========================================
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
const FILES =["index.js", "solus_core.js", "solus_friend.js", "solus_mute.js"];

// Espace global pour l'updater
global.SolusUpdater = {
    isChecking: false,
    lastCheck: 0,
    check: function(force = false, silent = false) {
        if (this.isChecking) return;
        // Cooldown de 3 minutes pour éviter de spam Github, sauf si on force
        if (!force && Date.now() - this.lastCheck < 180000) return;
        
        this.isChecking = true;
        this.lastCheck = Date.now();

        new Thread(() => {
            try {
                let updatedFiles =[];
                
                FILES.forEach(file => {
                    let remote = FileLib.getUrlContent(GITHUB_BASE + file + "?t=" + Date.now());
                    if (remote && remote.length > 50) {
                        let local = FileLib.read(CLIENT_NAME, file);
                        
                        // Nettoyage des espaces et retours à la ligne pour comparer correctement
                        let cleanRemote = remote.replace(/\r/g, "").trim();
                        let cleanLocal = local ? local.replace(/\r/g, "").trim() : "";

                        // Si le fichier Github est différent du fichier local
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
                } else {
                    if (!silent) ChatLib.chat("§b[Solus] §aLe code du client est déjà à jour !");
                }
            } catch(e) {
                if (!silent) ChatLib.chat("§c[Solus] Erreur de vérification : " + e);
            }
            this.isChecking = false;
        }).start();
    }
};

// 1. Vérification au démarrage
global.SolusUpdater.check(false, true);

// 2. Vérification quand on rejoint un serveur (WorldLoad)
register("worldLoad", () => {
    setTimeout(() => global.SolusUpdater.check(false, true), 5000); // 5 sec après la connexion
});

// 3. Vérification auto toutes les 5 minutes
register("step", () => {
    global.SolusUpdater.check(false, true);
}).setDelay(300); // 300 secondes = 5 minutes

// --- CHARGEMENT DES SOUS-MODULES ---
try {
    require("./solus_core.js");
    require("./solus_friend.js");
    require("./solus_mute.js");
} catch(e) {}
