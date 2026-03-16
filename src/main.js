import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { createAppRouter, defaultPluginsForWeb } from './router'
import LobsterApp from '../ext/养龙虾/App.vue'
import LockScreenLightOffApp from '../ext/锁屏（关灯）/App.vue'

const isLobsterStandalone = typeof window !== 'undefined' && window.location.search.includes('lobster=1')
const isLightOffStandalone = typeof window !== 'undefined' && window.location.search.includes('lightoff=1')

if (isLobsterStandalone) {
  const app = createApp(LobsterApp, { standalone: true })
  app.use(ElementPlus)
  app.mount('#app')
} else if (isLightOffStandalone) {
  const app = createApp(LockScreenLightOffApp, { standalone: true })
  app.use(ElementPlus)
  app.mount('#app')
} else {
  async function init() {
    const pluginList = window.electronAPI
      ? await window.electronAPI.getPluginList()
      : defaultPluginsForWeb
    const router = createAppRouter(pluginList)
    const app = createApp(App)
    app.use(ElementPlus)
    app.use(router)
    app.provide('pluginList', pluginList)
    app.mount('#app')
  }
  init()
}
