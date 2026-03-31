<template>
  <div class="md-reader">
    <div class="md-reader-toolbar">
      <el-button type="primary" :disabled="!hasElectron" @click="onPickFiles">
        <Icon icon="ri:file-open-line" :width="18" style="margin-right: 6px; vertical-align: -3px" />
        打开 Markdown
      </el-button>
      <el-dropdown trigger="click" placement="bottom-start" :disabled="!history.length">
        <el-button plain :disabled="!hasElectron">
          最近打开
          <Icon icon="ri:arrow-down-s-line" :width="16" style="margin-left: 4px; vertical-align: -2px" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu class="md-history-menu">
            <template v-if="!history.length">
              <el-dropdown-item disabled>暂无记录</el-dropdown-item>
            </template>
            <el-dropdown-item v-for="h in history" :key="h" class="md-history-item">
              <div class="md-history-row">
                <span
                  class="md-history-path"
                  :title="h"
                  @click.stop="openPath(h)"
                >{{ basename(h) }}</span>
                <button
                  type="button"
                  class="md-history-item-del"
                  title="从历史记录移除"
                  aria-label="从历史记录移除"
                  @click.stop="removeHistoryItem(h)"
                >
                  <Icon icon="ri:close-line" :width="16" />
                </button>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span v-if="!hasElectron" class="md-web-tip">请在 Electron 桌面版中使用以打开本地文件</span>
    </div>

    <template v-if="tabs.length">
      <div class="md-body-row">
        <aside v-show="!sidebarCollapsed" class="md-sidebar">
          <div class="md-sidebar-head">
            <span class="md-sidebar-title">文档目录</span>
            <button
              type="button"
              class="md-sidebar-fold"
              title="收起目录"
              aria-label="收起目录"
              @click="sidebarCollapsed = true"
            >
              <Icon icon="ri:menu-fold-line" :width="18" />
            </button>
          </div>
          <div class="md-sidebar-scroll">
            <p v-if="!tocItems.length" class="md-sidebar-empty">暂无标题（使用 #、## 等生成）</p>
            <button
              v-for="item in tocItems"
              :key="item.id"
              type="button"
              class="md-toc-item"
              :class="{ 'is-active': activeTocId === item.id }"
              :style="{ paddingLeft: (item.depth - 1) * 12 + 8 + 'px' }"
              :title="item.text"
              @click="onTocClick(item.id)"
            >
              {{ item.text }}
            </button>
          </div>
        </aside>
        <button
          v-if="sidebarCollapsed"
          type="button"
          class="md-sidebar-unfold"
          title="展开目录"
          aria-label="展开目录"
          @click="sidebarCollapsed = false"
        >
          <Icon icon="ri:menu-unfold-line" :width="18" />
        </button>
        <div class="md-main-col">
          <el-tabs
            v-model="activePath"
            type="card"
            closable
            class="md-tabs"
            @tab-remove="removeTab"
          >
            <el-tab-pane
              v-for="t in tabs"
              :key="t.path"
              :label="t.title"
              :name="t.path"
            />
          </el-tabs>
          <div class="md-toolbar-row">
            <el-input
              v-model="searchQuery"
              class="md-search-input"
              clearable
              placeholder="搜索…"
              size="small"
              @keydown.enter.prevent="searchGoNext"
            />
            <el-button
              size="small"
              :disabled="!searchMatchCount"
              @click="searchGoPrev"
            >
              <Icon icon="ri:arrow-up-s-line" :width="16" style="vertical-align: -2px" />
              上一个
            </el-button>
            <el-button
              size="small"
              :disabled="!searchMatchCount"
              @click="searchGoNext"
            >
              <Icon icon="ri:arrow-down-s-line" :width="16" style="vertical-align: -2px" />
              下一个
            </el-button>
            <span v-if="searchQuery.trim() && searchMatchCount" class="md-search-count">
              {{ searchMatchIndex + 1 }} / {{ searchMatchCount }}
            </span>
            <span v-else-if="searchQuery.trim() && !searchMatchCount" class="md-search-count md-search-count-empty">无匹配</span>
            <el-checkbox v-model="searchCaseSensitive" size="small" class="md-search-case">
              区分大小写
            </el-checkbox>
            <span class="md-mode-label md-mode-label-inline">视图</span>
            <el-radio-group v-model="viewMode" size="small" class="md-mode-group">
              <el-radio-button value="preview">预览</el-radio-button>
              <el-radio-button value="edit">编辑</el-radio-button>
              <el-radio-button value="split-lr">左右</el-radio-button>
              <el-radio-button value="split-tb">上下</el-radio-button>
            </el-radio-group>
          </div>
          <div class="md-content-area">
            <div v-if="viewMode === 'preview'" class="md-scroll md-pane-fill">
              <article
                v-if="activeTab"
                ref="articleRef"
                class="md-article markdown-body"
                v-html="activeHtml"
              />
            </div>
            <div v-else-if="viewMode === 'edit'" class="md-scroll md-pane-fill md-edit-only">
              <textarea
                v-if="activeTab"
                ref="editorRef"
                v-model="editorBinding"
                class="md-editor"
                spellcheck="false"
                placeholder="在此编辑 Markdown…"
              />
            </div>
            <div v-else-if="viewMode === 'split-lr'" class="md-split md-split-lr">
              <div class="md-split-pane md-edit-pane">
                <textarea
                  v-if="activeTab"
                  ref="editorRef"
                  v-model="editorBinding"
                  class="md-editor"
                  spellcheck="false"
                />
              </div>
              <div class="md-split-pane md-preview-pane md-scroll">
                <article
                  v-if="activeTab"
                  ref="articleRef"
                  class="md-article markdown-body"
                  v-html="activeHtml"
                />
              </div>
            </div>
            <div v-else-if="viewMode === 'split-tb'" class="md-split md-split-tb">
              <div class="md-split-pane md-edit-pane">
                <textarea
                  v-if="activeTab"
                  ref="editorRef"
                  v-model="editorBinding"
                  class="md-editor"
                  spellcheck="false"
                />
              </div>
              <div class="md-split-pane md-preview-pane md-scroll">
                <article
                  v-if="activeTab"
                  ref="articleRef"
                  class="md-article markdown-body"
                  v-html="activeHtml"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="md-empty-wrap">
      <el-empty :description="hasElectron ? '点击「打开 Markdown」选择文件，或从「最近打开」进入' : '请在桌面版中使用'">
        <el-button v-if="hasElectron" type="primary" @click="onPickFiles">打开文件</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const STORAGE_KEY = 'ly-markdown-reader:v1'
