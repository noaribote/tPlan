export function chargerSpotify(url) {
    const player = document.getElementById("playerSpotify");
    if (!url.includes("open.spotify.com")) return;
    player.src = url.replace("open.spotify.com/", "open.spotify.com/embed/");
    localStorage.setItem("spotify", url);
}
