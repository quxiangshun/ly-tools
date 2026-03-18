<template>
  <div class="lock-overlay">
    <button class="close-btn" title="退出" @click="exit">
      <Icon icon="ri:close-line" :width="28" />
    </button>

    <div class="update-content">
      <Icon icon="svg-spinners:6-dots-scale" class="spinner" :width="40" :height="40" />
      <p class="update-title">Windows正在进行更新 {{ percent }}%</p>
      <p class="update-sub">请勿关闭计算机。你的计算机可能会重启几次。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const router = useRouter()
const percent = ref(0)

const CYCLE_MS = 5 * 60 * 1000
let timer = null

function updatePercent() {
  const elapsed = (Date.now() - startTime) % CYCLE_MS
  percent.value = Math.min(100, Math.floor((elapsed / CYCLE_MS) * 101))
}

let startTime = 0
onMounted(() => {
  startTime = Date.now()
  updatePercent()
  timer = setInterval(updatePercent, 500)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function exit() {
  router.push('/')
}
</script>

<style scoped>
.lock-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: linear-gradient(to bottom, #1084d8 0%, #0078d4 100%);
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
  margin: 0 auto 36px;
  color: #fff;
}

.update-title {
  font-size: 26px;
  font-weight: 400;
  margin: 0 0 16px 0;
  letter-spacing: 0.5px;
}

.update-sub {
  font-size: 14px;
  opacity: 0.95;
  margin: 0;
  font-weight: 300;
  line-height: 1.5;
}
</style>
