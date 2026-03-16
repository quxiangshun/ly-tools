const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  findProcessByPort: (port) => ipcRenderer.invoke('find-process-by-port', port),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openLockScreen: () => ipcRenderer.invoke('open-lock-screen'),
  closeLockWindow: () => ipcRenderer.invoke('close-lock-window'),
  openLightOffWindow: () => ipcRenderer.invoke('open-light-off-window'),
  closeLightOffWindow: () => ipcRenderer.invoke('close-light-off-window'),
  getPluginList: () => ipcRenderer.invoke('get-plugin-list'),
  openLobsterWindow: () => ipcRenderer.invoke('open-lobster-window'),
  closeLobsterWindow: () => ipcRenderer.invoke('close-lobster-window'),
  sendLobsterState: (state) => ipcRenderer.send('lobster-sync-state', state),
  onLobsterState: (cb) => {
    ipcRenderer.on('lobster-state', (_e, state) => cb(state))
  },
  requestLobsterState: () => ipcRenderer.send('lobster-request-state'),
  sendLobsterCrawlDone: (id) => ipcRenderer.send('lobster-crawl-done', id),
  onLobsterCrawlDone: (cb) => {
    ipcRenderer.on('lobster-crawl-done', (_e, id) => cb(id))
  },
})
