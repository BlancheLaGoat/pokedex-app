const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readData: (rel) => ipcRenderer.invoke('data:read', rel),
  loadSave: () => ipcRenderer.invoke('save:load'),
  writeSave: (obj) => ipcRenderer.invoke('save:write', obj),
  exportSave: (obj) => ipcRenderer.invoke('save:export', obj),
  importSave: () => ipcRenderer.invoke('save:import'),
  openJournal: () => ipcRenderer.invoke('journal:open'),
  appVersion: () => ipcRenderer.invoke('app:version'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdate: (cb) => ipcRenderer.on('update:status', (_e, d) => cb(d)),
});
