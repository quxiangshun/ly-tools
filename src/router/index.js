import { createRouter, createMemoryHistory } from 'vue-router'
import Home from '../views/Home.vue'
import PortKillerApp from '../../ext/端口查杀/App.vue'
import IconGeneratorApp from '../../ext/图标生成/App.vue'
import LockScreenApp from '../../ext/锁屏（win更新）/App.vue'
import LockScreenLightOffApp from '../../ext/锁屏（关灯）/App.vue'
import LobsterApp from '../../ext/养龙虾/App.vue'
import MathGenApp from '../../ext/加减混合/App.vue'
import ScreenSaverShatterApp from '../../ext/屏保（碎屏）/App.vue'

const idToComponent = {
  'port-killer': PortKillerApp,
  'icon-generator': IconGeneratorApp,
  'lock-screen': LockScreenApp,
  'lock-screen-light-off': LockScreenLightOffApp,
  'lobster': LobsterApp,
  'math-gen': MathGenApp,
  'screen-saver-shatter': ScreenSaverShatterApp,
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