const MAX_HISTORY = 20
const VIEW_MODES = ['preview', 'edit', 'split-lr', 'split-tb']

const electronAPI = typeof window !== 'undefined' ? window.electronAPI : null
const hasElectron = computed(
  () =>
    !!(electronAPI?.openFileDialog && electronAPI?.readTextFile && electronAPI?.filterExistingFiles)
)

const tabs = ref([])
const activePath = ref('')
const history = ref([])
/** 文档目录侧栏是否收起（会持久化） */
const sidebarCollapsed = ref(false)
/** 当前在目录中点击的标题锚点（用于高亮） */
const activeTocId = ref('')
/** 预览 / 编辑 / 左右分栏 / 上下分栏 */
const viewMode = ref('preview')
/** 当前可见的源码编辑框（编辑 / 分栏模式） */
const editorRef = ref(null)
/** 预览区文章根节点（用于搜索高亮） */
const articleRef = ref(null)

const activeTab = computed(() => tabs.value.find((t) => t.path === activePath.value) || null)

const searchQuery = ref('')
const searchCaseSensitive = ref(false)
/** 当前选中的搜索结果（0-based，基于全文源码匹配列表） */
const searchMatchIndex = ref(0)

const searchMatches = computed(() => {
  const raw = activeTab.value?.raw
  if (raw == null || raw === '') return []
  const q = searchQuery.value.trim()
  if (!q) return []
  return findAllMatchesRaw(String(raw), q, !searchCaseSensitive.value)
})

