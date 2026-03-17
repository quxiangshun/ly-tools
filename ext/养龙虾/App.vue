<template>
  <div class="lobster-page" :class="{ 'lobster-standalone': standalone, 'lobster-controls-only': controlsOnly }">
    <header v-if="!standalone" class="lobster-header">
      <Icon icon="ri:restaurant-2-line" :width="22" color="#e74c3c" />
      <span>养龙虾</span>
    </header>
    <div v-if="standalone" class="pool" ref="poolRef">
      <div
        v-for="item in lobsters"
        :key="item.id"
        :class="['lobster', item.killing ? 'lobster-dying' : item.crawled ? 'lobster-wander' : 'lobster-crawl-in']"
        :style="lobsterStyle(item)"
        @transitionend="onLobsterTransitionEnd(item)"
      >
        <span class="lobster-emoji" :style="{ fontSize: item.size + 'px' }">{{ getEmoji(item) }}</span>
      </div>
    </div>

    <div class="float-bar">
      <div class="float-bar-inner">
        <el-button type="success" size="large" @click="addLobster" class="btn-add">
          <Icon icon="ri:add-line" :width="24" />
          <span>加一只</span>
        </el-button>
        <el-button
          type="danger"
          size="large"
          :disabled="lobsterCount === 0"
          @click="killOne"
          class="btn-minus"
        >
          <Icon icon="ri:subtract-line" :width="24" />
          <span>减一只</span>
        </el-button>
        <div class="creature-setting">
          <span class="size-label">种类</span>
          <el-radio-group v-model="selectedCreatureId" size="large" class="creature-radio">
            <el-radio-button
              v-for="c in CREATURES"
              :key="c.id"
              :value="c.id"
            >
              <span class="creature-radio-label">{{ c.emoji }} {{ c.name }}</span>
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="size-setting">
          <span class="size-label">大小</span>
          <el-slider v-model="lobsterSize" :min="5" :max="200" :step="1" :show-tooltip="true" style="width: 120px;" />
          <span class="size-value">{{ lobsterSize }}</span>
        </div>
        <span class="count-tip">{{ lobsterCount }} 只</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  standalone: { type: Boolean, default: false },
})

const isElectron = typeof window !== 'undefined' && window.electronAPI
const controlsOnly = computed(() => !props.standalone && isElectron)
const lobsterCount = computed(() => lobsters.value.length)

const CREATURES = [
  { id: 'lobster', name: '龙虾', emoji: '🦞' },
  { id: 'octopus', name: '八爪鱼', emoji: '🐙' },
  { id: 'whale', name: '鲸鱼', emoji: '🐋' },
  { id: 'dolphin', name: '海豚', emoji: '🐬' },
  { id: 'fish', name: '鱼', emoji: '🐟' },
  { id: 'shark', name: '鲨鱼', emoji: '🦈' },
  { id: 'turtle', name: '海龟', emoji: '🐢' },
  { id: 'crab', name: '螃蟹', emoji: '🦀' },
  { id: 'squid', name: '乌贼', emoji: '🦑' },
  { id: 'seal', name: '海豹', emoji: '🦭' },
]

const poolRef = ref(null)
const lobsters = ref([])
const lobsterSize = ref(48)
const selectedCreatureId = ref('lobster')
const displayPositions = ref({})
const wanderTargets = ref({})
let idCounter = 0
let wanderTimer = null
let killTimeout = null
let standaloneWanderTimer = null
let crawlDoneFallbackTimers = []

function getCreature(id) {
  return CREATURES.find((c) => c.id === id) || CREATURES[0]
}

function getEmoji(item) {
  const id = item.creatureType || 'lobster'
  return getCreature(id).emoji
}

function getRandom(min, max) {
  return Math.random() * (max - min) + min
}

