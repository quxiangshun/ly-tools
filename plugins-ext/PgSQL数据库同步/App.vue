<template>
  <div class="pgsql-sync-plugin">
    <p class="pgsql-hint">
      在<strong>已安装 PostgreSQL 客户端</strong>（<code>pg_dump</code> / <code>pg_restore</code> / <code>psql</code>）的机器上，从源库导出为自定义格式（<code>-Fc</code>），再恢复到目标库。
      与「数据库同步」插件中<strong>逐表 INSERT</strong>的方式不同，本页为<strong>官方逻辑备份</strong>，适合 <strong>NetBox</strong> 等需完整 DDL/索引/约束 的场景。
    </p>

    <el-alert type="warning" :closable="false" show-icon class="pgsql-alert">
      <template #title>
        导入使用 <code>--clean --if-exists</code>，会删除目标库中同名对象再恢复；执行前请确认目标库可覆盖。
      </template>
    </el-alert>

    <el-form label-width="120px" size="small" class="pgsql-form" @submit.prevent>
      <el-divider content-position="left">客户端</el-divider>
      <el-form-item label="bin 目录">
        <el-input
          v-model="pgBin"
          clearable
          placeholder="留空则从 PATH 查找 pg_dump；Windows 示例 C:\Program Files\PostgreSQL\17\bin"
        />
      </el-form-item>
      <el-form-item label="dump 文件">
        <el-input
          v-model="dumpFile"
          clearable
          placeholder="留空则使用系统临时目录下的 netbox.dump"
        />
      </el-form-item>

      <el-divider content-position="left">源库（导出）</el-divider>
      <el-form-item label="主机">
        <el-input v-model="source.host" placeholder="10.x.x.x" clearable />
      </el-form-item>
      <el-form-item label="端口">
        <el-input v-model="source.port" placeholder="5432" clearable />
      </el-form-item>
      <el-form-item label="用户">
        <el-input v-model="source.user" clearable />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="source.password" type="password" show-password clearable />
      </el-form-item>
      <el-form-item label="数据库名">
        <el-input v-model="source.database" placeholder="netbox" clearable />
      </el-form-item>

      <el-divider content-position="left">目标库（导入）</el-divider>
      <el-form-item label="主机">
        <el-input v-model="target.host" placeholder="10.x.x.x" clearable />
      </el-form-item>
      <el-form-item label="端口">
        <el-input v-model="target.port" placeholder="5432" clearable />
      </el-form-item>
      <el-form-item label="用户">
        <el-input v-model="target.user" placeholder="postgres" clearable />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="target.password" type="password" show-password clearable />
      </el-form-item>
      <el-form-item label="数据库名">
        <el-input v-model="target.database" placeholder="netbox" clearable />
      </el-form-item>
    </el-form>

    <div class="pgsql-actions">
      <el-button
        type="primary"
        :loading="loading === 'test'"
        :disabled="!hasElectron || !canTest"
        @click="onTest"
      >
        <Icon icon="ri:shield-check-line" :width="16" style="margin-right: 4px; vertical-align: -2px" />
        版本检测
      </el-button>
      <el-button :loading="loading === 'export'" :disabled="!hasElectron || !canExport" @click="onExport">
        <Icon icon="ri:download-2-line" :width="16" style="margin-right: 4px; vertical-align: -2px" />
        导出 dump
      </el-button>
      <el-button :loading="loading === 'import'" :disabled="!hasElectron || !canImport" @click="onImport">
        <Icon icon="ri:upload-2-line" :width="16" style="margin-right: 4px; vertical-align: -2px" />
        导入恢复
      </el-button>
      <el-button :loading="loading === 'verify'" :disabled="!hasElectron || !canImport" @click="onVerify">
        <Icon icon="ri:file-list-3-line" :width="16" style="margin-right: 4px; vertical-align: -2px" />
        校验 django_migrations
      </el-button>
      <el-button :loading="loading === 'clean'" :disabled="!hasElectron" @click="onClean">
        <Icon icon="ri:delete-bin-line" :width="16" style="margin-right: 4px; vertical-align: -2px" />
        删除本地 dump
      </el-button>
    </div>

    <el-alert
      v-if="testWarnings.length"
      type="error"
      :closable="false"
      show-icon
      class="pgsql-warn-alert"
      title="版本提示（可能导致 pg_dump 失败或跨版本不兼容）"
    >
      <ul class="pgsql-warn-list">
        <li v-for="(w, i) in testWarnings" :key="i">{{ w }}</li>
      </ul>
    </el-alert>

    <el-card v-if="testResult && !testWarnings.length" shadow="never" class="pgsql-result-card">
      <template #header>最近一次版本检测结果</template>
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="pg_dump 客户端">{{ testResult.clientVersion || '—' }}</el-descriptions-item>
        <el-descriptions-item label="源库主版本（约）">{{ testResult.sourceServerMajor ?? '—' }}</el-descriptions-item>
        <el-descriptions-item label="目标库主版本（约）">{{ testResult.targetServerMajor ?? '—' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="syncLogs.length" shadow="never" class="pgsql-log-card">
      <template #header>执行日志</template>
      <pre class="pgsql-log-pre">{{ syncLogs.join('\n') }}</pre>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'

const PLUGIN_ID = 'pgsql-sync'
const SCRIPT = 'pg-sync-main'

const hasElectron = computed(
  () => !!(typeof window !== 'undefined' && window.electronAPI?.plugin?.invokeMain)
)

function emptyConn() {
  return {
    host: '',
    port: '5432',
    user: '',
    password: '',
    database: '',
  }
}

const pgBin = ref('')
const dumpFile = ref('')
const source = ref(emptyConn())
const target = ref(emptyConn())
const loading = ref('')
const syncLogs = ref([])
const testWarnings = ref([])
const testResult = ref(null)

const canTest = computed(() => !!(source.value.host?.trim() && source.value.database?.trim()))
const canExport = computed(() => canTest.value)
const canImport = computed(
  () =>
    !!(
      target.value.host?.trim() &&
      target.value.database?.trim() &&
      target.value.user?.trim()
    )
)

function appendLog(line) {
  syncLogs.value.push(line)
}

function subscribeMainLog() {
  const api = window.electronAPI
  if (!api?.plugin?.onMainLog) return () => {}
  return api.plugin.onMainLog((payload) => {
    if (payload?.line != null) appendLog(String(payload.line))
  })
}

function payloadBase() {
  return {
    pgBin: pgBin.value.trim(),
    dumpFile: dumpFile.value.trim(),
    source: { ...source.value },
    target: { ...target.value },
  }
}

async function invoke(method, args) {
  const api = window.electronAPI
  if (!api?.plugin?.invokeMain) {
    throw new Error('请在 Electron 桌面版中使用')
  }
  return api.plugin.invokeMain(PLUGIN_ID, SCRIPT, method, args)
}

async function onTest() {
  if (!canTest.value) {
    ElMessage.warning('请至少填写源库主机与数据库名')
    return
  }
  testWarnings.value = []
  testResult.value = null
  syncLogs.value = []
  loading.value = 'test'
  const unsub = subscribeMainLog()
  try {
    const res = await invoke('testVersions', payloadBase())
    if (!res?.success) {
      ElMessage.error(res?.message || '检测失败')
      return
    }
    testResult.value = res
    if (Array.isArray(res.warnings) && res.warnings.length) {
      testWarnings.value = res.warnings
      ElMessage.warning('版本存在风险，请查看下方提示与日志')
    } else {
      ElMessage.success('版本检测完成：未发现明显的主版本冲突')
    }
  } catch (e) {
    ElMessage.error(e?.message || String(e))
  } finally {
    unsub()
    loading.value = ''
  }
}

async function onExport() {
  if (!canExport.value) {
    ElMessage.warning('请填写源库连接')
    return
  }
  syncLogs.value = []
  loading.value = 'export'
  const unsub = subscribeMainLog()
  try {
    const res = await invoke('exportDump', payloadBase())
    if (!res?.success) {
      ElMessage.error(res?.message || '导出失败')
      return
    }
    ElMessage.success(res.message || '导出完成')
  } catch (e) {
    ElMessage.error(e?.message || String(e))
  } finally {
    unsub()
    loading.value = ''
  }
}

async function onImport() {
  if (!canImport.value) {
    ElMessage.warning('请填写目标库连接')
    return
  }
  try {
    await ElMessageBox.confirm(
      '将向目标库执行 pg_restore（含 --clean --if-exists），目标库同名对象将被删除后重建。确定继续？',
      '确认导入',
      { type: 'warning', confirmButtonText: '确定导入', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  syncLogs.value = []
  loading.value = 'import'
  const unsub = subscribeMainLog()
  try {
    const res = await invoke('importDump', payloadBase())
    if (!res?.success) {
      ElMessage.error(res?.message || '导入失败')
      return
    }
    ElMessage.success(res.message || '导入完成')
  } catch (e) {
    ElMessage.error(e?.message || String(e))
  } finally {
    unsub()
    loading.value = ''
  }
}

async function onVerify() {
  if (!canImport.value) {
    ElMessage.warning('请填写目标库连接')
    return
  }
  syncLogs.value = []
  loading.value = 'verify'
  const unsub = subscribeMainLog()
  try {
    const res = await invoke('verifyMigrations', payloadBase())
    if (!res?.success) {
      ElMessage.error(res?.message || '校验失败')
      return
    }
    ElMessage.success('已在日志中输出查询结果')
  } catch (e) {
    ElMessage.error(e?.message || String(e))
  } finally {
    unsub()
    loading.value = ''
  }
}

async function onClean() {
  syncLogs.value = []
  loading.value = 'clean'
  const unsub = subscribeMainLog()
  try {
    const res = await invoke('cleanDump', payloadBase())
    if (!res?.success) {
      ElMessage.error(res?.message || '删除失败')
      return
    }
    ElMessage.success('已处理')
  } catch (e) {
    ElMessage.error(e?.message || String(e))
  } finally {
    unsub()
    loading.value = ''
  }
}
</script>

<style scoped>
.pgsql-sync-plugin {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  box-sizing: border-box;
  scrollbar-width: thin;
}

.pgsql-hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.65;
  color: #606266;
}

html.dark .pgsql-hint {
  color: #8b949e;
}

.pgsql-hint code {
  font-size: 12px;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(175, 184, 193, 0.25);
}

html.dark .pgsql-hint code {
  background: rgba(110, 118, 129, 0.25);
}

.pgsql-alert {
  margin-bottom: 14px;
}

.pgsql-form {
  margin-top: 8px;
}

.pgsql-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0;
}

.pgsql-warn-alert {
  margin-bottom: 14px;
}

.pgsql-warn-list {
  margin: 8px 0 0;
  padding-left: 1.2em;
}

.pgsql-result-card {
  margin-bottom: 14px;
}

.pgsql-log-card {
  margin-top: 8px;
}

.pgsql-log-pre {
  margin: 0;
  padding: 8px 4px;
  font-size: 12px;
  line-height: 1.5;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: #303133;
}

html.dark .pgsql-log-pre {
  color: #e6edf3;
}
</style>
