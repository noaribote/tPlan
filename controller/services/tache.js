/**
 * Types métier partagés pour la documentation ; aucune importation à l’exécution.
 * @typedef {import('../types').Task} Task
 * @typedef {import('../types').TaskComment} TaskComment
 * @typedef {import('../types').JsonValue} JsonValue
 */
"use strict";

/* ============================================================
   Gestionnaire de tâches : un fichier JSON dédié
   - Tri : deadline (sans deadline en dernier), puis priorité
   ============================================================ */

const PRIORITY_ORDER = { urgent: 0, moyen: 1, standard: 2 };
const PRIORITY_LABEL = { urgent: "Urgent", moyen: "Moyen", standard: "Standard" };
const CATEGORY_LABEL = { professionnel: "Professionnel", personnel: "Personnel" };
const CATEGORY_CLASS = { professionnel: "badge-pro", personnel: "badge-perso" };
const STATUS_LABEL = { todo: "À faire", "in-progress": "En cours", done: "Terminé" };

/**
 * Retourne le statut reconnu d’une tâche ou le statut par défaut todo.
 * @param {Task} task - Tâche à examiner.
 * @returns {'todo'|'in-progress'|'done'} Statut utilisable par l’interface.
 * @description Types utilisés : Task, 'todo'|'in-progress'|'done', string.
 */
function getStatus(task) {
  return Object.hasOwn(STATUS_LABEL, task.status) ? task.status : "todo";
}

/* ---------- Éléments du DOM ---------- */
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const modal = document.getElementById("task-modal");
const form = document.getElementById("task-form");
const commentFields = document.getElementById("comment-fields");
const taskTemplate = document.getElementById("task-template");
const commentTemplate = document.getElementById("comment-field-template");
const startInput = document.getElementById("task-start");
const endInput = document.getElementById("task-end");
const deadlineInput = document.getElementById("task-deadline");
const archiveModal = document.getElementById("archive-modal");
const archiveTaskList = document.getElementById("archive-task-list");
const archiveEmptyState = document.getElementById("archive-empty-state");
const taskCount = document.getElementById("task-count");

/* ---------- Fichier JSON ---------- */
/**
 * Lit les tâches via le pont Electron ; utilise une liste vide si les données ne sont pas un tableau.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {Promise<Task[]>} Tâches chargées ; rejetée si la lecture échoue.
 * @description Types utilisés : Promise<Task[]>, string, Task.
 */
async function loadTasks() {
  const data = await window.tplanData.read("tasks");
  return Array.isArray(data) ? data : [];
}

/**
 * Sauvegarde la liste tasks dans le fichier JSON des tâches.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {Promise<boolean>} true après écriture ; rejetée si la sauvegarde échoue.
 * @description Types utilisés : Promise<boolean>, string, Task.
 */
function saveTasks() { return window.tplanData.write("tasks", tasks); }

let tasks = [];
let tasksReady;
let editingTaskId = null;
let deletingTaskId = null;
const deleteModal = document.getElementById("delete-modal");
const submitButton = form.querySelector('[type="submit"]');

/* ---------- Utilitaires ---------- */
/**
 * Génère un identifiant UUID, ou un identifiant fondé sur l’heure et un nombre aléatoire si UUID est indisponible.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {string} Identifiant de la nouvelle tâche.
 * @description Types utilisés : string, number.
 */