function getEdgeStartAndTarget() {
  const edge = Math.floor(getRandom(0, 4))
  const targetLeft = getRandom(15, 85)
  const targetTop = getRandom(15, 85)
  let left, top
  if (edge === 0) {
    left = getRandom(10, 90)
    top = -3
  } else if (edge === 1) {
    left = 103
    top = getRandom(10, 90)
  } else if (edge === 2) {
    left = getRandom(10, 90)
    top = 103
  } else {
    left = -3
    top = getRandom(10, 90)
  }
  return { left, top, targetLeft, targetTop }
}

function lobsterStyle(item) {
  let left = item.left
  let top = item.top
  let transform = 'none'
  if (props.standalone && displayPositions.value[item.id]) {
    const d = displayPositions.value[item.id]
    left = d.left
    top = d.top
    const t = wanderTargets.value[item.id]
    if (t && (t.left !== left || t.top !== top)) {
      const dx = t.left - left
      const dy = t.top - top
      const moveAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
      const angleDeg = item.creatureType === 'crab' ? moveAngle + 90 : moveAngle
      transform = `rotate(${angleDeg}deg)`
    }
  }
  return {
    left: left + '%',
    top: top + '%',
    width: (item.size || 48) + 16 + 'px',
    height: (item.size || 48) + 16 + 'px',
    marginLeft: -((item.size || 48) / 2 + 8) + 'px',
    marginTop: -((item.size || 48) / 2 + 8) + 'px',
    transform,
  }
}

function addLobster() {
  const { left, top, targetLeft, targetTop } = getEdgeStartAndTarget()
  lobsters.value.push({
    id: ++idCounter,
    left,
    top,
    targetLeft,
    targetTop,
    size: lobsterSize.value,
    creatureType: selectedCreatureId.value,
    killing: false,
    crawled: false,
  })
  syncState()
}

function killOne() {
  if (lobsters.value.length === 0) return
  const index = Math.floor(Math.random() * lobsters.value.length)
  const id = lobsters.value[index].id
  lobsters.value[index].killing = true
  syncState()
  if (killTimeout) clearTimeout(killTimeout)
  killTimeout = setTimeout(() => {
    const next = lobsters.value.filter((l) => l.id !== id)
    lobsters.value = next
    syncState()
  }, 900)
}

function onLobsterTransitionEnd(item) {
  if (item.killing) return
  if (!item.crawled && item.targetLeft != null && window.electronAPI?.sendLobsterCrawlDone) {
    window.electronAPI.sendLobsterCrawlDone(item.id)
  } else if (!item.crawled && item.targetLeft != null) {
    item.crawled = true
    item.left = item.targetLeft
    item.top = item.targetTop
    item.targetLeft = undefined
    item.targetTop = undefined
  }
}

function wander() {
  lobsters.value.forEach((item) => {
    if (item.killing || !item.crawled) return
    item.left = item.left + getRandom(-0.6, 0.6)
    item.top = item.top + getRandom(-0.6, 0.6)
    if (item.left < 0) item.left = 0
    if (item.left > 100) item.left = 100
    if (item.top < 0) item.top = 0
    if (item.top > 100) item.top = 100
  })
  syncState()
}

function syncState() {
  if (!isElectron || !window.electronAPI?.sendLobsterState) return
  window.electronAPI.sendLobsterState({
    lobsters: lobsters.value.map((l) => ({ ...l })),
    lobsterSize: lobsterSize.value,
    selectedCreatureId: selectedCreatureId.value,
  })
}

function closeWindow() {
  if (window.electronAPI?.closeLobsterWindow) {
    window.electronAPI.closeLobsterWindow()
  } else {
    window.close()
  }
}

