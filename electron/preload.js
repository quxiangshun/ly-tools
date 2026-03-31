const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  findProcessByPort: (port) => ipcRenderer.invoke('find-process-by-port', port),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  /** 插件相关能力单独命名空间，避免与内置 API 平铺混淆；新增带主进程脚本的插件无需再改 preload */
  plugin: {
    invokeMain: (pluginId, script, method, args) =>
      ipcRenderer.invoke('invoke-plugin-main', { pluginId, script, method, args }),
  },
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  showAbout: () => ipcRenderer.invoke('show-about'),
  openPluginDoc: () => ipcRenderer.invoke('open-plugin-doc'),
  openLockScreen: () => ipcRenderer.invoke('open-lock-screen'),
  closeLockWindow: () => ipcRenderer.invoke('close-lock-window'),
  openLightOffWindow: () => ipcRenderer.invoke('open-light-off-window'),
  closeLightOffWindow: () => ipcRenderer.invoke('close-light-off-window'),
  getLightOffUrl: () => ipcRenderer.invoke('get-light-off-url'),
  openShatterWindow: () => ipcRenderer.invoke('open-shatter-window'),
  closeShatterWindow: () => ipcRenderer.invoke('close-shatter-window'),
  getPluginList: () => ipcRenderer.invoke('get-plugin-list'),
  getPluginEntryUrl: (pluginDir) => ipcRenderer.invoke('get-plugin-entry-url', pluginDir),
  getPluginEntryUrlById: (pluginId) => ipcRenderer.invoke('get-plugin-entry-url-by-id', pluginId),
  uninstallPlugin: (pluginDir) => ipcRenderer.invoke('uninstall-plugin', pluginDir),
  getPluginMarketList: () => ipcRenderer.invoke('get-plugin-market-list'),
  installPluginFromMarket: (filename) => ipcRenderer.invoke('install-plugin-from-market', filename),
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
  onNavigate: (cb) => {
    const handler = (_e, path) => cb(path)
    ipcRenderer.on('app-navigate', handler)
    return () => ipcRenderer.removeListener('app-navigate', handler)
  },
  onToggleTheme: (cb) => {
    const handler = (_e, theme) => cb(theme)
    ipcRenderer.on('app-toggle-theme', handler)
    return () => ipcRenderer.removeListener('app-toggle-theme', handler)
  },
})
