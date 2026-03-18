import { createRouter, createMemoryHistory } from 'vue-router'
import Home from '../views/Home.vue'

// 扫描 plugins 下所有 */App.vue，按 pluginDir 动态加载，无需逐个 import
const pluginModules = import.meta.glob('../../plugins/*/App.vue')

function getPluginComponentLoader(pluginDir) {
  const key = `../../plugins/${pluginDir}/App.vue`
  const load = pluginModules[key]
  if (!load) return null
  return () => load().then((m) => m.default)
}

const defaultPluginsForWeb = []

export function buildRoutes(pluginList) {
  const routes = [
    { path: '/', name: 'Home', component: Home },
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
