// ==========================================
// SOLUS CLIENT - AUTO-UPDATER & LOADER
// ==========================================
const CURRENT_VERSION = "8.0"; 
const CLIENT_NAME = "SolusClient";
const GITHUB_BASE = "https://raw.githubusercontent.com/OblivionFR/Oblivion/main/SolusClient/";

const FILES =["index.js", "solus_core.js", "solus_friend.js", "solus_mute.js"];
const File = Java.type("java.io.File");

let needsReload = false;

// 1. Auto-Installation (télécharge les fichiers manquants)
FILES.forEach(file => {
    let f = new File(Config.modulesFolder + "/" + CLIENT_NAME + "/" + file);
    if (!f.exists()) {
        let content = FileLib.getUrlContent(GITHUB_BASE + file + "?t=" + Date.now());
        if (content && content.length > 10) {
            FileLib.write(CLIENT_NAME, file, content);
            needsReload = true;
        }
    }
});

if (needsReload) {
    ChatLib.chat("§b[Solus] §aInstallation terminée ! Lancement...");
    setTimeout(() => ChatLib.command("ct load", true), 2000);
} else {
    // 2. Vérification des mises à jour
    new Thread(() => {
        try {
            let remoteIndex = FileLib.getUrlContent(GITHUB_BASE + "index.js?t=" + Date.now());
            if (!remoteIndex) return;
            let match = remoteIndex.match(/const CURRENT_VERSION = "([0-9.]+)";/);
            if (match && match[1] !== CURRENT_VERSION) {
                ChatLib.chat("§b[Solus] §fMise à jour (v" + match[1] + ") ! Téléchargement...");
                FILES.forEach(file => {
                    let content = FileLib.getUrlContent(GITHUB_BASE + file + "?t=" + Date.now());
                    if (content && content.length > 10) FileLib.write(CLIENT_NAME, file, content);
                });
                setTimeout(() => ChatLib.command("ct load", true), 2000);
            }
        } catch(e) {}
    }).start();

    // 3. Chargement de l'architecture
    try {
        require("./solus_core.js");   // Le cerveau d'abord
        require("./solus_friend.js"); // Le module ami/pvp
        require("./solus_mute.js");   // Le module mute
    } catch(e) {
        ChatLib.chat("§c[Solus] Erreur critique : " + e);
    }
}
