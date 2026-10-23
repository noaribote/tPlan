/**
 * Types métier partagés pour la documentation ; aucune importation à l’exécution.
 * @typedef {import('./controller/types').Task} Task
 * @typedef {import('./controller/types').Preferences} Preferences
 * @typedef {import('./controller/types').DataKey} DataKey
 * @typedef {import('./controller/types').JsonValue} JsonValue
 * @typedef {import('./controller/types').StorageDiagnostic} StorageDiagnostic
 * @typedef {import('./controller/types').StorageFileDiagnostic} StorageFileDiagnostic
 */
const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs/promises');
let mainWindow;
// L'archive app.asar est en lecture seule : stocker les données installées
// dans le dossier utilisateur propre à l'application.
const modelDirectory = app.isPackaged
  ? path.join(app.getPath('userData'), 'model')
  : path.join(__dirname, 'model');
const dataFiles = { notes: 'notes.json', tasks: 'tasks.json', preferences: 'preferences.json', app: 'app-data.json' };
const defaultPreferences = {
  theme: 'clair',
  color: 'violet',
  grid: 'actuel',
  positions: { agenda: 'left', taches: 'top-right', 'bloc-note': 'bottom-right' }
};
/**
 * Valide le thème, la couleur, la grille et les positions ; remplace les valeurs invalides par les préférences par défaut.
 * @param {unknown} [value] - Données à normaliser ; un objet vide est utilisé par défaut.
 * @returns {Preferences} Préférences complètes et positions valides.
 * @description Types utilisés : unknown, Preferences, Set<string>, string.
 */
function normalizePreferences(value = {}) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const positions = { ...defaultPreferences.positions, ...input.positions };
  const slots = ['left', 'top-right', 'bottom-right'];
  const validPositions = Object.values(defaultPreferences.positions).length ===
    new Set(Object.keys(defaultPreferences.positions).map(
      /**
       * Transforme l’élément courant pour construire la liste résultante.
       * @param {string} key - Texte ou clé de l’élément courant.
       * @returns {string} Position associée à la clé du panneau.
       * @description Types utilisés : string.
       */
      key => positions[key])).size &&
    Object.keys(defaultPreferences.positions).every(
      /**
       * Teste la condition de recherche sur l’élément courant.
       * @param {string} key - Texte ou clé de l’élément courant.
       * @returns {boolean} Résultat du test appliqué à l’élément.
       * @description Types utilisés : string, boolean.
       */
      key => slots.includes(positions[key]));
  return {
    theme: ['clair', 'sombre', 'vintage'].includes(input.theme) ? input.theme : defaultPreferences.theme,
    color: ['vert', 'jaune', 'noir', 'violet', 'bleu', 'bordeaux', 'rouge', 'orange', 'magenta', 'cyan', 'gris'].includes(input.color) ? input.color : defaultPreferences.color,
    grid: ['actuel', 'inverse', 'colonnes'].includes(input.grid) ? input.grid : defaultPreferences.grid,
    positions: validPositions
      ? Object.fromEntries(Object.keys(defaultPreferences.positions).map(
        /**
         * Transforme l’élément courant pour construire la liste résultante.
         * @param {string} key - Texte ou clé de l’élément courant.
         * @returns {string[]} Valeur calculée par le traitement.
         * @description Types utilisés : string, string[].
         */
        key => [key, positions[key]]))
      : { ...defaultPreferences.positions }
  };
}
/**
 * Crée le dossier model et initialise les fichiers JSON absents sans écraser les fichiers existants.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {Promise<void>} Résolue après initialisation ; rejetée en cas d’erreur du système de fichiers.
 * @description Types utilisés : Promise<void>, JsonValue, boolean, string, number, Preferences.
 */