const searchMatchCount = computed(() => searchMatches.value.length)

const editorBinding = computed({
  get() {
    return activeTab.value?.raw ?? ''
  },
  set(val) {
    const t = activeTab.value
    if (t) t.raw = val
  },
})

/** 从正文解析标题目录，并为渲染 HTML 注入与之一致的 id */
const tocAndHtml = computed(() => {
  const raw = activeTab.value?.raw
  if (raw == null || raw === '') return { toc: [], html: '' }
  try {
    const s = String(raw)
    const toc = buildToc(s)
    const html = injectHeadingIds(marked.parse(s), toc)
    return { toc, html }
  } catch (e) {
    return {
      toc: [],
      html: `<p class="md-parse-err">渲染失败：${escapeHtml(e?.message || String(e))}</p>`,
    }
  }
})

const activeHtml = computed(() => tocAndHtml.value.html)
const tocItems = computed(() => tocAndHtml.value.toc)

function collectInlineText(tokens) {
  if (!Array.isArray(tokens)) return ''
  let s = ''
  for (const x of tokens) {
    if (!x) continue
    if (x.type === 'text' || x.type === 'escape') s += x.text || ''
    else if (x.type === 'codespan') s += x.text || ''
    else if (x.type === 'br') s += ' '
    else if (x.type === 'strong' || x.type === 'em' || x.type === 'del')
      s += collectInlineText(x.tokens || [])
    else if (x.type === 'link') s += collectInlineText(x.tokens || [])
    else if (x.type === 'image') s += x.text || ''
    else if (x.tokens) s += collectInlineText(x.tokens)
  }
  return s
}

function getHeadingPlainText(t) {
  if (t.tokens && t.tokens.length) return collectInlineText(t.tokens).trim()
  if (typeof t.text === 'string') return t.text.trim()
  const raw = t.raw || ''
  return raw.replace(/^#{1,6}\s+/, '').trim()
}

function slugify(text) {
  let s = String(text).trim().toLowerCase()
  s = s.replace(/[^\p{L}\p{N}\s-]/gu, '')
  s = s.replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return s || 'heading'
}

function buildToc(md) {
  const tokens = marked.lexer(md)
  const items = []
  const used = new Map()
  let searchFrom = 0
  for (const t of tokens) {
    if (t.type !== 'heading') continue
    const depth = t.depth
    const text = getHeadingPlainText(t)
    let base = slugify(text)
    if (!base) base = 'heading'
    let id = base
    let n = 0
    while (used.has(id)) {
      n += 1
      id = `${base}-${n}`
    }
    used.set(id, true)

    let start = searchFrom
    const rawToken = typeof t.raw === 'string' ? t.raw : ''
    if (rawToken.length) {
      let idx = md.indexOf(rawToken, searchFrom)
      if (idx === -1) {
        const firstLine = rawToken.split(/\n/)[0]
        idx = md.indexOf(firstLine, searchFrom)
      }
      if (idx !== -1) {
        start = idx
        searchFrom = idx + rawToken.length
      }
    }
    items.push({ depth, text, id, start })
  }
  return items
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function injectHeadingIds(html, toc) {
  let i = 0
  return html.replace(/<h([1-6])(\s[^>]*)?>/gi, (full, level, attrs) => {
    const a = attrs || ''
    const item = toc[i++]
    if (!item) return full
    if (/\sid\s*=/i.test(a)) return full
    return `<h${level} id="${escapeAttr(item.id)}"${a}>`
  })
}

function scrollToAnchor(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 分栏模式：将 textarea 滚动到目录项对应的源码偏移（与 buildToc 中 start 一致） */
function scrollEditorToHeadingSync(id) {
  const item = tocItems.value.find((x) => x.id === id)
  if (!item || typeof item.start !== 'number') return
  const ta = editorRef.value
  if (!ta || ta.tagName !== 'TEXTAREA') return
  const len = ta.value.length
  const pos = Math.max(0, Math.min(item.start, len))
  ta.focus()
  ta.setSelectionRange(pos, pos)
  const style = window.getComputedStyle(ta)
  const lh = parseFloat(style.lineHeight) || 18
  const before = ta.value.slice(0, pos)
  const lineCount = before.split(/\r?\n/).length - 1
  ta.scrollTop = Math.max(0, lineCount * lh - ta.clientHeight / 3)
}

function onTocClick(id) {
  activeTocId.value = id
  if (viewMode.value === 'edit') {
    viewMode.value = 'preview'
    nextTick(() => {
      nextTick(() => scrollToAnchor(id))
    })
    return
  }
  const mode = viewMode.value
  if (mode === 'split-lr' || mode === 'split-tb') {
    nextTick(() => {
      scrollEditorToHeadingSync(id)
      requestAnimationFrame(() => scrollToAnchor(id))
    })
    return
  }
  nextTick(() => scrollToAnchor(id))
}

function normalizeViewMode(v) {
  return VIEW_MODES.includes(v) ? v : 'preview'
}

function escapeRegex(s) {
  return String(s).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&')
}

/** 在源码中查找所有匹配区间（用于编辑区跳转） */
function findAllMatchesRaw(text, query, caseInsensitive) {
  const q = query.trim()
  if (!q) return []
  const re = new RegExp(escapeRegex(q), caseInsensitive ? 'gi' : 'g')
  const out = []
  let m
  const s = String(text)
  re.lastIndex = 0
  while ((m = re.exec(s)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length })
    if (m.index === re.lastIndex) re.lastIndex++
  }
  return out
}

function unwrapSearchMarks(root) {
  if (!root) return
  const marks = root.querySelectorAll('mark.md-search-hit, mark.md-search-hit-current')
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
  })
  root.normalize()
}

