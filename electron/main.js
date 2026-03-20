/**
 * ly-tools (栾媛小工具)
 * Copyright (C) 2025 屈想顺
 * Licensed under AGPL-3.0
 */
const { app, BrowserWindow, ipcMain, dialog, screen, Tray, Menu, protocol } = require('electron')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')
const http = require('http')
const https = require('https')
const { pathToFileURL } = require('url')

const PLUGIN_MARKET_BASE = 'http://39.106.39.125:9999/tools/plugins/'

function getWindowIconPath() {
  const root = path.join(__dirname, '..')
  if (process.platform === 'win32') {
    const icoPath = app.isPackaged
      ? path.join(root, 'dist', 'icon.ico')
      : path.join(root, 'build', 'icon.ico')
    if (fs.existsSync(icoPath)) return icoPath
    return path.join(root, 'public', 'icon-512.png')
  }
  const pngPath = app.isPackaged
    ? path.join(root, 'dist', 'icon-512.png')
    : path.join(root, 'public', 'icon-512.png')
  return fs.existsSync(pngPath) ? pngPath : path.join(root, 'public', 'icon-512.png')
}

function getAppVersion() {
  if (app.isPackaged) return app.getVersion()
  try {
    const pkg = require(path.join(__dirname, '..', 'package.json'))
    return pkg.version || '0.0.0'
  } catch (_) {
    return '0.0.0'
  }
}

function semverGte(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0
    const vb = pb[i] || 0
    if (va > vb) return true
    if (va < vb) return false
  }
  return true
}

let mainWindow
let tray = null
let lockWindow = null
let lightOffWindow = null
let lobsterWindow = null
let lastLobsterState = null
let shatterWindow = null

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
  const pluginsRoot = getExtDir()
  const lockPluginDir = getPluginDirById('lock-screen') || '锁屏（win更新）'
  const htmlPath = path.join(pluginsRoot, lockPluginDir, 'lock-screen.html')
  const preloadPath = path.join(pluginsRoot, lockPluginDir, 'preload.js')

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

  lockWindow.loadFile(htmlPath).catch(() => {})
  lockWindow.on('closed', () => {
    lockWindow = null
  })
  lockWindow.once('ready-to-show', () => {
    lockWindow.setFullScreen(true)
    lockWindow.setBounds(display.bounds)
  })
}

function closeLightOffWindow() {
  if (lightOffWindow && !lightOffWindow.isDestroyed()) {
    lightOffWindow.close()
    lightOffWindow = null
  }
}

function createLightOffWindow() {
  if (lightOffWindow && !lightOffWindow.isDestroyed()) {
    lightOffWindow.focus()
    return
  }
  const display = screen.getPrimaryDisplay()
  const { width, height, x, y } = display.bounds
  lightOffWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  lightOffWindow.setMenuBarVisibility(false)
  lightOffWindow.setAlwaysOnTop(true, 'screen-saver')
  lightOffWindow.on('blur', () => {
    if (lightOffWindow && !lightOffWindow.isDestroyed()) lightOffWindow.focus()
  })
  const lightOffUrl = process.env.VITE_DEV_SERVER_URL
    ? process.env.VITE_DEV_SERVER_URL + '?pluginId=lock-screen-light-off'
    : pathToFileURL(path.join(__dirname, '../dist/index.html')).href + '?pluginId=lock-screen-light-off'
  lightOffWindow.loadURL(lightOffUrl)
  lightOffWindow.on('closed', () => {
    lightOffWindow = null
  })
  lightOffWindow.once('ready-to-show', () => {
    lightOffWindow.setFullScreen(true)
    lightOffWindow.setBounds(display.bounds)
  })
}

function closeShatterWindow() {
  if (shatterWindow && !shatterWindow.isDestroyed()) {
    shatterWindow.close()
    shatterWindow = null
  }
}

function createShatterWindow() {
  if (shatterWindow && !shatterWindow.isDestroyed()) {
    shatterWindow.focus()
    return
  }
  const display = screen.getPrimaryDisplay()
  const { width, height, x, y } = display.bounds
  shatterWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    fullscreen: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  shatterWindow.setMenuBarVisibility(false)
  shatterWindow.setBackgroundColor('#00000000')
  const pluginsRoot = getExtDir()
  const shatterPluginDir = getPluginDirById('screen-saver-shatter') || '屏保（碎屏）'
  const shatterPath = path.join(pluginsRoot, shatterPluginDir, 'shatter-screen.html')
  shatterWindow.loadFile(shatterPath).catch(() => {})
  shatterWindow.on('closed', () => {
    shatterWindow = null
  })
  shatterWindow.once('ready-to-show', () => {
    shatterWindow.setFullScreen(true)
    shatterWindow.setBounds(display.bounds)
    shatterWindow.setIgnoreMouseEvents(true, { forward: true })
  })
}

