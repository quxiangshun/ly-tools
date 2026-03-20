# ly-plugin 协议定义

Copyright (C) 2025 屈想顺. Licensed under AGPL-3.0.

本文档完整定义 `ly-plugin://` 自定义协议的实现流程，包含主进程、预加载、渲染进程的代码，可根据文档实现同等功能。

## 1. 协议概述

`ly-plugin://` 是 Electron 自定义协议，用于在运行时从插件目录加载静态文件（App.js、style.css 等）。主程序与插件解耦，插件需预构建为 UMD 格式。

**设计要点**：
- pluginDir（含中文）必须放在 URL path 中，避免 host 编码解析问题
- 协议在 `app.whenReady()` 后注册
- 渲染进程通过 IPC 获取 URL，再通过 `<script>`、`<link>` 加载

## 2. URL 格式

```
ly-plugin://plugin/<encodeURIComponent(pluginDir)>/<file>
```

| 部分 | 说明 |
|------|------|
| `plugin` | 固定 host，无实际含义 |
| `<encoded>` | `encodeURIComponent(pluginDir)`，如 `端口查杀` → `%E7%AB%AF%E5%8F%A3%E6%9F%A5%E6%9D%80` |
| `<file>` | 文件名，如 `App.js`、`style.css` |

**示例**：
- `ly-plugin://plugin/%E7%AB%AF%E5%8F%A3%E6%9F%A5%E6%9D%80/App.js`
- `ly-plugin://plugin/%E7%AB%AF%E5%8F%A3%E6%9F%A5%E6%9D%80/style.css`

## 3. 主进程实现

### 3.1 协议注册（需在 app.ready 前）

```javascript
// electron/main.js
const { app, protocol } = require('electron')
const path = require('path')
const fs = require('fs')

protocol.registerSchemesAsPrivileged([
  { scheme: 'ly-plugin', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])
```

### 3.2 插件目录获取

```javascript
function getExtDir() {
  const extDir = app.isPackaged
    ? path.join(require('os').homedir(), '.ly', 'tools', 'plugins')
    : path.join(__dirname, '..', 'plugins')
  if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true })
  return extDir
}
```

### 3.3 协议处理器（app.whenReady 内）

```javascript
app.whenReady().then(() => {
  protocol.handle('ly-plugin', (request) => {
    try {
      const u = new URL(request.url)
      const parts = (u.pathname || '').split('/').filter(Boolean)
      if (parts.length < 2) return new Response('Not Found', { status: 404 })

      const pluginDir = decodeURIComponent(parts[0])
      const file = parts.slice(1).join('/') || 'App.js'
      if (!pluginDir || !file) return new Response('Not Found', { status: 404 })

      const pluginsRoot = getExtDir()
      const filePath = path.join(pluginsRoot, pluginDir, file)

      // 路径校验：防止越权访问
      if (!filePath.startsWith(pluginsRoot) || !fs.existsSync(filePath)) {
        return new Response('Not Found', { status: 404 })
      }

      const content = fs.readFileSync(filePath)
      const ext = path.extname(file).toLowerCase()
      const mimeMap = {
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
      }
      const mime = mimeMap[ext] || 'text/plain'
      return new Response(content, { headers: { 'Content-Type': mime } })
    } catch (_) {
      return new Response('Error', { status: 500 })
    }
  })
})
```

### 3.4 IPC 接口

```javascript
const { ipcMain } = require('electron')

// 根据 pluginDir 获取 App.js URL
ipcMain.handle('get-plugin-entry-url', (_event, pluginDir) => {
  const pluginsRoot = getExtDir()
  const appJs = path.join(pluginsRoot, pluginDir, 'App.js')
  if (!fs.existsSync(appJs)) return null
  const encoded = encodeURIComponent(pluginDir)
  return `ly-plugin://plugin/${encoded}/App.js`
})

// 根据 pluginId 获取 App.js URL（需实现 getPluginDirById）
ipcMain.handle('get-plugin-entry-url-by-id', (_event, pluginId) => {
  const pluginDir = getPluginDirById(pluginId)
  if (!pluginDir) return null
  const pluginsRoot = getExtDir()
  const appJs = path.join(pluginsRoot, pluginDir, 'App.js')
  return fs.existsSync(appJs) ? `ly-plugin://plugin/${encodeURIComponent(pluginDir)}/App.js` : null
})
```

## 4. 预加载脚本

```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getPluginEntryUrl: (pluginDir) => ipcRenderer.invoke('get-plugin-entry-url', pluginDir),
  getPluginEntryUrlById: (pluginId) => ipcRenderer.invoke('get-plugin-entry-url-by-id', pluginId),
})
```

## 5. 渲染进程 - 插件加载器

### 5.1 暴露宿主环境（应用启动时调用）

插件 UMD 依赖全局 `Vue`、`ElementPlus`、`Icon`，需在加载插件前设置：

```javascript
// src/plugin-loader.js
import * as Vue from 'vue'
import ElementPlus from 'element-plus'
import * as Icon from '@iconify/vue'