onMounted(() => {
  if (props.standalone) {
    document.documentElement.classList.add('lobster-standalone-root')
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    if (window.electronAPI?.onLobsterState) {
      window.electronAPI.onLobsterState((state) => {
        if (!state || !state.lobsters) return
        const prevLobsters = lobsters.value
        lobsters.value = state.lobsters.map((l) => {
          const existing = prevLobsters.find((e) => e.id === l.id)
          if (existing && existing.crawled) return { ...l, crawled: true }
          return { ...l }
        })
        lobsterSize.value = state.lobsterSize ?? 48
        if (state.selectedCreatureId) selectedCreatureId.value = state.selectedCreatureId
        const nextPositions = { ...displayPositions.value }
        const nextTargets = { ...wanderTargets.value }
        const stateIds = new Set(state.lobsters.map((l) => Number(l.id)))
        const newIdsThisBatch = new Set()
        state.lobsters.forEach((item) => {
          const isNew = nextPositions[item.id] === undefined
          const isKilling = item.killing
          if (isNew || isKilling) {
            nextPositions[item.id] = { left: item.left, top: item.top }
            if (isNew) newIdsThisBatch.add(item.id)
          } else {
            const curPos = displayPositions.value[item.id]
            const curTarget = wanderTargets.value[item.id]
            if (curPos) {
              nextPositions[item.id] = { ...curPos }
            } else {
              nextPositions[item.id] = { left: item.left, top: item.top }
            }
            if (curTarget) nextTargets[item.id] = { ...curTarget }
          }
          if (item.crawled && !nextTargets[item.id]) {
            nextTargets[item.id] = { left: getRandom(15, 85), top: getRandom(15, 85) }
          }
        })
        Object.keys(nextPositions).forEach((id) => {
          if (!stateIds.has(Number(id))) delete nextPositions[id]
        })
        Object.keys(nextTargets).forEach((id) => {
          if (!stateIds.has(Number(id))) delete nextTargets[id]
        })
        displayPositions.value = nextPositions
        wanderTargets.value = nextTargets
        state.lobsters.forEach((item) => {
          const isNewThisBatch = newIdsThisBatch.has(item.id)
          if (isNewThisBatch && !item.crawled && item.targetLeft != null) {
            nextTick(() => {
              displayPositions.value = { ...displayPositions.value, [item.id]: { left: item.targetLeft, top: item.targetTop } }
              const timer = setTimeout(() => {
                const list = lobsters.value
                const cur = list.find((l) => l.id === item.id)
                if (cur && !cur.crawled) {
                  lobsters.value = list.map((l) => (l.id === item.id ? { ...l, crawled: true } : l))
                  if (!wanderTargets.value[item.id]) {
                    wanderTargets.value = { ...wanderTargets.value, [item.id]: { left: getRandom(15, 85), top: getRandom(15, 85) } }
                  }
                  nextTick(wanderTick)
                }
              }, 800)
              crawlDoneFallbackTimers.push(timer)
            })
          }
        })
      })
      if (window.electronAPI.requestLobsterState) {
        window.electronAPI.requestLobsterState()
      }
    }
    const WANDER_INTERVAL_MS = 70
    const STEP = 0.9
    const ARRIVE_THRESHOLD = 0.6
    function pickNextTarget() {
      return { left: getRandom(5, 95), top: getRandom(5, 95) }
    }
    function wanderTick() {
      const nextPos = { ...displayPositions.value }
      const nextTargets = { ...wanderTargets.value }
      let hasUpdate = false
      lobsters.value.forEach((item) => {
        if (item.killing || !item.crawled) return
        const cur = nextPos[item.id] ?? { left: item.left, top: item.top }
        let target = nextTargets[item.id]
        const distToTarget = target
          ? Math.sqrt((target.left - cur.left) ** 2 + (target.top - cur.top) ** 2)
          : Infinity
        if (!target || distToTarget < ARRIVE_THRESHOLD) {
          target = pickNextTarget()
          nextTargets[item.id] = target
        }
        const dx = target.left - cur.left
        const dy = target.top - cur.top
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
        const step = Math.min(STEP, dist)
        let left = cur.left + (dx / dist) * step
        let top = cur.top + (dy / dist) * step
        left = Math.max(0, Math.min(100, left))
        top = Math.max(0, Math.min(100, top))
        nextPos[item.id] = { left, top }
        hasUpdate = true
      })
      if (hasUpdate) {
        wanderTargets.value = nextTargets
        displayPositions.value = nextPos
      }
    }
    standaloneWanderTimer = setInterval(wanderTick, WANDER_INTERVAL_MS)
  } else if (isElectron) {
    if (window.electronAPI?.openLobsterWindow) {
      window.electronAPI.openLobsterWindow()
    }
    if (window.electronAPI?.onLobsterCrawlDone) {
      window.electronAPI.onLobsterCrawlDone((id) => {
        const item = lobsters.value.find((l) => l.id === id)
        if (item) {
          item.crawled = true
          item.left = item.targetLeft
          item.top = item.targetTop
          item.targetLeft = undefined
          item.targetTop = undefined
          syncState()
        }
      })
    }
    syncState()
    if (!controlsOnly) {
      wanderTimer = setInterval(wander, 120)
    }
  } else {
    wanderTimer = setInterval(wander, 120)
  }
})

