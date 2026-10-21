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
const dataAPI = window.tplanData;
dataAPI.read("app").then(data => {
    if (data.spotify) { lien.value = data.spotify; chargerSpotify(data.spotify); }
});

const grille = document.querySelector(".PlacementIframes");
const main = grille.closest("main");
const toggleEditMode = document.getElementById("toggleEditMode");
let modeEdition = false;
let tuileDeplacee = null;

toggleEditMode.addEventListener("click", () => {
    modeEdition = !modeEdition;
    grille.classList.toggle("edit-mode", modeEdition);
    toggleEditMode.setAttribute("aria-pressed", String(modeEdition));
    toggleEditMode.setAttribute("aria-label", modeEdition ? "Terminer la modification" : "Activer le mode éditeur");
    toggleEditMode.style.background = modeEdition ? "#1ed760" : "#1f7a63";
    toggleEditMode.title = modeEdition ? "Terminer la modification" : "Activer le mode éditeur";
});

function definirPleinEcran(tile, isExpanded) {
        tile.classList.toggle("expanded", isExpanded);
        const panneauOuvert = Boolean(grille.querySelector(".iframe-tile.expanded"));
        grille.classList.toggle("has-expanded", panneauOuvert);
        main.classList.toggle("has-expanded", panneauOuvert);
        const button = tile.querySelector(".expand-tile");
        button.innerHTML = isExpanded ? '<i class="fa-solid fa-down-left-and-up-right-to-center"></i>' : '<i class="fa-solid fa-expand"></i>';
        button.title = isExpanded ? "Réduire" : "Agrandir";
        button.setAttribute("aria-label", `${isExpanded ? "Réduire" : "Agrandir"} ${tile.querySelector("iframe").title}`);
}

main.addEventListener("click", (event) => {
    // Un clic sur le pseudo-élément ::before cible son parent main.
    if (event.target !== main) return;
    const tile = grille.querySelector(".iframe-tile.expanded");
    if (tile) definirPleinEcran(tile, false);
});

grille.querySelectorAll(".iframe-tile").forEach((tile) => {
    tile.querySelector(".expand-tile").addEventListener("click", () => {
        const isExpanded = !tile.classList.contains("expanded");
        grille.querySelectorAll(".iframe-tile.expanded").forEach((item) => definirPleinEcran(item, false));
        definirPleinEcran(tile, isExpanded);
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
            sauvegarderPositions();
            window.setTimeout(() => tile.classList.remove("drop-settling"), 280);
        }
        tile.classList.remove("dragging");
        grille.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
        tuileDeplacee = null;
    };
    tile.querySelector(".drag-handle").addEventListener("pointerup", terminerDeplacement);
    tile.querySelector(".drag-handle").addEventListener("pointercancel", terminerDeplacement);
});

const POSITIONS = ["left", "top-right", "bottom-right"];

function sauvegarderPositions() {
    const positions = {};
    grille.querySelectorAll(".iframe-tile").forEach((tile) => {
        positions[tile.dataset.id] = POSITIONS.find((name) => tile.classList.contains(name));
    });
    dataAPI.write("preferences", { positions }).catch(console.error);
}

dataAPI.read("preferences").then(({ positions: positionsSauvegardees } = {}) => {
    if (positionsSauvegardees && typeof positionsSauvegardees === "object" && !Array.isArray(positionsSauvegardees)) {
        grille.querySelectorAll(".iframe-tile").forEach((tile) => {
            const classe = positionsSauvegardees[tile.dataset.id];
            if (POSITIONS.includes(classe)) {
                POSITIONS.forEach((position) => tile.classList.remove(position));
                tile.classList.add(classe);
            }
        });
    }
}).catch(error => console.error("Impossible de charger les pr?f?rences :", error));
