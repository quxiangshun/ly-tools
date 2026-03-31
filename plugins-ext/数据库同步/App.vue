<template>
  <div class="db-sync-plugin">
    <p class="db-sync-hint">
      功能是把<strong>源库 A</strong> 的表结构与数据<strong>同步到目标库 B</strong>，不是单独「导出」文件。双方须为<strong>相同类型</strong>；同步会<strong>覆盖</strong> B 中与 A 对应的内容（MySQL / PostgreSQL 按表重建；SQLite 会重写 B 的文件）。
    </p>

    <el-collapse v-model="connCollapse" class="db-conn-collapse">
      <el-collapse-item name="conn">
        <template #title>
          <div class="collapse-title-row">
            <span class="collapse-title-text">
              <Icon icon="ri:database-2-line" :width="18" style="vertical-align: -3px" />
              连接配置（同列字段名只说明一次）
            </span>
            <el-button
              type="primary"
              :loading="syncing"
              :disabled="!canSync"
              class="collapse-sync-btn"
              @click.stop="onSyncClick"
            >
              <Icon icon="ri:refresh-line" :width="18" style="margin-right: 6px; vertical-align: -3px" />
              将 A 同步到 B
            </el-button>
          </div>
        </template>

        <div class="db-type-row">
          <span class="db-type-label">数据库类型</span>
          <el-select v-model="dbType" placeholder="选择类型" class="db-type-select">
            <el-option label="MySQL" value="mysql" />
            <el-option label="PostgreSQL" value="postgresql" />
            <el-option label="SQLite（文件）" value="sqlite" />
          </el-select>
        </div>

        <el-table
          :data="tableFieldRows"
          border
          size="small"
          class="conn-table"
          :show-header="true"
        >
          <el-table-column prop="label" label="连接项" width="132" align="right" />
          <el-table-column label="源库 A" min-width="200">
            <template #default="{ row }">
              <el-input
                v-if="!row.pass"
                v-model="source[row.key]"
                :placeholder="row.phA ?? row.ph"
                clearable
              />
              <el-input
                v-else
                v-model="source[row.key]"
                type="password"
                show-password
                clearable
              />
            </template>
          </el-table-column>
          <el-table-column label="目标库 B" min-width="200">
            <template #default="{ row }">
              <el-input
                v-if="!row.pass"
                v-model="target[row.key]"
                :placeholder="row.phB ?? row.ph"
                clearable
              />
              <el-input
                v-else
                v-model="target[row.key]"
                type="password"
                show-password
                clearable
              />
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>

    <div class="db-inspect-actions">
      <span class="db-inspect-hint">在已填写连接的前提下，可单独查看库信息（不触发同步）：</span>
      <div class="db-inspect-btns">
        <el-button
          plain
          :loading="inspectLoading === 'source'"
          :disabled="!canInspectSide.source"
          @click="onInspect('source')"
        >
          <Icon icon="ri:information-line" :width="16" style="margin-right: 4px; vertical-align: -2px" />
          源库 A 详情
        </el-button>
        <el-button
          plain
          :loading="inspectLoading === 'target'"
          :disabled="!canInspectSide.target"
          @click="onInspect('target')"
        >
          <Icon icon="ri:information-line" :width="16" style="margin-right: 4px; vertical-align: -2px" />
          目标库 B 详情
        </el-button>
      </div>
    </div>

    <el-card v-if="connectionDetail" shadow="never" class="db-detail-card">
      <template #header>
        <span class="card-title">
          <Icon icon="ri:list-check-2" :width="18" style="vertical-align: -3px" />
          {{ connectionDetailTitle }}
        </span>
      </template>
      <el-descriptions :column="1" border size="small" class="db-detail-desc">
        <el-descriptions-item
          v-for="row in connectionDetailRows"
          :key="row.key"
          :label="row.label"
        >
          {{ row.value }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="syncLogs.length" shadow="never" class="db-log-card">
      <template #header>
        <span class="card-title">执行日志</span>
      </template>
      <pre class="db-sync-log-pre">{{ syncLogs.join('\n') }}</pre>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'

function emptyConn() {
  return {
    host: '127.0.0.1',
    port: '',
    user: 'root',
    password: '',
    database: '',
    filename: '',
  }
}

const dbType = ref('mysql')
const source = ref(emptyConn())
const target = ref(emptyConn())
const syncing = ref(false)
/** 主进程推送的同步过程日志（仅 Electron 且订阅 onMainLog 时有内容） */
const syncLogs = ref([])

const inspectLoading = ref(null)
const connectionDetail = ref(null)
const connectionDetailSide = ref('')
/** 连接配置折叠：默认展开 */
const connCollapse = ref(['conn'])

const canInspectSide = computed(() => {
  const t = dbType.value
  const s = source.value
  const tg = target.value
  if (t === 'sqlite') {
    return { source: !!s.filename?.trim(), target: !!tg.filename?.trim() }
  }
  return {
    source: !!s.database?.trim(),
    target: !!tg.database?.trim(),
  }
})

const connectionDetailTitle = computed(() => {
  const side = connectionDetailSide.value === 'target' ? '目标库 B' : '源库 A'
  return `${side} — 连接信息`
})

function formatBytes(n) {
  if (n == null || n === '') return '—'
  const num = Number(n)
  if (Number.isNaN(num)) return String(n)
  if (num < 1024) return `${num} B`
  const u = ['KB', 'MB', 'GB', 'TB']
  let i = -1
  let x = num
  do {
    x /= 1024
    i++
  } while (x >= 1024 && i < u.length - 1)
  return `${x.toFixed(i === 0 ? 0 : 2)} ${u[i]}`
}

const connectionDetailRows = computed(() => {
  const info = connectionDetail.value
  if (!info) return []
  const labels = {
    engine: '数据库类型',
    version: '版本',
    database: '当前库名',
    host: '连接地址',
    user: '当前用户',
    publicTables: 'public 下表数量',
    userTables: '用户表数量',
    charset: '字符集',
    collation: '排序规则',
    databaseSize: '库逻辑大小',
    databaseSizeBytes: '库大小（字节）',
    file: '文件路径',
    fileBytes: '文件大小',
  }
  const rows = []
  for (const [k, v] of Object.entries(info)) {
    if (v === undefined || v === null || v === '') continue
    let display = v
    if (k === 'fileBytes' || k === 'databaseSizeBytes') display = `${v}（${formatBytes(v)}）`
    rows.push({ key: k, label: labels[k] || k, value: display })
  }
  return rows
})

/** 表行：与 MySQL/PG 或 SQLite 对应，避免双列表单重复 label */
const tableFieldRows = computed(() => {
  const t = dbType.value
  if (t === 'sqlite') {
    return [
      {
        key: 'filename',
        label: '数据库文件路径',
        phA: '源库 A 文件路径，如 D:\\data\\a.db',
        phB: '目标库 B 文件路径，如 D:\\data\\b.db',
        pass: false,
      },
    ]
  }
  const portPh = t === 'postgresql' ? '5432' : '3306'
  return [
    { key: 'host', label: '主机', ph: '127.0.0.1', pass: false },
    { key: 'port', label: '端口', ph: portPh, pass: false },
    { key: 'user', label: '用户名', ph: '', pass: false },
    { key: 'password', label: '密码', ph: '', pass: true },
    { key: 'database', label: '数据库名', ph: '', pass: false },
  ]
})

const canSync = computed(() => {
  const s = source.value
  const t = target.value
  const type = dbType.value
  if (!type) return false
  if (type === 'sqlite') {
    return !!(s.filename?.trim() && t.filename?.trim())
  }
  return !!(s.database?.trim() && t.database?.trim())
})

function invokeMainWithCallback(pluginId, script, method, args, callback) {
  const api = typeof window !== 'undefined' ? window.electronAPI : null
  if (!api?.plugin?.invokeMain) {
    callback(new Error('请在 Electron 桌面版中使用'), null)
    return
  }
  api.plugin
    .invokeMain(pluginId, script, method, args)
    .then((res) => callback(null, res))
    .catch((err) => callback(err, null))
}

function subscribeMainLog(appendLine) {
  const api = typeof window !== 'undefined' ? window.electronAPI : null
  if (!api?.plugin?.onMainLog) return () => {}
  return api.plugin.onMainLog((payload) => {
    if (payload?.line != null) appendLine(String(payload.line))
  })
}

function onInspect(side) {
  const api = typeof window !== 'undefined' ? window.electronAPI : null
  if (!api?.plugin?.invokeMain) {
    ElMessage.warning('请在 Electron 桌面版中使用')
    return
  }
  if (!canInspectSide.value[side]) {
    ElMessage.warning(side === 'source' ? '请先填写源库连接' : '请先填写目标库连接')
    return
  }
  inspectLoading.value = side
  connectionDetail.value = null
  const conn = side === 'source' ? source.value : target.value
  const payload = { type: dbType.value, side, ...conn }
  invokeMainWithCallback('db-sync', 'db-sync', 'inspectConnection', payload, (err, res) => {
    inspectLoading.value = null
    if (err) {
      ElMessage.error('获取信息失败：' + (err?.message || String(err)))
      return
    }
    if (!res?.success) {
      ElMessage.error(res?.message || '获取信息失败')
      return
    }
    connectionDetailSide.value = side
    connectionDetail.value = res.info || {}
    ElMessage.success('已获取连接详情')
  })
}

async function onSyncClick() {
  if (!canSync.value) {
    ElMessage.warning('请完整填写源库与目标库连接信息，且双方类型须一致')
    return
  }

  try {
    await ElMessageBox.confirm(
      '将把源库 A 同步到目标库 B，B 中对应表与数据将被覆盖，且不可撤销。确定继续吗？',
      '确认：A → B 同步',
      {
        confirmButtonText: '将 A 同步到 B',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return
  }

  syncing.value = true
  syncLogs.value = []
  const offLog = subscribeMainLog((line) => {
    syncLogs.value.push(line)
  })
  const payload = {
    source: { type: dbType.value, ...source.value },
    target: { type: dbType.value, ...target.value },
  }
  invokeMainWithCallback('db-sync', 'db-sync', 'syncDatabases', payload, (err, res) => {
    offLog()
    syncing.value = false
    if (err) {
      ElMessage.error('同步异常：' + (err?.message || String(err)))
      return
    }
    if (res?.success) {
      ElMessage.success(res.message || '同步完成')
    } else {
      ElMessage.error(res?.message || '同步失败')
    }
  })
}
</script>

<style scoped>
.db-sync-plugin {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  box-sizing: border-box;
  /* 细滚动条（本页为路由滚动容器） */
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.45) transparent;
}

.db-sync-plugin::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.db-sync-plugin::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.45);
  border-radius: 3px;
}

