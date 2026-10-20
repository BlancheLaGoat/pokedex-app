const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readData: (rel) => ipcRenderer.invoke('data:read', rel),
  loadSave: () => ipcRenderer.invoke('save:load'),
  writeSave: (obj) => ipcRenderer.invoke('save:write', obj),
  exportSave: (obj) => ipcRenderer.invoke('save:export', obj),
  importSave: () => ipcRenderer.invoke('save:import'),
  openJournal: () => ipcRenderer.invoke('journal:open'),
});
