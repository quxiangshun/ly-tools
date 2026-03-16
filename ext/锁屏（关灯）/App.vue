<template>
  <div class="lights-off" ref="containerRef" @mousemove="onMouseMove" @click="exit">
    <div class="drowse-vignette" :class="{ drowsy: isDrowsy }"></div>
    <div class="drowse-breathe" :class="{ drowsy: isDrowsy }"></div>
    <button class="close-btn" title="退出" @click.stop="exit">
      <Icon icon="ri:close-line" :width="28" />
    </button>
    <div class="face">
      <div class="eyes">
        <div class="eye" v-for="(eye, i) in eyes" :key="'e-' + i">
          <svg viewBox="-60 -40 120 80" class="eye-svg">
            <defs>
              <clipPath :id="'lid-clip-' + i">
                <!-- 从上往下遮：只显示 y <= lidCoverY 的区域，即眼皮从上方盖下 -->
                <rect x="-60" y="-40" width="120" :height="lidClipHeight" />
              </clipPath>
            </defs>
            <ellipse class="eye-outline" cx="0" cy="0" rx="50" ry="35" fill="none" stroke="currentColor" stroke-width="3" />
            <circle
              class="pupil"
              :cx="eye.pupilX"
              :cy="eye.pupilY"
              r="12"
              fill="currentColor"
            />
            <!-- 瞌睡眼皮：黑色从上往下盖住眼睛 -->
            <ellipse
              class="eyelid"
              cx="0"
              cy="0"
              rx="52"
              ry="38"
              fill="#000"
              :clip-path="'url(#lid-clip-' + i + ')'"
            />
          </svg>
        </div>
      </div>
      <div class="nose-mouth">
        <svg viewBox="0 0 80 50" class="face-svg">
          <path class="nose" d="M 40 8 L 38 22 L 40 20 L 42 22 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          <path class="mouth" d="M 20 32 Q 40 42 60 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

// 瞌睡感：鼠标 1 秒不动则进入，动则立即清醒
const isDrowsy = ref(false)
const IDLE_MS = 1000
let idleTimer = null

// 瞌睡感：从一半盖到底，再睁回一半，循环（不回到全睁）
const lidCoverY = ref(-40)
const lidClipHeight = ref(0)
let blinkRAF = null
let drowsyStart = 0
const EYE_TOP = -35
const EYE_BOTTOM = 35
const CLOSED_Y = 42
const HALF_Y = -10.5
const VIEWBOX_TOP = -40
const CLOSE_DURATION = 2500
const CLOSED_HOLD = 1200
const OPEN_DURATION = 1800

function tickBlink(t) {
  blinkRAF = requestAnimationFrame(tickBlink)
  lerpPupils()
  if (!isDrowsy.value) {
    lidCoverY.value = EYE_TOP - 5
    lidClipHeight.value = 0
    return
  }
  const cycle = CLOSE_DURATION + CLOSED_HOLD + OPEN_DURATION
  const elapsed = (t - drowsyStart) % cycle
  let y
  if (elapsed < CLOSE_DURATION) {
    const p = elapsed / CLOSE_DURATION
    const ease = 1 - Math.pow(1 - p, 1.5)
    y = HALF_Y + (CLOSED_Y - HALF_Y) * ease
  } else if (elapsed < CLOSE_DURATION + CLOSED_HOLD) {
    y = CLOSED_Y
  } else {
    const p = (elapsed - CLOSE_DURATION - CLOSED_HOLD) / OPEN_DURATION
    const ease = 1 - Math.pow(1 - p, 1.2)
    y = CLOSED_Y - (CLOSED_Y - HALF_Y) * ease
  }
  lidCoverY.value = y
  lidClipHeight.value = Math.max(0, y - VIEWBOX_TOP)
}

watch(isDrowsy, (drowsy) => {
  if (drowsy) {
    drowsyStart = performance.now()
    eyes.value.forEach((_, i) => {
      eyes.value[i].pupilX = 0
      eyes.value[i].pupilY = MAX_OFFSET
    })
  }
})