/** 预览 DOM 中与搜索一致的匹配次数（用于当前高亮与 matchIndex 对齐） */
function countDomSearchOccurrences(articleEl, query, caseInsensitive) {
  if (!articleEl || !query.trim()) return 0
  const q = query.trim()
  const qv = caseInsensitive ? q.toLowerCase() : q
  let count = 0
  const w = document.createTreeWalker(articleEl, NodeFilter.SHOW_TEXT, null)
  let n
  while ((n = w.nextNode())) {
    const p = n.parentElement
    if (!p || p.closest('pre, code, script, style')) continue
    const text = n.nodeValue
    if (!text) continue
    const t = caseInsensitive ? text.toLowerCase() : text
    let pos = 0
    while (pos < text.length) {
      const i = t.indexOf(qv, pos)
      if (i === -1) break
      count += 1
      pos = i + q.length
    }
  }
  return count
}

function applyPreviewSearchHighlights(articleEl, query, caseInsensitive, rawMatchIndex) {
  unwrapSearchMarks(articleEl)
  const q = query.trim()
  if (!q) return
  const qv = caseInsensitive ? q.toLowerCase() : q
  const domTotal = countDomSearchOccurrences(articleEl, q, caseInsensitive)
  const currentDom = domTotal === 0 ? -1 : Math.min(Math.max(rawMatchIndex, 0), domTotal - 1)

  const textNodes = []
  const w = document.createTreeWalker(articleEl, NodeFilter.SHOW_TEXT, null)
  let node
  while ((node = w.nextNode())) {
    const p = node.parentElement
    if (!p || p.closest('pre, code, script, style')) continue
    textNodes.push(node)
  }

  let occ = 0
  for (const tn of textNodes) {
    if (!tn.parentNode) continue
    let text = tn.nodeValue
    if (!text) continue
    const tComp = caseInsensitive ? text.toLowerCase() : text
    let pos = 0
    const parts = []
    while (pos < text.length) {
      const i = tComp.indexOf(qv, pos)
      if (i === -1) {
        if (pos === 0) break
        parts.push(text.slice(pos))
        break
      }
      if (i > pos) parts.push(text.slice(pos, i))
      const slice = text.slice(i, i + q.length)
      const mark = document.createElement('mark')
      const idx = occ
      occ += 1
      mark.className =
        idx === currentDom ? 'md-search-hit md-search-hit-current' : 'md-search-hit'
      mark.appendChild(document.createTextNode(slice))
      parts.push(mark)
      pos = i + q.length
    }
    if (parts.length === 0) continue
    if (parts.length === 1 && parts[0] === text) continue
    const frag = document.createDocumentFragment()
    for (const p of parts) {
      if (typeof p === 'string') frag.appendChild(document.createTextNode(p))
      else frag.appendChild(p)
    }
    tn.parentNode.replaceChild(frag, tn)
  }
}

