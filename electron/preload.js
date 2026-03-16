const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  findProcessByPort: (port) => ipcRenderer.invoke('find-process-by-port', port),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openLockScreen: () => ipcRenderer.invoke('open-lock-screen'),
  getPluginList: () => ipcRenderer.invoke('get-plugin-list'),
})
