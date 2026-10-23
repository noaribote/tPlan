/**
 * Types métier partagés pour la documentation ; aucune importation à l’exécution.
 * @typedef {import('../types').Task} Task
 * @typedef {import('../types').AgendaTask} AgendaTask
 * @typedef {import('../types').AgendaIndex} AgendaIndex
 */
/* ============================================================
   CONFIG : adapte ces noms à la structure de tes tâches
   ============================================================ */
const CONFIG = {
  fields: {
    title: 'name',              // nom de la tâche
    category: 'category',       // "Professionnel" ou "Personnel"
    start: 'start',             // date de début   (YYYY-MM-DD)
    end: 'end',                 // date de fin     (YYYY-MM-DD)
    deadline: 'deadline'        // deadline        (YYYY-MM-DD)
  }
};

const VIEWS = ['week', 'month', 'year'];           // du plus zoomé au moins zoomé : index 0 = semaine
const VIEW_NAMES = { week: 'Semaine', month: 'Mois', year: 'Année' };

const state = { view: 'month', date: new Date() };
/**
 * Recherche un élément du calendrier par son identifiant.
 * @param {string} id - Identifiant HTML recherché.
 * @returns {HTMLElement|null} Élément trouvé, ou null si absent.
 * @description Types utilisés : string, HTMLElement|null, HTMLElement.
 */
const $ = id => document.getElementById(id);

/* ---------- Dates ---------- */
/**
 * Convertit un nombre en chaîne et le complète à gauche pour obtenir au moins deux caractères.
 * @param {number} n - Nombre à formater.
 * @returns {string} Nombre complété avec un zéro si nécessaire.
 * @description Types utilisés : number, string.
 */
const pad = n => String(n).padStart(2, '0');
/**
 * Formate une date locale au format YYYY-MM-DD.
 * @param {Date} d - Date à formater.
 * @returns {string} Date au format ISO sans heure.
 * @description Types utilisés : Date, string, number.
 */
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/**
 * Extrait une date locale depuis le préfixe YYYY-MM-DD ; les valeurs débordantes sont normalisées par Date.
 * @param {string|null|undefined} s - Texte de la date, éventuellement absent.
 * @returns {Date|null} Date construite, ou null si le préfixe est absent ou non reconnu.
 * @description Types utilisés : string|null|undefined, Date|null, Date, number.
 */
