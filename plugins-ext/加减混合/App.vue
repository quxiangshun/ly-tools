<template>
  <div class="math-gen">
    <el-card shadow="never" class="config-card">
      <template #header>
        <span>出题设置</span>
      </template>
      <el-form label-width="120px" class="config-form">
        <el-form-item label="数值范围">
          <el-select v-model="config.range" placeholder="多少以内">
            <el-option label="10以内" :value="10" />
            <el-option label="20以内" :value="20" />
            <el-option label="50以内" :value="50" />
            <el-option label="100以内" :value="100" />
          </el-select>
        </el-form-item>
        <el-form-item label="数的个数">
          <el-radio-group v-model="config.numCount">
            <el-radio-button :label="2">两个数</el-radio-button>
            <el-radio-button :label="3">三个数</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="运算类型">
          <el-radio-group v-model="config.opType">
            <el-radio-button label="add">加法</el-radio-button>
            <el-radio-button label="sub">减法</el-radio-button>
            <el-radio-button label="mixed">加减混合</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-divider content-position="left">各题型数量与范围</el-divider>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="基本计算">
              <el-input-number v-model="config.countBasic" :min="0" :max="200" placeholder="题数" />
            </el-form-item>
            <el-form-item label="范围">
              <el-select v-model="config.rangeBasic" size="small">
                <el-option v-for="r in rangeOptions" :key="r.value" :label="r.label" :value="r.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="比大小">
              <el-input-number v-model="config.countCompare" :min="0" :max="200" placeholder="题数" />
            </el-form-item>
            <el-form-item label="范围">
              <el-select v-model="config.rangeCompare" size="small">
                <el-option v-for="r in rangeOptions" :key="r.value" :label="r.label" :value="r.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="填未知数">
              <el-input-number v-model="config.countBlank" :min="0" :max="200" placeholder="题数" />
            </el-form-item>
            <el-form-item label="范围">
              <el-select v-model="config.rangeBlank" size="small">
                <el-option v-for="r in rangeOptions" :key="r.value" :label="r.label" :value="r.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button type="primary" size="large" :loading="generating" @click="generate">
            <Icon icon="ri:magic-stick-line" :width="18" style="margin-right: 6px" />
            生成题目
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="hasQuestions" shadow="never" class="result-card">
      <template #header>
        <div class="card-header">
          <span>已生成 {{ totalCount }} 题</span>
          <div>
            <el-button size="small" @click="exportExcel">
              <Icon icon="ri:file-excel-2-line" :width="16" style="margin-right: 4px" />
              导出 Excel
            </el-button>
            <el-button size="small" type="primary" @click="doPrint">
              <Icon icon="ri:printer-line" :width="16" style="margin-right: 4px" />
              打印
            </el-button>
          </div>
        </div>
      </template>
      <div ref="printArea">
        <section v-if="questionsByType.basic.length" class="question-section">
          <h4 class="section-title">一、基本运算</h4>
          <div class="questions-grid">
            <div v-for="(q, i) in questionsByType.basic" :key="'b-' + i" class="q-item">
              <span class="q-text">{{ q.text }}</span>
            </div>
          </div>
        </section>
        <section v-if="questionsByType.compare.length" class="question-section">
          <h4 class="section-title">二、比大小（填 &gt;、&lt; 或 =）</h4>
          <div class="questions-grid">
            <div v-for="(q, i) in questionsByType.compare" :key="'c-' + i" class="q-item">
              <span class="q-text">{{ q.text }}</span>
            </div>
          </div>
        </section>
        <section v-if="questionsByType.blank.length" class="question-section">
          <h4 class="section-title">三、填未知数</h4>
          <div class="questions-grid">
            <div v-for="(q, i) in questionsByType.blank" :key="'k-' + i" class="q-item">
              <span class="q-text">{{ q.text }}</span>
            </div>
          </div>
        </section>
      </div>
    </el-card>

    <div class="print-only" style="display: none;">
      <div class="print-title">口算练习（一年级）</div>
      <div ref="printGridRef" class="print-body"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus'

const config = reactive({
  range: 20,
  numCount: 2,
  opType: 'mixed',
  countBasic: 20,
  rangeBasic: 20,
  countCompare: 10,
  rangeCompare: 20,
  countBlank: 10,
  rangeBlank: 20,
})

const rangeOptions = [
  { label: '10以内', value: 10 },
  { label: '20以内', value: 20 },
  { label: '50以内', value: 50 },
  { label: '100以内', value: 100 },
]

const questionsByType = ref({ basic: [], compare: [], blank: [] })
const generating = ref(false)
const printArea = ref(null)
const printGridRef = ref(null)

