<template>
  <div class="app-wrap">
    <header class="app-header">
      <router-link to="/" class="app-logo">
        <Icon icon="ri:tools-fill" :width="24" />
        <span>LY Tools</span>
      </router-link>
      <router-link v-if="!isHome" to="/" class="back-home">
        <Icon icon="ri:arrow-left-line" :width="18" />
        返回
      </router-link>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'

const route = useRoute()
const isHome = computed(() => route.path === '/')
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

.app-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.5px;
}

.app-logo:hover {
  color: #409eff;
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
</style>
