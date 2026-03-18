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

    <div class="card-grid">
      <el-card
        v-for="item in filteredTools"
        :key="item.route"
        shadow="hover"
        class="tool-card"
        @click="onCardClick(item)"
      >
        <div class="tool-card-body">
          <div class="tool-icon-wrap">
            <div class="tool-icon" :style="{ background: item.color }">
              <Icon :icon="item.icon" :width="24" />
            </div>
            <span v-if="item.version" class="tool-version">v{{ item.version }}</span>
          </div>
          <div class="tool-text">
            <h3 class="tool-title">{{ item.title }}</h3>
            <el-tooltip :content="item.description || ''" placement="top" :show-after="300">
              <p class="tool-desc">{{ item.description }}</p>
            </el-tooltip>
          </div>
        </div>
      </el-card>
    </div>

    <el-empty
      v-if="keyword && filteredTools.length === 0"
      description="未找到匹配的工具"
      class="empty-tip"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const router = useRouter()
const keyword = ref('')
const pluginList = inject('pluginList', [])

const filteredTools = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return pluginList
  return pluginList.filter(
    (t) =>
      t.title.toLowerCase().includes(k) ||
      (t.description && t.description.toLowerCase().includes(k))
  )
})

function onCardClick(item) {
  if (item.fullScreen && item.id === 'lock-screen') {
    if (window.electronAPI?.openLockScreen) {
      window.electronAPI.openLockScreen()
    } else {
      router.push(item.route)
    }
    return
  }
  if (item.fullScreen && item.id === 'lock-screen-light-off') {
    if (window.electronAPI?.openLightOffWindow) {
      window.electronAPI.openLightOffWindow()
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

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.tool-card {
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tool-card:hover {
  transform: translateY(-2px);
}

.tool-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.tool-card-body {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14px;
}

.tool-icon-wrap {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tool-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.tool-text {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.tool-title {
  font-size: 16px;
  color: #303133;
  margin: 0 0 4px 0;
  font-weight: 600;
}

.tool-version {
  font-size: 10px;
  font-weight: 400;
  color: #909399;
}

.tool-desc {
  font-size: 12px;
  color: #909399;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-tip {
  margin-top: 40px;
}
</style>
