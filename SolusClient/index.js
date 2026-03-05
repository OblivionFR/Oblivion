const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
const FILES = ["solus_core.js", "solus_friend.js", "solus_mute.js", "solus_combat.js"];

// Version locale du loader
const LOADER_VERSION = "11.0";

global.SolusUpdater = {
    check: function() {
        new Thread(() => {
            try {
                // 1. Vérifier la version
                let remoteIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
                if (!remoteIndex) return;
                
                let match = remoteIndex.match(/const LOADER_VERSION = "([0-9.]+)";/);
                let remoteVer = match ? match[1] : "0.0";

                // 2. Si pas la même version ou si fichiers manquants
                let missingFiles = false;
                FILES.forEach(f => { if (!FileLib.exists(CLIENT_NAME, f)) missingFiles = true; });

                if (remoteVer !== LOADER_VERSION || missingFiles) {
                    ChatLib.chat("§b[Solus] §eMise à jour / Réparation en cours...");
                    
                    // Mise à jour de l'index
                    FileLib.write(CLIENT_NAME, "index.js", remoteIndex);

                    // Téléchargement des modules
                    FILES.forEach(file => {
                        let content = FileLib.getUrlContent(GITHUB_BASE + file + "?t=" + Date.now());
                        if (content && content.length > 10) {
                            FileLib.write(CLIENT_NAME, file, content);
                            print("[Solus] Téléchargé : " + file);
                        }
                    });

                    ChatLib.chat("§b[Solus] §aInstallation terminée ! Rechargement...");
                    setTimeout(() => ChatLib.command("ct load", true), 2000);
                }
            } catch(e) {
                ChatLib.chat("§c[Solus] Erreur Update : " + e);
            }
        }).start();
    }
};

// Lancement
global.SolusUpdater.check();

// Chargement sécurisé
try {
    require("./solus_core.js");
    require("./solus_friend.js");
    require("./solus_mute.js");
    require("./solus_combat.js");
    print("[Solus] Client chargé avec succès.");
} catch(e) {
    // Si ça crash ici, c'est qu'un fichier manque, l'updater le fixera au prochain load
    console.log("[Solus] Attente des fichiers...");
}
