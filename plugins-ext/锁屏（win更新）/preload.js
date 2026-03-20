const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  closeLockWindow: () => ipcRenderer.invoke('close-lock-window'),
})
