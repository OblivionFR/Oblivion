// ==========================================
// SOLUS CLIENT - SMART LOADER (Fix Boucle)
// ==========================================
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";

// Liste de TOUS les fichiers du module (J'ai ajouté solus_tab.js)
const FILES =[
    "solus_core.js", 
    "solus_friend.js", 
    "solus_mute.js", 
    "solus_combat.js", 
    "solus_waypoints.js", 
    "solus_chat.js",
    "solus_filter.js",
    "solus_tab.js"
];

// Fonction pour normaliser le texte (Rend compatible Windows/Linux pour la comparaison)
function normalize(str) {
    if (!str) return "";
    // Remplace les retours à la ligne Windows (\r\n) par Unix (\n) et enlève les espaces inutiles au début/fin
    return str.replace(/\r\n/g, "\n").trim();
}

global.SolusUpdater = {
    check: function() {
        new Thread(() => {
            try {
                let needsReload = false;
                let updatedList =[];

                // 1. Vérification du Loader lui-même (index.js)
                // On utilise un paramètre de temps ?t=... pour éviter le cache
                let remoteIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
                let localIndex = FileLib.read(CLIENT_NAME, "index.js");

                if (remoteIndex && normalize(remoteIndex) !== normalize(localIndex)) {
                    print("[Solus] Mise à jour du Loader (index.js)...");
                    FileLib.write(CLIENT_NAME, "index.js", remoteIndex);
                    needsReload = true;
                }

                // 2. Vérification des autres fichiers
                FILES.forEach(file => {
                    let url = GITHUB_BASE + file + "?t=" + Date.now();
                    let remoteContent = FileLib.getUrlContent(url);
                    
                    if (remoteContent && remoteContent.length > 10) {
                        let localContent = FileLib.read(CLIENT_NAME, file);
                        
                        // Si le fichier n'existe pas OU si le contenu est différent (après normalisation)
                        if (!FileLib.exists(CLIENT_NAME, file) || normalize(localContent) !== normalize(remoteContent)) {
                            print("[Solus] Modification détectée : " + file);
                            FileLib.write(CLIENT_NAME, file, remoteContent);
                            updatedList.push(file);
                            needsReload = true;
                        }
                    }
                });

                // 3. Gestion du redémarrage
                if (needsReload) {
                    ChatLib.chat("§b[Solus] §aMise à jour effectuée (" + updatedList.length + " fichiers).");
                    ChatLib.chat("§b[Solus] §7Rechargement automatique...");
                    Thread.sleep(1500); // Petite pause pour laisser le temps d'écrire
                    ChatLib.command("ct load", true);
                } else {
                    // Si tout est pareil, on charge les modules directement
                    loadModules();
                }

            } catch(e) {
                print("[Solus] Erreur de vérification (Pas de connexion ?) : " + e);
                // En cas d'erreur, on essaie quand même de charger ce qu'on a en local
                loadModules();
            }
        }).start();
    }
};

function loadModules() {
    try {
        // Chargement de tous les sous-fichiers
        require("./solus_core.js");
        require("./solus_chat.js");
        require("./solus_tab.js");
        require("./solus_friend.js");
        require("./solus_mute.js");
        require("./solus_combat.js");
        require("./solus_waypoints.js");
        require("./solus_filter.js");
        print("[Solus] Modules chargés avec succès.");
    } catch(e) {
        ChatLib.chat("§c[Solus] Erreur au lancement : " + e);
    }
}

// Lancer la vérification au démarrage
global.SolusUpdater.check();
