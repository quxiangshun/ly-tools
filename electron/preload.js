const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  findProcessByPort: (port) => ipcRenderer.invoke('find-process-by-port', port),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  /** 打开文件对话框（Markdown 阅读等）；options: { title?, multiSelections?, filters? } */
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  /** 以 UTF-8 读取本地文本文件；返回 { ok, path?, content?, error? } */
  readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
  /** 过滤已删除路径，返回仍存在的绝对路径（顺序与传入一致） */
  filterExistingFiles: (paths) => ipcRenderer.invoke('filter-existing-files', paths),
  /** 列出目录内 Markdown 文件（非递归）；返回 { ok, dir?, files: [{ path, name }], error? } */
  listMarkdownInDir: (dirPath) => ipcRenderer.invoke('list-markdown-in-dir', dirPath),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  /** 插件相关能力单独命名空间，避免与内置 API 平铺混淆；新增带主进程脚本的插件无需再改 preload */
  plugin: {
    invokeMain: (pluginId, script, method, args) =>
      ipcRenderer.invoke('invoke-plugin-main', { pluginId, script, method, args }),
    /** 主进程脚本通过 invoke-plugin-main 推送的日志行（需先订阅再 invokeMain） */
    onMainLog: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('invoke-plugin-main-log', handler)
      return () => ipcRenderer.removeListener('invoke-plugin-main-log', handler)
    },
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