function applyEditorSearchSelection() {
  const ta = editorRef.value
  const matches = searchMatches.value
  const q = searchQuery.value.trim()
  if (!ta || !q || !matches.length) return
  let idx = searchMatchIndex.value
  if (idx < 0) idx = 0
  if (idx >= matches.length) idx = matches.length - 1
  const m = matches[idx]
  if (!m) return
  const len = ta.value.length
  const a = Math.max(0, Math.min(m.start, len))
  const b = Math.max(0, Math.min(m.end, len))
  ta.focus()
  ta.setSelectionRange(a, b)
  const style = window.getComputedStyle(ta)
  const lh = parseFloat(style.lineHeight) || 18
  const before = ta.value.slice(0, a)
  const lineCount = before.split(/\r?\n/).length - 1
  ta.scrollTop = Math.max(0, lineCount * lh - ta.clientHeight / 3)
}

function searchGoPrev() {
  const n = searchMatchCount.value
  if (!n) return
  searchMatchIndex.value = (searchMatchIndex.value - 1 + n) % n
}

function searchGoNext() {
  const n = searchMatchCount.value
  if (!n) return
  searchMatchIndex.value = (searchMatchIndex.value + 1) % n
}

function runSearchHighlight() {
  nextTick(() => {
    const mode = viewMode.value
    const art = articleRef.value
    const q = searchQuery.value.trim()
    const showPreview =
      art && (mode === 'preview' || mode === 'split-lr' || mode === 'split-tb')
    if (showPreview) {
      if (!q || !searchMatchCount.value) {
        unwrapSearchMarks(art)
      } else {
        applyPreviewSearchHighlights(
          art,
          searchQuery.value,
          !searchCaseSensitive.value,
          searchMatchIndex.value
        )
        const cur = art.querySelector('mark.md-search-hit-current')
        if (cur) cur.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    if (mode === 'edit' || mode === 'split-lr' || mode === 'split-tb') {
      applyEditorSearchSelection()
    }
  })
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function basename(p) {
  const s = String(p).replace(/\\/g, '/')
  const i = s.lastIndexOf('/')
  return i >= 0 ? s.slice(i + 1) : s
}

function pushHistory(p) {
  const path = String(p)
  const next = history.value.filter((x) => x !== path)
  next.unshift(path)
  history.value = next.slice(0, MAX_HISTORY)
}

function removeHistoryItem(path) {
  const p = String(path)
  history.value = history.value.filter((x) => x !== p)
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        paths: tabs.value.map((t) => t.path),
        activePath: activePath.value,
        history: history.value,
        sidebarCollapsed: sidebarCollapsed.value,
        viewMode: viewMode.value,
      })
    )
  } catch (_) {}
}

let persistTimer = null
function schedulePersist() {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    persist()
  }, 200)
}

watch([tabs, activePath, history, sidebarCollapsed, viewMode], schedulePersist, { deep: true })
watch(activePath, () => {
  activeTocId.value = ''
  searchMatchIndex.value = 0
})

watch(searchQuery, () => {
  searchMatchIndex.value = 0
})

watch(searchCaseSensitive, () => {
  searchMatchIndex.value = 0
})

watch(searchMatchCount, (n) => {
  if (searchMatchIndex.value >= n) searchMatchIndex.value = Math.max(0, n - 1)
})

