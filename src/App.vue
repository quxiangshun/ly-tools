<template>
  <div class="app-wrap">
    <header class="app-header">
      <div class="app-header-left">
        <router-link v-if="!isHome && !isPluginMarket" to="/" class="back-home">
          <Icon icon="ri:arrow-left-line" :width="18" />
          返回
        </router-link>
      </div>
      <div class="app-header-right">
        <button
          class="title-bar-btn theme-btn"
          :title="theme === 'dark' ? '浅色模式' : '深色模式'"
          @click="toggleTheme"
        >
          <Icon :icon="theme === 'dark' ? 'ri:sun-line' : 'ri:moon-line'" :width="16" />
        </button>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const route = useRoute()
const router = useRouter()
const isHome = computed(() => route.path === '/')
const isPluginMarket = computed(() => route.path === '/plugin-market')
const theme = ref(localStorage.getItem('ly-tools-theme') || 'light')

function applyTheme(t) {
  theme.value = t
  localStorage.setItem('ly-tools-theme', t)
  if (t === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

let stopNavigate = null
onMounted(() => {
  applyTheme(theme.value)
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
html.dark .app-wrap {
  background: #0d1117;
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
html.dark .app-header {
  background: #161b22;
  border-bottom-color: #30363d;
}

.app-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  -webkit-app-region: no-drag;
}

.app-header-right {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.title-bar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 32px;
  padding: 0;
  color: #606266;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.title-bar-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #303133;
}
html.dark .title-bar-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
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
html.dark .back-home {
  color: #8b949e;
}
.back-home:hover {
  background: #f5f7fa;
  color: #409eff;
}
html.dark .back-home:hover {
  background: #21262d;
  color: #58a6ff;
}

.app-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f0f2f5;
}
html.dark .app-main {
  background: #0d1117;
}

.app-footer {
  padding: 12px 24px;
  font-size: 12px;
  color: #909399;
  text-align: center;
  border-top: 1px solid #ebeef5;
  background: #fff;
}
html.dark .app-footer {
  background: #161b22;
  border-top-color: #30363d;
  color: #8b949e;
}

.app-footer a {
  color: #409eff;
  text-decoration: none;
}
html.dark .app-footer a {
  color: #58a6ff;
}
.app-footer a:hover {
  text-decoration: underline;
}
</style>
