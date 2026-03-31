<template>
  <div class="db-sync-plugin">
    <p class="db-sync-hint">
      功能是把<strong>源库 A</strong> 的表结构与数据<strong>同步到目标库 B</strong>，不是单独「导出」文件。双方须为<strong>相同类型</strong>；同步会<strong>覆盖</strong> B 中与 A 对应的内容（MySQL / PostgreSQL 按表重建；SQLite 会重写 B 的文件）。
    </p>

    <el-card shadow="never" class="db-card">
      <template #header>
        <span class="card-title">
          <Icon icon="ri:database-2-line" :width="18" style="vertical-align: -3px" />
          连接配置（同列字段名只说明一次）
        </span>
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
    </el-card>

    <div class="db-sync-actions">
      <el-button
        type="primary"
        size="large"
        :loading="syncing"
        :disabled="!canSync"
        @click="onSyncClick"
      >
        <Icon icon="ri:refresh-line" :width="18" style="margin-right: 6px; vertical-align: -3px" />
        将 A 同步到 B
      </el-button>
    </div>
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
  const payload = {
    source: { type: dbType.value, ...source.value },
    target: { type: dbType.value, ...target.value },
  }
  invokeMainWithCallback('db-sync', 'db-sync', 'syncDatabases', payload, (err, res) => {
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
  max-width: 920px;
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

.db-card {
  margin-bottom: 16px;
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

.db-sync-actions {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}
</style>