watch(
  [activeHtml, searchQuery, searchMatchIndex, viewMode, searchCaseSensitive],
  () => runSearchHighlight(),
  { flush: 'post' }
)

async function addOrFocusFile(filePath) {
  if (!hasElectron.value) return
  const res = await electronAPI.readTextFile(filePath)
  if (!res?.ok) {
    ElMessage.error(res?.error || '无法读取文件')
    return
  }
  pushHistory(res.path)
  const existing = tabs.value.find((t) => t.path === res.path)
  if (existing) {
    existing.raw = res.content
    existing.title = basename(res.path)
    activePath.value = res.path
    return
  }
  tabs.value.push({
    path: res.path,
    title: basename(res.path),
    raw: res.content,
  })
  activePath.value = res.path
}

async function onPickFiles() {
  if (!hasElectron.value) {
    ElMessage.warning('请在 Electron 桌面版中使用')
    return
  }
  const r = await electronAPI.openFileDialog({ multiSelections: true })
  if (r.canceled || !r.filePaths?.length) return
  for (const fp of r.filePaths) {
    await addOrFocusFile(fp)
  }
}

async function openPath(fp) {
  await addOrFocusFile(fp)
}

function removeTab(targetName) {
  const name = String(targetName)
  const i = tabs.value.findIndex((t) => t.path === name)
  if (i < 0) return
  tabs.value.splice(i, 1)
  if (activePath.value === name) {
    const next = tabs.value[i] || tabs.value[i - 1]
    activePath.value = next ? next.path : ''
  }
}

async function restoreState() {
  if (!hasElectron.value) return
  let data = null
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) data = JSON.parse(s)
  } catch {
    return
  }
  if (!data || typeof data !== 'object') return

  const savedPaths = Array.isArray(data.paths) ? data.paths : []
  const savedHist = Array.isArray(data.history) ? data.history : []

  const [okPaths, okHist] = await Promise.all([
    electronAPI.filterExistingFiles(savedPaths),
    electronAPI.filterExistingFiles(savedHist),
  ])

  history.value = okHist.slice(0, MAX_HISTORY)

  const tabList = []
  for (const p of okPaths) {
    const res = await electronAPI.readTextFile(p)
    if (res?.ok) {
      tabList.push({
        path: res.path,
        title: basename(res.path),
        raw: res.content,
      })
    }
  }
  tabs.value = tabList

  let want = typeof data.activePath === 'string' ? data.activePath : ''
  if (tabList.length) {
    const found = tabList.find((t) => t.path === want)
    activePath.value = found ? found.path : tabList[0].path
  } else {
    activePath.value = ''
  }

  if (typeof data.sidebarCollapsed === 'boolean') {
    sidebarCollapsed.value = data.sidebarCollapsed
  }
  if (data.viewMode != null) {
    viewMode.value = normalizeViewMode(String(data.viewMode))
  }
}

onMounted(() => {
  restoreState()
})
</script>

<style scoped>
.md-reader {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.35) transparent;
}

.md-reader::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}

.md-reader::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.4);
  border-radius: 2px;
}

.md-body-row {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 8px;
}

.md-sidebar {
  width: 212px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

html.dark .md-sidebar {
  background: #161b22;
  border-color: #30363d;
}

.md-sidebar-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  font-weight: 600;
}

.md-sidebar-title {
  color: #303133;
}

html.dark .md-sidebar-title {
  color: #e5e7eb;
}

.md-sidebar-fold {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #606266;
  cursor: pointer;
}

.md-sidebar-fold:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #409eff;
}

html.dark .md-sidebar-fold {
  color: #8b949e;
}

html.dark .md-sidebar-fold:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #58a6ff;
}

.md-sidebar-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 8px 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.35) transparent;
}

.md-sidebar-scroll::-webkit-scrollbar {
  width: 3px;
}

.md-sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.4);
  border-radius: 2px;
}

