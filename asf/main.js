const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsConstants = require('fs').constants;
let mainWindow;
const modelDirectory = path.join(app.getPath('userData'), 'models');
const settingsPath = path.join(app.getPath('userData'), 'data', 'asf-preferences.json');
const sharedDataDirectory = path.join(app.getPath('userData'), 'data');
const sharedDataFiles = { notes: 'notes.json', tasks: 'tasks.json', preferences: 'preferences.json', app: 'app-data.json' };
const legacyModelDirectory = path.join(__dirname, '..', 'model');
const legacySettingsPath = path.join(__dirname, 'asf-preferences.json');
const archiveDirectory = path.join(modelDirectory, 'archive');
async function ensureModelDirectories() {
  await Promise.all([
    fs.mkdir(modelDirectory, { recursive: true }),
    fs.mkdir(archiveDirectory, { recursive: true }),
  ]);
  try {
    const files = await fs.readdir(legacyModelDirectory, { withFileTypes: true });
    for (const entry of files) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        try { await fs.copyFile(path.join(legacyModelDirectory, entry.name), path.join(modelDirectory, entry.name), fsConstants.COPYFILE_EXCL); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      }
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
function safeModelPath(fileName) {
  if (typeof fileName !== 'string' || !/^[\w\p{L}-]+\.json$/iu.test(fileName)) {
    throw new Error('Nom de fichier JSON invalide.');
  }
  const resolved = path.resolve(modelDirectory, fileName);
  if (path.dirname(resolved) !== modelDirectory) throw new Error('Chemin de fichier invalide.');
  return resolved;
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 900,
    minWidth: 760,
    minHeight: 900,
    fullscreen: false,
    resizable: true,
    webPreferences: {
      devTools: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  Menu.setApplicationMenu(null);
  mainWindow.setIcon(path.join(__dirname, 'assets/images/logo.ico'));
  mainWindow.loadFile('views/home.html');
  // Ouvrir automatiquement le devTool lors du `npm start`
  // mainWindow.webContents.openDevTools();
}
ipcMain.handle('models:list', async () => {
  await ensureModelDirectories();
  const entries = await fs.readdir(modelDirectory, { withFileTypes: true });
  return entries.filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.json')).map(entry => entry.name).sort((a, b) => a.localeCompare(b, 'fr'));
});
ipcMain.handle('models:open-folder', async () => {
  await ensureModelDirectories();
  const error = await shell.openPath(modelDirectory);
  if (error) throw new Error(error);
  return true;
});
ipcMain.handle('models:open-archive', async () => {
  await ensureModelDirectories();
  const error = await shell.openPath(archiveDirectory);
  if (error) throw new Error(error);
  return true;
});
ipcMain.handle('models:delete-archive', async (event, fileName) => {
  await ensureModelDirectories();
  const sourcePath = safeModelPath(fileName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveName = `${path.basename(fileName, '.json')}-${timestamp}.json`;
  await fs.copyFile(sourcePath, path.join(archiveDirectory, archiveName), fsConstants.COPYFILE_EXCL);
  await fs.unlink(sourcePath);
  return archiveName;
});
ipcMain.handle('models:read', async (event, fileName) => {
  const content = await fs.readFile(safeModelPath(fileName), 'utf8');
  return JSON.parse(content);
});
ipcMain.handle('models:create', async (event, fileName, data) => {
  const filePath = safeModelPath(fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), { encoding: 'utf8', flag: 'wx' });
  return true;
});
ipcMain.handle('models:save', async (event, fileName, data) => {
  const filePath = safeModelPath(fileName);
  const content = JSON.stringify(data, null, 2);
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, content, 'utf8');
  await fs.rename(temporaryPath, filePath);
  return true;
});
ipcMain.handle('settings:read', async () => {
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  try { return JSON.parse(await fs.readFile(settingsPath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try {
      const saved = JSON.parse(await fs.readFile(legacySettingsPath, 'utf8'));
      await fs.writeFile(settingsPath, JSON.stringify(saved, null, 2), 'utf8');
      return saved;
    } catch (legacyError) { if (legacyError.code !== 'ENOENT') throw legacyError; return {}; }
  }
});
ipcMain.handle('settings:save', async (_event, settings) => {
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  const temporaryPath = `${settingsPath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(settings, null, 2), 'utf8');
  await fs.rename(temporaryPath, settingsPath);
  return true;
});
ipcMain.handle('models:data-read', async (_event, key) => {
  const file = sharedDataFiles[key];
  if (!file) throw new Error('Type de données inconnu.');
  await fs.mkdir(sharedDataDirectory, { recursive: true });
  const filePath = path.join(sharedDataDirectory, file);
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const initial = key === 'preferences' ? { theme: 'clair', grid: 'actuel', positions: {} } : key === 'app' ? {} : [];
    await fs.writeFile(filePath, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
});
ipcMain.handle('models:data-write', async (_event, key, value) => {
  const file = sharedDataFiles[key];
  if (!file) throw new Error('Type de données inconnu.');
  await fs.mkdir(sharedDataDirectory, { recursive: true });
  const filePath = path.join(sharedDataDirectory, file);
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(temporaryPath, filePath);
  return true;
});
ipcMain.on('open-external-link', (event, url) => {
  shell.openExternal(url);
});
app.whenReady().then(() => {
  ensureModelDirectories().then(createWindow).catch(error => {
    console.error('Impossible de créer les dossiers model :', error);
    app.quit();
  });
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
