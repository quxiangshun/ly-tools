const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

let mainWindow

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