function parse(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
/**
 * Construit une nouvelle date locale décalée du nombre de jours demandé.
 * @param {Date} d - Date de départ.
 * @param {number} n - Décalage en jours, positif ou négatif.
 * @returns {Date} Nouvelle date à minuit local.
 * @description Types utilisés : Date, number.
 */
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/**
 * Calcule le lundi de la semaine contenant la date donnée.
 * @param {Date} d - Date de référence.
 * @returns {Date} Lundi à minuit local.
 * @description Types utilisés : Date, number.
 */
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
/**
 * Retourne le nom français d’un mois.
 * @param {number} y - Année.
 * @param {number} m - Indice du mois, de 0 à 11.
 * @returns {string} Nom du mois en français.
 * @description Types utilisés : number, string, Date.
 */
const monthName = (y, m) => new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long' });

/* ---------- Tâches : lecture + placement par jour ---------- */
let cachedTasks = [];
// Retourne { "YYYY-MM-DD": [ {title, cat}, ... ] }
/**
 * Répartit les tâches non archivées par jour de début, de fin et d’échéance, en évitant les doublons pour une même tâche et un même jour.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {AgendaIndex} Tâches d’affichage regroupées par date YYYY-MM-DD.
 * @description Types utilisés : AgendaIndex, Set<string>, string, number.
 */
function buildIndex() {
  const f = CONFIG.fields, index = {};
  cachedTasks.forEach(
    /**
     * Ajoute la tâche au jour indexé en indiquant si ce jour est son échéance.
     * @param {Task} t - Tâche courante.
     * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
     * @description Types utilisés : Task, void, Set<string>, string, number.
     */
    t => {
    if (t.archive === true) return;
    const start = parse(t[f.start]), end = parse(t[f.end]), dl = parse(t[f.deadline]);
    const days = new Set();                         // Set = jamais deux fois la même tâche le même jour
    if (start && end) {
      const [a, b] = start <= end ? [start, end] : [end, start];
      for (let d = a; d <= b; d = addDays(d, 1)) days.add(fmt(d));
    } else if (start || end) {
      days.add(fmt(start || end));
    }
    if (dl) days.add(fmt(dl));
    if (!days.size) return;                         // aucune date : pas dans l'agenda

    const cat = /^pro/i.test(String(t[f.category] || '')) ? 'pro' : 'perso';
    const title = t[f.title] || t.name || t.text || '(sans titre)';
    const priority = ['urgent', 'moyen', 'standard'].includes(t.priority) ? t.priority : 'standard';
    days.forEach(
      /**
       * Ajoute la tâche au jour indexé en indiquant si ce jour est son échéance.
       * @param {string} k - Texte ou clé de l’élément courant.
       * @returns {number} Valeur calculée par le traitement.
       * @description Types utilisés : string, number.
       */
      k => (index[k] = index[k] || []).push({ title, cat, priority, isDeadline: !!dl && k === fmt(dl) }));
  });
  return index;
}

/**
 * Filtre les tâches d’un jour selon les catégories cochées dans le calendrier.
 * @param {AgendaIndex} index - Tâches indexées par date.
 * @param {string} key - Date YYYY-MM-DD recherchée.
 * @returns {AgendaTask[]} Tâches dont la catégorie est visible.
 * @description Types utilisés : AgendaIndex, string, AgendaTask[], boolean.
 */
function visibleTasks(index, key) {
  const showPro = $('chk-pro').checked, showPerso = $('chk-perso').checked;
  return (index[key] || []).filter(
    /**
     * Sélectionne les éléments qui satisfont la condition indiquée.
     * @param {AgendaTask} t - Tâche courante.
     * @returns {boolean} Résultat du test appliqué à l’élément.
     * @description Types utilisés : AgendaTask, boolean, string.
     */
    t => (t.cat === 'pro' ? showPro : showPerso));
}

/* ---------- Rendu ---------- */
/**
 * Reconstruit la vue active du calendrier à partir de state et cachedTasks ; actualise le titre, le zoom et la barre de défilement.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {void} Aucune valeur ; modifie le DOM.
 * @description Types utilisés : void, Date, HTMLElement, string, number.
 */
function render() {
  const index = buildIndex();
  const cal = $('calendar');
  const y = state.date.getFullYear(), m = state.date.getMonth();
  const todayKey = fmt(new Date());

  if (state.view === 'year') {
    $('title').textContent = y;
    cal.innerHTML = '<div class="year-view">' + Array.from({ length: 12 },
      /**
       * Initialise le service et ses gestionnaires d’événements.
       * @param {unknown} _ - Valeur fournie par l’appelant.
       * @param {number} i - Indice de l’élément courant, à partir de zéro.
       * @returns {string} Valeur calculée par le traitement.
       * @description Types utilisés : unknown, number, string.
       */
      (_, i) => miniMonth(y, i, index, todayKey)).join('') + '</div>';
  } else if (state.view === 'month') {
    $('title').textContent = `${monthName(y, m)} ${y}`;
    cal.innerHTML = monthView(y, m, index, todayKey);
  } else {
    const mon = mondayOf(state.date), sun = addDays(mon, 6);
    $('title').textContent = `${mon.getDate()} ${monthName(mon.getFullYear(), mon.getMonth())} – ${sun.getDate()} ${monthName(sun.getFullYear(), sun.getMonth())} ${sun.getFullYear()}`;
    cal.innerHTML = weekView(mon, index, todayKey);
  }

  $('view-label').textContent = VIEW_NAMES[state.view];
  const i = VIEWS.indexOf(state.view);
  $('zoom-in').disabled = i === 0;
  $('zoom-out').disabled = i === VIEWS.length - 1;
  updateTaskDensity();
  requestAnimationFrame(updateCalendarScrollbar);
}

/* Barre dédiée adjacente au calendrier : indépendante de la visibilité des scrollbars système. */
const calendarScrollbar = $('calendar-scrollbar');
const calendarScrollbarThumb = $('calendar-scrollbar-thumb');
/**
 * Synchronise la taille et la position du curseur avec le défilement du calendrier ; ignore les éléments absents ou sans hauteur.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {void} Aucune valeur ; modifie les styles du curseur.
 * @description Types utilisés : void, HTMLElement, boolean, string, number.
 */
function updateCalendarScrollbar() {
  const cal = $('calendar');
  if (!cal || !calendarScrollbar || !calendarScrollbarThumb) return;
  const trackHeight = calendarScrollbar.clientHeight;
  const contentHeight = cal.scrollHeight;
  if (!trackHeight) return;
  calendarScrollbar.hidden = false;
  const hasOverflow = contentHeight > cal.clientHeight + 1;
  const thumbHeight = hasOverflow
    ? Math.min(trackHeight, Math.max(24, trackHeight * cal.clientHeight / contentHeight))
    : trackHeight;
  const maxThumbTop = trackHeight - thumbHeight;
  const scrollRange = hasOverflow ? contentHeight - cal.clientHeight : 1;
  calendarScrollbarThumb.style.height = `${thumbHeight}px`;
  calendarScrollbarThumb.style.transform = `translateY(${maxThumbTop * cal.scrollTop / scrollRange}px)`;
}

$('calendar').addEventListener('scroll', updateCalendarScrollbar, { passive: true });
new ResizeObserver(updateCalendarScrollbar).observe($('calendar'));
new ResizeObserver(updateCalendarScrollbar).observe(calendarScrollbar);
let scrollbarDrag = null;
calendarScrollbarThumb.addEventListener('pointerdown',
  /**
   * Traite l’événement « pointerdown » de calendarScrollbarThumb.
   * @param {PointerEvent} e - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : PointerEvent, void, string.
   */
  e => {
  e.preventDefault();
  scrollbarDrag = { pointerY: e.clientY, scrollTop: $('calendar').scrollTop };
  calendarScrollbarThumb.setPointerCapture(e.pointerId);
});
calendarScrollbarThumb.addEventListener('pointermove',
  /**
   * Traite l’événement « pointermove » de calendarScrollbarThumb.
   * @param {PointerEvent} e - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : PointerEvent, void, string, number.
   */
  e => {
  if (!scrollbarDrag) return;
  const cal = $('calendar');
  const travel = calendarScrollbar.clientHeight - calendarScrollbarThumb.offsetHeight;
  if (travel > 0) cal.scrollTop = scrollbarDrag.scrollTop + (e.clientY - scrollbarDrag.pointerY) * (cal.scrollHeight - cal.clientHeight) / travel;
});
/**
 * Termine le déplacement du curseur en réinitialisant scrollbarDrag.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {void} Aucune valeur de retour.
 * @description Types utilisés : void.
 */
const stopScrollbarDrag = () => { scrollbarDrag = null; };
calendarScrollbarThumb.addEventListener('pointerup', stopScrollbarDrag);
calendarScrollbarThumb.addEventListener('pointercancel', stopScrollbarDrag);
calendarScrollbar.addEventListener('pointerdown',
  /**
   * Traite l’événement « pointerdown » de calendarScrollbar.
   * @param {PointerEvent} e - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : PointerEvent, void, string, number.
   */
  e => {
  if (e.target === calendarScrollbarThumb) return;
  const rect = calendarScrollbar.getBoundingClientRect();
  const thumbCenter = calendarScrollbarThumb.getBoundingClientRect().top + calendarScrollbarThumb.offsetHeight / 2;
  const direction = e.clientY < thumbCenter ? -1 : 1;
  $('calendar').scrollBy({ top: direction * $('calendar').clientHeight * 0.85, behavior: 'smooth' });
});

// Les titres sont réservés à la vue semaine.
/**
 * Active l’affichage compact des tâches pour la vue mensuelle.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {void} Aucune valeur ; modifie la classe du calendrier.
 * @description Types utilisés : void, HTMLElement, string, Task.
 */
function updateTaskDensity() {
  $('calendar').classList.toggle('compact-tasks', state.view === 'month');
}

/**
 * Génère le HTML d’une tâche avec priorité, catégorie et indicateur d’échéance ; échappe son titre.
 * @param {AgendaTask} t - Tâche d’affichage du calendrier.
 * @returns {string} Fragment HTML de la tâche.
 * @description Types utilisés : AgendaTask, string, Task.
 */
const taskHTML = t => `<div class="task priority-${t.priority}${t.isDeadline ? ' deadline' : ''}" title="${esc(t.title)} — Priorité : ${t.priority}${t.isDeadline ? ' — Échéance' : ''}"><div class="task-markers"><span class="priority-square" aria-label="Priorité : ${t.priority}"></span><span class="category-badge ${t.cat}">${t.cat === 'pro' ? 'Pro' : 'Perso'}</span></div><span class="task-title">${esc(t.title)}</span>${t.isDeadline ? '<span class="deadline-label">Échéance</span>' : ''}</div>`;
/**
 * Convertit une valeur en texte et échappe les caractères HTML &, <, > et les guillemets doubles.
 * @param {unknown} s - Valeur à convertir et à échapper.
 * @returns {string} Texte échappé pour le HTML.
 * @description Types utilisés : unknown, string.
 */
const esc = s => String(s).replace(/[&<>"]/g,
  /**
   * Initialise le service et ses gestionnaires d’événements.
   * @param {string} c - Texte ou clé de l’élément courant.
   * @returns {string} Entité HTML correspondant au caractère spécial.
   * @description Types utilisés : string.
   */
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Construit la grille HTML d’un mois avec ses jours adjacents et les tâches visibles.
 * @param {number} y - Année.
 * @param {number} m - Indice du mois, de 0 à 11.
 * @param {AgendaIndex} index - Tâches par date.
 * @param {string} todayKey - Date du jour au format YYYY-MM-DD.
 * @returns {string} HTML de la vue mensuelle.
 * @description Types utilisés : number, AgendaIndex, string, Date, Task.
 */
function monthView(y, m, index, todayKey) {
  const first = new Date(y, m, 1);
  const start = mondayOf(first);
  const weeks = Math.ceil(((first.getDay() + 6) % 7 + new Date(y, m + 1, 0).getDate()) / 7);
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i), key = fmt(d);
    const tasks = visibleTasks(index, key);
    const shown = tasks.map(taskHTML).join('');
    cells += `<div class="cell${d.getMonth() !== m ? ' other' : ''}${key === todayKey ? ' today' : ''}" data-date="${key}">
      <span class="num">${d.getDate()}</span>${shown}</div>`;
  }
  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    .map(
      /**
       * Génère le fragment HTML correspondant à l’élément courant.
       * @param {string} day - Texte ou clé de l’élément courant.
       * @returns {string} Valeur calculée par le traitement.
       * @description Types utilisés : string.
       */
      day => `<div>${day}</div>`)
    .join('');

  return `<div class="month-view">
    <div class="dow-row">${daysOfWeek}</div>
    <div class="grid">${cells}</div>
  </div>`;
}

/**
 * Construit les sept colonnes HTML de la semaine et leurs tâches visibles.
 * @param {Date} mon - Lundi de la semaine.
 * @param {AgendaIndex} index - Tâches par date.
 * @param {string} todayKey - Date du jour au format YYYY-MM-DD.
 * @returns {string} HTML de la vue hebdomadaire.
 * @description Types utilisés : Date, AgendaIndex, string, number.
 */
function weekView(mon, index, todayKey) {
  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i), key = fmt(d);
    html += `<div class="day-col${key === todayKey ? ' today' : ''}" data-date="${key}">
      <div class="head">${d.toLocaleDateString('fr-FR', { weekday: 'long' })}<b>${d.getDate()}</b></div>
      ${visibleTasks(index, key).map(taskHTML).join('')}</div>`;
  }
  return `<div class="week-view">${html}</div>`;
}

