<template>
  <div class="json-formatter">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="左侧粘贴原始 JSON，右侧展示格式化并带颜色标记的结果；解析失败时会提示错误。"
      class="hint"
    />

    <div class="toolbar">
      <el-form inline size="small">
        <el-form-item label="缩进空格">
          <el-input-number v-model="indentSize" :min="2" :max="8" :step="2" />
        </el-form-item>
      </el-form>
      <div class="actions">
        <el-button size="small" @click="onFormat">重新格式化</el-button>
        <el-button size="small" @click="onMinify">压缩</el-button>
        <el-button size="small" type="primary" :disabled="!formattedText.trim()" @click="onCopy">
          复制结果
        </el-button>
        <el-button size="small" @click="onClear">清空</el-button>
      </div>
    </div>

    <div class="editor-grid">
      <div class="editor-pane">
        <div class="pane-title">原始 JSON</div>
        <div class="line-editor">
          <div class="line-gutter">{{ sourceLineNumbers }}</div>
          <el-input
            v-model="sourceText"
            type="textarea"
            :rows="18"
            resize="none"
            placeholder="在这里粘贴原始 JSON..."
            @paste="onPaste"
          />
        </div>
      </div>

      <div class="editor-pane">
        <div class="pane-title">格式化结果（高亮）</div>
        <div class="line-editor">
          <div class="line-gutter">{{ formattedLineNumbers }}</div>
          <pre class="result-view" v-html="highlightedFormatted"></pre>
        </div>
      </div>
    </div>

    <div class="status">
      <span v-if="error" class="status-error">{{ error }}</span>
      <span v-else-if="formattedText.trim()" class="status-ok">JSON 有效，已格式化。</span>
      <span v-else>等待输入 JSON...</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const sourceText = ref('')
const formattedText = ref('')
const indentSize = ref(2)
const error = ref('')

function parseJson(raw) {
  const value = JSON.parse(raw)
  error.value = ''
  return value
}

function tryFormat(raw = sourceText.value) {
  if (!raw.trim()) {
    error.value = ''
    formattedText.value = ''
    return
  }
  try {
    const value = parseJson(raw)
    formattedText.value = JSON.stringify(value, null, indentSize.value)
  } catch (e) {
    formattedText.value = ''
    error.value = `JSON 解析失败：${e.message}`
  }
}

function onPaste() {
  // 等待 v-model 接收到粘贴后的文本，再做自动格式化
  requestAnimationFrame(() => {
    tryFormat()
  })
}

function onFormat() {
  tryFormat()
  if (!error.value && formattedText.value.trim()) {
    ElMessage.success('格式化完成')
  }
}

function onMinify() {
  if (!sourceText.value.trim()) return
  try {
    const value = parseJson(sourceText.value)
    formattedText.value = JSON.stringify(value)
    ElMessage.success('已压缩 JSON')
  } catch (e) {
    formattedText.value = ''
    error.value = `JSON 解析失败：${e.message}`
    ElMessage.error('压缩失败，请先修正 JSON')
  }
}

async function onCopy() {
  try {
    await navigator.clipboard.writeText(formattedText.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

function onClear() {
  sourceText.value = ''
  formattedText.value = ''
  error.value = ''
}

watch(indentSize, () => {
  if (error.value || !sourceText.value.trim()) return
  tryFormat()
})

const highlightedFormatted = computed(() => {
  if (!formattedText.value) return ''
  return syntaxHighlight(formattedText.value)
})

const sourceLineNumbers = computed(() => buildLineNumbers(sourceText.value))
const formattedLineNumbers = computed(() => buildLineNumbers(formattedText.value))

function buildLineNumbers(text) {
  const lineCount = text ? text.split('\n').length : 1
  const lines = []
  for (let i = 1; i <= lineCount; i += 1) {
    lines.push(String(i))
  }
  return lines.join('\n')
}

function syntaxHighlight(jsonString) {
  const escaped = jsonString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number'
      if (match.startsWith('"')) {
        cls = match.endsWith(':') ? 'json-key' : 'json-string'
      } else if (match === 'true' || match === 'false') {
        cls = 'json-boolean'
      } else if (match === 'null') {
        cls = 'json-null'
      }
      return `<span class="${cls}">${match}</span>`
    }
  )
}
</script>

<style scoped>
.json-formatter {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
}

.hint {
  margin-bottom: 12px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.editor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.editor-pane {
  min-width: 0;
}

.line-editor {
  display: flex;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  min-height: 386px;
  max-height: 520px;
}

.line-gutter {
  width: 50px;
  flex-shrink: 0;
  margin: 0;
  padding: 12px 8px;
  border-right: 1px solid #ebeef5;
  background: #f5f7fa;
  color: #909399;
  text-align: right;
  white-space: pre;
  overflow: hidden;
  user-select: none;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.55;
}

.pane-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

:deep(.line-editor .el-textarea) {
  flex: 1;
}

:deep(.line-editor .el-textarea__inner) {
  border: none;
  border-radius: 0;
  min-height: 386px !important;
  max-height: 520px;
  padding: 12px;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre;
  overflow: auto;
  scrollbar-width: thin;
}

.result-view {
  margin: 0;
  flex: 1;
  padding: 12px;
  background: #fff;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.55;
  scrollbar-width: thin;
}

:deep(.line-editor .el-textarea__inner::-webkit-scrollbar),
.result-view::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

:deep(.line-editor .el-textarea__inner::-webkit-scrollbar-thumb),
.result-view::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 999px;
}

:deep(.line-editor .el-textarea__inner::-webkit-scrollbar-track),
.result-view::-webkit-scrollbar-track {
  background: transparent;
}

.status {
  margin-top: 10px;
  font-size: 13px;
  color: #909399;
}

.status-ok {
  color: #67c23a;
}

.status-error {
  color: #f56c6c;
}

html.dark .status-ok {
  color: #7ee787;
}

html.dark .status-error {
  color: #ff7b72;
}

html.dark .pane-title {
  color: #8b949e;
}

html.dark .line-editor {
  border-color: #30363d;
}

html.dark .line-gutter {
  border-right-color: #30363d;
  background: #161b22;
  color: #8b949e;
}

html.dark :deep(.line-editor .el-textarea__inner),
html.dark .result-view {
  background: #0d1117;
  color: #e6edf3;
}

html.dark :deep(.line-editor .el-textarea__inner::-webkit-scrollbar-thumb),
html.dark .result-view::-webkit-scrollbar-thumb {
  background: #484f58;
}

:deep(.json-key) {
  color: #1f6feb;
}

:deep(.json-string) {
  color: #22863a;
}

:deep(.json-number) {
  color: #cf222e;
}

:deep(.json-boolean) {
  color: #8250df;
}

:deep(.json-null) {
  color: #953800;
}

html.dark :deep(.json-key) {
  color: #79c0ff;
}

html.dark :deep(.json-string) {
  color: #a5d6ff;
}

html.dark :deep(.json-number) {
  color: #ffa657;
}

html.dark :deep(.json-boolean) {
  color: #d2a8ff;
}

html.dark :deep(.json-null) {
  color: #f2cc60;
}

@media (max-width: 960px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
