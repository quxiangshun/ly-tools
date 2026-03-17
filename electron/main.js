const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')

let mainWindow
let lockWindow = null
let lightOffWindow = null
let lobsterWindow = null
let lastLobsterState = null
let shatterWindow = null

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
    ? process.env.VITE_DEV_SERVER_URL + '?lightoff=1'
    : pathToFileURL(path.join(__dirname, '../dist/index.html')).href + '?lightoff=1'
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
  const shatterPath = resolveLockPath('shatter-screen.html')
  shatterWindow.loadFile(shatterPath).catch(() => {
    shatterWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getShatterHTML()))
  })
  shatterWindow.on('closed', () => {
    shatterWindow = null
  })
  shatterWindow.once('ready-to-show', () => {
    shatterWindow.setFullScreen(true)
    shatterWindow.setBounds(display.bounds)
    shatterWindow.setIgnoreMouseEvents(true, { forward: true })
  })
}

function getShatterHTML() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:transparent;pointer-events:none}#wrap{pointer-events:none}.shatter-cracks{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.ih{fill:rgba(0,0,0,.55);filter:url(#hb)}.cg{fill:none;stroke:rgba(0,0,0,.65);stroke-width:.26;stroke-linecap:round;stroke-linejoin:round;filter:url(#gb)}.cl{fill:none;stroke:rgba(255,255,255,.96);stroke-width:.08;stroke-linecap:round;stroke-linejoin:round}.hg{fill:none;stroke:rgba(0,0,0,.5);stroke-width:.12;stroke-linecap:round;stroke-linejoin:round}.hl{fill:none;stroke:rgba(255,255,255,.7);stroke-width:.05;stroke-linecap:round;stroke-linejoin:round}</style></head><body><div id="wrap"><svg class="shatter-cracks" id="svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><filter id="hb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.85 0"/></filter><filter id="gb" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur in="SourceGraphic" stdDeviation="0.35" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0"/></filter></defs></svg></div><script>
function seg(x,y,ang,len,br){var p=[[x,y]],l=0,st=br?0.7:1,mt=br?0.5:0.35,kc=br?0.08:0.06,n=Math.min(br?35:95,Math.ceil(len/st)+5);for(var i=0;i<n&&l<len;i++){if(Math.random()<kc)ang+=(Math.random()-.5)*1.5;ang+=(Math.random()-.5)*mt;var s=st*(0.6+Math.random()*0.85);x+=Math.cos(ang)*s+(Math.random()-.5)*0.85;y+=Math.sin(ang)*s+(Math.random()-.5)*0.85;l+=s;p.push([x,y]);}return p;}
function toD(p){if(p.length<2)return '';var d='M '+p[0][0].toFixed(3)+' '+p[0][1].toFixed(3);for(var i=1;i<p.length;i++)d+=' L '+p[i][0].toFixed(3)+' '+p[i][1].toFixed(3);return d;}
var cx=50+(Math.random()-.5)*3,cy=50+(Math.random()-.5)*3,svg=document.getElementById('svg');
var hp=7+Math.floor(Math.random()*4),holeD='';for(var i=0;i<hp;i++){var a=(i/hp)*6.28+Math.random()*0.5,r=2.2+Math.random()*2.5;holeD+=(i?' L ':'M ')+(cx+Math.cos(a)*r).toFixed(2)+' '+(cy+Math.sin(a)*r).toFixed(2);}
var hole=document.createElementNS('http://www.w3.org/2000/svg','path');hole.setAttribute('class','ih');hole.setAttribute('d',holeD+' Z');svg.appendChild(hole);
var paths=[],n=8+Math.floor(Math.random()*5);for(var i=0;i<n;i++){var a=(i/n)*360+(Math.random()-.5)*20,r=a*0.01745,tl=48+Math.random()*24,pts=seg(cx,cy,r,tl,false);paths.push(toD(pts));if(pts.length>=4&&Math.random()<0.55){var idx=2+Math.floor(Math.random()*(pts.length-4)),bx=pts[idx][0],by=pts[idx][1],bl=10+Math.random()*18;paths.push(toD(seg(bx,by,r+(Math.random()-.5)*2,bl,true)));}}
paths.forEach(function(d){var g=document.createElementNS('http://www.w3.org/2000/svg','path');g.setAttribute('class','cg');g.setAttribute('d',d);svg.appendChild(g);var l=document.createElementNS('http://www.w3.org/2000/svg','path');l.setAttribute('class','cl');l.setAttribute('d',d);svg.appendChild(l);});
for(var h=0;h<6+Math.floor(Math.random()*6);h++){var fromC=Math.random()<0.5,sx=fromC?cx+(Math.random()-.5)*6:cx+(Math.random()-.5)*50,sy=fromC?cy+(Math.random()-.5)*6:cy+(Math.random()-.5)*50,ha=Math.random()*6.28,hp2=seg(sx,sy,ha,5+Math.random()*13,true);if(hp2.length<2)continue;var hd=toD(hp2);var hg=document.createElementNS('http://www.w3.org/2000/svg','path');hg.setAttribute('class','hg');hg.setAttribute('d',hd);svg.appendChild(hg);var hl=document.createElementNS('http://www.w3.org/2000/svg','path');hl.setAttribute('class','hl');hl.setAttribute('d',hd);svg.appendChild(hl);}
<\/script></body></html>`
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
    ? process.env.VITE_DEV_SERVER_URL + '?lobster=1'
    : pathToFileURL(path.join(__dirname, '../dist/index.html')).href + '?lobster=1'
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

function getLockScreenHTML() {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/><title>Windows正在进行更新 0%</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;font-family:"Segoe UI","Microsoft YaHei",sans-serif}.lock-overlay{position:fixed;inset:0;background:#0078d4;display:flex;align-items:center;justify-content:center}.close-btn{position:absolute;top:20px;right:24px;width:28px;height:28px;border:none;background:transparent;color:rgba(255,255,255,.5);border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .2s,color .2s,background .2s;box-shadow:none;opacity:0}.close-btn:hover{opacity:1;color:rgba(255,255,255,.7);background:rgba(255,255,255,.08)}.update-content{text-align:center;color:#fff}.spinner-wrap{margin:0 auto 32px;width:40px;height:40px;color:#fff}.spinner-wrap svg{width:100%;height:100%}.spinner-wrap .dot{animation:dot-scale .75s ease-in-out infinite both}.spinner-wrap .dot:nth-child(1){animation-delay:0s;transform-origin:4px 4px}.spinner-wrap .dot:nth-child(2){animation-delay:.125s;transform-origin:12px 4px}.spinner-wrap .dot:nth-child(3){animation-delay:.25s;transform-origin:20px 4px}.spinner-wrap .dot:nth-child(4){animation-delay:.375s;transform-origin:4px 12px}.spinner-wrap .dot:nth-child(5){animation-delay:.5s;transform-origin:12px 12px}.spinner-wrap .dot:nth-child(6){animation-delay:.625s;transform-origin:20px 12px}@keyframes dot-scale{0%,100%{transform:scale(.3);opacity:.5}50%{transform:scale(1);opacity:1}}.update-title{font-size:28px;font-weight:300;margin:0 0 12px;letter-spacing:.5px}.update-sub{font-size:15px;opacity:.9;margin:0;font-weight:300}</style></head><body><div class="lock-overlay"><button class="close-btn" title="退出" id="closeBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button><div class="update-content"><div class="spinner-wrap"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle class="dot" cx="4" cy="4" r="3"/><circle class="dot" cx="12" cy="4" r="3"/><circle class="dot" cx="20" cy="4" r="3"/><circle class="dot" cx="4" cy="12" r="3"/><circle class="dot" cx="12" cy="12" r="3"/><circle class="dot" cx="20" cy="12" r="3"/></svg></div><p class="update-title">Windows正在进行更新 0%</p><p class="update-sub">请勿关闭计算机。你的计算机可能会重启几次。</p></div></div><script>document.getElementById('closeBtn').onclick=function(){if(window.electronAPI&&typeof window.electronAPI.closeLockWindow==='function')window.electronAPI.closeLockWindow();else window.close();};</script></body></html>`
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
    mainWindow.webContents.openDevTools()
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