function createLobsterWindow() {
  if (lobsterWindow && !lobsterWindow.isDestroyed()) {
    return
  }
  const display = screen.getPrimaryDisplay()
  const { width, height, x, y } = display.workArea
  lobsterWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  lobsterWindow.setMenuBarVisibility(false)
  const lobsterUrl = process.env.VITE_DEV_SERVER_URL
    ? process.env.VITE_DEV_SERVER_URL + '?pluginId=lobster'
    : pathToFileURL(path.join(__dirname, '../dist/index.html')).href + '?pluginId=lobster'
  lobsterWindow.loadURL(lobsterUrl)
  lobsterWindow.on('closed', () => {
    lobsterWindow = null
  })
  lobsterWindow.webContents.once('did-finish-load', () => {
    if (lastLobsterState != null && lobsterWindow && !lobsterWindow.isDestroyed()) {
      lobsterWindow.webContents.send('lobster-state', lastLobsterState)
    }
  })
  lobsterWindow.once('ready-to-show', () => {
    lobsterWindow.setBounds(display.workArea)
    lobsterWindow.setAlwaysOnTop(true, 'screen-saver')
    lobsterWindow.setIgnoreMouseEvents(true, { forward: true })
  })
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
    icon: getWindowIconPath(),
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

if (process.platform === 'win32') {
  app.setAppUserModelId(app.isPackaged ? 'com.ly-tools' : 'com.ly-tools.dev')
}

// 自定义协议 ly-plugin:// 用于运行时加载插件，主程序不依赖 plugins 源码
protocol.registerSchemesAsPrivileged([
  { scheme: 'ly-plugin', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

function createTray() {
  if (tray) return
  const iconPath = getWindowIconPath()
  tray = new Tray(iconPath)
  tray.setToolTip('栾媛小工具')
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示', click: () => { mainWindow && !mainWindow.isDestroyed() && mainWindow.show() } },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; app.quit() } },
  ]))
}

app.isQuitting = false

app.whenReady().then(() => {
  migrateEncodedPluginDirs()
  // 注册 ly-plugin:// 协议，从插件目录提供 App.js
  protocol.handle('ly-plugin', (request) => {
    try {
      const u = new URL(request.url)
      const pathname = decodeURIComponent(u.pathname)
      const match = pathname.match(/^\/([^/]+)\/(.+)$/)
      if (!match) return new Response('Not Found', { status: 404 })
      const [, pluginDir, file] = match
      const pluginsRoot = getExtDir()
      const filePath = path.join(pluginsRoot, pluginDir, file)
      if (!filePath.startsWith(pluginsRoot) || !fs.existsSync(filePath)) {
        return new Response('Not Found', { status: 404 })
      }
      const content = fs.readFileSync(filePath)
      const ext = path.extname(file).toLowerCase()
      const mime = ext === '.js' ? 'application/javascript' : ext === '.json' ? 'application/json' : 'text/plain'
      return new Response(content, { headers: { 'Content-Type': mime } })
    } catch (_) {
      return new Response('Error', { status: 500 })
    }
  })
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) app.quit()
})

app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
  } else if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
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

ipcMain.handle('save-file', async (_event, { defaultName, data, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters || [{ name: 'ICO 图标', extensions: ['ico'] }],
  })

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, Buffer.from(data))
    return { success: true, path: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('get-platform', () => process.platform)

// 插件目录：打包后为 ~/.ly/tools/plugins，开发时为项目 plugins
function getExtDir() {
  const extDir = app.isPackaged
    ? path.join(require('os').homedir(), '.ly', 'tools', 'plugins')
    : path.join(__dirname, '..', 'plugins')
  if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true })
  return extDir
}

// 将 URL 编码的插件目录名迁移为解码后的中文名，避免 Vite 请求 404
function migrateEncodedPluginDirs() {
  const pluginsRoot = getExtDir()
  if (!fs.existsSync(pluginsRoot)) return
  try {
    const names = fs.readdirSync(pluginsRoot, { withFileTypes: true })
    for (const d of names) {
      if (!d.isDirectory()) continue
      const raw = d.name
      if (!/%[0-9A-Fa-f]{2}/.test(raw)) continue
      try {
        const decoded = decodeURIComponent(raw)
        if (decoded === raw) continue
        const oldPath = path.join(pluginsRoot, raw)
        const newPath = path.join(pluginsRoot, decoded)
        if (!fs.existsSync(newPath)) {
          fs.renameSync(oldPath, newPath)
        }
      } catch (_) {}
    }
  } catch (_) {}
}

