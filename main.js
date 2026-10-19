const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs/promises');
let mainWindow;
const modelDirectory = path.join(__dirname, 'model');
const dataFiles = { notes: 'notes.json', tasks: 'tasks.json', preferences: 'preferences.json', app: 'app-data.json' };
async function ensureDataFiles() {
  await fs.mkdir(modelDirectory, { recursive: true });
  for (const [key, file] of Object.entries(dataFiles)) {
    const filePath = path.join(modelDirectory, file);
    try { await fs.access(filePath); }
    catch {
      let initial = key === 'preferences' ? { theme: 'clair', grid: 'actuel', positions: {} } : key === 'app' ? {} : [];
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
  return JSON.parse(await fs.readFile(path.join(modelDirectory, file), 'utf8'));
});
ipcMain.handle('data:diagnose', async () => ({
  modelDirectory,
  files: await Promise.all(Object.entries(dataFiles).map(async ([key, name]) => {
    const file = path.join(modelDirectory, name);
    try { const content = await fs.readFile(file, 'utf8'); return { key, file, exists: true, validJson: !!JSON.parse(content) || content.trim() === '[]' || content.trim() === '{}', writable: true }; }
    catch (error) { return { key, file, exists: error.code !== 'ENOENT', writable: false, error: error.message }; }
  }))
}));
ipcMain.handle('data:write', async (_event, key, value) => {
  const file = dataFiles[key];
  if (!file) throw new Error('Type de données inconnu.');
  await ensureDataFiles();
  const filePath = path.join(modelDirectory, file);
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(temporaryPath, filePath);
  if (key === 'tasks') {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send('data:tasks-changed', value);
  }
  return true;
});
app.whenReady().then(() => {
  ensureDataFiles().then(createWindow).catch(error => { console.error(error); app.quit(); });
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
