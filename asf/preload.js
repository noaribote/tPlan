const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tplanData', {
  read: key => ipcRenderer.invoke('models:data-read', key),
  write: (key, value) => ipcRenderer.invoke('models:data-write', key, value)
});

contextBridge.exposeInMainWorld('asfAPI', {
  readSettings: () => ipcRenderer.invoke('settings:read'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  listModels: () => ipcRenderer.invoke('models:list'),
  readModel: fileName => ipcRenderer.invoke('models:read', fileName),
  createModel: (fileName, data) => ipcRenderer.invoke('models:create', fileName, data),
  saveModel: (fileName, data) => ipcRenderer.invoke('models:save', fileName, data),
  openModelsFolder: () => ipcRenderer.invoke('models:open-folder'),
  openArchiveFolder: () => ipcRenderer.invoke('models:open-archive'),
  deleteAndArchiveModel: fileName => ipcRenderer.invoke('models:delete-archive', fileName)
});

contextBridge.exposeInMainWorld('electronAPI', {
  readSettings: () => ipcRenderer.invoke('settings:read'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  listModels: () => ipcRenderer.invoke('models:list'),
  readModel: fileName => ipcRenderer.invoke('models:read', fileName),
  createModel: (fileName, data) => ipcRenderer.invoke('models:create', fileName, data),
  saveModel: (fileName, data) => ipcRenderer.invoke('models:save', fileName, data),
  openModelsFolder: () => ipcRenderer.invoke('models:open-folder'),
  openArchiveFolder: () => ipcRenderer.invoke('models:open-archive'),
  deleteAndArchiveModel: fileName => ipcRenderer.invoke('models:delete-archive', fileName)
});
