import { chargerSpotify } from "./functions/spotify.js";

const lien = document.getElementById("lienSpotify");
const spotify = document.querySelector(".spotify");
const toggleSpotify = document.getElementById("toggleSpotify");

toggleSpotify.addEventListener("click", () => {
    const ouvrir = spotify.hidden;
    spotify.hidden = !ouvrir;
    toggleSpotify.setAttribute("aria-expanded", String(ouvrir));
    if (ouvrir) lien.focus();
});

function chargerDepuisChamp() {
    if (!chargerSpotify(lien.value)) {
        lien.setCustomValidity("Saisissez un lien Spotify valide (open.spotify.com).");
        lien.reportValidity();
        return;
    }
    lien.setCustomValidity("");
}
lien.addEventListener("change", chargerDepuisChamp);
lien.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); chargerDepuisChamp(); }
});
const lienSauvegarde = localStorage.getItem("spotify");
if (lienSauvegarde) {
    lien.value = lienSauvegarde;
    chargerSpotify(lienSauvegarde);
}

const grille = document.querySelector(".PlacementIframes");
const toggleEditMode = document.getElementById("toggleEditMode");
let modeEdition = false;
let tuileDeplacee = null;

toggleEditMode.addEventListener("click", () => {
    modeEdition = !modeEdition;
    grille.classList.toggle("edit-mode", modeEdition);
    toggleEditMode.setAttribute("aria-pressed", String(modeEdition));
    toggleEditMode.setAttribute("aria-label", modeEdition ? "Terminer la modification" : "Activer le mode éditeur");
    toggleEditMode.style.background = modeEdition ? "#1ed760" : "rgb(255, 208, 0)";
    toggleEditMode.title = modeEdition ? "Terminer la modification" : "Activer le mode éditeur";
});

grille.querySelectorAll(".iframe-tile").forEach((tile) => {
    tile.querySelector(".expand-tile").addEventListener("click", () => {
        const isExpanded = tile.classList.toggle("expanded");
        grille.classList.toggle("has-expanded", isExpanded);
        const button = tile.querySelector(".expand-tile");
        button.textContent = isExpanded ? "⤢" : "⛶";
        button.title = isExpanded ? "Réduire" : "Agrandir";
        button.setAttribute("aria-label", `${isExpanded ? "Réduire" : "Agrandir"} ${tile.querySelector("iframe").title}`);
    });

    tile.querySelector(".drag-handle").addEventListener("pointerdown", (event) => {
        if (!modeEdition || event.button !== 0) return;
        event.preventDefault();
        tuileDeplacee = tile;
        tile.classList.add("dragging");
        tile.querySelector(".drag-handle").setPointerCapture(event.pointerId);
    });
    tile.querySelector(".drag-handle").addEventListener("pointermove", (event) => {
        if (!modeEdition || tuileDeplacee !== tile || event.buttons === 0) return;
        const cible = document.elementFromPoint(event.clientX, event.clientY)?.closest(".iframe-tile");
        grille.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
        if (cible && cible !== tile) cible.classList.add("drag-over");
    });
    const terminerDeplacement = (event) => {
        if (tuileDeplacee !== tile) return;
        const cible = document.elementFromPoint(event.clientX, event.clientY)?.closest(".iframe-tile");
        if (cible && cible !== tile) {
            tile.classList.add("drop-settling");
            const classeDepart = [...tile.classList].find((name) => ["left", "top-right", "bottom-right"].includes(name));
            const classeCible = [...cible.classList].find((name) => ["left", "top-right", "bottom-right"].includes(name));
            tile.classList.replace(classeDepart, classeCible);
            cible.classList.replace(classeCible, classeDepart);
            localStorage.setItem("ordreIframes", JSON.stringify([...grille.querySelectorAll(".iframe-tile")].map((item) => item.dataset.id)));
            window.setTimeout(() => tile.classList.remove("drop-settling"), 280);
        }
        tile.classList.remove("dragging");
        grille.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
        tuileDeplacee = null;
    };
    tile.querySelector(".drag-handle").addEventListener("pointerup", terminerDeplacement);
    tile.querySelector(".drag-handle").addEventListener("pointercancel", terminerDeplacement);
});

try {
    const ordre = JSON.parse(localStorage.getItem("ordreIframes") || "[]");
    ordre.forEach((id) => {
        const tile = grille.querySelector(`.iframe-tile[data-id="${id}"]`);
        if (!tile) return;
        const classeDepart = [...tile.classList].find((name) => ["left", "top-right", "bottom-right"].includes(name));
        const index = ordre.indexOf(id);
        const classes = ["left", "top-right", "bottom-right"];
        if (classes[index]) tile.classList.replace(classeDepart, classes[index]);
    });
} catch { localStorage.removeItem("ordreIframes"); }
