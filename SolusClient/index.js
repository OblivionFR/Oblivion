// ==========================================
// SOLUS CLIENT - LOADER & AUTO-INSTALLER
// ==========================================
const CURRENT_VERSION = "1.1"; 
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/refs/heads/main/SolusClient/";

const FILES_TO_UPDATE =["index.js", "solus_friend.js", "solus_mute.js"];
const File = Java.type("java.io.File");

let needsReload = false;

// 1. VÉRIFICATION ET CRÉATION DES FICHIERS MANQUANTS (Auto-Install)
FILES_TO_UPDATE.forEach(file => {
    let f = new File(Config.modulesFolder + "/" + CLIENT_NAME + "/" + file);
    if (!f.exists()) {
        print("[Solus] Installation du fichier manquant : " + file);
        let content = FileLib.getUrlContent(GITHUB_BASE + file + "?t=" + Date.now());
        if (content && content.length > 10) {
            FileLib.write(CLIENT_NAME, file, content);
            needsReload = true;
        }
    }
});

if (needsReload) {
    ChatLib.chat("§b[Solus] §aInstallation initiale terminée ! Lancement dans 2 secondes...");
    setTimeout(() => ChatLib.command("ct load", true), 2000);
} else {
    // 2. VÉRIFICATION DES MISES À JOUR (Auto-Updater en arrière-plan)
    new Thread(() => {
        try {
            let remoteIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
            if (!remoteIndex) return;

            let match = remoteIndex.match(/const CURRENT_VERSION = "([0-9.]+)";/);
            if (match && match[1] !== CURRENT_VERSION) {
                ChatLib.chat("§b[Solus] §fMise à jour détectée (v" + match[1] + ") ! Téléchargement...");
                
                FILES_TO_UPDATE.forEach(file => {
                    let content = FileLib.getUrlContent(GITHUB_BASE + file + "?t=" + Date.now());
                    if (content && content.length > 10) {
                        FileLib.write(CLIENT_NAME, file, content);
                    }
                });

                ChatLib.chat("§b[Solus] §aMise à jour terminée ! Rechargement...");
                setTimeout(() => ChatLib.command("ct load", true), 1500);
            }
        } catch(e) {}
    }).start();

    // 3. CHARGEMENT DES SOUS-MODULES
    try {
        require("./solus_friend.js");
        require("./solus_mute.js");
        print("[Solus] Modules chargés avec succès.");
    } catch(e) {
        ChatLib.chat("§c[Solus] Erreur critique au chargement : " + e);
    }
}