onMounted(() => {
  blinkRAF = requestAnimationFrame(tickBlink)
  idleTimer = setTimeout(() => {
    isDrowsy.value = true
    idleTimer = null
  }, IDLE_MS)
})
onUnmounted(() => {
  if (blinkRAF) cancelAnimationFrame(blinkRAF)
  if (idleTimer) clearTimeout(idleTimer)
})

let router = null
try {
  router = useRouter()
} catch (_) {}
const containerRef = ref(null)
const mouse = reactive({ x: 0, y: 0 })
const eyes = ref([
  { pupilX: 0, pupilY: 0, centerX: 0, centerY: 0 },
  { pupilX: 0, pupilY: 0, centerX: 0, centerY: 0 },
])
const PUPIL_R = 12
const EYE_RX = 50
const EYE_RY = 35
const MAX_OFFSET = Math.min(EYE_RX - PUPIL_R - 4, EYE_RY - PUPIL_R - 4)

const EYE_GAP = 110
const PUPIL_LERP = 0.14

function onMouseMove(e) {
  if (!containerRef.value) return
  if (idleTimer) clearTimeout(idleTimer)
  isDrowsy.value = false
  idleTimer = setTimeout(() => {
    isDrowsy.value = true
    idleTimer = null
  }, IDLE_MS)
  const rect = containerRef.value.getBoundingClientRect()
  mouse.x = e.clientX - (rect.left + rect.width / 2)
  mouse.y = e.clientY - (rect.top + rect.height / 2)
}

function getPupilTargets() {
  const leftDx = mouse.x + EYE_GAP
  const leftDy = mouse.y
  const rightDx = mouse.x - EYE_GAP
  const rightDy = mouse.y
  return [
    { dx: leftDx, dy: leftDy },
    { dx: rightDx, dy: rightDy },
  ].map((d) => {
    const dist = Math.sqrt(d.dx * d.dx + d.dy * d.dy) || 1
    const scale = Math.min(1, MAX_OFFSET / dist)
    return {
      x: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, d.dx * scale)),
      y: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, d.dy * scale)),
    }
  })
}

function lerpPupils() {
  if (isDrowsy.value) return
  const targets = getPupilTargets()
  targets.forEach((t, i) => {
    eyes.value[i].pupilX += (t.x - eyes.value[i].pupilX) * PUPIL_LERP
    eyes.value[i].pupilY += (t.y - eyes.value[i].pupilY) * PUPIL_LERP
  })
}

function exit() {
  if (typeof window !== 'undefined' && window.electronAPI?.closeLightOffWindow) {
    window.electronAPI.closeLightOffWindow()
  } else if (router) {
    router.push('/')
  }
}

</script>

<style scoped>
.lights-off {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

/* 瞌睡感：边缘暗角，仅 drowsy 时显示并动画 */
.drowse-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%);
  opacity: 0;
  transition: opacity 0.5s ease;
}
.drowse-vignette.drowsy {
  opacity: 0.6;
  animation: drowse-vignette-pulse 6s ease-in-out infinite;
}
@keyframes drowse-vignette-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 瞌睡感：整体缓慢呼吸式明暗，仅 drowsy 时 */
.drowse-breathe {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: #000;
  opacity: 0;
}
.drowse-breathe.drowsy {
  animation: drowse-breathe 5s ease-in-out infinite;
}
@keyframes drowse-breathe {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.12; }
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  color: rgba(255, 255, 255, 0.92);
}

.eyes {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 80px;
}

.eye {
  width: 140px;
  height: 100px;
}

.eye-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.eye-outline {
  color: inherit;
}

.pupil {
  /* 每帧 lerp 更新，无需 transition */
}

.eyelid {
  transition: opacity 0.12s ease-out;
  pointer-events: none;
}

.nose-mouth {
  margin-top: -8px;
}

.face-svg {
  width: 80px;
  height: 50px;
  display: block;
}

.nose {
  color: inherit;
}

.mouth {
  color: inherit;
}
</style>
