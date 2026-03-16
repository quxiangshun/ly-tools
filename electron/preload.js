const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  findProcessByPort: (port) => ipcRenderer.invoke('find-process-by-port', port),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
})