.db-sync-plugin::-webkit-scrollbar-track {
  background: transparent;
}

html.dark .db-sync-plugin {
  scrollbar-color: rgba(139, 148, 158, 0.4) transparent;
}

html.dark .db-sync-plugin::-webkit-scrollbar-thumb {
  background: rgba(139, 148, 158, 0.4);
}

/* Element Plus 内部滚动条（表格等） */
.db-sync-plugin :deep(.el-scrollbar__bar.is-vertical) {
  width: 5px;
  right: 0;
}

.db-sync-plugin :deep(.el-scrollbar__bar.is-horizontal) {
  height: 5px;
}

.db-sync-plugin :deep(.el-scrollbar__thumb) {
  border-radius: 3px;
}

.db-sync-hint {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
}

html.dark .db-sync-hint {
  color: #8b949e;
}

.db-conn-collapse {
  margin-bottom: 16px;
  border: none;
  --el-collapse-header-height: auto;
}

.db-conn-collapse :deep(.el-collapse-item__header) {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-weight: 600;
  border-radius: 4px;
}

.db-conn-collapse :deep(.el-collapse-item__title) {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.collapse-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.collapse-title-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  min-width: 0;
  flex: 1;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collapse-sync-btn {
  flex-shrink: 0;
}

.db-conn-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.db-conn-collapse :deep(.el-collapse-item__content) {
  padding: 0 16px 16px;
}

.card-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.db-type-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.db-type-label {
  flex-shrink: 0;
  font-size: 14px;
  color: #606266;
}

html.dark .db-type-label {
  color: #a3a6ad;
}

.db-type-select {
  width: 220px;
  max-width: 100%;
}

.conn-table {
  width: 100%;
}

.conn-table :deep(.el-table__cell) {
  vertical-align: middle;
}

.conn-table :deep(.el-input__wrapper) {
  width: 100%;
}

.db-inspect-actions {
  margin-top: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.db-inspect-hint {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 10px;
}

html.dark .db-inspect-hint {
  color: #8b949e;
}

.db-inspect-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.db-detail-card {
  margin-top: 16px;
}

.db-detail-desc {
  max-width: 100%;
}

.db-log-card {
  margin-top: 16px;
}

.db-sync-log-pre {
  margin: 0;
  padding: 8px 4px;
  font-size: 12px;
  line-height: 1.5;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: #303133;
}

html.dark .db-sync-log-pre {
  color: #e6edf3;
}
</style>
