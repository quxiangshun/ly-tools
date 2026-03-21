<template>
  <div class="home">
    <div class="search-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索工具，如：端口、图标..."
        size="large"
        clearable
        class="search-input"
      >
        <template #prefix>
          <Icon icon="ri:search-line" :width="20" />
        </template>
      </el-input>
    </div>

    <el-empty
      v-if="hasNoPlugins"
      class="empty-tip"
      description="暂无插件，请到插件市场下载"
    >
      <el-button type="primary" @click="router.push('/plugin-market')">
        <Icon icon="ri:store-2-line" :width="18" style="vertical-align: middle; margin-right: 4px" />
        去插件市场
      </el-button>
    </el-empty>

    <template v-else>
      <ToolCardList
        :list="displayList"
        :can-uninstall="canUninstall"
        :on-card-click="onCardClick"
        :on-uninstall="onUninstall"
      />

      <el-empty
        v-if="keyword && filteredTools.length === 0"
        description="未找到匹配的工具"
        class="empty-tip"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import ToolCardList from './components/ToolCardList.vue'

const router = useRouter()
const keyword = ref('')
const pluginList = inject('pluginList', [])
const refreshPlugins = inject('refreshPlugins', () => {})
const electronAPI = inject('electronAPI', {})

const canUninstall = computed(() => !!electronAPI?.uninstallPlugin)

const filteredTools = computed(() => {
  const arr = pluginList?.list ?? pluginList
  const k = keyword.value.trim().toLowerCase()
  if (!k) return Array.isArray(arr) ? arr : []
  return (Array.isArray(arr) ? arr : []).filter(
    (t) =>
      t.title?.toLowerCase().includes(k) ||
      (t.description && t.description.toLowerCase().includes(k))
  )
})

const displayList = computed(() => filteredTools.value)

const hasNoPlugins = computed(() => {
  const arr = pluginList?.list ?? pluginList
  const list = Array.isArray(arr) ? arr : []
  return list.length === 0 && !keyword.value
})

function onCardClick(item) {
  if (item.fullScreen && item.id === 'lock-screen') {
    if (electronAPI?.openLockScreen) {
      electronAPI.openLockScreen()
    } else {
      router.push(item.route)
    }
    return
  }
  if (item.fullScreen && item.id === 'lock-screen-light-off') {
    if (electronAPI?.openLightOffWindow) {
      electronAPI.openLightOffWindow()
    } else {
      router.push(item.route)
    }
    return
  }
  if (item.fullScreen && item.id === 'screen-saver-shatter') {
    router.push(item.route)
    return
  }
  router.push(item.route)
}

async function onUninstall(item) {
  try {
    await ElMessageBox.confirm(
      `确定要卸载「${item.title}」吗？卸载后将完全删除该插件的所有文件，无法恢复。`,
      '确认卸载',
      {
        confirmButtonText: '卸载',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const { ok, err } = await electronAPI.uninstallPlugin(item.pluginDir)
    if (ok) {
      ElMessage.success('卸载成功')
      await refreshPlugins()
    } else {
      ElMessage.error(err || '卸载失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '卸载失败')
  }
}
</script>

<style scoped>
.home {
  width: 100%;
}

.search-bar {
  margin-bottom: 28px;
}

.search-input {
  font-size: 15px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 10px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.search-input :deep(.el-input__wrapper:hover),
.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 2px 16px rgba(64, 158, 255, 0.2);
}

.empty-tip {
  margin-top: 40px;
}
</style>
