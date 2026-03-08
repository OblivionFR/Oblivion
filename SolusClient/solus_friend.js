// ==========================================
// MODULE: SOLUS FRIEND (Version Finale)
// ==========================================
const FRIEND_FILE = "SolusClient";
const COULEUR_AMI = "§b§l"; 
const JOUER_SON = true;

let friends = [];

function getSafePlayersFriend() {
    let players = [];
    try {
        if (World.isLoaded()) {
            World.getAllPlayers().forEach(p => players.push(p.getName()));
        }
    } catch (e) {}
    return [...new Set(players)];
}

// --- Sauvegarde ---
try {
    let saved = FileLib.read(FRIEND_FILE, "friends.json");
    if (saved) friends = JSON.parse(saved);
} catch (e) {}

function saveFriends() { FileLib.write(FRIEND_FILE, "friends.json", JSON.stringify(friends)); }

// --- Logique ---
function handleFriend(args) {
    if (!args || args.length === 0) {
        ChatLib.chat("&8&m---------------------------------------");
        ChatLib.chat("&b&l⭐ Solus Friends ⭐");
        ChatLib.chat("&3/sfriend add <joueur>");
        ChatLib.chat("&3/sfriend remove <joueur>");
        ChatLib.chat("&3/sfriend list");
        return;
    }
    let action = args[0].toLowerCase();

    if (action === "add") {
        if (args.length < 2) return ChatLib.chat("&cErreur: Pseudo manquant.");
        let player = args[1];
        if (!friends.some(f => f.toLowerCase() === player.toLowerCase())) {
            friends.push(player); saveFriends(); ChatLib.chat("&aAmi &b" + player + " &aajouté !");
        } else ChatLib.chat("&cDéjà ami.");
    } 
    else if (action === "remove") {
        if (args.length < 2) return ChatLib.chat("&cErreur: Pseudo manquant.");
        let idx = friends.findIndex(f => f.toLowerCase() === args[1].toLowerCase());
        if (idx !== -1) {
            friends.splice(idx, 1); saveFriends(); ChatLib.chat("&c" + args[1] + " retiré.");
        } else ChatLib.chat("&cPas dans la liste.");
    } 
    else if (action === "list") {
        ChatLib.chat("&b⭐ Vos Amis (" + friends.length + ") ⭐");
        friends.forEach(f => {
            new Message(`&3- &b${f} `, new TextComponent("&8[&cRetirer&8]").setClick("run_command", `/sfriend remove ${f}`)).chat();
        });
    }
}

// Commande courte
register("command", (...args) => handleFriend(args)).setName("sfriend").setTabCompletions((args) => {
    if (!args || args.length === 0) return [];
    if (args.length === 1) return ["add", "remove", "list"].filter(a => a.startsWith(args[0].toLowerCase()));
    if (args.length === 2 && args[0] === "add") return getSafePlayersFriend().filter(p => p.toLowerCase().startsWith(args[1].toLowerCase()));
    return [];
});

// Hijack /solus friend (Le truc important pour toi)
register("messageSent", (message, event) => {
    if (message.toLowerCase().startsWith("/solus friend")) {
        cancel(event); 
        handleFriend(message.split(" ").slice(2));
    }
});

// Highlight & Son
register("chat", (event) => {
    if (friends.length === 0) return;
    
    let unformatted = ChatLib.getChatMessage(event, false);
    let formatted = ChatLib.getChatMessage(event, true);
    let changed = false;

    friends.forEach(f => {
        if (new RegExp("\\b" + f + "\\b", "i").test(unformatted)) {
            changed = true;
            formatted = formatted.replace(new RegExp("(" + f + ")", "ig"), COULEUR_AMI + "$1§r"); 
        }
    });

    if (changed) {
        cancel(event); 
        ChatLib.chat(formatted); 
        if (JOUER_SON) World.playSound("random.orb", 1, 1);
    }
});
