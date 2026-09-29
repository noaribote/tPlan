const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
let mainWindow;
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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });
  Menu.setApplicationMenu(null);
  mainWindow.setIcon(path.join(__dirname, 'assets/images/logo.ico'));
  mainWindow.loadFile('views/home.html');
  mainWindow.webContents.openDevTools();
}
ipcMain.on('open-external-link', (event, url) => {
  shell.openExternal(url);
});
app.whenReady().then(() => {
  createWindow();
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