function newId() {
  return window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

// "2026-10-10" -> "10/10/2026"
/**
 * Inverse les composantes d’une date YYYY-MM-DD pour l’afficher au format DD/MM/YYYY.
 * @param {string} iso - Date ISO sans heure.
 * @returns {string} Date au format français.
 * @description Types utilisés : string.
 */
function formatDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Calcule le pourcentage arrondi de commentaires cochés pour une tâche.
 * @param {Task} task - Tâche dont les commentaires sont examinés.
 * @returns {number|null} Pourcentage de 0 à 100, ou null en l’absence de commentaires.
 * @description Types utilisés : Task, number|null, number.
 */
function getProgress(task) {
  const total = (task.comments || []).length;
  if (total === 0) return null;
  const done = (task.comments || []).filter(
    /**
     * Conserve les commentaires cochés pour calculer la progression.
     * @param {TaskComment} c - Commentaire de tâche courant.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : TaskComment, boolean.
     */
    (c) => c.done).length;
  return Math.round((done / total) * 100);
}

/* ---------- Tri : deadline, puis priorité ---------- */
/**
 * Trie une copie des tâches par échéance croissante, puis priorité ; place les tâches sans échéance à la fin.
 * @param {Task[]} list - Liste des tâches à trier.
 * @returns {Task[]} Nouvelle liste triée ; le tableau fourni est conservé.
 * @description Types utilisés : Task[], number.
 */
function sortTasks(list) {
  return [...list].sort(
    /**
     * Compare deux tâches par échéance puis par priorité.
     * @param {Task} a - Tâche courante.
     * @param {Task} b - Tâche courante.
     * @returns {number} Valeur calculée par le traitement.
     * @description Types utilisés : Task, number.
     */
    (a, b) => {
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    if (a.deadline && b.deadline && a.deadline !== b.deadline) {
      return a.deadline < b.deadline ? -1 : 1;
    }
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

/* ---------- Affichage ---------- */
/**
 * Affiche une date formatée dans une ligne de détail ou retire cette ligne si la date est vide.
 * @param {HTMLElement} root - Racine de la carte.
 * @param {string} selector - Sélecteur de la ligne.
 * @param {string} value - Date YYYY-MM-DD ou chaîne vide.
 * @returns {void} Aucune valeur ; modifie le DOM.
 * @description Types utilisés : HTMLElement, string, void.
 */
function setDate(root, selector, value) {
  const row = root.querySelector(selector);
  if (value) {
    row.querySelector("dd").textContent = formatDate(value);
  } else {
    row.remove();
  }
}

// Met à jour barre + bouton "Valider" sans tout re-générer
/**
 * Actualise la barre de progression et la visibilité du bouton de validation selon les commentaires et le statut.
 * @param {HTMLElement} li - Carte de la tâche.
 * @param {Task} task - Tâche représentée.
 * @returns {void} Aucune valeur ; modifie le DOM.
 * @description Types utilisés : HTMLElement, Task, void, boolean, string, number.
 */
function updateProgress(li, task) {
  const progress = getProgress(task);
  const validateBtn = li.querySelector(".btn-validate");
  if (progress === null) {
    validateBtn.hidden = false; // sans commentaire : toujours visible
    return;
  }
  li.querySelector(".progress-fill").style.width = progress + "%";
  li.querySelector(".progress-value").textContent = progress + " %";
  li.querySelector(".progress-track").setAttribute("aria-valuenow", progress);
  validateBtn.hidden = progress < 100 && getStatus(task) !== "done";
}

/**
 * Clone le modèle de tâche et renseigne statut, priorité, catégorie, dates, commentaires et progression.
 * @param {Task} task - Tâche à représenter.
 * @returns {HTMLElement} Carte de tâche prête à être insérée.
 * @description Types utilisés : Task, HTMLElement, boolean, string, number.
 */
function createTaskElement(task) {
  const li = taskTemplate.content.firstElementChild.cloneNode(true);
  li.dataset.id = task.id;
  const status = getStatus(task);
  li.querySelector(".status-label").textContent = STATUS_LABEL[status];
  li.querySelector(".task-status summary").setAttribute("aria-label", `Statut de ${task.name} : ${STATUS_LABEL[status]}`);
  li.querySelectorAll("[data-status]").forEach(
    /**
     * Synchronise aria-pressed avec la valeur sélectionnée.
     * @param {HTMLElement} button - Élément DOM à traiter.
     * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
     * @description Types utilisés : HTMLElement, void, string.
     */
    button => {
    button.setAttribute("aria-pressed", String(button.dataset.status === status));
  });
  li.classList.add("priority-" + task.priority);

  const square = li.querySelector(".priority-square");
  square.title = "Priorité : " + PRIORITY_LABEL[task.priority].toLowerCase();

  li.querySelector(".task-title").textContent = task.name;
  li.querySelector(".task-desc").textContent = task.description;

  const badge = li.querySelector(".badge");
  badge.textContent = CATEGORY_LABEL[task.category];
  badge.classList.add(CATEGORY_CLASS[task.category]);

  // Dates (affichées seulement si renseignées)
  setDate(li, ".date-start", task.start);
  setDate(li, ".date-end", task.end);
  setDate(li, ".date-deadline", task.deadline);
  if (!task.start && !task.end && !task.deadline) {
    li.querySelector(".task-dates").remove();
  }

  // Commentaires cochables + barre de progression
  const checklist = li.querySelector(".checklist");
  if ((task.comments || []).length === 0) {
    checklist.remove();
    li.querySelector(".progress").remove();
  } else {
    (task.comments || []).forEach(
      /**
       * Construit la case à cocher et le texte d’un commentaire dans la carte de tâche.
       * @param {TaskComment} comment - Commentaire de tâche courant.
       * @param {number} index - Indice de l’élément courant, à partir de zéro.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : TaskComment, number, void, HTMLElement, boolean, string.
       */
      (comment, index) => {
      const item = document.createElement("li");
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      const text = document.createElement("span");
      checkbox.type = "checkbox";
      checkbox.checked = comment.done;
      checkbox.dataset.index = index;
      text.textContent = comment.text;
      label.append(checkbox, text);
      item.append(label);
      checklist.append(item);
    });
  }

  updateProgress(li, task);
  return li;
}

/**
 * Reconstruit les listes actives et archivées ; trie les tâches, désactive les contrôles des archives et actualise les compteurs.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {void} Aucune valeur ; modifie le DOM.
 * @description Types utilisés : void, HTMLElement, boolean, string, number, Task.
 */
function renderTasks() {
  const activeTasks = tasks.filter(
    /**
     * Conserve les tâches actives dont archive ne vaut pas true.
     * @param {Task} task - Tâche courante.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : Task, boolean.
     */
    task => task.archive !== true);
  const archivedTasks = tasks.filter(
    /**
     * Conserve les tâches archivées dont archive vaut true.
     * @param {Task} task - Tâche courante.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : Task, boolean.
     */
    task => task.archive === true);
  taskList.replaceChildren(...sortTasks(activeTasks).map(createTaskElement));
  emptyState.hidden = activeTasks.length > 0;
  taskCount.textContent = `${activeTasks.length} ${activeTasks.length === 1 ? "tâche" : "tâches"}`;
  archiveTaskList.replaceChildren(...sortTasks(archivedTasks).map(
    /**
     * Transforme l’élément courant pour construire la liste résultante.
     * @param {Task} task - Tâche courante.
     * @returns {HTMLElement} Valeur calculée par le traitement.
     * @description Types utilisés : Task, HTMLElement, boolean, string.
     */
    task => {
    const element = createTaskElement(task);
    const archiveButton = element.querySelector(".task-archive");
    element.classList.add("task-archived");
    element.querySelectorAll(".task-status, .btn-edit, .btn-delete, .btn-validate, .checklist input").forEach(
      /**
       * Désactive les contrôles de la tâche archivée.
       * @param {HTMLElement} control - Élément DOM à traiter.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : HTMLElement, void, boolean.
       */
      control => {
      control.disabled = true;
    });
    element.querySelectorAll(".task-status").forEach(
      /**
       * Ferme le menu de statut d’une tâche archivée et retire son accès par tabulation.
       * @param {HTMLElement} status - Élément DOM à traiter.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : HTMLElement, void, boolean, string.
       */
      status => {
      status.open = false;
      status.removeAttribute("tabindex");
    });
    archiveButton.classList.add("task-restore");
    archiveButton.setAttribute("aria-label", "Rétablir cette tâche");
    archiveButton.title = "Rétablir";
    archiveButton.innerHTML = '<i class="fa-solid fa-arrow-rotate-right" aria-hidden="true"></i>';
    return element;
  }));
  archiveEmptyState.hidden = archivedTasks.length > 0;
}

/* ---------- Actions sur les tâches (cocher / valider) ---------- */
document.addEventListener("click",
  /**
   * Traite l’événement « click » de document.
   * @param {MouseEvent} event - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : MouseEvent, void, HTMLElement, boolean, string, Task.
   */
  (event) => {
  document.querySelectorAll(".task-status[open]").forEach(
    /**
     * Traite l’élément courant de la collection.
     * @param {HTMLElement} menu - Élément DOM à traiter.
     * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
     * @description Types utilisés : HTMLElement, void, boolean.
     */
    menu => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});

taskList.addEventListener("keydown",
  /**
   * Traite l’événement « keydown » de taskList.
   * @param {KeyboardEvent} event - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : KeyboardEvent, void, HTMLElement, boolean, string, Task.
   */
  (event) => {
  const menu = event.target.closest(".task-status");
  if (event.key === "Escape" && menu?.open) {
    menu.open = false;
    menu.querySelector("summary").focus();
  }
});

taskList.addEventListener("click",
  /**
   * Traite l’événement « click » de taskList. Reconstruit la liste des tâches. Sauvegarde les modifications et gère les erreurs de persistance.
   * @param {MouseEvent} event - Événement déclenchant le traitement.
   * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
   * @description Types utilisés : MouseEvent, Promise<void>, HTMLElement, boolean, string, Task.
   */
  async (event) => {
  const button = event.target.closest("button[data-status]");
  if (!button) return;
  const li = button.closest(".task");
  const task = tasks.find(
    /**
     * Compare l’identifiant de l’élément à celui recherché.
     * @param {Task} item - Tâche à comparer ou à remplacer.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : Task, boolean.
     */
    item => item.id === li.dataset.id);
  if (!task || li.querySelector(".task-status").dataset.saving) return;
  const previousStatus = getStatus(task);
  task.status = button.dataset.status;
  const menu = li.querySelector(".task-status");
  menu.dataset.saving = "true";
  menu.open = false;
  li.querySelector(".status-label").textContent = STATUS_LABEL[task.status];
  updateProgress(li, task);
  try {
    await saveTasks();
  } catch (error) {
    task.status = previousStatus;
    alert("Impossible d’enregistrer le statut : " + (error.message || String(error)));
  } finally {
    renderTasks();
    [...taskList.children].find(
      /**
       * Compare l’identifiant de l’élément à celui recherché.
       * @param {HTMLElement} item - Élément DOM à traiter.
       * @returns {boolean} Résultat du test appliqué à l’élément.
       * @description Types utilisés : HTMLElement, boolean, Task.
       */
      item => item.dataset.id === task.id)?.querySelector(".task-status summary").focus();
  }
});

taskList.addEventListener("change",
  /**
   * Traite l’événement « change » de taskList. Sauvegarde les modifications et gère les erreurs de persistance.
   * @param {Event} event - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : Event, void, boolean, string, Task.
   */
  (event) => {
  const checkbox = event.target;
  if (!checkbox.matches('.checklist input[type="checkbox"]')) return;

  const li = checkbox.closest(".task");
  const task = tasks.find(
    /**
     * Compare l’identifiant de l’élément à celui recherché.
     * @param {Task} t - Tâche courante.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : Task, boolean.
     */
    (t) => t.id === li.dataset.id);
  if (!task) return;

  task.comments[Number(checkbox.dataset.index)].done = checkbox.checked;
  saveTasks().catch(console.error);
  updateProgress(li, task);
});

archiveTaskList.addEventListener("change",
  /**
   * Traite l’événement « change » de archiveTaskList.
   * @param {Event} event - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : Event, void, boolean, string.
   */
  event => {
  if (!event.target.matches('.checklist input[type="checkbox"]')) return;
  event.preventDefault();
  event.target.checked = !event.target.checked;
});

taskList.addEventListener("click",
  /**
   * Traite l’événement « click » de taskList. Ouvre la confirmation de suppression. Reconstruit la liste des tâches. Sauvegarde les modifications et gère les erreurs de persistance.
   * @param {MouseEvent} event - Événement déclenchant le traitement.
   * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
   * @description Types utilisés : MouseEvent, Promise<void>, HTMLElement, boolean, string, Task.
   */
  async (event) => {
  const button = event.target.closest(".btn-validate, .btn-edit, .btn-delete, .task-archive");
  if (!button) return;

  const li = button.closest(".task");
  const task = tasks.find(
    /**
     * Compare l’identifiant de l’élément à celui recherché.
     * @param {Task} item - Tâche à comparer ou à remplacer.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : Task, boolean.
     */
    (item) => item.id === li.dataset.id);
  if (!task) return;
  if (button.matches(".task-archive")) {
    await setArchived(task, true);
    return;
  }
  if (button.matches(".btn-edit")) { openModal(task); return; }
  if (button.matches(".btn-delete")) {
    deletingTaskId = task.id;
    document.getElementById("delete-task-name").textContent = task.name;
    deleteModal.showModal();
    return;
  }
  const previousTasks = tasks;
  tasks = tasks.filter(
    /**
     * Conserve les éléments dont l’identifiant diffère de celui à supprimer.
     * @param {Task} task - Tâche courante.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : Task, boolean.
     */
    (task) => task.id !== li.dataset.id);
  try {
    await saveTasks();
    renderTasks();
  } catch (error) {
    tasks = previousTasks;
    renderTasks();
    alert("Échec d’enregistrement de model/tasks.json : " + (error.message || String(error)));
  }
});

archiveTaskList.addEventListener("click",
  /**
   * Traite l’événement « click » de archiveTaskList.
   * @param {MouseEvent} event - Événement déclenchant le traitement.
   * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
   * @description Types utilisés : MouseEvent, Promise<void>, boolean, string, Task.
   */
  async (event) => {
  const button = event.target.closest(".task-archive");
  if (!button) return;
  const li = button.closest(".task");
  const task = tasks.find(
    /**
     * Compare l’identifiant de l’élément à celui recherché.
     * @param {Task} item - Tâche à comparer ou à remplacer.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : Task, boolean.
     */
    item => item.id === li.dataset.id);
  if (task) await setArchived(task, false);
});

/**
 * Modifie l’archivage d’une tâche et sauvegarde ; restaure la valeur précédente et affiche une erreur en cas d’échec.
 * @param {Task} task - Tâche à modifier.
 * @param {boolean} archive - true pour archiver, false pour rétablir.
 * @returns {Promise<void>} Résolue après la tentative de sauvegarde et le rafraîchissement.
 * @description Types utilisés : Task, boolean, Promise<void>, string.
 */
async function setArchived(task, archive) {
  const previous = task.archive;
  task.archive = archive;
  try {
    await saveTasks();
    renderTasks();
  } catch (error) {
    if (previous === undefined) delete task.archive;
    else task.archive = previous;
    renderTasks();
    alert("Impossible d’enregistrer l’archivage : " + (error.message || String(error)));
  }
}

archiveModal.addEventListener("click",
  /**
   * Traite l’événement « click » de archiveModal. Ferme le dialogue concerné lorsque les conditions sont remplies.
   * @param {MouseEvent} event - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : MouseEvent, void.
   */
  event => {
  if (event.target === archiveModal) archiveModal.close();
});
document.getElementById("close-archive-modal").addEventListener("click",
  /**
   * Traite l’événement « click » de document.getElementById("close-archive-modal"). Ferme le dialogue concerné lorsque les conditions sont remplies.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void.
   */
  () => archiveModal.close());
document.getElementById("ouvrirArchives").addEventListener("click",
  /**
   * Traite l’événement « click » de document.getElementById("ouvrirArchives").
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void.
   */
  () => archiveModal.showModal());

/* ---------- Fenêtre modale ---------- */
/**
 * Ajoute un champ de commentaire au formulaire et restaure éventuellement son texte et son état coché.
 * @param {TaskComment|null} [comment] - Commentaire existant, ou null pour un champ vide.
 * @returns {void} Aucune valeur ; ajoute une ligne et place le focus dans son champ.
 * @description Types utilisés : TaskComment|null, void, HTMLElement, boolean, string.
 */
function addCommentField(comment = null) {
  const row = commentTemplate.content.firstElementChild.cloneNode(true);
  commentFields.append(row);
  const input = row.querySelector("input");
  input.value = comment?.text || "";
  row.dataset.done = String(Boolean(comment?.done));
  input.focus();
}

/**
 * Prépare et ouvre le formulaire de tâche, ses commentaires et ses dates si le chargement est initialisé.
 * @param {Task|null} [task] - Tâche à modifier, ou null pour une création.
 * @returns {void} Aucune valeur ; modifie editingTaskId, le formulaire et le focus.
 * @description Types utilisés : Task|null, void, HTMLElement, string, Task.
 */
function openModal(task = null) {
  if (!tasksReady) return;
  editingTaskId = task?.id ?? null;
  form.reset();
  for (const field of ["name", "description"]) form.elements[field].setCustomValidity("");
  commentFields.replaceChildren();
  if (task) {
    for (const field of ["name", "description", "priority", "category", "start", "end", "deadline"]) {
      form.elements[field].value = task[field] || "";
    }
    (task.comments || []).forEach(addCommentField);
  }
  document.getElementById("modal-title").textContent = task ? "Modifier la tâche" : "Nouvelle tâche";
  submitButton.textContent = task ? "Enregistrer les modifications" : "Ajouter la tâche";
  checkDates();
  modal.showModal();
  document.getElementById("task-name").focus();
}

document.getElementById("open-modal").addEventListener("click",
  /**
   * Traite l’événement « click » de document.getElementById("open-modal").
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void.
   */
  () => openModal());
document.getElementById("close-modal").addEventListener("click",
  /**
   * Traite l’événement « click » de document.getElementById("close-modal"). Ferme le dialogue concerné lorsque les conditions sont remplies.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void.
   */
  () => modal.close());
document.getElementById("cancel-modal").addEventListener("click",
  /**
   * Traite l’événement « click » de document.getElementById("cancel-modal"). Ferme le dialogue concerné lorsque les conditions sont remplies.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void.
   */
  () => modal.close());
document.getElementById("add-comment").addEventListener("click",
  /**
   * Traite l’événement « click » de document.getElementById("add-comment").
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void.
   */
  () => addCommentField());

// Clic sur le fond sombre = fermeture
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

// Supprimer une ligne de commentaire
commentFields.addEventListener("click",
  /**
   * Traite l’événement « click » de commentFields.
   * @param {MouseEvent} event - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : MouseEvent, void, string.
   */
  (event) => {
  const removeBtn = event.target.closest(".remove-comment");
  if (removeBtn) removeBtn.closest(".comment-field").remove();
});

// Règles sur les dates :
// - début et fin vont ensemble (les deux ou aucune)
// - la fin ne peut pas précéder le début
// - la fin ne peut pas dépasser la deadline
/**
 * Vérifie la paire début/fin et l’ordre des dates par rapport à l’échéance ; renseigne les messages de validation.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {void} Aucune valeur ; modifie la validité des champs de date.
 * @description Types utilisés : void, string.
 */
function checkDates() {
  const start = startInput.value;
  const end = endInput.value;
  const deadline = deadlineInput.value;

  startInput.setCustomValidity(end && !start ? "Indiquez aussi une date de début." : "");

  let endMessage = "";
  if (start && !end) {
    endMessage = "Indiquez aussi une date de fin.";
  } else if (start && end && end < start) {
    endMessage = "La date de fin doit être après la date de début.";
  } else if (end && deadline && end > deadline) {
    endMessage = "La date de fin ne peut pas dépasser la deadline.";
  }
  endInput.setCustomValidity(endMessage);
}
startInput.addEventListener("input", checkDates);
endInput.addEventListener("input", checkDates);
deadlineInput.addEventListener("input", checkDates);

/* ---------- Envoi du formulaire ---------- */
form.addEventListener("submit",
  /**
   * Traite l’événement « submit » de form. Ferme le dialogue concerné lorsque les conditions sont remplies. Reconstruit la liste des tâches. Sauvegarde les modifications et gère les erreurs de persistance.
   * @param {SubmitEvent} event - Événement déclenchant le traitement.
   * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
   * @description Types utilisés : SubmitEvent, Promise<void>, HTMLElement, FormData, boolean, string, Task.
   */
  async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  checkDates();
  if (!form.reportValidity()) return;

  const data = new FormData(form);

  // Nom ou description composés uniquement d'espaces = refusés
  for (const field of ["name", "description"]) {
    if (!data.get(field).trim()) {
      const input = form.elements[field];
      input.setCustomValidity("Ce champ est obligatoire.");
      input.reportValidity();
      input.addEventListener("input",
        /**
         * Traite l’événement « input » de input.
         * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
         * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
         * @description Types utilisés : void, string.
         */
        () => input.setCustomValidity(""), { once: true });
      return;
    }
  }

  const comments = [...commentFields.children].map(
    /**
     * Transforme l’élément courant pour construire la liste résultante.
     * @param {HTMLElement} row - Élément DOM à traiter.
     * @returns {TaskComment} Texte nettoyé et état coché du commentaire.
     * @description Types utilisés : HTMLElement, TaskComment, boolean, string.
     */
    (row) => ({
    text: row.querySelector("input").value.trim(),
    done: row.dataset.done === "true",
  })).filter(
    /**
     * Conserve uniquement les commentaires dont le texte est non vide.
     * @param {TaskComment} comment - Commentaire de tâche courant.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : TaskComment, boolean, string.
     */
    (comment) => comment.text !== "");

  if (editingTaskId && !tasks.some(
    /**
     * Compare l’identifiant de l’élément à celui recherché.
     * @param {Task} item - Tâche à comparer ou à remplacer.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : Task, boolean.
     */
    (item) => item.id === editingTaskId)) {
    alert("Cette tâche n’existe plus. Fermez le formulaire pour actualiser la liste.");
    return;
  }
  const task = {
    id: editingTaskId ?? newId(),
    status: editingTaskId ? getStatus(tasks.find(
      /**
       * Compare l’identifiant de l’élément à celui recherché.
       * @param {Task} item - Tâche à comparer ou à remplacer.
       * @returns {boolean} Résultat du test appliqué à l’élément.
       * @description Types utilisés : Task, boolean.
       */
      item => item.id === editingTaskId)) : "todo",
    name: data.get("name").trim(),
    description: data.get("description").trim(),
    priority: data.get("priority"),
    category: data.get("category"),
    start: data.get("start") || "",
    end: data.get("end") || "",
    deadline: data.get("deadline") || "",
    comments,
  };
  const previousTasks = tasks;
  tasks = editingTaskId ? tasks.map(
    /**
     * Transforme l’élément courant pour construire la liste résultante.
     * @param {Task} item - Tâche à comparer ou à remplacer.
     * @returns {Task} Tâche mise à jour si son identifiant correspond, sinon tâche d’origine.
     * @description Types utilisés : Task.
     */
    (item) => item.id === editingTaskId ? task : item) : [...tasks, task];
  submitButton.disabled = true;
  try {
    await saveTasks();
    renderTasks();
    modal.close();
  } catch (error) {
    tasks = previousTasks;
    renderTasks();
    alert("Échec d’enregistrement de model/tasks.json : " + (error.message || String(error)));
  } finally {
    submitButton.disabled = false;
  }
});

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
  () => { deletingTaskId = null; });
document.getElementById("delete-form").addEventListener("submit",
  /**
   * Traite l’événement « submit » de document.getElementById("delete-form"). Ferme le dialogue concerné lorsque les conditions sont remplies. Reconstruit la liste des tâches. Sauvegarde les modifications et gère les erreurs de persistance.
   * @param {SubmitEvent} event - Événement déclenchant le traitement.
   * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
   * @description Types utilisés : SubmitEvent, Promise<void>, HTMLElement, boolean, string, Task.
   */
  async (event) => {
  event.preventDefault();
  const button = document.getElementById("confirm-delete");
  if (button.disabled || !deletingTaskId) return;
  const previousTasks = tasks;
  tasks = tasks.filter(
    /**
     * Conserve les éléments dont l’identifiant diffère de celui à supprimer.
     * @param {Task} task - Tâche courante.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : Task, boolean.
     */
    (task) => task.id !== deletingTaskId);
  button.disabled = true;
  try {
    await saveTasks();
    renderTasks();
    deleteModal.close();
  } catch (error) {
    tasks = previousTasks;
    renderTasks();
    alert("Impossible de supprimer la tâche : " + (error.message || String(error)));
  } finally {
    button.disabled = false;
  }
});

/* ---------- Démarrage ---------- */
tasksReady = loadTasks()
  .then(
    /**
     * Poursuit le traitement après résolution de l’opération précédente. Reconstruit la liste des tâches.
     * @param {Task[]|Record<string, Task>} saved - Tâches reçues du stockage ou de la notification.
     * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
     * @description Types utilisés : Task[]|Record<string, Task>, void, Task.
     */
    saved => {
    tasks = saved;
    renderTasks();
  })
  .catch(
    /**
     * Traite l’erreur de l’opération précédente.
     * @param {Error} error - Erreur transmise par la promesse rejetée.
     * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
     * @description Types utilisés : Error, Promise<void>, JsonValue, string.
     */
    async error => {
    console.error("Task load failed", error);
    let details = error.message || String(error);

    try {
      details += "\n" + JSON.stringify(await window.tplanData.diagnose());
    } catch (diagnosticError) {
      details += "\nAPI diagnostic unavailable: " + diagnosticError.message;
    }

    alert("Impossible de lire les t?ches :\n" + details);
  });

window.tplanData.onTasksChanged?.(
  /**
   * Actualise les tâches en mémoire et leur affichage après une notification Electron. Reconstruit la liste des tâches.
   * @param {Task[]|Record<string, Task>} saved - Tâches reçues du stockage ou de la notification.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : Task[]|Record<string, Task>, void, Task.
   */
  saved => {
  tasks = Array.isArray(saved) ? saved : [];
  renderTasks();
});
