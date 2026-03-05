// ==========================================
// SOLUS CLIENT - SECURE LOADER (v13.0)
// ==========================================
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";

// CHANGE CE NUMÉRO SUR GITHUB POUR DÉCLENCHER UNE MAJ CHEZ LES GENS
const CURRENT_VERSION = "13.0"; 

const FILES = ["solus_core.js", "solus_friend.js", "solus_mute.js", "solus_combat.js"];

let isInstalling = false;

// Fonction de mise à jour
function startUpdate(remoteVersion) {
    if (isInstalling) return;
    isInstalling = true;
    
    ChatLib.chat("§b[Solus] §eMise à jour détectée (v" + remoteVersion + ")... Installation.");
    
    new Thread(() => {
        try {
            // 1. Télécharger le nouveau index.js (Loader)
            let newIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
            if (newIndex) FileLib.write(CLIENT_NAME, "index.js", newIndex);

            // 2. Télécharger tous les modules
            FILES.forEach(file => {
                let content = FileLib.getUrlContent(GITHUB_BASE + file + "?t=" + Date.now());
                if (content && content.length > 10) {
                    FileLib.write(CLIENT_NAME, file, content);
                    print("[Solus] Installé : " + file);
                }
            });

            ChatLib.chat("§b[Solus] §aMise à jour terminée !");
            ChatLib.chat("§b[Solus] §7Rechargement dans 3 secondes...");
            Thread.sleep(3000);
            ChatLib.command("ct load", true);
            
        } catch(e) {
            ChatLib.chat("§c[Solus] Échec de la mise à jour : " + e);
            isInstalling = false;
        }
    }).start();
}

// Vérification au démarrage
new Thread(() => {
    try {
        // On vérifie si les fichiers essentiels manquent
        let missingFiles = false;
        FILES.forEach(f => { if (!FileLib.exists(CLIENT_NAME, f)) missingFiles = true; });

        if (missingFiles) {
            ChatLib.chat("§b[Solus] §cFichiers manquants détectés ! Réparation...");
            startUpdate(CURRENT_VERSION);
            return;
        }

        // On vérifie la version sur GitHub
        let remoteIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
        if (remoteIndex) {
            let match = remoteIndex.match(/const CURRENT_VERSION = "([0-9.]+)";/);
            if (match) {
                let remoteVer = match[1];
                // Si la version GitHub est différente de la nôtre -> MAJ
                if (remoteVer !== CURRENT_VERSION) {
                    startUpdate(remoteVer);
                } else {
                    console.log("[Solus] Client à jour (v" + CURRENT_VERSION + ")");
                }
            }
        }
    } catch(e) {
        print("[Solus] Impossible de vérifier les MAJ (Pas d'internet ?)");
    }
}).start();

// Chargement des modules si pas de MAJ en cours
if (!isInstalling) {
    try {
        require("./solus_core.js");
        require("./solus_friend.js");
        require("./solus_mute.js");
        require("./solus_combat.js");
    } catch(e) {
        console.log("[Solus] Erreur chargement modules: " + e);
    }
}
