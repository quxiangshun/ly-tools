import { h } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import Home from '../views/Home.vue'
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

const defaultPluginsForWeb = []

export function buildRoutes(pluginList) {
  const routes = [
    { path: '/', name: 'Home', component: Home },
    { path: '/plugin-market', name: 'PluginMarket', component: () => import('../views/PluginMarket.vue') },
    ...pluginList
      .filter((p) => p.pluginDir)
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
