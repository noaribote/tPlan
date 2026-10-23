/**
 * Types métier partagés pour la documentation ; aucune importation à l’exécution.
 * @typedef {import('../types').Note} Note
 * @typedef {import('../types').JsonValue} JsonValue
 */
"use strict";

    const list = document.getElementById("liste");
    const count = document.getElementById("compteur");
    const emptyState = document.getElementById("empty-state");
    const modal = document.getElementById("note-modal");
    const form = document.getElementById("formulaire");
    const titleInput = document.getElementById("titre");
    const contentInput = document.getElementById("contenu");
    const modalTitle = document.getElementById("modal-titre");
    const submitButton = form.querySelector('[type="submit"]');
    const deleteModal = document.getElementById("delete-modal");
    const confirmDelete = document.getElementById("confirm-delete");
    let deletingId = null;
    let editingId = null;
    let notes = [];
    let notesReady;

    /**
     * Lit les notes via le pont Electron ; utilise une liste vide si les données ne sont pas un tableau.
     * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
     * @returns {Promise<Note[]>} Notes chargées ; rejetée si la lecture échoue.
     * @description Types utilisés : Promise<Note[]>, string, Note.
     */
    async function loadNotes() {
      const saved = await window.tplanData.read("notes");
      return Array.isArray(saved) ? saved : [];
    }

    /**
     * Enregistre la liste notes dans model/notes.json ; journalise puis propage toute erreur d’écriture.
     * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
     * @returns {Promise<void>} Résolue après sauvegarde, rejetée en cas d’échec.
     * @description Types utilisés : Promise<void>, string, Note.
     */
    async function saveNotes() {
      try {
        await window.tplanData.write("notes", notes);
      } catch (error) {
        console.error("Impossible d'enregistrer les notes :", error);
        throw error;
      }
    }

    /**
     * Formate un horodatage en date et heure françaises.
     * @param {string} value - Horodatage ISO de la note.
     * @returns {string} Date longue et heure courte ; lève RangeError si la date est invalide.
     * @description Types utilisés : string, Date.
     */
    function formatDate(value) {
      return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
    }

    /**
     * Reconstruit les cartes des notes, leurs boutons et le compteur à partir de notes.
     * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
     * @returns {void} Aucune valeur ; modifie le DOM et installe les événements des cartes.
     * @description Types utilisés : void, HTMLElement, boolean, string, number, Note.
     */
    function renderNotes() {
      list.replaceChildren();
      count.textContent = `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;
      emptyState.hidden = notes.length > 0;

      for (const note of notes) {
        const article = document.createElement("article");
        article.className = "note";
        const title = document.createElement("h2");
        title.textContent = note.title;
        const content = document.createElement("p");
        content.textContent = note.content;
        const time = document.createElement("time");
        time.dateTime = note.updatedAt;
        time.textContent = formatDate(note.updatedAt);
        const actions = document.createElement("div");
        actions.className = "note__actions";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Modifier";
        edit.addEventListener("click",
          /**
           * Traite l’événement « click » de edit.
           * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : void, Note.
           */
          () => openModal(note));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "supprimer";
        remove.textContent = "Supprimer";
        remove.addEventListener("click",
          /**
           * Traite l’événement « click » de remove. Ouvre la confirmation de suppression.
           * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
           * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
           * @description Types utilisés : void, HTMLElement, string, Note.
           */
          () => {
          deletingId = note.id;
          document.getElementById("delete-note-title").textContent = note.title;
          deleteModal.showModal();
        });

        actions.append(edit, remove);
        article.append(title, content, time, actions);
        list.append(article);
      }
    }

    document.getElementById("cancel-delete").addEventListener("click",
      /**
       * Traite l’événement « click » de document.getElementById("cancel-delete"). Ferme le dialogue concerné lorsque les conditions sont remplies.
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : void.
       */
      () => deleteModal.close());
    deleteModal.addEventListener("click",
      /**
       * Traite l’événement « click » de deleteModal. Ferme le dialogue concerné lorsque les conditions sont remplies.
       * @param {MouseEvent} event - Événement déclenchant le traitement.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : MouseEvent, void.
       */
      (event) => {
      if (event.target === deleteModal) deleteModal.close();
    });
    deleteModal.addEventListener("close",
      /**
       * Traite l’événement « close » de deleteModal.
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : void.
       */
      () => { deletingId = null; });
    document.getElementById("delete-form").addEventListener("submit",
      /**
       * Traite l’événement « submit » de document.getElementById("delete-form"). Ferme le dialogue concerné lorsque les conditions sont remplies. Reconstruit la liste des notes. Sauvegarde les modifications et gère les erreurs de persistance.
       * @param {SubmitEvent} event - Événement déclenchant le traitement.
       * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
       * @description Types utilisés : SubmitEvent, Promise<void>, boolean, string, Note.
       */
      async (event) => {
      event.preventDefault();
      if (confirmDelete.disabled || !deletingId) return;
      const previousNotes = notes;
      notes = notes.filter(
        /**
         * Conserve les éléments dont l’identifiant diffère de celui à supprimer.
         * @param {Note} note - Note courante.
         * @returns {boolean} Résultat du test appliqué à l’élément.
         * @description Types utilisés : Note, boolean.
         */
        (note) => note.id !== deletingId);
      confirmDelete.disabled = true;
      try {
        await saveNotes();
        renderNotes();
        deleteModal.close();
      } catch (error) {
        notes = previousNotes;
        renderNotes();
        alert("Impossible de supprimer la note : " + (error.message || String(error)));
      } finally {
        confirmDelete.disabled = false;
      }
    });

    /**
     * Prépare et ouvre le formulaire de création ou de modification d’une note si le chargement est initialisé.
     * @param {Note|null} [note] - Note à modifier, ou null pour une création.
     * @returns {void} Aucune valeur ; modifie editingId, le formulaire et le focus.
     * @description Types utilisés : Note|null, void, HTMLElement, string, Note.
     */
    function openModal(note = null) {
      if (!notesReady) return;
      form.reset();
      editingId = note?.id ?? null;
      modalTitle.textContent = editingId ? "Modifier la note" : "Ajouter une note";
      submitButton.textContent = editingId ? "Enregistrer" : "Ajouter la note";
      if (note) {
        titleInput.value = note.title;
        contentInput.value = note.content;
      }
      modal.showModal();
      titleInput.focus();
    }

    document.getElementById("ouvrir-modal").addEventListener("click",
      /**
       * Traite l’événement « click » de document.getElementById("ouvrir-modal").
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : void.
       */
      () => openModal());
    document.getElementById("fermer-modal").addEventListener("click",
      /**
       * Traite l’événement « click » de document.getElementById("fermer-modal"). Ferme le dialogue concerné lorsque les conditions sont remplies.
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : void.
       */
      () => modal.close());
    document.getElementById("annuler-modal").addEventListener("click",
      /**
       * Traite l’événement « click » de document.getElementById("annuler-modal"). Ferme le dialogue concerné lorsque les conditions sont remplies.
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : void.
       */
      () => modal.close());
    modal.addEventListener("click",
      /**
       * Traite l’événement « click » de modal. Ferme le dialogue concerné lorsque les conditions sont remplies.
       * @param {MouseEvent} event - Événement déclenchant le traitement.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : MouseEvent, void.
       */
      (event) => {
      if (event.target === modal) modal.close();
    });

    form.addEventListener("submit",
      /**
       * Traite l’événement « submit » de form. Ferme le dialogue concerné lorsque les conditions sont remplies. Reconstruit la liste des notes. Sauvegarde les modifications et gère les erreurs de persistance.
       * @param {SubmitEvent} event - Événement déclenchant le traitement.
       * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
       * @description Types utilisés : SubmitEvent, Promise<void>, Date, string, Note.
       */
      async (event) => {
      event.preventDefault();
      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      if (!title || !content) return;

      const timestamp = new Date().toISOString();
      if (editingId) {
        const note = notes.find(
          /**
           * Compare l’identifiant de l’élément à celui recherché.
           * @param {Note} item - Note courante.
           * @returns {boolean} Résultat du test appliqué à l’élément.
           * @description Types utilisés : Note, boolean.
           */
          (item) => item.id === editingId);
        if (note) Object.assign(note, { title, content, updatedAt: timestamp });
      } else {
        notes.unshift({ id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, title, content, updatedAt: timestamp });
      }
      try {
        await saveNotes();
        renderNotes();
        modal.close();
      } catch (error) {
        alert("?chec d?enregistrement de model/notes.json : " + (error.message || String(error)));
      }
    });

    notesReady = loadNotes()
      .then(
        /**
         * Poursuit le traitement après résolution de l’opération précédente. Reconstruit la liste des notes.
         * @param {Note[]} saved - Notes lues depuis le stockage.
         * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
         * @description Types utilisés : Note[], void, Note.
         */
        saved => {
        notes = saved;
        renderNotes();
      })
      .catch(
        /**
         * Traite l’erreur de l’opération précédente.
         * @param {Error} error - Erreur transmise par la promesse rejetée.
         * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
         * @description Types utilisés : Error, Promise<void>, JsonValue, string, Note.
         */
        async error => {
        console.error("Notes load failed", error);
        let details = error.message || String(error);

        try {
          details += "\n" + JSON.stringify(await window.tplanData.diagnose());
        } catch (diagnosticError) {
          details += "\nAPI diagnostic unavailable: " + diagnosticError.message;
        }

        alert("Impossible de lire les notes :\n" + details);
      });