const hasQuestions = computed(() => {
  const t = questionsByType.value
  return t.basic.length + t.compare.length + t.blank.length > 0
})
const totalCount = computed(() => {
  const t = questionsByType.value
  return t.basic.length + t.compare.length + t.blank.length
})

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 基本计算：结果与所有数均在 [0, maxVal]
function genBasic(maxVal, numCount, opType) {
  const seen = new Set()
  const list = []
  const maxAttempts = 500
  let attempts = 0

  while (list.length < (config.countBasic || 0) && attempts < maxAttempts) {
    attempts++
    if (numCount === 2) {
      const a = rand(0, maxVal)
      const b = rand(0, maxVal)
      let op = opType
      if (opType === 'mixed') op = Math.random() < 0.5 ? 'add' : 'sub'
      let text, ans
      if (op === 'add') {
        ans = a + b
        if (ans > maxVal) continue
        text = `${a} + ${b} = `
      } else {
        if (a < b) continue
        ans = a - b
        text = `${a} - ${b} = `
      }
      const key = text.trim()
      if (seen.has(key)) continue
      seen.add(key)
      list.push({ type: 'basic', text, textOnly: text, answer: ans })
    } else {
      const a = rand(0, maxVal)
      const b = rand(0, maxVal)
      const c = rand(0, maxVal)
      const ops = opType === 'add' ? ['+', '+'] : opType === 'sub' ? ['-', '-'] : [rand(0, 1) ? '+' : '-', rand(0, 1) ? '+' : '-']
      let val = a
      if (ops[0] === '+') val += b
      else { if (a < b) continue; val = a - b }
      if (ops[1] === '+') val += c
      else { if (val < c) continue; val -= c }
      if (val < 0 || val > maxVal) continue
      const text = `${a} ${ops[0]} ${b} ${ops[1]} ${c} = `
      const key = text.trim()
      if (seen.has(key)) continue
      seen.add(key)
      list.push({ type: 'basic', text, textOnly: text, answer: val })
    }
  }
  return list
}

// 比大小：左 ⚪ 右，答案为 > < =
function genCompare(maxVal) {
  const seen = new Set()
  const list = []
  const n = config.countCompare || 0
  let attempts = 0
  while (list.length < n && attempts < 500) {
    attempts++
    const form = rand(0, 2)
    let left, right, text, ans
    if (form === 0) {
      const a = rand(0, maxVal)
      const b = rand(0, maxVal)
      const c = rand(0, maxVal)
      left = a + b
      right = c
      text = `${a} + ${b} ⚪ ${c}`
    } else if (form === 1) {
      const a = rand(0, maxVal)
      const b = rand(0, maxVal)
      const c = rand(0, maxVal)
      const d = rand(0, maxVal)
      if (c < d) continue
      left = a + b
      right = c - d
      text = `${a} + ${b} ⚪ ${c} - ${d}`
    } else {
      const a = rand(0, maxVal)
      const b = rand(0, maxVal)
      const c = rand(0, maxVal)
      if (a < b) continue
      left = a - b
      right = c
      text = `${a} - ${b} ⚪ ${c}`
    }
    if (left < right) ans = '<'
    else if (left > right) ans = '>'
    else ans = '='
    const key = text
    if (seen.has(key)) continue
    seen.add(key)
    list.push({ type: 'compare', text, textOnly: text, answer: ans })
  }
  return list
}

// 填未知数：? + A = B, A + ? = B, ? - A = B, A - ? = B
// 避免 0+?=0、?+0=0、0-?=0、?-0=0 等 trivial 题，并按形式轮询以分散题型
function genBlank(maxVal) {
  const seen = new Set()
  const list = []
  const n = config.countBlank || 0
  const formOrder = [0, 1, 2, 3]
  for (let i = 0; i < formOrder.length - 1; i++) {
    const j = rand(i + 1, formOrder.length - 1)
    ;[formOrder[i], formOrder[j]] = [formOrder[j], formOrder[i]]
  }
  let formIndex = 0
  let attempts = 0
  const maxAttempts = 800
  while (list.length < n && attempts < maxAttempts) {
    attempts++
    const form = formOrder[formIndex % 4]
    formIndex++
    let text, ans
    if (form === 0) {
      const b = rand(1, maxVal)
      const a = rand(0, b)
      ans = b - a
      text = `? + ${a} = ${b}`
    } else if (form === 1) {
      const b = rand(1, maxVal)
      const a = rand(0, b)
      ans = b - a
      text = `${a} + ? = ${b}`
    } else if (form === 2) {
      const a = rand(0, maxVal)
      const b = rand(0, maxVal)
      if (a === 0 && b === 0) continue
      ans = a + b
      if (ans > maxVal) continue
      text = `? - ${a} = ${b}`
    } else {
      const a = rand(1, maxVal)
      const b = rand(0, a)
      ans = a - b
      text = `${a} - ? = ${b}`
    }
    if (seen.has(text)) continue
    seen.add(text)
    list.push({ type: 'blank', text: text.replace('?', '____'), textOnly: text.replace('?', '____'), answer: ans })
  }
  return list
}

