import { createRouter, createMemoryHistory } from 'vue-router'
import { defineAsyncComponent } from 'vue'
import Home from '../views/Home.vue'

const extModules = import.meta.glob('../ext/*/App.vue')

function getExtTitleFromPath(path) {
  const parts = path.replace(/\\/g, '/').split('/')
  const extIndex = parts.indexOf('ext')
  if (extIndex >= 0 && parts[extIndex + 1]) return parts[extIndex + 1]
  return null
}

const titleToLoader = {}
for (const [path, load] of Object.entries(extModules)) {
  const title = getExtTitleFromPath(path)
  if (title) titleToLoader[title] = load
}

function getExtComponent(title) {
  const load = titleToLoader[title]
  if (!load) return null
  return defineAsyncComponent(() => load().then((m) => m.default))
}

const defaultPluginsForWeb = [
  { id: 'port-killer', route: '/port-killer', title: '端口查杀', icon: 'ri:terminal-box-line', description: '根据端口号查询并终止占用进程', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'icon-generator', route: '/icon-generator', title: '图标生成', icon: 'ri:palette-line', description: '文字生成 ICO 图标，支持多尺寸', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'lock-screen', route: '/lock-screen', title: '锁屏', icon: 'ri:lock-line', description: 'Windows 更新风格假锁屏，点击右上角 × 退出', color: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)', fullScreen: true },
]

export function buildRoutes(pluginList) {
  const routes = [
    { path: '/', name: 'Home', component: Home },
    ...pluginList
      .filter((p) => getExtComponent(p.title))
      .map((p) => ({
        path: p.route,
        name: p.id,
        component: getExtComponent(p.title),
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
