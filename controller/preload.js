const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tplanData', {
  read: key => ipcRenderer.invoke('data:read', key),
  write: (key, value) => ipcRenderer.invoke('data:write', key, value),
  diagnose: () => ipcRenderer.invoke('data:diagnose'),
  onTasksChanged: callback =>
    ipcRenderer.on('data:tasks-changed', (_event, tasks) => callback(tasks))
});
