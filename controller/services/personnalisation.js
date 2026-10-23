/**
 * Types métier partagés pour la documentation ; aucune importation à l’exécution.
 * @typedef {import('../types').Note} Note
 * @typedef {import('../types').Preferences} Preferences
 */
(
  /**
   * Initialise le service et ses gestionnaires d’événements. Ferme le dialogue concerné lorsque les conditions sont remplies.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, HTMLElement, URL, boolean, string, Note, Preferences.
   */
  () => {
    const themes = ["clair", "sombre", "vintage"];
    const couleurs = ["vert", "jaune", "noir", "violet", "bleu", "bordeaux", "rouge", "orange", "magenta", "cyan", "gris"];
    const dispositions = ["actuel", "inverse", "colonnes"];
    const dialogue = document.getElementById("personnalisation");
    const ouvrir = document.getElementById("ouvrirPersonnalisation");
    const grille = document.querySelector(".PlacementIframes");
    const statut = document.getElementById("preferencesStatut");
    const stylesheet = new URL("../assets/css/nav.css", document.baseURI).href;
    let preferences = { theme: "clair", color: "violet", grid: "actuel", positions: { agenda: "left", taches: "top-right", "bloc-note": "bottom-right" } };
    let theme = "clair";
    let couleur = "violet";

    /**
     * Sauvegarde les préférences modifiées et affiche le résultat dans le statut de personnalisation.
     * @param {Partial<Preferences>} changements - Champs de préférences à mettre à jour.
     * @returns {Promise<void>} Résolue après la tentative ; les erreurs sont affichées et absorbées.
     * @description Types utilisés : Partial<Preferences>, Promise<void>, HTMLElement, string, Preferences.
     */
    async function enregistrer(changements) {
        try {
            await window.tplanData.write("preferences", changements);
            statut.textContent = "Vos choix sont enregistrés automatiquement.";
        } catch {
            statut.textContent = "Impossible d’enregistrer les préférences.";
        }
    }

    /**
     * Met à jour aria-pressed sur les choix correspondant à un attribut de personnalisation.
     * @param {string} attribut - Nom de l’attribut des boutons.
     * @param {string} valeur - Valeur du choix sélectionné.
     * @returns {void} Aucune valeur ; modifie les attributs des boutons.
     * @description Types utilisés : string, void, HTMLElement.
     */
    function selectionner(attribut, valeur) {
        dialogue.querySelectorAll(`[${attribut}]`).forEach(
          /**
           * Synchronise aria-pressed avec la valeur sélectionnée.
           * @param {HTMLElement} bouton - Élément DOM à traiter.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : HTMLElement, void, string.
           */
          (bouton) => {
            bouton.setAttribute("aria-pressed", String(bouton.getAttribute(attribut) === valeur));
        });
    }

    /**
     * Injecte la feuille de thème puis applique le thème et la couleur à une iframe locale accessible.
     * @param {HTMLIFrameElement} iframe - Iframe à personnaliser.
     * @returns {void} Aucune valeur ; ignore les documents absents et les accès interdits.
     * @description Types utilisés : HTMLIFrameElement, void, string.
     */
    function appliquerIframe(iframe) {
        // Seuls les trois modules locaux sont concernés, pas le lecteur Spotify.
        try {
            const doc = iframe.contentDocument;
            if (!doc?.head) return;
            if (!doc.getElementById("tplan-theme-styles")) {
                const lien = doc.createElement("link");
                lien.id = "tplan-theme-styles";
                lien.rel = "stylesheet";
                lien.href = stylesheet;
                doc.head.append(lien);
            }
            doc.documentElement.dataset.theme = theme;
            doc.documentElement.dataset.color = couleur;
        } catch { /* Une iframe externe ne partage pas les styles locaux. */ }
    }

    /**
     * Applique le thème au document et aux iframes puis sélectionne le bouton correspondant.
     * @param {string} valeur - Nom du thème à appliquer.
     * @returns {void} Aucune valeur ; modifie theme et le DOM.
     * @description Types utilisés : string, void, HTMLElement.
     */
    function appliquerTheme(valeur) {
        theme = valeur;
        document.documentElement.dataset.theme = valeur;
        grille.querySelectorAll("iframe").forEach(appliquerIframe);
        selectionner("data-theme-choice", valeur);
    }

    /**
     * Applique la couleur au document et aux iframes puis sélectionne le bouton correspondant.
     * @param {string} valeur - Nom de la couleur à appliquer.
     * @returns {void} Aucune valeur ; modifie couleur et le DOM.
     * @description Types utilisés : string, void, HTMLElement.
     */
    function appliquerCouleur(valeur) {
        couleur = valeur;
        document.documentElement.dataset.color = valeur;
        grille.querySelectorAll("iframe").forEach(appliquerIframe);
        selectionner("data-color-choice", valeur);
    }

    /**
     * Applique la disposition de grille et sélectionne son bouton.
     * @param {string} valeur - Nom de disposition à appliquer.
     * @returns {void} Aucune valeur ; modifie le DOM.
     * @description Types utilisés : string, void.
     */
    function appliquerGrille(valeur) {
        grille.dataset.grid = valeur;
        selectionner("data-grid-choice", valeur);
    }

    grille.querySelectorAll("iframe").forEach(
      /**
       * Traite l’élément courant de la collection.
       * @param {HTMLIFrameElement} iframe - Iframe locale à personnaliser.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : HTMLIFrameElement, void, string.
       */
      (iframe) => {
        iframe.addEventListener("load",
          /**
           * Traite l’événement « load » de iframe.
           * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : void.
           */
          () => appliquerIframe(iframe));
    });
    window.tplanData.read("preferences").then(
      /**
       * Poursuit le traitement après résolution de l’opération précédente.
       * @param {Preferences} saved - Préférences enregistrées.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : Preferences, void, string.
       */
      saved => {
        preferences = { ...preferences, ...(saved || {}) };
        theme = themes.includes(preferences.theme) ? preferences.theme : "clair";
        appliquerTheme(theme);
        appliquerCouleur(couleurs.includes(preferences.color) ? preferences.color : "violet");
        appliquerGrille(dispositions.includes(preferences.grid) ? preferences.grid : "actuel");
    });

    ouvrir.addEventListener("click",
      /**
       * Traite l’événement « click » de ouvrir.
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : void, boolean, string.
       */
      () => {
        if (!dialogue.open) dialogue.showModal();
        ouvrir.setAttribute("aria-expanded", "true");
    });
    document.getElementById("fermerPersonnalisation").addEventListener("click",
      /**
       * Traite l’événement « click » de document.getElementById("fermerPersonnalisation"). Ferme le dialogue concerné lorsque les conditions sont remplies.
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : void.
       */
      () => dialogue.close());
    dialogue.addEventListener("close",
      /**
       * Traite l’événement « close » de dialogue.
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : void, boolean, string.
       */
      () => {
        ouvrir.setAttribute("aria-expanded", "false");
        ouvrir.focus();
    });
    dialogue.addEventListener("click",
      /**
       * Traite l’événement « click » de dialogue. Ferme le dialogue concerné lorsque les conditions sont remplies.
       * @param {MouseEvent} event - Événement déclenchant le traitement.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : MouseEvent, void.
       */
      (event) => {
        if (event.target !== dialogue) return;
        const rect = dialogue.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialogue.close();
    });
    dialogue.querySelectorAll("[data-theme-choice]").forEach(
      /**
       * Traite l’élément courant de la collection.
       * @param {HTMLElement} bouton - Élément DOM à traiter.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : HTMLElement, void, string, Preferences.
       */
      (bouton) => {
        bouton.addEventListener("click",
          /**
           * Traite l’événement « click » de bouton.
           * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : void, Preferences.
           */
          () => {
            appliquerTheme(bouton.dataset.themeChoice);
            preferences.theme = theme;
            enregistrer({ theme });
        });
    });
    dialogue.querySelectorAll("[data-color-choice]").forEach(
      /**
       * Traite l’élément courant de la collection.
       * @param {HTMLElement} bouton - Élément DOM à traiter.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : HTMLElement, void, string, Preferences.
       */
      (bouton) => {
        bouton.addEventListener("click",
          /**
           * Traite l’événement « click » de bouton.
           * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : void, Preferences.
           */
          () => {
            appliquerCouleur(bouton.dataset.colorChoice);
            preferences.color = couleur;
            enregistrer({ color: couleur });
        });
    });
    dialogue.querySelectorAll("[data-grid-choice]").forEach(
      /**
       * Traite l’élément courant de la collection.
       * @param {HTMLElement} bouton - Élément DOM à traiter.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : HTMLElement, void, string, Preferences.
       */
      (bouton) => {
        bouton.addEventListener("click",
          /**
           * Traite l’événement « click » de bouton.
           * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : void, Preferences.
           */
          () => {
            appliquerGrille(bouton.dataset.gridChoice);
            preferences.grid = bouton.dataset.gridChoice;
            enregistrer({ grid: preferences.grid });
        });
    });
})();
