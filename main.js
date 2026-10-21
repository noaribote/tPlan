const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs/promises');
let mainWindow;
const modelDirectory = path.join(__dirname, 'model');
const dataFiles = { notes: 'notes.json', tasks: 'tasks.json', preferences: 'preferences.json', app: 'app-data.json' };
const defaultPreferences = {
  theme: 'clair',
  color: 'violet',
  grid: 'actuel',
  positions: { agenda: 'left', taches: 'top-right', 'bloc-note': 'bottom-right' }
};
function normalizePreferences(value = {}) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const positions = { ...defaultPreferences.positions, ...input.positions };
  const slots = ['left', 'top-right', 'bottom-right'];
  const validPositions = Object.values(defaultPreferences.positions).length ===
    new Set(Object.keys(defaultPreferences.positions).map(key => positions[key])).size &&
    Object.keys(defaultPreferences.positions).every(key => slots.includes(positions[key]));
  return {
    theme: ['clair', 'sombre', 'vintage'].includes(input.theme) ? input.theme : defaultPreferences.theme,
    color: ['vert', 'jaune', 'noir', 'violet', 'bleu', 'bordeaux', 'rouge', 'orange', 'magenta', 'cyan', 'gris'].includes(input.color) ? input.color : defaultPreferences.color,
    grid: ['actuel', 'inverse', 'colonnes'].includes(input.grid) ? input.grid : defaultPreferences.grid,
    positions: validPositions
      ? Object.fromEntries(Object.keys(defaultPreferences.positions).map(key => [key, positions[key]]))
      : { ...defaultPreferences.positions }
  };
}
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
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 880,
    minWidth: 450,
    minHeight: 880,
    fullscreen: false,
    resizable: true,
    webPreferences: {
      devTools: true,
      preload: path.join(__dirname, 'controller/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: true
    },
  });
  Menu.setApplicationMenu(null);
  mainWindow.setIcon(path.join(__dirname, 'assets/image/logo_sans_background-bordure-bold.png'));
  mainWindow.loadFile('views/home.html');
  mainWindow.webContents.openDevTools();
}
ipcMain.on('open-external-link', (event, url) => {
  shell.openExternal(url);
});
ipcMain.handle('data:read', async (_event, key) => {
  const file = dataFiles[key];
  if (!file) throw new Error('Type de données inconnu.');
  await ensureDataFiles();
  const value = JSON.parse(await fs.readFile(path.join(modelDirectory, file), 'utf8'));
  return key === 'preferences' ? normalizePreferences(value) : value;
});
ipcMain.handle('data:diagnose', async () => ({
  modelDirectory,
  files: await Promise.all(Object.entries(dataFiles).map(async ([key, name]) => {
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
ipcMain.handle('data:write', (_event, key, value) => {
  const file = dataFiles[key];
  if (!file) throw new Error('Type de données inconnu.');
  const operation = (pendingWrites.get(key) || Promise.resolve()).catch(() => {}).then(async () => {
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
      for (const window of BrowserWindow.getAllWindows()) window.webContents.send('data:tasks-changed', saved);
    }
    return true;
  });
  pendingWrites.set(key, operation);
  return operation;
});
app.whenReady().then(() => {
  ensureDataFiles()
    .then(async () => {
      const file = path.join(modelDirectory, dataFiles.preferences);
      const value = normalizePreferences(JSON.parse(await fs.readFile(file, 'utf8')));
      await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
      createWindow();
    })
    .catch(error => {
      console.error(error);
      app.quit();
    });
  nativeTheme.themeSource = 'light';
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
