<template>
  <div class="card-grid">
    <el-card
      v-for="item in list"
      :key="item.id || item.route"
      shadow="hover"
      class="tool-card"
      @click="item.route && onCardClick(item)"
    >
      <el-tooltip v-if="canUninstall && item.pluginDir" content="卸载" placement="top" :show-after="300">
        <span
          class="tool-uninstall-btn"
          @click.stop="onUninstall(item)"
        >
          <Icon icon="ri:close-line" :width="14" />
        </span>
      </el-tooltip>
      <div class="tool-card-body">
        <div class="tool-icon-wrap">
          <div class="tool-icon" :style="{ background: item.color || 'linear-gradient(135deg, #409eff 0%, #66b1ff 100%)' }">
            <Icon :icon="item.icon || 'ri:store-2-line'" :width="24" />
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
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  list: {
    type: Array,
    default: () => [],
  },
  canUninstall: {
    type: Boolean,
    default: false,
  },
  onCardClick: {
    type: Function,
    required: true,
  },
  onUninstall: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.tool-card {
  position: relative;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tool-uninstall-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: #909399;
  opacity: 0;
  cursor: pointer;
  border-radius: 4px;
  transition: opacity 0.2s, color 0.2s, background 0.2s;
}

.tool-card:hover .tool-uninstall-btn {
  opacity: 1;
}

.tool-uninstall-btn:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
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
</style>
