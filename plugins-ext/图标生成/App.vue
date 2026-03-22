<template>
  <div class="icon-generator">
    <div class="gen-layout">
      <el-card shadow="never" class="config-card">
        <template #header>
          <span>
            <Icon icon="ri:settings-3-line" :width="18" style="vertical-align: -3px" />
            参数设置
          </span>
        </template>

        <el-form label-position="top" size="default">
          <el-form-item label="图标文字">
            <el-input
              v-model="config.text"
              placeholder="输入1~4个字符"
              maxlength="4"
              show-word-limit
              clearable
            />
          </el-form-item>

          <el-form-item label="背景颜色">
            <div class="color-row">
              <el-color-picker v-model="config.bgColor" show-alpha />
              <el-input v-model="config.bgColor" style="flex: 1" />
            </div>
            <div class="preset-colors">
              <span
                v-for="c in presetBgColors"
                :key="c"
                class="preset-dot"
                :style="{ background: c }"
                @click="config.bgColor = c"
              />
            </div>
          </el-form-item>

          <el-form-item label="文字颜色">
            <div class="color-row">
              <el-color-picker v-model="config.textColor" show-alpha />
              <el-input v-model="config.textColor" style="flex: 1" />
            </div>
          </el-form-item>

          <el-form-item label="字体">
            <el-select v-model="config.fontFamily" style="width: 100%">
              <el-option
                v-for="f in fontOptions"
                :key="f"
                :label="f"
                :value="f"
                :style="{ fontFamily: f }"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="文字大小">
            <el-slider
              v-model="config.fontSizePercent"
              :min="20"
              :max="90"
              :step="1"
              :format-tooltip="(v) => v + '%'"
              show-input
              input-size="small"
            />
          </el-form-item>

          <el-form-item label="粗体">
            <el-switch v-model="config.bold" />
          </el-form-item>

          <el-form-item label="图标形状">
            <el-radio-group v-model="config.shape">
              <el-radio-button value="square">
                <Icon icon="ri:checkbox-blank-fill" :width="14" />
                方形
              </el-radio-button>
              <el-radio-button value="rounded">
                <Icon icon="ri:checkbox-blank-fill" :width="14" style="border-radius: 3px" />
                圆角
              </el-radio-button>
              <el-radio-button value="circle">
                <Icon icon="ri:checkbox-blank-circle-fill" :width="14" />
                圆形
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </el-card>

      <div class="preview-area">
        <el-card shadow="never" class="preview-card">
          <template #header>
            <span>
              <Icon icon="ri:eye-line" :width="18" style="vertical-align: -3px" />
              预览
            </span>
          </template>

          <div class="preview-grid">
            <div class="preview-main">
              <img
                v-if="previewUrl"
                :src="previewUrl"
                class="preview-img-large"
                :style="{ background: transparentBg }"
              />
              <div v-else class="preview-placeholder">
                <Icon icon="ri:image-line" :width="48" color="#c0c4cc" />
                <span>输入文字开始预览</span>
              </div>
            </div>

            <div v-if="previewUrl" class="preview-sizes">
              <div
                v-for="s in previewSizes"
                :key="s.size"
                class="preview-size-item"
              >
                <img
                  :src="s.url"
                  :width="s.size"
                  :height="s.size"
                  :style="{ background: transparentBg }"
                />
                <span class="size-label">{{ s.size }}×{{ s.size }}</span>
              </div>
            </div>
          </div>
        </el-card>

        <el-button
          type="primary"
          size="large"
          class="download-btn"
          :disabled="!config.text.trim()"
          :loading="downloading"
          @click="downloadIco"
        >
          <Icon icon="ri:download-2-line" :width="18" style="margin-right: 6px" />
          下载 ICO 图标
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { renderIcon, createIco } from './ico.js'

const config = reactive({
  text: 'LY',
  bgColor: '#409eff',
  textColor: '#ffffff',
  fontFamily: 'Arial',
  fontSizePercent: 60,
  bold: true,
  shape: 'rounded',
})

const presetBgColors = [
  '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399',
  '#1a1a2e', '#6c5ce7', '#00b894', '#e17055', '#2d3436',
]

const fontOptions = [
  'Arial',
  'Helvetica',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Microsoft YaHei',
  'SimHei',
  'KaiTi',
  'SimSun',
]

const transparentBg =
  'repeating-conic-gradient(#e8e8e8 0% 25%, #fff 0% 50%) 0 0 / 16px 16px'

const previewUrl = ref('')
const previewSizes = ref([])
const downloading = ref(false)

const iconOptions = computed(() => ({
  bgColor: config.bgColor,
  textColor: config.textColor,
  fontFamily: config.fontFamily,
  fontSizeRatio: config.fontSizePercent / 100,
  bold: config.bold,
  shape: config.shape,
}))

function updatePreview() {
  const text = config.text.trim()
  if (!text) {
    previewUrl.value = ''
    previewSizes.value = []
    return
  }

  const opts = iconOptions.value
  const mainCanvas = renderIcon(text, 256, opts)
  previewUrl.value = mainCanvas.toDataURL('image/png')

  const sizes = [64, 48, 32, 16]
  previewSizes.value = sizes.map((size) => {
    const canvas = renderIcon(text, size, opts)
    return { size, url: canvas.toDataURL('image/png') }
  })
}

watch(
  () => ({ ...config }),
  () => updatePreview(),
  { immediate: true, deep: true }
)

async function downloadIco() {
  const text = config.text.trim()
  if (!text) return

  downloading.value = true
  try {
    const icoBuffer = await createIco(text, iconOptions.value)
    const data = Array.from(new Uint8Array(icoBuffer))
    const result = await window.electronAPI.saveFile({
      defaultName: `${text}.ico`,
      data,
    })
    if (result.success) {
      ElMessage.success('图标已保存到 ' + result.path)
    }
  } catch (e) {
    ElMessage.error('生成失败：' + e.message)
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.icon-generator {
  max-width: 960px;
}

.gen-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  align-items: start;
}

.config-card :deep(.el-card__body) {
  padding-top: 12px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.preset-colors {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.preset-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.preset-dot:hover {
  border-color: #409eff;
  transform: scale(1.15);
}

.preview-card {
  margin-bottom: 16px;
}

.preview-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.preview-main {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 280px;
}

.preview-img-large {
  width: 256px;
  height: 256px;
  border-radius: 8px;
  image-rendering: pixelated;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #c0c4cc;
  font-size: 14px;
}

.preview-sizes {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  padding: 12px 0;
  border-top: 1px solid #ebeef5;
  width: 100%;
  justify-content: center;
}

.preview-size-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.preview-size-item img {
  border-radius: 4px;
  image-rendering: pixelated;
}

.size-label {
  font-size: 11px;
  color: #909399;
}

.download-btn {
  width: 100%;
}
</style>
