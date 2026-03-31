<template>
  <div class="app-wrap">
    <header class="app-header">
      <div class="app-header-left">
        <template v-if="isHome">
          <span class="app-brand-title">栾媛小工具</span>
        </template>
        <template v-else>
          <router-link to="/" class="back-home">
            <Icon icon="ri:arrow-left-line" :width="14" />
            返回
          </router-link>
          <span v-if="pageTitle" class="app-page-title">{{ pageTitle }}</span>
        </template>
      </div>
      <div class="app-header-right">
        <router-link to="/plugin-market" class="title-bar-btn" title="插件市场">
          <Icon icon="ri:store-2-line" :width="14" />
        </router-link>
        <button
          class="title-bar-btn"
          title="关于"
          @click="showAbout"
        >
          <Icon icon="ri:information-line" :width="14" />
        </button>
        <button
          class="title-bar-btn theme-btn"
          :title="theme === 'dark' ? '浅色模式' : '深色模式'"
          @click="toggleTheme"
        >
          <Icon :icon="theme === 'dark' ? 'ri:sun-line' : 'ri:moon-line'" :width="16" />
        </button>
        <template v-if="hasElectron">
        <button
          class="title-bar-btn win-btn"
          title="缩小"
          @click="electronAPI?.windowMinimize?.()"
        >
          <Icon icon="ri:subtract-line" :width="14" />
        </button>
        <button
          class="title-bar-btn win-btn"
          title="放大"
          @click="electronAPI?.windowMaximize?.()"
        >
          <Icon icon="ri:fullscreen-line" :width="12" />
        </button>
        <button
          class="title-bar-btn win-btn win-btn-close"
          title="关闭"
          @click="electronAPI?.windowClose?.()"
        >
          <Icon icon="ri:close-line" :width="14" />
        </button>
        </template>
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
import { ref, computed, onMounted, onUnmounted, inject, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const electronAPI = inject('electronAPI', {})
const hasElectron = computed(() => !!electronAPI?.windowMinimize)
const route = useRoute()
const router = useRouter()
const pluginList = inject('pluginList', { list: [] })
const isHome = computed(() => route.path === '/')
const pageTitle = computed(() => {
  if (route.path === '/') return ''
  if (route.path === '/plugin-market') return '插件市场'
  const list = pluginList?.list ?? pluginList
  const arr = Array.isArray(list) ? list : []
  const p = arr.find((item) => item.route === route.path)
  return p?.title ?? ''
})
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

function showAbout() {
  if (electronAPI?.showAbout) {
    electronAPI.showAbout()
  } else {
    alert('栾媛小工具\n版本 1.0.0\n\nCopyright (C) 2025 屈想顺\nLicensed under AGPL-3.0')
  }
}

provide('theme', theme)

let stopNavigate = null
let stopToggleTheme = null
onMounted(() => {
  applyTheme(theme.value)
  if (window.electronAPI?.onNavigate) {
    stopNavigate = window.electronAPI.onNavigate((path) => router.push(path))
  }
  if (window.electronAPI?.onToggleTheme) {
    stopToggleTheme = window.electronAPI.onToggleTheme((t) => applyTheme(t))
  }
})
onUnmounted(() => {
  if (stopNavigate) stopNavigate()
  if (stopToggleTheme) stopToggleTheme()
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
  overflow: hidden;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
}

.app-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f0f2f5;
}
html.dark .app-wrap {
  background: #0d1117;
}

.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
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
  gap: 8px;
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
  text-decoration: none;
}
.title-bar-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #303133;
}
html.dark .title-bar-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
}

.win-btn {
  width: 36px;
}
.win-btn-close:hover {
  background: #e81123 !important;
  color: #fff !important;
}
html.dark .win-btn-close:hover {
  background: #e81123 !important;
  color: #fff !important;
}

.back-home {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  color: #606266;
  font-size: 12px;
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

.app-brand-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.02em;
}
html.dark .app-brand-title {
  color: #e5e7eb;
}

.app-page-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}
html.dark .app-page-title {
  color: #e5e7eb;
}

.app-main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #f0f2f5;
}
html.dark .app-main {
  background: #0d1117;
}

.app-footer {
  flex-shrink: 0;
  padding: 8px 16px;
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
