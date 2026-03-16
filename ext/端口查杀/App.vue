<template>
  <div class="port-killer">
    <div class="page-header">
      <Icon icon="ri:terminal-box-fill" :width="26" color="#409eff" />
      <h2>端口查杀</h2>
    </div>

    <el-card shadow="never" class="search-card">
      <div class="search-row">
        <el-input
          v-model="port"
          placeholder="请输入端口号，如 8080"
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
              @click="killProcess(row)"
            >
              <Icon icon="ri:close-circle-line" :width="14" style="margin-right: 2px" />
              终止
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="未找到占用该端口的进程">
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

const port = ref('')
const searching = ref(false)
const searched = ref(false)
const processes = ref([])
const killLogs = ref([])

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

async function searchProcess() {
  const p = port.value.trim()
  if (!p || !/^\d+$/.test(p) || +p < 1 || +p > 65535) {
    ElMessage.warning('请输入有效端口号（1-65535）')
    return
  }

  searching.value = true
  searched.value = true
  try {
    const result = await window.electronAPI.findProcessByPort(+p)
    processes.value = result.map((r) => ({ ...r, _killing: false }))
    if (result.length === 0) {
      ElMessage.info(`端口 ${p} 未被占用`)
    }
  } catch (e) {
    ElMessage.error('查询失败：' + e.message)
  } finally {
    searching.value = false
  }
}

async function killProcess(row) {
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
    const result = await window.electronAPI.killProcess(row.pid)
    killLogs.value.unshift({
      success: result.success,
      message: result.success
        ? `已终止进程 ${row.command}（PID: ${row.pid}）`
        : `终止失败：${result.message}`,
      time: now(),
    })
    if (result.success) {
      processes.value = processes.value.filter((p) => p.pid !== row.pid)
      ElMessage.success(`进程 ${row.pid} 已终止`)
    } else {
      ElMessage.error('终止失败：' + result.message)
    }
  } catch (e) {
    ElMessage.error('操作失败：' + e.message)
  } finally {
    row._killing = false
  }
}

async function killAll() {
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
  for (const pid of pids) {
    const row = processes.value.find((p) => p.pid === pid)
    if (!row) continue
    const result = await window.electronAPI.killProcess(pid)
    killLogs.value.unshift({
      success: result.success,
      message: result.success
        ? `已终止进程 ${row.command}（PID: ${pid}）`
        : `终止 PID ${pid} 失败：${result.message}`,
      time: now(),
    })
  }

  processes.value = []
  ElMessage.success('批量终止完成')
}
</script>

<style scoped>
.port-killer {
  max-width: 900px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 22px;
  color: #303133;
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
</style>
