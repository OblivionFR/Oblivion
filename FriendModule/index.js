// ==========================================
// SOLUS CLIENT - LOADER & UPDATER
// ==========================================
const CURRENT_VERSION = "1.0"; 
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/FriendModule/";

// Liste des fichiers du client
const FILES_TO_UPDATE = ["index.js", "solus_friend.js", "solus_mute.js"];

function checkForUpdates() {
    new Thread(() => {
        try {
            // Vérification de la version sur le index distant
            let remoteIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
            if (!remoteIndex) return;

            let match = remoteIndex.match(/const CURRENT_VERSION = "([0-9.]+)";/);
            if (match && match[1] !== CURRENT_VERSION) {
                ChatLib.chat("§b[Solus] §fMise à jour détectée (v" + match[1] + ") !");
                ChatLib.chat("§b[Solus] §7Téléchargement des modules...");

                FILES_TO_UPDATE.forEach(file => {
                    let content = FileLib.getUrlContent(GITHUB_BASE + file + "?t=" + Date.now());
                    if (content && content.length > 10) {
                        FileLib.write(CLIENT_NAME, file, content);
                        print("[Solus] Updated " + file);
                    }
                });

                ChatLib.chat("§b[Solus] §aMise à jour terminée ! Rechargement...");
                setTimeout(() => ChatLib.command("ct load", true), 1500);
            }
        } catch(e) {
            print("[Solus] Update Check Failed: " + e);
        }
    }).start();
}

// Lancement
checkForUpdates();

// Chargement des modules
try {
    require("./solus_friend.js");
    require("./solus_mute.js");
    print("[Solus] Modules chargés avec succès.");
} catch(e) {
    ChatLib.chat("§c[Solus] Erreur critique au chargement : " + e);
}
