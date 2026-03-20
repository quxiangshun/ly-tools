import { createApp, reactive } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { createAppRouter, defaultPluginsForWeb, getPluginComponentLoader } from './router'

// standalone 窗口通过 URL 参数选择插件，与 router 一致用 glob 动态加载，不写死 import
const standaloneModules = import.meta.glob('../plugins/*/App.vue')
const standaloneQueryToDir = { lobster: '养龙虾', lightoff: '锁屏（关灯）' }

function getStandalonePluginDir() {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  for (const [param, pluginDir] of Object.entries(standaloneQueryToDir)) {
    if (q.get(param) === '1') return pluginDir
  }
  return null
}

const standalonePluginDir = getStandalonePluginDir()

if (standalonePluginDir) {
  const key = `../plugins/${standalonePluginDir}/App.vue`
  const load = standaloneModules[key]
  if (load) {
    load().then((m) => {
      const app = createApp(m.default, { standalone: true })
      app.use(ElementPlus)
      app.mount('#app')
    })
  } else {
    const app = createApp(App)
    app.use(ElementPlus)
    app.mount('#app')
  }
} else {
  const pluginState = reactive({ list: [] })

  async function refreshPlugins() {
    const list = window.electronAPI
      ? await window.electronAPI.getPluginList()
      : defaultPluginsForWeb
    const oldIds = new Set(pluginState.list.map((p) => p.id))
    pluginState.list = list
    const router = window.__LY_TOOLS_ROUTER__
    if (router) {
      for (const p of list) {
        if (!oldIds.has(p.id) && p.pluginDir && getPluginComponentLoader(p.pluginDir)) {
          router.addRoute({
            path: p.route,
            name: p.id,
            component: getPluginComponentLoader(p.pluginDir),
          })
        }
      }
    }
  }

  async function init() {
    await refreshPlugins()
    const router = createAppRouter(pluginState.list)
    window.__LY_TOOLS_ROUTER__ = router
    const app = createApp(App)
    app.use(ElementPlus)
    app.use(router)
    app.provide('pluginList', pluginState)
    app.provide('refreshPlugins', refreshPlugins)
    app.mount('#app')
  }
  init()
}
