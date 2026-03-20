import { createRouter, createMemoryHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { pluginModules } from '../plugin-modules'

function findPluginLoad(pluginDir) {
  const decoded = (() => {
    try {
      return decodeURIComponent(pluginDir)
    } catch {
      return pluginDir
    }
  })()
  const keys = [
    `../plugins/${pluginDir}/App.vue`,
    ...(decoded !== pluginDir ? [`../plugins/${decoded}/App.vue`] : []),
  ]
  for (const key of keys) {
    const load = pluginModules[key]
    if (load) return load
  }
  const sep = /[/\\]/
  for (const [key, load] of Object.entries(pluginModules)) {
    const parts = key.split(sep)
    const dir = parts[parts.length - 2]
    if (dir === pluginDir || dir === decoded) return load
  }
  return null
}

export function getPluginComponentLoader(pluginDir) {
  const load = findPluginLoad(pluginDir)
  if (!load) return null
  return () => load().then((m) => m.default)
}

const defaultPluginsForWeb = []

export function buildRoutes(pluginList) {
  const routes = [
    { path: '/', name: 'Home', component: Home },
    { path: '/plugin-market', name: 'PluginMarket', component: () => import('../views/PluginMarket.vue') },
    ...pluginList
      .filter((p) => p.pluginDir && getPluginComponentLoader(p.pluginDir))
      .map((p) => ({
        path: p.route,
        name: p.id,
        component: getPluginComponentLoader(p.pluginDir),
      })),
  ]
  return routes
}

export function createAppRouter(pluginList) {
  const routes = buildRoutes(pluginList)
  return createRouter({
    history: createMemoryHistory(),
    routes,
  })
}

export { defaultPluginsForWeb }
