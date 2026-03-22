<template>
  <div class="app-wrap">
    <header class="app-header">
      <div class="app-header-left">
        <router-link v-if="!isHome && !isPluginMarket" to="/" class="back-home">
          <Icon icon="ri:arrow-left-line" :width="18" />
          返回
        </router-link>
      </div>
    </header>
    <main class="app-main">
      <router-view />
    </main>
    <footer class="app-footer">
      © 2025 屈想顺 · <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">AGPL-3.0</a>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const route = useRoute()
const router = useRouter()
const isHome = computed(() => route.path === '/')
const isPluginMarket = computed(() => route.path === '/plugin-market')

let stopNavigate = null
onMounted(() => {
  if (window.electronAPI?.onNavigate) {
    stopNavigate = window.electronAPI.onNavigate((path) => router.push(path))
  }
})
onUnmounted(() => {
  if (stopNavigate) stopNavigate()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
}

.app-wrap {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  -webkit-app-region: drag;
}

.app-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  -webkit-app-region: no-drag;
}

.back-home {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  color: #606266;
  font-size: 14px;
  text-decoration: none;
  border-radius: 8px;
  -webkit-app-region: no-drag;
}

.back-home:hover {
  background: #f5f7fa;
  color: #409eff;
}

.app-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.app-footer {
  padding: 12px 24px;
  font-size: 12px;
  color: #909399;
  text-align: center;
  border-top: 1px solid #ebeef5;
  background: #fff;
}

.app-footer a {
  color: #409eff;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}
</style>
