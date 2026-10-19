"use strict";

/* ============================================================
   Gestionnaire de tâches : un fichier JSON dédié
   - Tri : deadline (sans deadline en dernier), puis priorité
   ============================================================ */

const PRIORITY_ORDER = { urgent: 0, moyen: 1, standard: 2 };
const PRIORITY_LABEL = { urgent: "Urgent", moyen: "Moyen", standard: "Standard" };
const CATEGORY_LABEL = { professionnel: "Professionnel", personnel: "Personnel" };
const CATEGORY_CLASS = { professionnel: "badge-pro", personnel: "badge-perso" };

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

/* ---------- Fichier JSON ---------- */
async function loadTasks() {
  const data = await window.tplanData.read("tasks");
  return Array.isArray(data) ? data : [];
}

function saveTasks() { return window.tplanData.write("tasks", tasks); }

let tasks = [];
let tasksReady;

/* ---------- Utilitaires ---------- */
function newId() {
  return window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

// "2026-10-10" -> "10/10/2026"
function formatDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function getProgress(task) {
  const total = (task.comments || []).length;
  if (total === 0) return null;
  const done = (task.comments || []).filter((c) => c.done).length;
  return Math.round((done / total) * 100);
}

/* ---------- Tri : deadline, puis priorité ---------- */
function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    if (a.deadline && b.deadline && a.deadline !== b.deadline) {
      return a.deadline < b.deadline ? -1 : 1;
    }
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

/* ---------- Affichage ---------- */
function setDate(root, selector, value) {
  const row = root.querySelector(selector);
  if (value) {
    row.querySelector("dd").textContent = formatDate(value);
  } else {
    row.remove();
  }
}

// Met à jour barre + bouton "Valider" sans tout re-générer
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
  validateBtn.hidden = progress < 100;
}

function createTaskElement(task) {
  const li = taskTemplate.content.firstElementChild.cloneNode(true);
  li.dataset.id = task.id;
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
    (task.comments || []).forEach((comment, index) => {
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

function renderTasks() {
  taskList.replaceChildren(...sortTasks(tasks).map(createTaskElement));
  emptyState.hidden = tasks.length > 0;
}

/* ---------- Actions sur les tâches (cocher / valider) ---------- */
taskList.addEventListener("change", (event) => {
  const checkbox = event.target;
  if (!checkbox.matches('.checklist input[type="checkbox"]')) return;

  const li = checkbox.closest(".task");
  const task = tasks.find((t) => t.id === li.dataset.id);
  if (!task) return;

  task.comments[Number(checkbox.dataset.index)].done = checkbox.checked;
  saveTasks().catch(console.error);
  updateProgress(li, task);
});

taskList.addEventListener("click", async (event) => {
  const button = event.target.closest(".btn-validate");
  if (!button) return;

  const li = button.closest(".task");
  const previousTasks = tasks;
  tasks = tasks.filter((task) => task.id !== li.dataset.id);
  try {
    await saveTasks();
    renderTasks();
  } catch (error) {
    tasks = previousTasks;
    renderTasks();
    alert("?chec d?enregistrement de model/tasks.json : " + (error.message || String(error)));
  }
});

/* ---------- Fenêtre modale ---------- */
function addCommentField() {
  const row = commentTemplate.content.firstElementChild.cloneNode(true);
  commentFields.append(row);
  row.querySelector("input").focus();
}

function openModal() {
  if (!tasksReady) return;
  form.reset();
  checkDates();
  commentFields.replaceChildren();
  modal.showModal();
  document.getElementById("task-name").focus();
}

document.getElementById("open-modal").addEventListener("click", openModal);
document.getElementById("close-modal").addEventListener("click", () => modal.close());
document.getElementById("cancel-modal").addEventListener("click", () => modal.close());
document.getElementById("add-comment").addEventListener("click", addCommentField);

// Clic sur le fond sombre = fermeture
modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.close();
});

// Supprimer une ligne de commentaire
commentFields.addEventListener("click", (event) => {
  const removeBtn = event.target.closest(".remove-comment");
  if (removeBtn) removeBtn.closest(".comment-field").remove();
});

// Règles sur les dates :
// - début et fin vont ensemble (les deux ou aucune)
// - la fin ne peut pas précéder le début
// - la fin ne peut pas dépasser la deadline
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
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  checkDates();
  if (!form.reportValidity()) return;

  const data = new FormData(form);

  // Nom ou description composés uniquement d'espaces = refusés
  for (const field of ["name", "description"]) {
    if (!data.get(field).trim()) {
      const input = form.elements[field];
      input.setCustomValidity("Ce champ est obligatoire.");
      input.reportValidity();
      input.addEventListener("input", () => input.setCustomValidity(""), { once: true });
      return;
    }
  }

  const comments = data
    .getAll("comment")
    .map((text) => text.trim())
    .filter((text) => text !== "")
    .map((text) => ({ text, done: false }));

  const task = {
    id: newId(),
    name: data.get("name").trim(),
    description: data.get("description").trim(),
    priority: data.get("priority"),
    category: data.get("category"),
    start: data.get("start") || "",
    end: data.get("end") || "",
    deadline: data.get("deadline") || "",
    comments,
  };
  tasks.push(task);
  try {
    await saveTasks();
    renderTasks();
    modal.close();
  } catch (error) {
    tasks = tasks.filter((item) => item.id !== task.id);
    alert("?chec d?enregistrement de model/tasks.json : " + (error.message || String(error)));
  }
});

/* ---------- Démarrage ---------- */
tasksReady = loadTasks().then((saved) => { tasks = saved; renderTasks(); }).catch(async error => { console.error("Task load failed", error); let details = error.message || String(error); try { details += "\n" + JSON.stringify(await window.tplanData.diagnose()); } catch (diagnosticError) { details += "\nAPI diagnostic unavailable: " + diagnosticError.message; } alert("Impossible de lire les t?ches :\n" + details); });
window.tplanData.onTasksChanged?.(saved => { tasks = Array.isArray(saved) ? saved : []; renderTasks(); });