.md-sidebar-empty {
  margin: 8px 0;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.md-toc-item {
  display: block;
  width: 100%;
  margin: 2px 0;
  padding: 5px 8px 5px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #303133;
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.md-toc-item:hover {
  background: #f5f7fa;
}

html.dark .md-toc-item {
  color: #e6edf3;
}

html.dark .md-toc-item:hover {
  background: #21262d;
}

.md-toc-item.is-active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 500;
}

html.dark .md-toc-item.is-active {
  background: rgba(56, 139, 253, 0.15);
  color: #58a6ff;
}

.md-sidebar-unfold {
  flex-shrink: 0;
  width: 28px;
  align-self: stretch;
  min-height: 120px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: #fff;
  color: #606266;
  cursor: pointer;
}

.md-sidebar-unfold:hover {
  background: #f5f7fa;
  color: #409eff;
}

html.dark .md-sidebar-unfold {
  background: #161b22;
  border-color: #30363d;
  color: #8b949e;
}

html.dark .md-sidebar-unfold:hover {
  background: #21262d;
  color: #58a6ff;
}

.md-main-col {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.md-reader-toolbar {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.md-web-tip {
  font-size: 12px;
  color: #909399;
}

html.dark .md-web-tip {
  color: #8b949e;
}

.md-tabs {
  flex-shrink: 0;
}

.md-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.md-toolbar-row {
  flex-shrink: 0;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.md-toolbar-row::-webkit-scrollbar {
  height: 4px;
}

.md-toolbar-row::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.35);
  border-radius: 2px;
}

.md-mode-label {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.md-mode-label-inline {
  margin-left: 4px;
}

html.dark .md-mode-label {
  color: #8b949e;
}

.md-mode-group {
  flex: 1;
  min-width: 0;
  flex-shrink: 1;
}

.md-mode-group :deep(.el-radio-button__inner) {
  padding: 5px 10px;
}

.md-search-input {
  width: 148px;
  flex-shrink: 0;
}

.md-search-input :deep(.el-input__wrapper) {
  padding-left: 8px;
  padding-right: 8px;
}

.md-search-count {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  flex-shrink: 0;
}

.md-search-count-empty {
  color: #909399;
}

html.dark .md-search-count {
  color: #c9d1d9;
}

html.dark .md-search-count-empty {
  color: #8b949e;
}

.md-search-case {
  flex-shrink: 0;
}

.md-content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 4px;
}

.md-pane-fill {
  flex: 1;
  min-height: 0;
}

.md-edit-only {
  padding: 0 !important;
  display: flex;
  flex-direction: column;
}

.md-split {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  gap: 0;
}

.md-split-lr {
  flex-direction: row;
}

.md-split-tb {
  flex-direction: column;
}

.md-split-pane {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.md-split-lr .md-edit-pane {
  border-right: 1px solid var(--el-border-color-lighter);
}

.md-split-tb .md-edit-pane {
  flex: 1 1 45%;
  min-height: 100px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.md-split-tb .md-preview-pane {
  flex: 1 1 55%;
  min-height: 100px;
}

.md-editor {
  flex: 1;
  width: 100%;
  min-height: 0;
  padding: 14px 16px;
  box-sizing: border-box;
  border: none;
  resize: none;
  outline: none;
  overflow: auto;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.55;
  color: #303133;
  background: #f6f8fa;
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.35) transparent;
}

.md-editor::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}

.md-editor::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.4);
  border-radius: 2px;
}

html.dark .md-editor {
  background: #0d1117;
  color: #e6edf3;
}

html.dark .md-editor::-webkit-scrollbar-thumb {
  background: rgba(139, 148, 158, 0.35);
}

.md-empty-wrap {
  flex: 1;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.md-scroll {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  overflow: auto;
  padding: 16px 20px 24px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: #fff;
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.35) transparent;
}

.md-content-area .md-scroll {
  margin-top: 0;
}

.md-content-area > .md-pane-fill.md-scroll:first-child {
  margin-top: 0;
}

.md-scroll::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}

.md-scroll::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.4);
  border-radius: 2px;
}

html.dark .md-scroll::-webkit-scrollbar-thumb {
  background: rgba(139, 148, 158, 0.35);
}

