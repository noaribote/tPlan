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
    let editingId = null;
    let notes = [];
    let notesReady;

    async function loadNotes() {
      const saved = await window.tplanData.read("notes");
      return Array.isArray(saved) ? saved : [];
    }

    async function saveNotes() {
      try {
        await window.tplanData.write("notes", notes);
      } catch (error) {
        console.error("Impossible d'enregistrer les notes :", error);
        throw error;
      }
    }

    function formatDate(value) {
      return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
    }

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
        edit.addEventListener("click", () => openModal(note));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "supprimer";
        remove.textContent = "Supprimer";
        remove.addEventListener("click", () => {
          notes = notes.filter((item) => item.id !== note.id);
          saveNotes().then(renderNotes).catch(error => alert("La suppression de la note a ?chou? : " + error.message));
        });

        actions.append(edit, remove);
        article.append(title, content, time, actions);
        list.append(article);
      }
    }

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

    document.getElementById("ouvrir-modal").addEventListener("click", () => openModal());
    document.getElementById("fermer-modal").addEventListener("click", () => modal.close());
    document.getElementById("annuler-modal").addEventListener("click", () => modal.close());
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.close();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      if (!title || !content) return;

      const timestamp = new Date().toISOString();
      if (editingId) {
        const note = notes.find((item) => item.id === editingId);
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

    notesReady = loadNotes().then((saved) => { notes = saved; renderNotes(); }).catch(async error => { console.error("Notes load failed", error); let details = error.message || String(error); try { details += "\n" + JSON.stringify(await window.tplanData.diagnose()); } catch (diagnosticError) { details += "\nAPI diagnostic unavailable: " + diagnosticError.message; } alert("Impossible de lire les notes :\n" + details); });
