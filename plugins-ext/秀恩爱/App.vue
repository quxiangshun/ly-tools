<template>
  <div class="show-love">
    <div class="hearts-bg">
      <span v-for="i in 12" :key="i" class="heart-float" :style="heartStyle(i)">❤</span>
    </div>

    <el-card shadow="never" class="love-card">
      <div class="names-row">
        <el-input
          v-model="name1"
          placeholder="TA 的名字"
          size="large"
          clearable
          class="name-input"
          maxlength="10"
          show-word-limit
        />
        <span class="heart-connector">
          <Icon icon="ri:heart-3-fill" :width="32" />
        </span>
        <el-input
          v-model="name2"
          placeholder="你的名字"
          size="large"
          clearable
          class="name-input"
          maxlength="10"
          show-word-limit
        />
      </div>

      <div class="anniversary-row">
        <span class="label">在一起的日子</span>
        <el-date-picker
          v-model="anniversary"
          type="date"
          placeholder="选择日期"
          size="large"
          format="YYYY年MM月DD日"
          value-format="YYYY-MM-DD"
          :shortcuts="shortcuts"
          class="date-picker"
        />
      </div>

      <div v-if="anniversary && daysTogether >= 0" class="days-display">
        <div class="days-number">{{ daysTogether }}</div>
        <div class="days-label">天</div>
        <p class="days-tip">{{ daysTip }}</p>
      </div>

      <div v-else-if="anniversary && daysTogether < 0" class="days-display days-future">
        <p>选择未来日期？看来你们是命中注定～</p>
      </div>

      <div v-else class="days-display days-future">
        <p>选择在一起的日期，看看已经多少天啦～</p>
      </div>
    </el-card>

    <el-card shadow="never" class="quote-card">
      <div class="quote-content">
        <Icon icon="ri:double-quotes-l" :width="24" class="quote-icon" />
        <p class="quote-text">{{ currentQuote }}</p>
        <Icon icon="ri:double-quotes-r" :width="24" class="quote-icon" />
      </div>
      <el-button text type="primary" @click="nextQuote" class="next-quote-btn">
        换一句
        <Icon icon="ri:arrow-right-line" :width="16" />
      </el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

onMounted(() => {
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  document.body.style.overflow = ''
})

const name1 = ref('')
const name2 = ref('')
const anniversary = ref('')
const quoteIndex = ref(0)

const QUOTES = [
  '斯人若彩虹，遇上方知有。',
  '愿得一心人，白首不相离。',
  '山无陵，江水为竭，冬雷震震，夏雨雪，天地合，乃敢与君绝。',
  '两情若是久长时，又岂在朝朝暮暮。',
  '只愿君心似我心，定不负相思意。',
  '世间所有的相遇，都是久别重逢。',
  '春风十里，不如你。',
  '余生很长，愿你遇见对的人。',
  '你是年少的欢喜，喜欢的少年是你。',
  '白茶清欢无别事，我在等风也等你。',
  '星河滚烫，你是人间理想。',
  '你是我温暖的手套，冰冷的啤酒。',
  '我想和你一起看日出到日落。',
  '爱是恒久忍耐，又有恩慈。',
  '陪伴是最长情的告白。',
]

const shortcuts = [
  { text: '今天', value: () => new Date() },
  { text: '一周前', value: () => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  }},
  { text: '一个月前', value: () => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d
  }},
  { text: '一年前', value: () => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return d
  }},
]

const currentQuote = computed(() => QUOTES[quoteIndex.value % QUOTES.length])

const daysTogether = computed(() => {
  if (!anniversary.value) return null
  const start = new Date(anniversary.value)
  const now = new Date()
  start.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.floor((now - start) / (24 * 60 * 60 * 1000))
})

const daysTip = computed(() => {
  const d = daysTogether.value
  if (d === 0) return '今天是在一起的第一天，要好好纪念哦～'
  if (d === 1) return '第二天啦，继续保持～'
  if (d < 7) return '热恋期，甜度满分！'
  if (d < 30) return '已经快一个月啦，越来越默契～'
  if (d < 100) return '百日纪念不远啦～'
  if (d < 365) return '快一周年了，期待！'
  if (d < 1000) return '在一起超过一年，感情越来越深～'
  if (d < 3653) return '十年之约，相伴到老～'
  return '执子之手，与子偕老。'
})

function nextQuote() {
  quoteIndex.value++
}

function heartStyle(i) {
  const left = (i * 7 + 3) % 100
  const delay = (i * 0.5) % 4
  const duration = 3 + (i % 3)
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  }
}

</script>

<style scoped>
.show-love {
  height: calc(100vh - 150px);
  max-height: calc(100vh - 150px);
  padding: 20px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.hearts-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.heart-float {
  position: absolute;
  font-size: 20px;
  opacity: 0.15;
  animation: float-up 4s ease-in-out infinite;
  color: #ff6b9d;
}

@keyframes float-up {
  0%, 100% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0.15;
  }
  50% {
    transform: translateY(-20px) rotate(10deg);
    opacity: 0.25;
  }
}

.love-card {
  margin-bottom: 16px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  border-radius: 16px;
}

.quote-card {
  flex: 1;
  min-height: 0;
  margin-bottom: 0;
  position: relative;
  z-index: 1;
  border-radius: 16px;
}

.love-card :deep(.el-card__body) {
  padding: 20px;
}

.quote-card :deep(.el-card__body) {
  padding: 16px 20px;
  height: 100%;
  box-sizing: border-box;
}

.names-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.name-input {
  width: 160px;
}

.heart-connector {
  color: #ff6b9d;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.anniversary-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.anniversary-row .label {
  font-size: 14px;
  color: #666;
  min-width: 100px;
}

.date-picker {
  flex: 1;
  max-width: 240px;
}

.days-display {
  text-align: center;
  padding: 16px 0;
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.08) 0%, rgba(196, 69, 105, 0.08) 100%);
  border-radius: 12px;
}

.days-number {
  font-size: 48px;
  font-weight: 700;
  color: #ff6b9d;
  line-height: 1;
  text-shadow: 0 2px 12px rgba(255, 107, 157, 0.3);
}

.days-label {
  font-size: 20px;
  color: #c44569;
  margin-top: 4px;
}

.days-tip {
  font-size: 14px;
  color: #888;
  margin: 12px 0 0;
}

.days-future p {
  color: #999;
  font-size: 14px;
}

.quote-card {
  background: linear-gradient(135deg, #fff9fb 0%, #fff5f8 100%);
}

.quote-content {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
  min-height: 0;
}

.quote-icon {
  color: #ff6b9d;
  opacity: 0.6;
  flex-shrink: 0;
}

.quote-text {
  flex: 1;
  font-size: 15px;
  line-height: 1.6;
  color: #555;
  margin: 0;
  font-style: italic;
  min-width: 0;
}

.next-quote-btn {
  font-size: 13px;
}
</style>