export function exposePluginHost() {
  if (typeof window === 'undefined') return
  window.Vue = Vue
  window.ElementPlus = ElementPlus
  window.Icon = Icon
}
```

### 5.2 加载插件 CSS

```javascript
function loadPluginCss(pluginDir) {
  const encoded = encodeURIComponent(pluginDir)
  const url = `ly-plugin://plugin/${encoded}/style.css`
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}
```

### 5.3 通过 URL 加载插件

```javascript
async function loadPluginByUrl(url, pluginDir) {
  if (pluginDir) loadPluginCss(pluginDir)

  return new Promise((resolve, reject) => {
    const prev = window.__LY_PLUGIN__
    window.__LY_PLUGIN__ = undefined

    const script = document.createElement('script')
    script.src = url
    script.onload = () => {
      const comp = window.__LY_PLUGIN__
      window.__LY_PLUGIN__ = prev
      script.remove()
      resolve(comp || null)
    }
    script.onerror = () => {
      window.__LY_PLUGIN__ = prev
      script.remove()
      reject(new Error(`加载插件失败: ${pluginDir}`))
    }
    document.head.appendChild(script)
  })
}
```

### 5.4 按 pluginDir 加载

```javascript
export async function loadPluginComponent(pluginDir) {
  if (!window.electronAPI?.getPluginEntryUrl) return null
  const url = await window.electronAPI.getPluginEntryUrl(pluginDir)
  if (!url) return null
  return loadPluginByUrl(url, pluginDir)
}
```

### 5.5 按 pluginId 加载（独立窗口等场景）

```javascript
export async function loadPluginComponentById(pluginId) {
  if (!window.electronAPI?.getPluginEntryUrlById) return null
  const url = await window.electronAPI.getPluginEntryUrlById(pluginId)
  if (!url) return null
  const pluginDir = url.match(/ly-plugin:\/\/[^/]+\/([^/]+)\//)?.[1]
  return loadPluginByUrl(url, pluginDir ? decodeURIComponent(pluginDir) : null)
}
```

## 6. 路由集成

```javascript
// src/router/index.js
import { h } from 'vue'
import { loadPluginComponent } from '../plugin-loader'

function errorPlaceholder(msg) {
  return { render: () => h('div', { class: 'p-4 text-gray-500' }, msg) }
}

export function getPluginComponentLoader(pluginDir) {
  return () =>
    loadPluginComponent(pluginDir)
      .then((c) => c || errorPlaceholder('插件未构建，请运行 npm run build:plugins'))
      .catch(() => errorPlaceholder('插件加载失败'))
}

// 路由配置示例
export function buildRoutes(pluginList) {
  return [
    { path: '/', name: 'Home', component: Home },
    ...pluginList
      .filter((p) => p.pluginDir)
      .map((p) => ({
        path: p.route,
        name: p.id,
        component: getPluginComponentLoader(p.pluginDir),
      })),
  ]
}
```

## 7. 插件 UMD 格式要求

插件构建为 UMD，执行后需设置 `window.__LY_PLUGIN__` 为 Vue 组件。Vite 配置示例：

```javascript
// 构建配置
build: {
  lib: {
    entry: 'App.vue',
    name: '__LY_PLUGIN__',
    formats: ['umd'],
    fileName: () => 'App.js',
  },
  rollupOptions: {
    external: ['vue', 'element-plus', '@iconify/vue'],
    output: {
      format: 'umd',
      globals: {
        vue: 'Vue',
        'element-plus': 'ElementPlus',
        '@iconify/vue': 'Icon',
      },
    },
  },
}
```

## 8. 完整流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. 应用启动                                                              │
│    exposePluginHost() → window.Vue / ElementPlus / Icon                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. 用户访问插件路由（如 /port-killer）                                    │
│    getPluginComponentLoader(pluginDir) 被调用                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. 渲染进程 IPC                                                          │
│    electronAPI.getPluginEntryUrl('端口查杀')                             │
│    → 主进程返回 ly-plugin://plugin/%E7%AB%AF.../App.js                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. 加载 CSS                                                              │
│    <link href="ly-plugin://plugin/.../style.css">                        │
│    → 主进程 protocol.handle 拦截 → 读取 plugins/端口查杀/style.css        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. 加载 JS                                                               │
│    <script src="ly-plugin://plugin/.../App.js">                          │
│    → 主进程 protocol.handle 拦截 → 读取 plugins/端口查杀/App.js          │
│    → App.js 执行，设置 window.__LY_PLUGIN__ = Vue 组件                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. 加载器读取 window.__LY_PLUGIN__，resolve 为组件，路由渲染             │
└─────────────────────────────────────────────────────────────────────────┘
```

## 9. 协议处理流程（主进程）

```
请求: GET ly-plugin://plugin/%E7%AB%AF%E5%8F%A3%E6%9F%A5%E6%9D%80/App.js
    │
    ▼
解析 pathname: "/%E7%AB%AF%E5%8F%A3%E6%9F%A5%E6%9D%80/App.js"
    │
    ▼
split('/').filter(Boolean) → ["%E7%AB%AF%E5%8F%A3%E6%9F%A5%E6%9D%80", "App.js"]
    │
    ▼
pluginDir = decodeURIComponent(parts[0])  → "端口查杀"
file = parts.slice(1).join("/")           → "App.js"
    │
    ▼
filePath = pluginsRoot + "/" + pluginDir + "/" + file
    │
    ▼
校验: filePath.startsWith(pluginsRoot) && fs.existsSync(filePath)
    │
    ▼
content = fs.readFileSync(filePath)
mime = { .js: "application/javascript", .css: "text/css", ... }[ext]
    │
    ▼
return new Response(content, { headers: { "Content-Type": mime } })
```

## 10. 注意事项

1. **pluginDir 编码**：必须使用 `encodeURIComponent`，解析时 `decodeURIComponent`
2. **路径安全**：`filePath.startsWith(pluginsRoot)` 防止 `../` 越权
3. **UMD 全局名**：插件必须设置 `window.__LY_PLUGIN__`，加载器依赖此约定
4. **宿主暴露时机**：`exposePluginHost()` 需在首次加载插件前执行
