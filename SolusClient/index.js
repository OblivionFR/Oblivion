// ==========================================
// SOLUS CLIENT - STABLE LOADER (ANTI-LOOP)
// ==========================================
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";

// Liste complète des fichiers (y compris le nouveau filtre)
const FILES = [
    "solus_core.js", 
    "solus_friend.js", 
    "solus_mute.js", 
    "solus_combat.js", 
    "solus_waypoints.js", 
    "solus_chat.js",
    "solus_filter.js" // Le nouveau module
];

// Numéro de version du loader (Change-le sur Github pour forcer la maj du index.js lui-même)
const LOADER_VERSION = "16.0"; 

// Fonction de nettoyage : Retire TOUS les espaces/sauts de ligne pour la comparaison
// C'est ça qui empêche la boucle infinie !
function clean(str) {
    if (!str) return "";
    return str.replace(/\s+/g, ""); 
}

global.SolusUpdater = {
    check: function() {
        new Thread(() => {
            try {
                let needsReload = false;

                // 1. Vérification du Loader (index.js) par Numéro de Version
                let remoteIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
                if (remoteIndex) {
                    let match = remoteIndex.match(/const LOADER_VERSION = "([0-9.]+)";/);
                    if (match && match[1] !== LOADER_VERSION) {
                        ChatLib.chat("§b[Solus] §eMise à jour du Loader détectée !");
                        FileLib.write(CLIENT_NAME, "index.js", remoteIndex);
                        needsReload = true;
                    }
                }

                // 2. Vérification des Modules par Comparaison de Contenu Nettoyé
                FILES.forEach(f => {
                    let url = GITHUB_BASE + f + "?t=" + Date.now();
                    let remoteContent = FileLib.getUrlContent(url);
                    
                    if (remoteContent && remoteContent.length > 50) {
                        let localContent = FileLib.read(CLIENT_NAME, f);
                        
                        // Si le fichier n'existe pas OU si le contenu nettoyé est différent
                        if (!FileLib.exists(CLIENT_NAME, f) || clean(localContent) !== clean(remoteContent)) {
                            print("[Solus] Mise à jour détectée pour : " + f);
                            FileLib.write(CLIENT_NAME, f, remoteContent);
                            needsReload = true;
                        }
                    }
                });

                // 3. Rechargement unique si nécessaire
                if (needsReload) {
                    ChatLib.chat("§b[Solus] §aMise à jour terminée. Rechargement...");
                    setTimeout(() => ChatLib.command("ct load", true), 2000);
                } else {
                    // Si pas de maj, on lance les modules
                    loadModules();
                }

            } catch(e) {
                print("[Solus] Erreur Update (Pas grave, lancement local) : " + e);
                loadModules();
            }
        }).start();
    }
};

function loadModules() {
    try {
        // Chargement dans l'ordre
        require("./solus_core.js");
        require("./solus_chat.js");
        require("./solus_friend.js");
        require("./solus_mute.js");
        require("./solus_combat.js");
        require("./solus_waypoints.js");
        require("./solus_filter.js");
        print("[Solus] Modules chargés avec succès.");
    } catch(e) {
        ChatLib.chat("§c[Solus] Erreur au lancement des modules : " + e);
    }
}

// Lancement
global.SolusUpdater.check();
