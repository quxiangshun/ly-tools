import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { createAppRouter, defaultPluginsForWeb } from './router'

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
