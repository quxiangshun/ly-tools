<template>
  <div class="lock-overlay">
    <button class="close-btn" title="退出" @click="exit">
      <Icon icon="ri:close-line" :width="28" />
    </button>

    <div class="update-content">
      <div class="spinner">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
      <p class="update-title">正在准备 Windows 更新</p>
      <p class="update-sub">请不要关闭电脑</p>
      <div class="progress-bar">
        <div class="progress-inner"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const router = useRouter()

function exit() {
  router.push('/')
}
</script>

<style scoped>
.lock-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0078d4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.update-content {
  text-align: center;
  color: #fff;
}

.spinner {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 32px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 1.4s ease-in-out infinite both;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.update-title {
  font-size: 28px;
  font-weight: 300;
  margin: 0 0 12px 0;
  letter-spacing: 0.5px;
}

.update-sub {
  font-size: 15px;
  opacity: 0.9;
  margin: 0 0 40px 0;
  font-weight: 300;
}

.progress-bar {
  width: 320px;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  width: 30%;
  background: #fff;
  border-radius: 2px;
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(200%); }
  100% { transform: translateX(-100%); }
}
</style>
