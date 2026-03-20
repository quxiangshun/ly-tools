/**
 * ly-tools (栾媛小工具)
 * Copyright (C) 2025 屈想顺
 * Licensed under AGPL-3.0
 */
import { createApp, reactive } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { createAppRouter, defaultPluginsForWeb, getPluginComponentLoader } from './router'
import { exposePluginHost, loadPluginComponentById } from './plugin-loader'

exposePluginHost()

// standalone 窗口：通过 URL ?pluginId=xxx 加载指定插件（如养龙虾、关灯）
function getStandalonePluginId() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('pluginId')
}

const standalonePluginId = getStandalonePluginId()

if (standalonePluginId) {
  loadPluginComponentById(standalonePluginId).then((comp) => {
    if (comp) {
      const app = createApp(comp, { standalone: true })
      app.use(ElementPlus)
      app.mount('#app')
    } else {
      const app = createApp(App)
      app.use(ElementPlus)
      app.mount('#app')
    }
  }).catch(() => {
    const app = createApp(App)
    app.use(ElementPlus)
    app.mount('#app')
  })
} else {
  const pluginState = reactive({ list: [] })

  async function refreshPlugins() {
    const list = window.electronAPI
      ? await window.electronAPI.getPluginList()
      : defaultPluginsForWeb
    const oldIds = new Set(pluginState.list.map((p) => p.id))
    const newIds = new Set(list.map((p) => p.id))
    pluginState.list = list
    const router = window.__LY_TOOLS_ROUTER__
    if (router) {
      for (const id of oldIds) {
        if (!newIds.has(id)) router.removeRoute(id)
      }
      for (const p of list) {
        if (!oldIds.has(p.id) && p.pluginDir) {
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
