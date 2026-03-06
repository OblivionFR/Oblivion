const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";
// Liste complète des modules (Ne rien enlever)
const FILES = ["solus_core.js", "solus_friend.js", "solus_mute.js", "solus_chat.js", "solus_combat.js", "solus_waypoints.js"];

// Change ce numéro pour forcer une mise à jour chez les autres
const LOADER_VERSION = "15.0"; 

global.SolusUpdater = {
    check: function() {
        new Thread(() => {
            try {
                let remoteIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
                
                // Vérif version Loader
                if (remoteIndex) {
                    let match = remoteIndex.match(/const LOADER_VERSION = "([0-9.]+)";/);
                    if (match && match[1] !== LOADER_VERSION) {
                        ChatLib.chat("§b[Solus] §eMise à jour du Cœur détectée !");
                        FileLib.write(CLIENT_NAME, "index.js", remoteIndex);
                        setTimeout(() => ChatLib.command("ct load", true), 1000);
                        return;
                    }
                }

                // Vérif des modules manquants ou vides
                let missing = false;
                FILES.forEach(f => {
                    let path = CLIENT_NAME + "/" + f;
                    if (!FileLib.exists(path) || FileLib.read(path).length < 10) {
                        ChatLib.chat("§b[Solus] §7Réparation : " + f);
                        let content = FileLib.getUrlContent(GITHUB_BASE + f + "?t=" + Date.now());
                        if (content) {
                            FileLib.write(CLIENT_NAME, f, content);
                            missing = true;
                        }
                    }
                });

                if (missing) {
                    ChatLib.chat("§b[Solus] §aFichiers réparés. Rechargement...");
                    setTimeout(() => ChatLib.command("ct load", true), 2000);
                }
            } catch(e) {}
        }).start();
    }
};

global.SolusUpdater.check();

try {
    // Ordre de chargement important
    require("./solus_core.js");      // 1. Cerveau
    require("./solus_chat.js");      // 2. Chat (Croix)
    require("./solus_friend.js");    // 3. Amis/Visuels
    require("./solus_mute.js");      // 4. Mute
    require("./solus_combat.js");    // 5. Combat
    require("./solus_waypoints.js"); // 6. Waypoints
    print("[Solus] Client chargé avec succès (v" + LOADER_VERSION + ").");
} catch(e) {
    console.log("[Solus] Erreur chargement : " + e);
}