function getPluginList() {
  const pluginsRoot = getExtDir()
  const list = []
  try {
    const names = fs.readdirSync(pluginsRoot, { withFileTypes: true })
    for (const dirent of names) {
      if (!dirent.isDirectory()) continue
      const pluginDir = dirent.name
      const manifestPath = path.join(pluginsRoot, pluginDir, 'manifest.json')
      if (!fs.existsSync(manifestPath)) continue
      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8')
        const manifest = JSON.parse(raw)
        const minVer = manifest.minLyToolsVersion
        if (minVer && !semverGte(getAppVersion(), minVer)) continue
        const supportedOS = manifest.supportedOS
        if (!Array.isArray(supportedOS) || supportedOS.length === 0) continue
        const platform = process.platform
        const normalized = supportedOS.map((s) =>
          String(s).toLowerCase()
            .replace(/^windows$|^win64$/, 'win32')
            .replace(/^macos?$/, 'darwin')
        )
        if (!normalized.includes(platform)) continue
        const displayTitle =
          manifest.title ??
          (() => {
            try {
              return decodeURIComponent(pluginDir)
            } catch {
              return pluginDir
            }
          })()
        list.push({ pluginDir, ...manifest, title: displayTitle })
      } catch (_) {}
    }
  } catch (_) {}
  return list
}

function getPluginDirById(pluginId) {
  const list = getPluginList()
  const found = list.find((p) => p.id === pluginId)
  return found ? found.pluginDir : null
}

ipcMain.handle('get-plugin-list', () => getPluginList())

ipcMain.handle('get-plugin-entry-url', (_event, pluginDir) => {
  const pluginsRoot = getExtDir()
  const dir = path.join(pluginsRoot, pluginDir)
  const appJs = path.join(dir, 'App.js')
  if (!fs.existsSync(appJs)) return null
  const encoded = encodeURIComponent(pluginDir)
  return `ly-plugin://${encoded}/App.js`
})

ipcMain.handle('get-plugin-entry-url-by-id', (_event, pluginId) => {
  const pluginDir = getPluginDirById(pluginId)
  if (!pluginDir) return null
  const pluginsRoot = getExtDir()
  const appJs = path.join(pluginsRoot, pluginDir, 'App.js')
  return fs.existsSync(appJs) ? `ly-plugin://${encodeURIComponent(pluginDir)}/App.js` : null
})

ipcMain.handle('uninstall-plugin', (_event, pluginDir) => {
  const pluginsRoot = getExtDir()
  const targetDir = path.join(pluginsRoot, pluginDir)
  if (!targetDir.startsWith(pluginsRoot) || !fs.existsSync(targetDir)) {
    return { ok: false, err: '插件目录不存在或路径非法' }
  }
  try {
    fs.rmSync(targetDir, { recursive: true })
    return { ok: true }
  } catch (e) {
    return { ok: false, err: e.message || '删除失败' }
  }
})

function fetchPluginMarketHtml() {
  return new Promise((resolve, reject) => {
    const url = new URL(PLUGIN_MARKET_BASE)
    const get = url.protocol === 'https:' ? https.get : http.get
    get(PLUGIN_MARKET_BASE, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      res.on('error', reject)
    }).on('error', reject)
  })
}

/** 获取插件市场 index.json，用于显示中文名称。格式：{ "plugins": [{ "filename": "xxx.zip", "title": "中文名" }] } 或 { "xxx.zip": "中文名" } */
async function fetchPluginMarketIndex() {
  return new Promise((resolve) => {
    const url = new URL('index.json', PLUGIN_MARKET_BASE).href
    const get = url.startsWith('https') ? https.get : http.get
    get(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
          resolve(json)
        } catch {
          resolve(null)
        }
      })
      res.on('error', () => resolve(null))
    }).on('error', () => resolve(null))
  })
}

function buildTitleMap(indexJson) {
  const map = {}
  if (!indexJson) return map
  if (Array.isArray(indexJson.plugins)) {
    for (const p of indexJson.plugins) {
      if (p.filename && p.title) map[p.filename] = p.title
    }
  } else if (typeof indexJson === 'object') {
    for (const [k, v] of Object.entries(indexJson)) {
      if (k.endsWith('.zip') && typeof v === 'string') map[k] = v
      else if (k.endsWith('.zip') && v && typeof v.title === 'string') map[k] = v.title
    }
  }
  return map
}

function parseZipLinksFromHtml(html, titleMap = {}) {
  const list = []
  const re = /href=["']([^"']+\.zip)["']/gi
  let m
  const seen = new Set()
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    const filename = raw.split('/').pop().replace(/%20/g, ' ')
    if (!filename.endsWith('.zip') || seen.has(filename)) continue
    seen.add(filename)
    const name = filename.replace(/\.zip$/i, '')
    list.push({
      name,
      title: titleMap[filename] || name,
      filename,
      url: new URL(filename, PLUGIN_MARKET_BASE).href,
    })
  }
  return list
}

