/**
 * Types métier partagés pour la documentation ; aucune importation à l’exécution.
 * @typedef {import('../types').Preferences} Preferences
 * @typedef {import('../types').AppData} AppData
 */
import { chargerSpotify } from "./spotify.js";

const lien = document.getElementById("lienSpotify");
const spotify = document.querySelector(".spotify");
const toggleSpotify = document.getElementById("toggleSpotify");

toggleSpotify.addEventListener("click",
  /**
   * Traite l’événement « click » de toggleSpotify.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, boolean, string.
   */
  () => {
    const ouvrir = spotify.hidden;
    spotify.hidden = !ouvrir;
    toggleSpotify.setAttribute("aria-expanded", String(ouvrir));
    if (ouvrir) lien.focus();
});

/**
 * Charge le lien Spotify saisi et affiche la validation du champ si le lien est invalide.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {void} Aucune valeur ; actualise le lecteur ou la validité du champ.
 * @description Types utilisés : void, string.
 */
function chargerDepuisChamp() {
    if (!chargerSpotify(lien.value)) {
        lien.setCustomValidity("Saisissez un lien Spotify valide (open.spotify.com).");
        lien.reportValidity();
        return;
    }
    lien.setCustomValidity("");
}
lien.addEventListener("change", chargerDepuisChamp);
lien.addEventListener("keydown",
  /**
   * Traite l’événement « keydown » de lien.
   * @param {KeyboardEvent} event - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : KeyboardEvent, void, string.
   */
  (event) => {
    if (event.key === "Enter") { event.preventDefault(); chargerDepuisChamp(); }
});
const dataAPI = window.tplanData;
dataAPI.read("app").then(
  /**
   * Poursuit le traitement après résolution de l’opération précédente.
   * @param {AppData} data - Données de configuration de l’application.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : AppData, void.
   */
  data => {
    if (data.spotify) { lien.value = data.spotify; chargerSpotify(data.spotify); }
});

const grille = document.querySelector(".PlacementIframes");
const main = grille.closest("main");
const precedent = main.querySelector(".fullscreen-prev");
const suivant = main.querySelector(".fullscreen-next");
const toggleEditMode = document.getElementById("toggleEditMode");
let modeEdition = false;
let tuileDeplacee = null;

toggleEditMode.addEventListener("click",
  /**
   * Traite l’événement « click » de toggleEditMode.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, HTMLElement, string.
   */
  () => {
    modeEdition = !modeEdition;
    grille.classList.toggle("edit-mode", modeEdition);
    toggleEditMode.setAttribute("aria-pressed", String(modeEdition));
    toggleEditMode.setAttribute("aria-label", modeEdition ? "Terminer la modification" : "Activer le mode éditeur");
    toggleEditMode.style.background = modeEdition ? "#1ed760" : "#1f7a63";
    toggleEditMode.title = modeEdition ? "Terminer la modification" : "Activer le mode éditeur";
});

/**
 * Agrandit ou réduit une tuile et synchronise les commandes de navigation et les libellés accessibles.
 * @param {HTMLElement} tile - Tuile contenant une iframe et son bouton.
 * @param {boolean} isExpanded - État agrandi demandé.
 * @returns {void} Aucune valeur ; modifie le DOM.
 * @description Types utilisés : HTMLElement, boolean, void, string.
 */
function definirPleinEcran(tile, isExpanded) {
        tile.classList.toggle("expanded", isExpanded);
        const panneauOuvert = Boolean(grille.querySelector(".iframe-tile.expanded"));
        grille.classList.toggle("has-expanded", panneauOuvert);
        main.classList.toggle("has-expanded", panneauOuvert);
        precedent.hidden = !panneauOuvert;
        suivant.hidden = !panneauOuvert;
        const button = tile.querySelector(".expand-tile");
        button.innerHTML = isExpanded ? '<i class="fa-solid fa-down-left-and-up-right-to-center"></i>' : '<i class="fa-solid fa-expand"></i>';
        button.title = isExpanded ? "Réduire" : "Agrandir";
        button.setAttribute("aria-label", `${isExpanded ? "Réduire" : "Agrandir"} ${tile.querySelector("iframe").title}`);
}

/**
 * Sélectionne le panneau agrandi précédent ou suivant en bouclant sur les tuiles disponibles.
 * @param {number} direction - Décalage dans la liste des panneaux ; généralement -1 ou 1.
 * @returns {void} Aucune valeur ; actualise les panneaux agrandis.
 * @description Types utilisés : number, void, HTMLElement, boolean, string.
 */
