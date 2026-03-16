import { createRouter, createMemoryHistory } from 'vue-router'
import Home from '../views/Home.vue'
import PortKillerApp from '../../ext/端口查杀/App.vue'
import IconGeneratorApp from '../../ext/图标生成/App.vue'
import LockScreenApp from '../../ext/锁屏/App.vue'
import LobsterApp from '../../ext/养龙虾/App.vue'

const idToComponent = {
  'port-killer': PortKillerApp,
  'icon-generator': IconGeneratorApp,
  'lock-screen': LockScreenApp,
  'lobster': LobsterApp,
}

function getPluginComponent(id) {
  return idToComponent[id] || null
}

const defaultPluginsForWeb = []

export function buildRoutes(pluginList) {
  const routes = [
    { path: '/', name: 'Home', component: Home },
    ...pluginList
      .filter((p) => getPluginComponent(p.id))
      .map((p) => ({
        path: p.route,
        name: p.id,
        component: getPluginComponent(p.id),
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
