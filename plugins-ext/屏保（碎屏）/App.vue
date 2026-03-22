<template>
  <div class="shatter-page">
    <div class="shatter-bar">
      <el-button type="primary" size="large" @click="enable" class="btn-enable">
        <Icon icon="ri:play-line" :width="22" />
        <span>启用</span>
      </el-button>
      <el-button type="danger" size="large" @click="exit" class="btn-exit">
        <Icon icon="ri:stop-line" :width="22" />
        <span>退出</span>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

function enable() {
  if (window.electronAPI?.openShatterWindow) {
    window.electronAPI.openShatterWindow()
  }
}

function exit() {
  if (window.electronAPI?.closeShatterWindow) {
    window.electronAPI.closeShatterWindow()
  }
}
</script>

<style scoped>
.shatter-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f0f2f5;
}

.shatter-bar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.btn-enable,
.btn-exit {
  min-width: 140px;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 28px;
}

.btn-enable span,
.btn-exit span {
  margin-left: 8px;
}

/* 跟随主框架深色模式 */
html.dark .shatter-page {
  background: #0d1117;
}
</style>