function changerPanneau(direction) {
    const tiles = [...grille.querySelectorAll(".iframe-tile")];
    const index = tiles.findIndex(
      /**
       * Initialise le service et ses gestionnaires d’événements.
       * @param {HTMLElement} tile - Élément DOM à traiter.
       * @returns {boolean} Résultat du test appliqué à l’élément.
       * @description Types utilisés : HTMLElement, boolean, string.
       */
      (tile) => tile.classList.contains("expanded"));
    if (index === -1 || tiles.length < 2) return;
    const prochaine = tiles[(index + direction + tiles.length) % tiles.length];
    // Ouvrir le nouveau panneau avant de fermer l'ancien conserve le mode agrandi.
    definirPleinEcran(prochaine, true);
    definirPleinEcran(tiles[index], false);
}

precedent.addEventListener("click",
  /**
   * Traite l’événement « click » de precedent.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, number.
   */
  () => changerPanneau(-1));
suivant.addEventListener("click",
  /**
   * Traite l’événement « click » de suivant.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, number.
   */
  () => changerPanneau(1));

main.addEventListener("click",
  /**
   * Traite l’événement « click » de main.
   * @param {MouseEvent} event - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : MouseEvent, void, HTMLElement, boolean, string.
   */
  (event) => {
    // Un clic sur le pseudo-élément ::before cible son parent main.
    if (event.target !== main) return;
    const tile = grille.querySelector(".iframe-tile.expanded");
    if (tile) definirPleinEcran(tile, false);
});

grille.querySelectorAll(".iframe-tile").forEach(
  /**
   * Traite l’élément courant de la collection.
   * @param {HTMLElement} tile - Élément DOM à traiter.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : HTMLElement, void, boolean, string, number.
   */
  (tile) => {
    tile.querySelector(".expand-tile").addEventListener("click",
      /**
       * Traite l’événement « click » de tile.querySelector(".expand-tile").
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : void, HTMLElement, boolean, string.
       */
      () => {
        const isExpanded = !tile.classList.contains("expanded");
        grille.querySelectorAll(".iframe-tile.expanded").forEach(
          /**
           * Traite l’élément courant de la collection.
           * @param {HTMLElement} item - Tuile dont le mode agrandi doit être fermé.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : HTMLElement, void, boolean.
           */
          (item) => definirPleinEcran(item, false));
        definirPleinEcran(tile, isExpanded);
    });

    tile.querySelector(".drag-handle").addEventListener("pointerdown",
      /**
       * Traite l’événement « pointerdown » de tile.querySelector(".drag-handle").
       * @param {PointerEvent} event - Événement déclenchant le traitement.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : PointerEvent, void, HTMLElement, string, number.
       */
      (event) => {
        if (!modeEdition || event.button !== 0) return;
        event.preventDefault();
        tuileDeplacee = tile;
        tile.classList.add("dragging");
        tile.querySelector(".drag-handle").setPointerCapture(event.pointerId);
    });
    tile.querySelector(".drag-handle").addEventListener("pointermove",
      /**
       * Traite l’événement « pointermove » de tile.querySelector(".drag-handle").
       * @param {PointerEvent} event - Événement déclenchant le traitement.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : PointerEvent, void, HTMLElement, string, number.
       */
      (event) => {
        if (!modeEdition || tuileDeplacee !== tile || event.buttons === 0) return;
        const cible = document.elementFromPoint(event.clientX, event.clientY)?.closest(".iframe-tile");
        grille.querySelectorAll(".drag-over").forEach(
          /**
           * Traite l’élément courant de la collection.
           * @param {HTMLElement} item - Tuile dont le mode agrandi doit être fermé.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : HTMLElement, void, string.
           */
          (item) => item.classList.remove("drag-over"));
        if (cible && cible !== tile) cible.classList.add("drag-over");
    });
    /**
     * Termine le glisser d’une tuile, échange les positions si une cible est trouvée et déclenche leur sauvegarde.
     * @param {PointerEvent} event - Événement de fin ou d’annulation du déplacement.
     * @returns {void} Aucune valeur ; modifie les classes, tuileDeplacee et les préférences.
     * @description Types utilisés : PointerEvent, void, HTMLElement, string, number.
     */
    const terminerDeplacement = (event) => {
        if (tuileDeplacee !== tile) return;
        const cible = document.elementFromPoint(event.clientX, event.clientY)?.closest(".iframe-tile");
        if (cible && cible !== tile) {
            tile.classList.add("drop-settling");
            const classeDepart = [...tile.classList].find(
              /**
               * Teste la condition de recherche sur l’élément courant.
               * @param {string} name - Texte ou clé de l’élément courant.
               * @returns {boolean} Résultat du test appliqué à l’élément.
               * @description Types utilisés : string, boolean.
               */
              (name) => ["left", "top-right", "bottom-right"].includes(name));
            const classeCible = [...cible.classList].find(
              /**
               * Teste la condition de recherche sur l’élément courant.
               * @param {string} name - Texte ou clé de l’élément courant.
               * @returns {boolean} Résultat du test appliqué à l’élément.
               * @description Types utilisés : string, boolean.
               */
              (name) => ["left", "top-right", "bottom-right"].includes(name));
            tile.classList.replace(classeDepart, classeCible);
            cible.classList.replace(classeCible, classeDepart);
            sauvegarderPositions();
            window.setTimeout(
              /**
               * Initialise le service et ses gestionnaires d’événements.
               * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
               * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
               * @description Types utilisés : void, HTMLElement, string.
               */
              () => tile.classList.remove("drop-settling"), 280);
        }
        tile.classList.remove("dragging");
        grille.querySelectorAll(".drag-over").forEach(
          /**
           * Traite l’élément courant de la collection.
           * @param {HTMLElement} item - Tuile dont le mode agrandi doit être fermé.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : HTMLElement, void, string.
           */
          (item) => item.classList.remove("drag-over"));
        tuileDeplacee = null;
    };
    tile.querySelector(".drag-handle").addEventListener("pointerup", terminerDeplacement);
    tile.querySelector(".drag-handle").addEventListener("pointercancel", terminerDeplacement);
});