async function ensureDataFiles() {
  await fs.mkdir(modelDirectory, { recursive: true });
  for (const [key, file] of Object.entries(dataFiles)) {
    const filePath = path.join(modelDirectory, file);
    try {
      await fs.access(filePath);
    } catch {
      let initial =
        key === 'preferences'
          ? normalizePreferences()
          : key === 'app'
            ? {}
            : [];
      await fs.writeFile(filePath, JSON.stringify(initial, null, 2), 'utf8');
    }
  }
}
/**
 * Crée la fenêtre Electron, charge la page d’accueil et ouvre les outils de développement ; met à jour mainWindow.
 * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
 * @returns {void} Aucune valeur de retour.
 * @description Types utilisés : void, boolean, string, number.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 880,
    minWidth: 450,
    minHeight: 880,
    fullscreen: false,
    resizable: true,
    webPreferences: {
      devTools: false,
      preload: path.join(__dirname, 'controller/services/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: true
    },
  });
  Menu.setApplicationMenu(null);
  mainWindow.setIcon(path.join(__dirname, 'assets/image/logo_sans_background-bordure-bold.png'));
  mainWindow.loadFile('views/home.html');
  // mainWindow.webContents.openDevTools();
}
ipcMain.on('open-external-link',
  /**
   * Traite l’événement « open-external-link ».
   * @param {import("electron").IpcMainEvent} event - Événement déclenchant le traitement.
   * @param {string} url - URL à ouvrir dans le navigateur externe.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : import("electron").IpcMainEvent, string, void.
   */
  (event, url) => {
  shell.openExternal(url);
});
ipcMain.handle('data:read',
  /**
   * Lit le fichier JSON associé à la clé et normalise les préférences ; rejette les clés inconnues et propage les erreurs de lecture.
   * @param {import("electron").IpcMainInvokeEvent} _event - Événement IPC reçu, non utilisé.
   * @param {DataKey} key - Clé du fichier JSON concerné.
   * @returns {Promise<JsonValue>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
   * @description Types utilisés : import("electron").IpcMainInvokeEvent, DataKey, Promise<JsonValue>, JsonValue, string, Preferences.
   */
  async (_event, key) => {
  const file = dataFiles[key];
  if (!file) throw new Error('Type de données inconnu.');
  await ensureDataFiles();
  const value = JSON.parse(await fs.readFile(path.join(modelDirectory, file), 'utf8'));
  return key === 'preferences' ? normalizePreferences(value) : value;
});
ipcMain.handle('data:diagnose',
  /**
   * Examine les fichiers de stockage et retourne leur chemin, leur existence et le résultat de lecture JSON.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {Promise<StorageDiagnostic>} Diagnostic du dossier model et de chaque fichier.
   * @description Types utilisés : Promise<StorageDiagnostic>, JsonValue, boolean, string.
   */
  async () => ({
  modelDirectory,
  files: await Promise.all(Object.entries(dataFiles).map(
    /**
     * Transforme l’élément courant pour construire la liste résultante.
     * @param {[DataKey, string]} options - Clé de stockage et nom de fichier associé.
     * @returns {Promise<StorageFileDiagnostic>} Diagnostic du fichier ; les erreurs de lecture et JSON sont incluses dans le résultat.
     * @description Types utilisés : [DataKey, string], Promise<StorageFileDiagnostic>, JsonValue, boolean, string.
     */
    async ([key, name]) => {
    const file = path.join(modelDirectory, name);
    try {
      const content = await fs.readFile(file, 'utf8');
      return {
        key,
        file,
        exists: true,
        validJson:
          !!JSON.parse(content) ||
          content.trim() === '[]' ||
          content.trim() === '{}',
        writable: true,
      };
    } catch (error) {
      return {
        key,
        file,
        exists: error.code !== 'ENOENT',
        writable: false,
        error: error.message,
      };
    }
  }))
}));
// Sérialiser les écritures pour éviter les collisions sur les fichiers temporaires.
const pendingWrites = new Map();
ipcMain.handle('data:write',
  /**
   * Sérialise les écritures par clé, fusionne les préférences et remplace le fichier via un fichier temporaire ; diffuse les tâches aux fenêtres.
   * @param {import("electron").IpcMainInvokeEvent} _event - Événement IPC reçu, non utilisé.
   * @param {DataKey} key - Clé du fichier JSON concerné.
   * @param {JsonValue} value - Valeur JSON à enregistrer.
   * @returns {Promise<boolean>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
   * @description Types utilisés : import("electron").IpcMainInvokeEvent, DataKey, JsonValue, Promise<boolean>, boolean, string, number, Task, Preferences.
   */
  (_event, key, value) => {
  const file = dataFiles[key];
  if (!file) throw new Error('Type de données inconnu.');
  const operation = (pendingWrites.get(key) || Promise.resolve()).catch(
    /**
     * Traite l’erreur de l’opération précédente.
     * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
     * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
     * @description Types utilisés : void.
     */
    () => {}).then(
    /**
     * Écrit les données dans un fichier temporaire puis remplace le fichier cible et notifie les fenêtres pour les tâches.
     * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
     * @returns {Promise<boolean>} true après sauvegarde ; rejetée si une opération de fichier échoue.
     * @description Types utilisés : Promise<boolean>, JsonValue, boolean, string, number, Task, Preferences.
     */
    async () => {
    await ensureDataFiles();
    const filePath = path.join(modelDirectory, file);
    const temporaryPath = `${filePath}.tmp`;
    const saved = key === 'preferences'
      ? normalizePreferences({
          ...JSON.parse(await fs.readFile(filePath, 'utf8')),
          ...value,
          positions: {
            ...JSON.parse(await fs.readFile(filePath, 'utf8')).positions,
            ...value?.positions
          }
        })
      : value;
    await fs.writeFile(temporaryPath, JSON.stringify(saved, null, 2), 'utf8');
    await fs.rename(temporaryPath, filePath);
    if (key === 'tasks') {
      for (const window of BrowserWindow.getAllWindows()) {
        for (const frame of window.webContents.mainFrame.framesInSubtree) {
          frame.send('data:tasks-changed', saved);
        }
      }
    }
    return true;
  });
  pendingWrites.set(key, operation);
  return operation;
});
app.whenReady().then(
  /**
   * Poursuit le traitement après résolution de l’opération précédente.
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, JsonValue, string, number, Preferences.
   */
  () => {
  ensureDataFiles()
    .then(
      /**
       * Poursuit le traitement après résolution de l’opération précédente.
       * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
       * @returns {Promise<void>} Résultat asynchrone ; une erreur non interceptée rejette la promesse.
       * @description Types utilisés : Promise<void>, JsonValue, string, number, Preferences.
       */
      async () => {
      const file = path.join(modelDirectory, dataFiles.preferences);
      const value = normalizePreferences(JSON.parse(await fs.readFile(file, 'utf8')));
      await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
      createWindow();
    })
    .catch(
      /**
       * Traite l’erreur de l’opération précédente.
       * @param {Error} error - Erreur transmise par la promesse rejetée.
       * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
       * @description Types utilisés : Error, void.
       */
      error => {
      console.error(error);
      app.quit();
    });
  nativeTheme.themeSource = 'light';
  app.on('activate',
    /**
     * Traite l’événement « activate ».
     * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
     * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
     * @description Types utilisés : void, number.
     */
    () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on('window-all-closed',
  /**
   * Traite l’événement « window-all-closed ».
   * @description Entrées : aucun paramètre. Les données de contexte sont capturées dans la portée englobante.
   * @returns {void} Aucune valeur de retour ; les effets éventuels portent sur l’état ou le DOM.
   * @description Types utilisés : void, string.
   */
  () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
