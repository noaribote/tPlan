/**
 * Types métier partagés pour la documentation ; aucune importation à l’exécution.
 * @typedef {import('../types').AppData} AppData
 */
/**
 * Valide une URL open.spotify.com, charge sa version intégrée et déclenche la sauvegarde du lien dans les données de l’application.
 * @param {string} url - URL Spotify saisie.
 * @returns {boolean} true si le lecteur est chargé, false si le lecteur ou le lien est invalide ; la sauvegarde reste asynchrone.
 * @description Types utilisés : string, boolean, HTMLElement, URL, number.
 */
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
        .then(
          /**
           * Poursuit le traitement après résolution de l’opération précédente.
           * @param {AppData} data - Données de configuration de l’application.
           * @returns {Promise<boolean>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
           * @description Types utilisés : AppData, Promise<boolean>, string.
           */
          data =>
            window.tplanData.write("app", {
                ...data,
                spotify: url.trim()
            })
        )
        .catch(console.error);
    return true;
}
