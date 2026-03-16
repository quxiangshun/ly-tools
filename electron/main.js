const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

let mainWindow
let lockWindow = null

function resolveLockPath(filename) {
  const inDir = path.join(__dirname, filename)
  if (fs.existsSync(inDir)) return inDir
  const inApp = path.join(app.getAppPath(), 'electron', filename)
  if (fs.existsSync(inApp)) return inApp
  return inDir
}

function closeLockWindow() {
  if (lockWindow && !lockWindow.isDestroyed()) {
    lockWindow.close()
    lockWindow = null
  }
}

function createLockWindow() {
  if (lockWindow && !lockWindow.isDestroyed()) {
    lockWindow.focus()
    return
  }
  const display = screen.getPrimaryDisplay()
  const { width, height, x, y } = display.bounds
  const preloadPath = resolveLockPath('preload-lock.js')
  const htmlPath = resolveLockPath('lock-screen.html')

  lockWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  lockWindow.setMenuBarVisibility(false)
  lockWindow.setAlwaysOnTop(true, 'screen-saver')

  lockWindow.on('blur', () => {
    if (lockWindow && !lockWindow.isDestroyed()) lockWindow.focus()
  })

  lockWindow.loadFile(htmlPath).catch(() => {
    lockWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getLockScreenHTML()))
  })
  lockWindow.on('closed', () => {
    lockWindow = null
  })
  lockWindow.once('ready-to-show', () => {
    lockWindow.setFullScreen(true)
    lockWindow.setBounds(display.bounds)
  })
}

function getLockScreenHTML() {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/><title>正在准备 Windows 更新</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;font-family:"Segoe UI","Microsoft YaHei",sans-serif}.lock-overlay{position:fixed;inset:0;background:#0078d4;display:flex;align-items:center;justify-content:center}.close-btn{position:absolute;top:20px;right:24px;width:28px;height:28px;border:none;background:transparent;color:rgba(255,255,255,.5);border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .2s,color .2s,background .2s;box-shadow:none;opacity:0}.close-btn:hover{opacity:1;color:rgba(255,255,255,.7);background:rgba(255,255,255,.08)}.update-content{text-align:center;color:#fff}.spinner{display:flex;gap:10px;justify-content:center;margin-bottom:32px}.dot{width:12px;height:12px;border-radius:50%;background:#fff;animation:pulse 1.4s ease-in-out infinite both}.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}@keyframes pulse{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}.update-title{font-size:28px;font-weight:300;margin:0 0 12px;letter-spacing:.5px}.update-sub{font-size:15px;opacity:.9;margin:0 0 40px;font-weight:300}.progress-bar{width:320px;height:4px;background:rgba(255,255,255,.25);border-radius:2px;overflow:hidden;margin:0 auto}.progress-inner{height:100%;width:30%;background:#fff;border-radius:2px;animation:progress 2s ease-in-out infinite}@keyframes progress{0%{transform:translateX(-100%)}50%{transform:translateX(200%)}100%{transform:translateX(-100%)}}.lock-tip{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);font-size:12px;color:rgba(255,255,255,.4);font-weight:300}</style></head><body><div class="lock-overlay"><button class="close-btn" title="退出" id="closeBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button><div class="update-content"><div class="spinner"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><p class="update-title">正在准备 Windows 更新</p><p class="update-sub">请不要关闭电脑</p><div class="progress-bar"><div class="progress-inner"></div></div></div><p class="lock-tip">使用方式：鼠标移至右上角悬停可显示关闭按钮退出</p></div><script>document.getElementById('closeBtn').onclick=function(){if(window.electronAPI&&typeof window.electronAPI.closeLockWindow==='function')window.electronAPI.closeLockWindow();else window.close();};</script></body></html>`
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

function execPromise(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { encoding: 'utf-8', windowsHide: true }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout || '', stderr: stderr || '' })
    })
  })
}