/**
 * Construit un mini calendrier mensuel avec des indicateurs de catégorie pour la vue annuelle.
 * @param {number} y - Année.
 * @param {number} m - Indice du mois, de 0 à 11.
 * @param {AgendaIndex} index - Tâches par date.
 * @param {string} todayKey - Date du jour au format YYYY-MM-DD.
 * @returns {string} HTML du mini calendrier.
 * @description Types utilisés : number, AgendaIndex, string, Date, Set<string>.
 */
function miniMonth(y, m, index, todayKey) {
  const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, nb = new Date(y, m + 1, 0).getDate();
  let days = '';
  for (let i = 0; i < offset; i++) days += '<div></div>';
  for (let n = 1; n <= nb; n++) {
    const key = `${y}-${pad(m + 1)}-${pad(n)}`;
    const cats = new Set(visibleTasks(index, key).map(
      /**
       * Extrait la catégorie de la tâche pour les indicateurs du calendrier.
       * @param {AgendaTask} t - Tâche courante.
       * @returns {string} Valeur calculée par le traitement.
       * @description Types utilisés : AgendaTask, string.
       */
      t => t.cat));
    const dots = ['pro', 'perso'].filter(
      /**
       * Sélectionne les éléments qui satisfont la condition indiquée.
       * @param {string} c - Texte ou clé de l’élément courant.
       * @returns {boolean} Résultat du test appliqué à l’élément.
       * @description Types utilisés : string, boolean.
       */
      c => cats.has(c)).map(
      /**
       * Génère le fragment HTML correspondant à l’élément courant.
       * @param {string} c - Texte ou clé de l’élément courant.
       * @returns {string} Valeur calculée par le traitement.
       * @description Types utilisés : string.
       */
      c => `<span class="dot ${c}"></span>`).join('');
    days += `<div class="d${key === todayKey ? ' today' : ''}">${n}<div class="dots">${dots}</div></div>`;
  }
  return `<div class="mini" data-date="${y}-${pad(m + 1)}-01"><h3>${monthName(y, m)}</h3>
    <div class="dow-row">${DOW.map(
      /**
       * Génère le fragment HTML correspondant à l’élément courant.
       * @param {string} x - Texte ou clé de l’élément courant.
       * @returns {string} Valeur calculée par le traitement.
       * @description Types utilisés : string.
       */
      x => `<div>${x}</div>`).join('')}</div><div class="grid">${days}</div></div>`;
}

