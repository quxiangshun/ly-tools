<template>
  <div class="port-killer">
    <el-card shadow="never" class="search-card">
      <div class="search-row">
        <el-input
          v-model="port"
          placeholder="支持单个和范围，如 5173,5174,8080-8085"
          size="large"
          clearable
          class="port-input"
          @keyup.enter="searchProcess"
        >
          <template #prefix>
            <Icon icon="ri:search-line" :width="18" />
          </template>
        </el-input>
        <el-button
          type="primary"
          size="large"
          :loading="searching"
          @click="searchProcess"
        >
          <Icon icon="ri:radar-line" :width="16" style="margin-right: 4px" />
          查询进程
        </el-button>
        <el-button
          v-if="processes.length > 0"
          type="danger"
          size="large"
          @click="killAll"
        >
          <Icon icon="ri:skull-2-line" :width="16" style="margin-right: 4px" />
          全部终止
        </el-button>
      </div>
    </el-card>

    <el-card v-if="searched" shadow="never" class="result-card">
      <template #header>
        <div class="card-header">
          <span>
            <Icon icon="ri:list-check-2" :width="18" style="vertical-align: -3px" />
            查询结果
          </span>
          <el-tag v-if="processes.length" type="warning" size="small">
            共 {{ processes.length }} 个进程
          </el-tag>
        </div>
      </template>

      <el-table
        v-if="processes.length"
        :data="processes"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="pid" label="PID" width="100" />
        <el-table-column prop="command" label="进程名" min-width="160" />
        <el-table-column prop="port" label="端口" width="80" />
        <el-table-column prop="protocol" label="协议" width="80" />
        <el-table-column prop="localAddr" label="本地地址" min-width="160" />
        <el-table-column prop="state" label="状态" width="120" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="danger"
              size="small"
              plain
              :loading="row._killing"
              @click.stop="killProcess(row)"
            >
              <Icon icon="ri:close-circle-line" :width="14" style="margin-right: 2px" />
              终止
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="未找到占用这些端口的进程">
        <template #image>
          <Icon icon="ri:emotion-happy-line" :width="64" color="#c0c4cc" />
        </template>
      </el-empty>
    </el-card>

    <el-card v-if="killLogs.length" shadow="never" class="log-card">
      <template #header>
        <span>
          <Icon icon="ri:file-list-3-line" :width="18" style="vertical-align: -3px" />
          操作日志
        </span>
      </template>
      <div class="log-list">
        <div
          v-for="(log, i) in killLogs"
          :key="i"
          :class="['log-item', log.success ? 'log-success' : 'log-error']"
        >
          <Icon
            :icon="log.success ? 'ri:checkbox-circle-fill' : 'ri:error-warning-fill'"
            :width="16"
          />
          <span>{{ log.message }}</span>
          <span class="log-time">{{ log.time }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'

function getAPI() {
  const api = typeof window !== 'undefined' ? window.electronAPI : null
  if (!api?.killProcess || !api?.findProcessByPort) {
    return null
  }
  return api
}

const port = ref('')
const searching = ref(false)
const searched = ref(false)
const processes = ref([])
const killLogs = ref([])

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

function parsePorts(input) {
  const result = []
  const parts = input.trim().split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean)
  for (const part of parts) {
    if (/^\d+-\d+$/.test(part)) {
      const [a, b] = part.split('-').map(Number)
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      for (let p = lo; p <= hi && p <= 65535; p++) {
        if (p >= 1) result.push(p)
      }
    } else if (/^\d+$/.test(part)) {
      const p = +part
      if (p >= 1 && p <= 65535) result.push(p)
    }
  }
  return result
}