html.dark .md-scroll {
  background: #161b22;
  border-color: #30363d;
}

.md-article {
  max-width: 100%;
  font-size: 15px;
  line-height: 1.65;
  color: #24292f;
}

html.dark .md-article {
  color: #e6edf3;
}

.md-parse-err {
  color: #f56c6c;
}

/* Markdown 正文（精简 GitHub 风格） */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 1.2em;
  margin-bottom: 0.6em;
  font-weight: 600;
  line-height: 1.35;
  scroll-margin-top: 12px;
}

.markdown-body :deep(h1) {
  font-size: 1.75em;
  border-bottom: 1px solid #d0d7de;
  padding-bottom: 0.25em;
}

html.dark .markdown-body :deep(h1) {
  border-bottom-color: #30363d;
}

.markdown-body :deep(h2) {
  font-size: 1.45em;
}

.markdown-body :deep(h3) {
  font-size: 1.2em;
}

.markdown-body :deep(p) {
  margin: 0.65em 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.6em;
  margin: 0.65em 0;
}

.markdown-body :deep(blockquote) {
  margin: 0.8em 0;
  padding: 0 0.9em;
  border-left: 4px solid #d0d7de;
  color: #57606a;
}

html.dark .markdown-body :deep(blockquote) {
  border-left-color: #30363d;
  color: #8b949e;
}

.markdown-body :deep(pre) {
  margin: 0.9em 0;
  padding: 12px 14px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 6px;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
}

html.dark .markdown-body :deep(pre) {
  background: #0d1117;
  border-color: #30363d;
}

.markdown-body :deep(code) {
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.9em;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: rgba(175, 184, 193, 0.25);
}

html.dark .markdown-body :deep(code) {
  background: rgba(110, 118, 129, 0.25);
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: none;
  border-radius: 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.9em 0;
  font-size: 14px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #d0d7de;
  padding: 6px 10px;
}

html.dark .markdown-body :deep(th),
html.dark .markdown-body :deep(td) {
  border-color: #30363d;
}

.markdown-body :deep(th) {
  background: #f6f8fa;
  font-weight: 600;
}

html.dark .markdown-body :deep(th) {
  background: #21262d;
}

.markdown-body :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

html.dark .markdown-body :deep(a) {
  color: #58a6ff;
}

.markdown-body :deep(hr) {
  margin: 1.2em 0;
  border: none;
  border-top: 1px solid #d0d7de;
}

html.dark .markdown-body :deep(hr) {
  border-top-color: #30363d;
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.markdown-body :deep(mark.md-search-hit) {
  padding: 0 0.1em;
  border-radius: 3px;
  background: rgba(255, 213, 128, 0.95);
  color: inherit;
}

.markdown-body :deep(mark.md-search-hit-current) {
  background: rgba(255, 160, 60, 0.98);
  box-shadow: 0 0 0 1px rgba(200, 100, 0, 0.35);
}

html.dark .markdown-body :deep(mark.md-search-hit) {
  background: rgba(204, 142, 0, 0.45);
}

html.dark .markdown-body :deep(mark.md-search-hit-current) {
  background: rgba(210, 120, 0, 0.65);
  box-shadow: 0 0 0 1px rgba(255, 180, 80, 0.35);
}
</style>

<style>
/* 下拉过宽路径 */
.md-history-menu {
  max-width: min(92vw, 520px);
}

.md-history-item.el-dropdown-menu__item,
.md-history-item {
  padding: 0 !important;
}

.md-history-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: min(88vw, 500px);
  padding: 5px 12px;
}

.md-history-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.md-history-path:hover {
  color: var(--el-color-primary);
}

.md-history-item-del {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #909399;
  cursor: pointer;
}

.md-history-item-del:hover {
  background: rgba(144, 147, 153, 0.15);
  color: #f56c6c;
}

html.dark .md-history-item-del {
  color: #8b949e;
}

html.dark .md-history-item-del:hover {
  background: rgba(139, 148, 158, 0.2);
  color: #f89898;
}
</style>