/* ---------- Navigation ---------- */
/**
 * Décale la période affichée selon la vue active puis reconstruit le calendrier.
 * @param {number} dir - Nombre de périodes à avancer ou reculer.
 * @returns {void} Aucune valeur ; modifie state et le DOM.
 * @description Types utilisés : number, void, Date, string.
 */
function shift(dir) {
  const d = state.date;
  if (state.view === 'week') state.date = addDays(d, 7 * dir);
  else if (state.view === 'month') state.date = new Date(d.getFullYear(), d.getMonth() + dir, 1);
  else state.date = new Date(d.getFullYear() + dir, d.getMonth(), 1);
  render();
}

/* ---------- Zoom ---------- */
// dir = +1 : zoom avant (année → mois → semaine) ; dir = -1 : zoom arrière
/**
 * Change le niveau de zoom et centre éventuellement le calendrier sur une date ; ignore les niveaux hors limites.
 * @param {number} dir - 1 pour rapprocher la vue, -1 pour l’éloigner.
 * @param {string|null|undefined} targetKey - Date YYYY-MM-DD à cibler, si fournie.
 * @returns {void} Aucune valeur ; modifie state et le DOM.
 * @description Types utilisés : number, string|null|undefined, void, string.
 */
function zoom(dir, targetKey) {
  const i = VIEWS.indexOf(state.view), next = i - dir;
  if (next < 0 || next >= VIEWS.length) return;
  const target = parse(targetKey);
  if (target) state.date = target;                  // on zoome sur l'élément survolé/cliqué
  state.view = VIEWS[next];
  render();
}