ipcMain.handle('get-plugin-market-list', async () => {
  try {
    const [html, indexJson] = await Promise.all([
      fetchPluginMarketHtml(),
      fetchPluginMarketIndex(),
    ])
    const titleMap = buildTitleMap(indexJson)
    return { success: true, list: parseZipLinksFromHtml(html, titleMap) }
  } catch (e) {
    return { success: false, message: e.message || '获取列表失败', list: [] }
  }
})

// 跨设备移动：rename 在 C: -> D: 会 EXDEV，改为复制后删除
function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const e of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, e), path.join(dest, e))
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
  }
}

function moveToSync(src, dest) {
  try {
    fs.renameSync(src, dest)
  } catch (err) {
    if (err.code === 'EXDEV') {
      copyRecursiveSync(src, dest)
      fs.rmSync(src, { recursive: true, force: true })
    } else {
      throw err
    }
  }
}

// 插件目录使用解码后的中文名，避免 Vite 请求 URL 解码后路径不匹配导致 404
function decodePluginDirName(raw) {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

// 插件市场安装：下载 zip，自动解压到插件目录（开发=项目 plugins，打包后=~/.ly/tools/plugins）
ipcMain.handle('install-plugin-from-market', async (_event, filename) => {
  const appRoot = path.join(__dirname, '..')
  const AdmZip = require(path.join(appRoot, 'node_modules', 'adm-zip'))
  const pluginsRoot = getExtDir()
  const pluginName = decodePluginDirName(filename.replace(/\.zip$/i, ''))
  const targetDir = path.join(pluginsRoot, pluginName)
  const tmpFile = path.join(os.tmpdir(), `ly-tools-plugin-${Date.now()}-${filename}`)
  const tmpDir = path.join(os.tmpdir(), `ly-tools-plugin-extract-${Date.now()}`)

  try {
    await new Promise((resolve, reject) => {
      const url = new URL(filename, PLUGIN_MARKET_BASE).href
      const get = url.startsWith('https') ? https.get : http.get
      const file = fs.createWriteStream(tmpFile)
      const onResponse = (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = new URL(res.headers.location || '', url).href
          return get(loc, onResponse).on('error', reject)
        }
        res.pipe(file).on('finish', resolve).on('error', reject)
      }
      get(url, onResponse).on('error', (e) => {
        file.close()
        reject(e)
      })
    })

    fs.mkdirSync(tmpDir, { recursive: true })
    const zip = new AdmZip(tmpFile)
    zip.extractAllTo(tmpDir, true)

    const entries = fs.readdirSync(tmpDir)
    if (entries.length === 1) {
      const single = path.join(tmpDir, entries[0])
      if (fs.statSync(single).isDirectory()) {
        if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true })
        moveToSync(single, targetDir)
      } else {
        fs.mkdirSync(targetDir, { recursive: true })
        moveToSync(single, path.join(targetDir, entries[0]))
      }
    } else {
      if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true })
      fs.mkdirSync(targetDir, { recursive: true })
      for (const e of entries) {
        moveToSync(path.join(tmpDir, e), path.join(targetDir, e))
      }
    }

    fs.unlinkSync(tmpFile)
    fs.rmSync(tmpDir, { recursive: true, force: true })
    return { success: true, message: `已安装：${pluginName}` }
  } catch (e) {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (_) {}
    return { success: false, message: e.message || '安装失败' }
  }
})

ipcMain.handle('open-lock-screen', () => {
  createLockWindow()
})

ipcMain.handle('close-lock-window', () => {
  closeLockWindow()
})

ipcMain.handle('open-light-off-window', () => {
  createLightOffWindow()
})

ipcMain.handle('close-light-off-window', () => {
  closeLightOffWindow()
})

ipcMain.handle('open-shatter-window', () => {
  createShatterWindow()
})

ipcMain.handle('close-shatter-window', () => {
  closeShatterWindow()
})

ipcMain.handle('open-lobster-window', () => {
  createLobsterWindow()
})

ipcMain.handle('close-lobster-window', () => {
  if (lobsterWindow && !lobsterWindow.isDestroyed()) {
    lobsterWindow.close()
    lobsterWindow = null
  }
})

ipcMain.on('lobster-sync-state', (_e, state) => {
  lastLobsterState = state
  if (lobsterWindow && !lobsterWindow.isDestroyed()) {
    lobsterWindow.webContents.send('lobster-state', state)
  }
})

ipcMain.on('lobster-request-state', (e) => {
  if (lastLobsterState != null) e.sender.send('lobster-state', lastLobsterState)
})

ipcMain.on('lobster-crawl-done', (_e, id) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('lobster-crawl-done', id)
  }
})
