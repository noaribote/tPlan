/* ============================================================
   CONFIG : adapte ces noms à la structure de tes tâches
   ============================================================ */
const CONFIG = {
  fields: {
    title: 'title',             // nom de la tâche
    category: 'category',       // "Professionnel" ou "Personnel"
    start: 'startDate',         // date de début   (YYYY-MM-DD)
    end: 'endDate',             // date de fin     (YYYY-MM-DD)
    deadline: 'deadline'        // deadline        (YYYY-MM-DD)
  }
};

const VIEWS = ['week', 'month', 'year'];           // du plus zoomé au moins zoomé : index 0 = semaine
const VIEW_NAMES = { week: 'Semaine', month: 'Mois', year: 'Année' };
const MAX_MAIN_TASKS = 3;                          // tâches visibles par case en vue mois

const state = { view: 'month', date: new Date() };
const $ = id => document.getElementById(id);

/* ---------- Dates ---------- */
const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parse(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const monthName = (y, m) => new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long' });

/* ---------- Tâches : lecture + placement par jour ---------- */
let cachedTasks = [];
// Retourne { "YYYY-MM-DD": [ {title, cat}, ... ] }
function buildIndex() {
  const f = CONFIG.fields, index = {};
  cachedTasks.forEach(t => {
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
    days.forEach(k => (index[k] = index[k] || []).push({ title, cat }));
  });
  return index;
}

function visibleTasks(index, key) {
  const showPro = $('chk-pro').checked, showPerso = $('chk-perso').checked;
  return (index[key] || []).filter(t => (t.cat === 'pro' ? showPro : showPerso));
}

/* ---------- Rendu ---------- */
function render() {
  const index = buildIndex();
  const cal = $('calendar');
  const y = state.date.getFullYear(), m = state.date.getMonth();
  const todayKey = fmt(new Date());

  if (state.view === 'year') {
    $('title').textContent = y;
    cal.innerHTML = '<div class="year-view">' + Array.from({ length: 12 }, (_, i) => miniMonth(y, i, index, todayKey)).join('') + '</div>';
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
}

const taskHTML = t => `<div class="task ${t.cat}" title="${esc(t.title)}">${esc(t.title)}</div>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function monthView(y, m, index, todayKey) {
  const first = new Date(y, m, 1);
  const start = mondayOf(first);
  const weeks = Math.ceil(((first.getDay() + 6) % 7 + new Date(y, m + 1, 0).getDate()) / 7);
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i), key = fmt(d);
    const tasks = visibleTasks(index, key);
    const shown = tasks.slice(0, MAX_MAIN_TASKS).map(taskHTML).join('');
    const more = tasks.length > MAX_MAIN_TASKS ? `<div class="more">+${tasks.length - MAX_MAIN_TASKS} autre(s)</div>` : '';
    cells += `<div class="cell${d.getMonth() !== m ? ' other' : ''}${key === todayKey ? ' today' : ''}" data-date="${key}">
      <span class="num">${d.getDate()}</span>${shown}${more}</div>`;
  }
  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    .map(day => `<div>${day}</div>`)
    .join('');

  return `<div class="month-view">
    <div class="dow-row">${daysOfWeek}</div>
    <div class="grid">${cells}</div>
  </div>`;
}

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

function miniMonth(y, m, index, todayKey) {
  const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, nb = new Date(y, m + 1, 0).getDate();
  let days = '';
  for (let i = 0; i < offset; i++) days += '<div></div>';
  for (let n = 1; n <= nb; n++) {
    const key = `${y}-${pad(m + 1)}-${pad(n)}`;
    const cats = new Set(visibleTasks(index, key).map(t => t.cat));
    const dots = ['pro', 'perso'].filter(c => cats.has(c)).map(c => `<span class="dot ${c}"></span>`).join('');
    days += `<div class="d${key === todayKey ? ' today' : ''}">${n}<div class="dots">${dots}</div></div>`;
  }
  return `<div class="mini" data-date="${y}-${pad(m + 1)}-01"><h3>${monthName(y, m)}</h3>
    <div class="dow-row">${DOW.map(x => `<div>${x}</div>`).join('')}</div><div class="grid">${days}</div></div>`;
}

/* ---------- Navigation ---------- */
function shift(dir) {
  const d = state.date;
  if (state.view === 'week') state.date = addDays(d, 7 * dir);
  else if (state.view === 'month') state.date = new Date(d.getFullYear(), d.getMonth() + dir, 1);
  else state.date = new Date(d.getFullYear() + dir, d.getMonth(), 1);
  render();
}

/* ---------- Zoom ---------- */
// dir = +1 : zoom avant (année → mois → semaine) ; dir = -1 : zoom arrière
function zoom(dir, targetKey) {
  const i = VIEWS.indexOf(state.view), next = i - dir;
  if (next < 0 || next >= VIEWS.length) return;
  const target = parse(targetKey);
  if (target) state.date = target;                  // on zoome sur l'élément survolé/cliqué
  state.view = VIEWS[next];
  render();
}

/* ---------- Événements ---------- */
$('prev').onclick = () => shift(-1);
$('next').onclick = () => shift(1);
$('today').onclick = () => { state.date = new Date(); render(); };
$('zoom-in').onclick = () => zoom(1);
$('zoom-out').onclick = () => zoom(-1);
$('chk-pro').onchange = $('chk-perso').onchange = render;

// Clic sur un mois (vue année) ou un jour (vue mois) = zoom dessus
$('calendar').addEventListener('click', e => {
  const el = e.target.closest('[data-date]');
  if (el && state.view !== 'week') zoom(1, el.dataset.date);
});

// Molette : uniquement sur PC (souris + survol), jamais tablette/mobile
const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)');
let lastWheel = 0;
$('calendar').addEventListener('wheel', e => {
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


window.tplanData.read('tasks').then(raw => { cachedTasks = Array.isArray(raw) ? raw : Object.values(raw || {}); render(); });
window.tplanData.onTasksChanged?.(tasks => { cachedTasks = Array.isArray(tasks) ? tasks : []; render(); });