/* ---------- Événements ---------- */
$('prev').onclick =
  /**
   * Initialise le service et ses gestionnaires d’événements.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, number.
   */
  () => shift(-1);
$('next').onclick =
  /**
   * Initialise le service et ses gestionnaires d’événements.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, number.
   */
  () => shift(1);
$('today').onclick =
  /**
   * Initialise le service et ses gestionnaires d’événements.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, Date.
   */
  () => { state.date = new Date(); render(); };
$('zoom-in').onclick =
  /**
   * Initialise le service et ses gestionnaires d’événements.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, number.
   */
  () => zoom(1);
$('zoom-out').onclick =
  /**
   * Initialise le service et ses gestionnaires d’événements.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, number.
   */
  () => zoom(-1);
$('chk-pro').onchange = $('chk-perso').onchange = render;

// Clic sur un mois (vue année) ou un jour (vue mois) = zoom dessus
$('calendar').addEventListener('click',
  /**
   * Traite l’événement « click » de $('calendar').
   * @param {MouseEvent} e - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : MouseEvent, void, string, number.
   */
  e => {
  const el = e.target.closest('[data-date]');
  if (el && state.view !== 'week') zoom(1, el.dataset.date);
});

// Molette : uniquement sur PC (souris + survol), jamais tablette/mobile
const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)');
let lastWheel = 0;
$('calendar').addEventListener('wheel',
  /**
   * Traite l’événement « wheel » de $('calendar').
   * @param {WheelEvent} e - Événement déclenchant le traitement.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : WheelEvent, void, string, number.
   */
  e => {
  if (!isDesktop.matches) return;
  e.preventDefault();
  const now = Date.now();
  if (now - lastWheel < 350) return;                // évite de traverser les 3 vues d'un seul coup
  if (Math.abs(e.deltaY) < 4) return;
  lastWheel = now;
  const el = e.target.closest('[data-date]');
  zoom(e.deltaY < 0 ? 1 : -1, el ? el.dataset.date : null);
}, { passive: false });

// Se met à jour si les tâches changent dans un autre onglet


let receivedTaskUpdate = false;
window.tplanData.onTasksChanged?.(
  /**
   * Actualise les tâches en mémoire et leur affichage après une notification Electron.
   * @param {Task[]|Record<string, Task>} tasks - Tâches reçues du stockage ou de la notification.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : Task[]|Record<string, Task>, void, boolean, Task.
   */
  tasks => {
  receivedTaskUpdate = true;
  cachedTasks = Array.isArray(tasks) ? tasks : Object.values(tasks || {});
  render();
});
window.tplanData.read('tasks').then(
  /**
   * Poursuit le traitement après résolution de l’opération précédente.
   * @param {Task[]|Record<string, Task>} raw - Tâches reçues du stockage ou de la notification.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : Task[]|Record<string, Task>, void.
   */
  raw => {
  if (receivedTaskUpdate) return;
  cachedTasks = Array.isArray(raw) ? raw : Object.values(raw || {});
  render();
});