ipcMain.handle('find-process-by-port', async (_event, port) => {
  const isWin = process.platform === 'win32'
  const portStr = String(port)
  const processes = []
  const pidSet = new Set()

  if (isWin) {
    const { stdout } = await execPromise(`netstat -ano`)
    if (!stdout.trim()) return []

    for (const line of stdout.split('\n')) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 5) continue
      const localAddr = parts[1] || ''
      const lastColon = localAddr.lastIndexOf(':')
      if (lastColon === -1) continue
      const addrPort = localAddr.substring(lastColon + 1)
      if (addrPort !== portStr) continue

      const pid = parts[4]
      if (pidSet.has(pid) || pid === '0') continue
      pidSet.add(pid)
      processes.push({ pid, localAddr, state: parts[3], protocol: parts[0], command: '' })
    }

    if (processes.length > 0) {
      const { stdout: taskOut } = await execPromise('tasklist /FO CSV /NH')
      const nameMap = {}
      for (const line of taskOut.split('\n')) {
        const match = line.match(/"([^"]+)","(\d+)"/)
        if (match) nameMap[match[2]] = match[1]
      }
      for (const p of processes) {
        p.command = nameMap[p.pid] || 'Unknown'
      }
    }
  } else {
    const { stdout } = await execPromise(`lsof -i :${portStr} -P -n`)
    if (!stdout.trim()) return []

    const lines = stdout.trim().split('\n')
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/)
      if (parts.length < 9) continue
      const pid = parts[1]
      if (pidSet.has(pid)) continue
      pidSet.add(pid)
      processes.push({
        pid,
        command: parts[0],
        user: parts[2],
        localAddr: parts[8],
        state: parts[9] || '',
        protocol: parts[7] || '',
      })
    }
  }

  return processes
})

ipcMain.handle('kill-process', async (_event, pid) => {
  const isWin = process.platform === 'win32'
  const cmd = isWin ? `taskkill /F /PID ${pid} /T` : `kill -9 ${pid}`

  const { error, stdout, stderr } = await execPromise(cmd)
  if (error) {
    return { success: false, message: stderr || error.message }
  }
  return { success: true, message: stdout || `进程 ${pid} 已终止` }
})

ipcMain.handle('save-file', async (_event, { defaultName, data }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'ICO 图标', extensions: ['ico'] }],
  })

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, Buffer.from(data))
    return { success: true, path: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('get-platform', () => process.platform)

function getExtDir() {
  const extDir = path.join(app.getAppPath(), 'ext')
  if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true })
  return extDir
}

const DEFAULT_PLUGINS = [
  { dir: '端口查杀', manifest: { id: 'port-killer', route: '/port-killer', icon: 'ri:terminal-box-line', description: '根据端口号查询并终止占用进程', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } },
  { dir: '图标生成', manifest: { id: 'icon-generator', route: '/icon-generator', icon: 'ri:palette-line', description: '文字生成 ICO 图标，支持多尺寸', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' } },
  { dir: '锁屏', manifest: { id: 'lock-screen', route: '/lock-screen', icon: 'ri:lock-line', description: 'Windows 更新风格假锁屏，点击右上角 × 退出', color: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)', fullScreen: true } },
]

function ensureExtPlugins() {
  const extDir = getExtDir()
  for (const { dir: dirName, manifest } of DEFAULT_PLUGINS) {
    const pluginDir = path.join(extDir, dirName)
    if (!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true })
      fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')
    }
  }
}

function getPluginList() {
  ensureExtPlugins()
  const extDir = getExtDir()
  const list = []
  try {
    const names = fs.readdirSync(extDir, { withFileTypes: true })
    for (const dirent of names) {
      if (!dirent.isDirectory()) continue
      const title = dirent.name
      const manifestPath = path.join(extDir, title, 'manifest.json')
      if (!fs.existsSync(manifestPath)) continue
      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8')
        const manifest = JSON.parse(raw)
        list.push({ title, ...manifest })
      } catch (_) {}
    }
  } catch (_) {}
  return list
}

ipcMain.handle('get-plugin-list', () => getPluginList())

ipcMain.handle('open-lock-screen', () => {
  createLockWindow()
})

ipcMain.handle('close-lock-window', () => {
  closeLockWindow()
})
