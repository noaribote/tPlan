(() => {
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

    async function enregistrer(changements) {
        try {
            await window.tplanData.write("preferences", changements);
            statut.textContent = "Vos choix sont enregistrés automatiquement.";
        } catch {
            statut.textContent = "Impossible d’enregistrer les préférences.";
        }
    }

    function selectionner(attribut, valeur) {
        dialogue.querySelectorAll(`[${attribut}]`).forEach((bouton) => {
            bouton.setAttribute("aria-pressed", String(bouton.getAttribute(attribut) === valeur));
        });
    }

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

    function appliquerTheme(valeur) {
        theme = valeur;
        document.documentElement.dataset.theme = valeur;
        grille.querySelectorAll("iframe").forEach(appliquerIframe);
        selectionner("data-theme-choice", valeur);
    }

    function appliquerCouleur(valeur) {
        couleur = valeur;
        document.documentElement.dataset.color = valeur;
        grille.querySelectorAll("iframe").forEach(appliquerIframe);
        selectionner("data-color-choice", valeur);
    }

    function appliquerGrille(valeur) {
        grille.dataset.grid = valeur;
        selectionner("data-grid-choice", valeur);
    }

    grille.querySelectorAll("iframe").forEach((iframe) => {
        iframe.addEventListener("load", () => appliquerIframe(iframe));
    });
    window.tplanData.read("preferences").then(saved => {
        preferences = { ...preferences, ...(saved || {}) };
        theme = themes.includes(preferences.theme) ? preferences.theme : "clair";
        appliquerTheme(theme);
        appliquerCouleur(couleurs.includes(preferences.color) ? preferences.color : "violet");
        appliquerGrille(dispositions.includes(preferences.grid) ? preferences.grid : "actuel");
    });

    ouvrir.addEventListener("click", () => {
        if (!dialogue.open) dialogue.showModal();
        ouvrir.setAttribute("aria-expanded", "true");
    });
    document.getElementById("fermerPersonnalisation").addEventListener("click", () => dialogue.close());
    dialogue.addEventListener("close", () => {
        ouvrir.setAttribute("aria-expanded", "false");
        ouvrir.focus();
    });
    dialogue.addEventListener("click", (event) => {
        if (event.target !== dialogue) return;
        const rect = dialogue.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialogue.close();
    });
    dialogue.querySelectorAll("[data-theme-choice]").forEach((bouton) => {
        bouton.addEventListener("click", () => {
            appliquerTheme(bouton.dataset.themeChoice);
            preferences.theme = theme;
            enregistrer({ theme });
        });
    });
    dialogue.querySelectorAll("[data-color-choice]").forEach((bouton) => {
        bouton.addEventListener("click", () => {
            appliquerCouleur(bouton.dataset.colorChoice);
            preferences.color = couleur;
            enregistrer({ color: couleur });
        });
    });
    dialogue.querySelectorAll("[data-grid-choice]").forEach((bouton) => {
        bouton.addEventListener("click", () => {
            appliquerGrille(bouton.dataset.gridChoice);
            preferences.grid = bouton.dataset.gridChoice;
            enregistrer({ grid: preferences.grid });
        });
    });
})();
