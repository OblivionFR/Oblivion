// ==========================================
// SOLUS CLIENT - LOADER v14.0
// ==========================================
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
const FILES = ["solus_core.js", "solus_friend.js", "solus_mute.js", "solus_combat.js", "solus_waypoints.js", "solus_chat.js"];

// Fonction de nettoyage pour comparaison stricte
function clean(str) {
    if (!str) return "";
    return str.replace(/\s+/g, '');
}

global.SolusUpdater = {
    check: function() {
        new Thread(() => {
            try {
                let updatedFiles = [];
                FILES.forEach(file => {
                    let url = GITHUB_BASE + file + "?t=" + Date.now();
                    let remoteContent = FileLib.getUrlContent(url);
                    
                    if (remoteContent && remoteContent.length > 50) {
                        let localContent = FileLib.read(CLIENT_NAME, file);
                        if (!FileLib.exists(CLIENT_NAME, file) || clean(localContent) !== clean(remoteContent)) {
                            print("[Solus] Mise à jour de " + file);
                            FileLib.write(CLIENT_NAME, file, remoteContent);
                            updatedFiles.push(file);
                        }
                    }
                });

                if (updatedFiles.length > 0) {
                    ChatLib.chat("§b[Solus] §aMise à jour terminée ! Rechargement...");
                    setTimeout(() => ChatLib.command("ct load", true), 2000);
                } else {
                    loadModules();
                }
            } catch(e) { loadModules(); }
        }).start();
    }
};

function loadModules() {
    try {
        // Ordre critique pour que les commandes marchent
        require("./solus_core.js");   
        require("./solus_chat.js");   // Nouveau module
        require("./solus_friend.js");
        require("./solus_mute.js");
        require("./solus_combat.js");
        require("./solus_waypoints.js");
        print("[Solus] Tous les modules sont chargés.");
    } catch(e) {
        ChatLib.chat("§c[Solus] Erreur chargement : " + e);
    }
}

global.SolusUpdater.check();