function generate() {
  const total = (config.countBasic || 0) + (config.countCompare || 0) + (config.countBlank || 0)
  if (total === 0) {
    ElMessage.warning('请至少设置一种题型的数量')
    return
  }
  generating.value = true
  try {
    const basic = genBasic(config.rangeBasic, config.numCount, config.opType)
    const compare = genCompare(config.rangeCompare)
    const blank = genBlank(config.rangeBlank)
    questionsByType.value = { basic, compare, blank }
    const total = basic.length + compare.length + blank.length
    ElMessage.success(`已生成 ${total} 题`)
  } finally {
    generating.value = false
  }
}

function exportExcel() {
  if (!hasQuestions.value) {
    ElMessage.warning('请先生成题目')
    return
  }
  const BOM = '\uFEFF'
  const t = questionsByType.value
  const allRows = [
    ...t.basic.map((q) => (q.textOnly || q.text).replace(/"/g, '""')),
    ...t.compare.map((q) => (q.textOnly || q.text).replace(/"/g, '""')),
    ...t.blank.map((q) => (q.textOnly || q.text).replace(/"/g, '""')),
  ]
  const allAnswers = [
    ...t.basic.map((q) => q.answer ?? ''),
    ...t.compare.map((q) => q.answer ?? ''),
    ...t.blank.map((q) => q.answer ?? ''),
  ]
  const rows = allRows.map((text, i) => `${i + 1},"${text}",${allAnswers[i]}`)
  const header = '序号,题目,答案\n'
  const csv = BOM + header + rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  if (window.electronAPI?.saveFile) {
    const reader = new FileReader()
    reader.onload = async () => {
      const data = Array.from(new Uint8Array(reader.result))
      const result = await window.electronAPI.saveFile({
        defaultName: `口算题_${new Date().toISOString().slice(0, 10)}.csv`,
        data,
        filters: [{ name: 'CSV/Excel', extensions: ['csv'] }],
      })
      if (result?.success) ElMessage.success('已导出到 ' + result.path)
    }
    reader.readAsArrayBuffer(blob)
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `口算题_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('已下载 CSV')
  }
}

function doPrint() {
  if (!hasQuestions.value) {
    ElMessage.warning('请先生成题目')
    return
  }
  const printEl = document.querySelector('.print-only')
  if (printGridRef.value) {
    const t = questionsByType.value
    const parts = []
    if (t.basic.length) {
      parts.push('<div class="print-section-title">一、基本运算</div>')
      parts.push('<div class="print-grid">' + t.basic.map((q) => `<div class="print-q">${(q.textOnly || q.text).replace(/（答案.*?）/g, '')}</div>`).join('') + '</div>')
    }
    if (t.compare.length) {
      parts.push('<div class="print-section-title">二、比大小（填 &gt;、&lt; 或 =）</div>')
      parts.push('<div class="print-grid">' + t.compare.map((q) => `<div class="print-q">${(q.textOnly || q.text).replace(/（答案.*?）/g, '')}</div>`).join('') + '</div>')
    }
    if (t.blank.length) {
      parts.push('<div class="print-section-title">三、填未知数</div>')
      parts.push('<div class="print-grid">' + t.blank.map((q) => `<div class="print-q">${(q.textOnly || q.text).replace(/（答案.*?）/g, '')}</div>`).join('') + '</div>')
    }
    printGridRef.value.innerHTML = parts.join('')
  }
  printEl.style.display = 'block'
  const style = document.createElement('style')
  style.textContent = `
    @media print {
      body * { visibility: hidden; }
      .print-only, .print-only * { visibility: visible; }
      .print-only { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
      .print-title { font-size: 22px; text-align: center; margin-bottom: 20px; }
      .print-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 24px; font-size: 16px; }
      .print-q { padding: 4px 0; }
    }
  `
  document.head.appendChild(style)
  window.print()
  document.head.removeChild(style)
  printEl.style.display = 'none'
}
</script>

<style scoped>
.math-gen {
  max-width: 900px;
}

.config-card {
  margin-bottom: 20px;
}

.config-form :deep(.el-input-number) {
  width: 140px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.question-section {
  margin-bottom: 24px;
}
.question-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #333;
  font-weight: 600;
}

.questions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 24px;
  font-size: 15px;
  align-items: start;
}

.q-item {
  padding: 8px 0;
  border-bottom: 1px dashed #eee;
  min-height: 1.5em;
  display: flex;
  align-items: center;
}

.q-text {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.print-only .print-title {
  font-size: 22px;
  text-align: center;
  margin-bottom: 20px;
}

.print-only .print-section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px 0;
}
.print-only .print-section-title:first-of-type {
  margin-top: 0;
}

.print-only .print-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 24px;
  font-size: 16px;
  align-items: start;
}

.print-only .print-q {
  padding: 8px 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

/* 跟随主框架深色模式 */
html.dark .section-title {
  color: #e5e7eb;
}
html.dark .q-item {
  border-bottom-color: #30363d;
}
</style>
