import { createRouter, createMemoryHistory } from 'vue-router'
import Home from '../views/Home.vue'
import PortKiller from '../views/PortKiller.vue'
import IconGenerator from '../views/IconGenerator.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/port-killer', name: 'PortKiller', component: PortKiller },
  { path: '/icon-generator', name: 'IconGenerator', component: IconGenerator },
]

export default createRouter({
  history: createMemoryHistory(),
  routes,
})
