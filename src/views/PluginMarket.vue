<template>
  <div class="plugin-market">
    <h2 class="market-title">插件市场</h2>
    <p class="market-desc">资源来自 <code>http://39.106.39.125:9999/tools/plugins/</code>，安装后会自动热加载，新插件立即可用。</p>

    <template v-if="!hasElectron">
      <el-alert type="info" :closable="false" class="market-alert">
        请在桌面版（Electron）中使用插件市场，浏览器环境无法安装插件。
      </el-alert>
    </template>

    <template v-else>
      <div v-loading="loading" class="market-list">
        <el-empty v-if="!loading && list.length === 0" description="暂无插件或加载失败" />
        <div v-else class="market-grid">
          <el-card
            v-for="item in list"
            :key="item.filename"
            shadow="hover"
            class="market-card"
          >
            <div class="market-card-body">
              <div class="market-name">{{ item.name }}</div>
              <el-button
                v-if="isInstalled(item)"
                type="success"
                size="small"
                disabled
                class="market-btn"
              >
                已安装
              </el-button>
              <el-button
                v-else
                type="primary"
                size="small"
                :loading="installing === item.filename"
                class="market-btn"
                @click="install(item)"
              >
                安装
              </el-button>
            </div>
          </el-card>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { ElMessage } from 'element-plus'

const hasElectron = computed(() => !!window.electronAPI)
const pluginList = inject('pluginList', { list: [] })
const refreshPlugins = inject('refreshPlugins', null)

const loading = ref(true)
const list = ref([])
const installing = ref('')

function isInstalled(item) {
  const arr = pluginList?.list ?? (Array.isArray(pluginList) ? pluginList : [])
  return arr.some((p) => p.pluginDir === item.name)
}

function loadList() {
  if (!window.electronAPI?.getPluginMarketList) return
  loading.value = true
  window.electronAPI
    .getPluginMarketList()
    .then(({ success, list: data, message }) => {
      if (success) list.value = data || []
      else ElMessage.warning(message || '获取列表失败')
    })
    .finally(() => {
      loading.value = false
    })
}

function install(item) {
  if (!window.electronAPI?.installPluginFromMarket) return
  installing.value = item.filename
  window.electronAPI
    .installPluginFromMarket(item.filename)
    .then(async ({ success, message }) => {
      if (success) {
        ElMessage.success(message)
        loadList()
        if (typeof refreshPlugins === 'function') {
          await refreshPlugins()
          ElMessage.success('已热加载，新插件可用')
        }
      } else {
        ElMessage.error(message || '安装失败')
      }
    })
    .finally(() => {
      installing.value = ''
    })
}

onMounted(() => {
  if (hasElectron.value) loadList()
  else loading.value = false
})
</script>

<style scoped>
.plugin-market {
  width: 100%;
}

.market-title {
  font-size: 20px;
  color: #303133;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.market-desc {
  font-size: 13px;
  color: #909399;
  margin: 0 0 20px 0;
}

.market-desc code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.market-alert {
  margin-bottom: 16px;
}

.market-list {
  min-height: 120px;
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.market-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.market-card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.market-name {
  font-size: 15px;
  color: #303133;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-btn {
  flex-shrink: 0;
}
</style>
