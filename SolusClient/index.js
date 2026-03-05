// ==========================================
// SOLUS CLIENT - LOADER STABLE (ANTI-BOUCLE)
// ==========================================
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
const FILES = ["solus_core.js", "solus_friend.js", "solus_mute.js", "solus_combat.js", "solus_waypoints.js"];

// Fonction pour nettoyer le code (retire espaces et sauts de ligne) pour la comparaison
// Cela empêche la boucle infinie si Windows/Github gèrent les lignes différemment
function clean(str) {
    if (!str) return "";
    return str.replace(/\s+/g, ''); // Retire TOUS les espaces et retours à la ligne
}

global.SolusUpdater = {
    check: function() {
        new Thread(() => {
            try {
                let updatedFiles = [];
                
                // 1. Vérifier chaque fichier
                FILES.forEach(file => {
                    let url = GITHUB_BASE + file + "?t=" + Date.now();
                    let remoteContent = FileLib.getUrlContent(url);
                    
                    if (remoteContent && remoteContent.length > 50) {
                        let localContent = FileLib.read(CLIENT_NAME, file);
                        
                        // Si le fichier n'existe pas OU si le contenu (nettoyé) est différent
                        if (!FileLib.exists(CLIENT_NAME, file) || clean(localContent) !== clean(remoteContent)) {
                            print("[Solus] Différence détectée sur " + file + ". Mise à jour...");
                            FileLib.write(CLIENT_NAME, file, remoteContent);
                            updatedFiles.push(file);
                        }
                    }
                });

                // 2. Si des fichiers ont changé, on reload UNE SEULE FOIS
                if (updatedFiles.length > 0) {
                    ChatLib.chat("§b[Solus] §aMise à jour effectuée (" + updatedFiles.length + " fichiers).");
                    ChatLib.chat("§b[Solus] §7Rechargement rapide...");
                    Thread.sleep(1000);
                    ChatLib.command("ct load", true);
                } else {
                    // Si rien n'a changé, on charge juste les scripts
                    loadModules();
                }

            } catch(e) {
                print("[Solus] Erreur Update: " + e);
                // En cas d'erreur (pas internet), on charge quand même
                loadModules();
            }
        }).start();
    }
};

function loadModules() {
    try {
        require("./solus_core.js");
        require("./solus_friend.js");
        require("./solus_mute.js");
        require("./solus_combat.js");
        require("./solus_waypoints.js");
        print("[Solus] Modules chargés.");
    } catch(e) {
        ChatLib.chat("§c[Solus] Erreur chargement : " + e);
    }
}

// Lancement
global.SolusUpdater.check();
