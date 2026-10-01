import { chargerSpotify } from "./functions/spotify.js";

const lien = document.getElementById("lienSpotify");
lien.addEventListener("change", () => chargerSpotify(lien.value));
const lienSauvegarde = localStorage.getItem("spotify");
if (lienSauvegarde) {
    lien.value = lienSauvegarde;
    chargerSpotify(lienSauvegarde);
}