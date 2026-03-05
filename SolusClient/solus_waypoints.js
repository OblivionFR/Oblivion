// FORMAT REQUIS SUR LE GITHUB (waypoints.json) :
//[ {"name": "Base Faction", "x": 100, "y": 64, "z": 200, "color": "b"}, {"name": "KOTH", "x": -50, "y": 70, "z": -50, "color": "c"} ]

const S = global.Solus;

register("renderWorld", () => {
    if (!S.config.showWaypoints) return;
    if (!S.cloud.waypoints || S.cloud.waypoints.length === 0) return;

    S.cloud.waypoints.forEach(wp => {
        if (wp.name && wp.x != null && wp.y != null && wp.z != null) {
            // Calcul de distance sans crash 1.8.9
            let dx = Player.getX() - wp.x;
            let dy = Player.getY() - wp.y;
            let dz = Player.getZ() - wp.z;
            let dist = Math.round(Math.sqrt(dx*dx + dy*dy + dz*dz));

            let col = wp.color || "b"; // Aqua par défaut
            let txt = "§" + col + "§l" + wp.name + "\n§7[" + dist + "m]";

            // Affiche le waypoint dans le monde
            Tessellator.drawString(txt, wp.x + 0.5, wp.y + 1.5, wp.z + 0.5, 0, true, 0.05, false);
        }
    });
});
