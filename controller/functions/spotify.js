export function chargerSpotify(url) {
    const player = document.getElementById("playerSpotify");
    if (!player || !url) return false;
    let parsed;
    try {
        parsed = new URL(url.trim());
    } catch {
        return false;
    }
    if (parsed.hostname !== "open.spotify.com") return false;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed") parts.shift();
    if (!parts.length) return false;
    parsed.pathname = `/embed/${parts.join("/")}`;
    parsed.search = "";
    player.src = parsed.toString();
    window.tplanData
        .read("app")
        .then(data =>
            window.tplanData.write("app", {
                ...data,
                spotify: url.trim()
            })
        )
        .catch(console.error);
    return true;
}