onUnmounted(() => {
  if (props.standalone) {
    document.documentElement.classList.remove('lobster-standalone-root')
    document.body.style.background = ''
    document.documentElement.style.background = ''
  }
  if (!props.standalone && isElectron && window.electronAPI?.closeLobsterWindow) {
    window.electronAPI.closeLobsterWindow()
  }
  if (killTimeout) clearTimeout(killTimeout)
  if (wanderTimer) clearInterval(wanderTimer)
  if (standaloneWanderTimer != null) {
    clearInterval(standaloneWanderTimer)
  }
  crawlDoneFallbackTimers.forEach(clearTimeout)
  crawlDoneFallbackTimers = []
})
</script>

<style scoped>
:global(html.lobster-standalone-root),
:global(html.lobster-standalone-root body),
:global(html.lobster-standalone-root #app) {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.lobster-page {
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: #e8f4f8;
  z-index: 0;
  min-height: 300px;
}

.lobster-controls-only .float-bar {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  bottom: auto;
}

.lobster-standalone {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  background: transparent;
  min-height: 0;
  pointer-events: none;
}

.lobster-standalone .pool {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  background: transparent;
  overflow: visible;
  z-index: 1;
}

.lobster-standalone .lobster {
  z-index: 2;
}

.lobster-standalone .float-bar {
  display: none;
}

.lobster-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #d4e9f0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  z-index: 5;
}

.pool {
  position: absolute;
  top: 49px;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #e8f4f8 0%, #d4e9f0 50%, #c5e0eb 100%);
}

.lobster {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  will-change: left, top;
}

.lobster-emoji {
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
  pointer-events: none;
  animation: creature-float 2.5s ease-in-out infinite;
}

@keyframes creature-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.05); }
}

.lobster-crawl-in {
  transition: left 0.7s ease-out, top 0.7s ease-out;
}

.lobster-wander {
  transition: left 0.18s ease-out, top 0.18s ease-out, transform 0.15s ease-out;
}

.lobster-dying .lobster-emoji {
  animation: none;
}

.lobster-dying {
  transition: opacity 0.9s ease-out, transform 0.9s ease-out;
  opacity: 0;
  transform: scale(0);
}

/* 窗口中间的操作栏：加一只、减一只、大小等 */
.float-bar {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  padding: 14px 0;
}

.float-bar-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  max-width: 600px;
  margin: 0 auto;
}

.btn-add {
  min-width: 120px;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
}

.btn-add span,
.btn-minus span {
  margin-left: 6px;
}

.btn-minus {
  min-width: 120px;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
}

.creature-setting {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.creature-radio {
  flex-wrap: wrap;
}

.creature-radio-label {
  font-size: 14px;
}

.size-setting {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-label {
  font-size: 14px;
  color: #606266;
}

.size-value {
  font-size: 14px;
  color: #303133;
  min-width: 28px;
}

.count-tip {
  font-size: 15px;
  color: #606266;
  margin-left: auto;
  font-weight: 500;
}
</style>