const POSITIONS = ["left", "top-right", "bottom-right"];

/**
 * Collecte les positions courantes des tuiles et déclenche leur sauvegarde ; journalise les erreurs.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {void} Aucune valeur ; la sauvegarde asynchrone est lancée sans être retournée.
 * @description Types utilisés : void, HTMLElement, string, Preferences.
 */
function sauvegarderPositions() {
    const positions = {};
    grille.querySelectorAll(".iframe-tile").forEach(
      /**
       * Traite l’élément courant de la collection.
       * @param {HTMLElement} tile - Élément DOM à traiter.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : HTMLElement, void.
       */
      (tile) => {
        positions[tile.dataset.id] = POSITIONS.find(
          /**
           * Teste la condition de recherche sur l’élément courant.
           * @param {string} name - Texte ou clé de l’élément courant.
           * @returns {boolean} Résultat du test appliqué à l’élément.
           * @description Types utilisés : string, boolean, HTMLElement.
           */
          (name) => tile.classList.contains(name));
    });
    dataAPI.write("preferences", { positions }).catch(console.error);
}

dataAPI.read("preferences").then(
  /**
   * Poursuit le traitement après résolution de l’opération précédente.
   * @param {Partial<Preferences>} [options] - Préférences dont les positions sont extraites.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : Partial<Preferences>, void, HTMLElement, string.
   */
  ({ positions: positionsSauvegardees } = {}) => {
    if (positionsSauvegardees && typeof positionsSauvegardees === "object" && !Array.isArray(positionsSauvegardees)) {
        grille.querySelectorAll(".iframe-tile").forEach(
          /**
           * Traite l’élément courant de la collection.
           * @param {HTMLElement} tile - Élément DOM à traiter.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : HTMLElement, void.
           */
          (tile) => {
            const classe = positionsSauvegardees[tile.dataset.id];
            if (POSITIONS.includes(classe)) {
                POSITIONS.forEach(
                  /**
                   * Traite l’élément courant de la collection.
                   * @param {string} position - Texte ou clé de l’élément courant.
                   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
                   * @description Types utilisés : string, void, HTMLElement.
                   */
                  (position) => tile.classList.remove(position));
                tile.classList.add(classe);
            }
        });
    }
}).catch(
  /**
   * Traite l’erreur de l’opération précédente.
   * @param {Error} error - Erreur transmise par la promesse rejetée.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : Error, void, string.
   */
  error => console.error("Impossible de charger les pr?f?rences :", error));
