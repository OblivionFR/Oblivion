const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";

// Liste EXACTE des fichiers. Si un fichier manque, il sera téléchargé.
const FILES = ["solus_core.js", "solus_friend.js", "solus_mute.js", "solus_combat.js"];

// Version du LOADER (change le si tu modifies index.js sur Github)
const LOADER_VERSION = "12.0";

global.SolusUpdater = {
    check: function() {
        new Thread(() => {
            try {
                // 1. Vérification de la version du Loader (index.js)
                let remoteIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
                
                // Si on trouve une nouvelle version, on met à jour
                if (remoteIndex) {
                    let match = remoteIndex.match(/const LOADER_VERSION = "([0-9.]+)";/);
                    if (match && match[1] !== LOADER_VERSION) {
                        ChatLib.chat("§b[Solus] §eMise à jour du Loader détectée !");
                        FileLib.write(CLIENT_NAME, "index.js", remoteIndex);
                        setTimeout(() => ChatLib.command("ct load", true), 1000);
                        return;
                    }
                }

                // 2. Vérification des sous-fichiers manquants ou vides
                let missing = false;
                FILES.forEach(f => {
                    let path = CLIENT_NAME + "/" + f;
                    // Si le fichier n'existe pas ou fait moins de 10 caractères (vide)
                    if (!FileLib.exists(path) || FileLib.read(path).length < 10) {
                        ChatLib.chat("§b[Solus] §7Téléchargement manquant : " + f);
                        let content = FileLib.getUrlContent(GITHUB_BASE + f + "?t=" + Date.now());
                        if (content) {
                            FileLib.write(CLIENT_NAME, f, content);
                            missing = true;
                        }
                    }
                });

                if (missing) {
                    ChatLib.chat("§b[Solus] §aFichiers récupérés ! Rechargement...");
                    setTimeout(() => ChatLib.command("ct load", true), 2000);
                }

            } catch(e) {
                print("Erreur Update Solus: " + e);
            }
        }).start();
    }
};

// Lancement de la vérif
global.SolusUpdater.check();

// Chargement sécurisé des modules
try {
    require("./solus_core.js");
    require("./solus_friend.js");
    require("./solus_mute.js");
    require("./solus_combat.js");
    print("[Solus] Tous les modules sont chargés.");
} catch(e) {
    ChatLib.chat("§c[Solus] Erreur de chargement (Fichiers manquants ?). Tentative de réparation...");
    global.SolusUpdater.check(); // On réessaie si ça plante
}