function getExtDir() {
  const extDir = path.join(app.getAppPath(), 'ext')
  if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true })
  return extDir
}

const DEFAULT_PLUGINS = [
  { dir: '端口查杀', manifest: { id: 'port-killer', route: '/port-killer', icon: 'ri:terminal-box-line', description: '根据端口号查询并终止占用进程', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } },
  { dir: '图标生成', manifest: { id: 'icon-generator', route: '/icon-generator', icon: 'ri:palette-line', description: '文字生成 ICO 图标，支持多尺寸', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' } },
  { dir: '锁屏（win更新）', manifest: { id: 'lock-screen', route: '/lock-screen', title: '锁屏（win更新）', icon: 'ri:lock-line', description: 'Windows 更新风格假锁屏，点击右上角 × 退出', color: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)', fullScreen: true } },
  { dir: '锁屏（关灯）', manifest: { id: 'lock-screen-light-off', route: '/lock-screen-light-off', icon: 'ri:lightbulb-flash-line', description: '全黑关灯，中间两只大眼睛，眼球随鼠标转动，简笔画风格，点击退出', color: 'linear-gradient(135deg, #1a1a1a 0%, #000 100%)', fullScreen: true } },
  { dir: '屏保（碎屏）', manifest: { id: 'screen-saver-shatter', route: '/screen-saver-shatter', title: '屏保（碎屏）', icon: 'ri:fullscreen-exit-line', description: '点击后桌面呈现碎屏效果，点击任意处退出', color: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)', fullScreen: true } },
  { dir: '养龙虾', manifest: { id: 'lobster', route: '/lobster', icon: 'ri:restaurant-2-line', description: '点击加号增加龙虾，减号随机杀掉一只，龙虾从屏幕任意位置爬出', color: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' } },
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