async function searchProcess() {
  const api = getAPI()
  if (!api) {
    ElMessage.error('请在 Electron 桌面版中使用端口查杀功能')
    return
  }
  const ports = [...new Set(parsePorts(port.value))]
  if (ports.length === 0) {
    ElMessage.warning('请输入有效端口号（1-65535），多个端口用逗号或空格分隔')
    return
  }

  searching.value = true
  searched.value = true
  try {
    const pidMap = new Map()
    for (const p of ports) {
      const result = await api.findProcessByPort(p)
      for (const r of result) {
        if (!pidMap.has(r.pid)) {
          pidMap.set(r.pid, { ...r, port: p, _killing: false })
        } else {
          const existing = pidMap.get(r.pid)
          const current = String(existing.port).split(',').map(Number).filter(Boolean)
          if (!current.includes(p)) current.push(p)
          existing.port = current.join(',')
        }
      }
    }
    processes.value = Array.from(pidMap.values())
    if (processes.value.length === 0) {
      ElMessage.info(`端口 ${ports.join(', ')} 均未被占用`)
    }
  } catch (e) {
    ElMessage.error('查询失败：' + e.message)
  } finally {
    searching.value = false
  }
}

async function killProcess(row) {
  const api = getAPI()
  if (!api) {
    ElMessage.error('请在 Electron 桌面版中使用端口查杀功能')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要终止进程 ${row.command || ''}（PID: ${row.pid}）吗？`,
      '确认终止',
      { confirmButtonText: '终止', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  row._killing = true
  try {
    const result = await api.killProcess(row.pid)
    const ok = result && result.success === true
    const msg = result?.message ?? '未知错误'
    killLogs.value.unshift({
      success: ok,
      message: ok
        ? `已终止进程 ${row.command}（PID: ${row.pid}）`
        : `终止失败：${msg}`,
      time: now(),
    })
    if (ok) {
      processes.value = processes.value.filter((p) => p.pid !== row.pid)
      ElMessage.success(`进程 ${row.pid} 已终止`)
    } else {
      ElMessage.error('终止失败：' + msg)
    }
  } catch (e) {
    const errMsg = e?.message ?? String(e)
    killLogs.value.unshift({
      success: false,
      message: `操作异常：${errMsg}`,
      time: now(),
    })
    ElMessage.error('操作失败：' + errMsg)
  } finally {
    row._killing = false
  }
}

async function killAll() {
  const api = getAPI()
  if (!api) {
    ElMessage.error('请在 Electron 桌面版中使用端口查杀功能')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要终止端口 ${port.value} 上的全部 ${processes.value.length} 个进程吗？此操作不可恢复。`,
      '批量终止',
      { confirmButtonText: '全部终止', cancelButtonText: '取消', type: 'error' }
    )
  } catch {
    return
  }

  const pids = processes.value.map((p) => p.pid)
  let hasError = false
  for (const pid of pids) {
    const row = processes.value.find((p) => p.pid === pid)
    if (!row) continue
    try {
      const result = await api.killProcess(pid)
      const ok = result && result.success === true
      const msg = result?.message ?? '未知错误'
      killLogs.value.unshift({
        success: ok,
        message: ok
          ? `已终止进程 ${row.command}（PID: ${pid}）`
          : `终止 PID ${pid} 失败：${msg}`,
        time: now(),
      })
      if (!ok) hasError = true
    } catch (e) {
      const errMsg = e?.message ?? String(e)
      killLogs.value.unshift({
        success: false,
        message: `终止 PID ${pid} 异常：${errMsg}`,
        time: now(),
      })
      hasError = true
    }
  }

  processes.value = []
  ElMessage[hasError ? 'warning' : 'success'](
    hasError ? '批量终止完成，部分进程可能未成功终止' : '批量终止完成'
  )
}
</script>

<style scoped>
.port-killer {
  max-width: 900px;
}

.search-card {
  margin-bottom: 16px;
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.port-input {
  flex: 1;
  max-width: 360px;
}

.result-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-card {
  margin-bottom: 16px;
}

.log-list {
  max-height: 200px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}

.log-item:last-child {
  border-bottom: none;
}

.log-success {
  color: #67c23a;
}

.log-error {
  color: #f56c6c;
}

.log-time {
  margin-left: auto;
  color: #909399;
  font-size: 12px;
}

/* 跟随主框架深色模式 */
html.dark .log-item {
  border-bottom-color: #30363d;
}
html.dark .log-time {
  color: #8b949e;
}
</style>
