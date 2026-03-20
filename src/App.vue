<template>
  <div class="app-wrap">
    <header class="app-header">
      <div class="app-header-left">
        <router-link v-if="!isHome" to="/" class="back-home">
          <Icon icon="ri:arrow-left-line" :width="18" />
          返回
        </router-link>
        <div class="app-logo">
          <img :src="iconImg" alt="栾媛小工具" class="app-logo-img" />
          <span>栾媛小工具（无用版）</span>
          <el-tooltip placement="bottom" effect="dark" :show-after="300">
            <template #content>
              <div class="plugin-tip-content">
                <div class="plugin-tip-title">插件开发说明</div>
                <p>1. 开发时源码在 <code>plugins-ext</code>，构建输出到 <code>plugins</code>；打包后为 <code>~/.ly/tools/plugins</code>；</p>
                <p>2. 在文件夹内添加 <code>manifest.json</code>，包含：id、route、icon、description、color、supportedOS（必填，支持的系统，如 <code>["win64"]</code>、<code>["win64","linux"]</code>，可选 win64/win32/windows、linux、darwin/macos）；可选 fullScreen、version、minLyToolsVersion；</p>
                <p>3. 在文件夹内添加 <code>App.vue</code> 作为插件入口组件；</p>
                <p>4. 删除对应文件夹即可卸载该插件。</p>
              </div>
            </template>
            <span class="app-logo-tip">
              <Icon icon="ri:information-line" :width="18" />
            </span>
          </el-tooltip>
        </div>
      </div>
      <router-link to="/plugin-market" class="app-plugin-market">
        <Icon icon="ri:store-2-line" :width="18" />
        插件市场
      </router-link>
    </header>
    <main class="app-main">
      <router-view />
    </main>
    <footer class="app-footer">
      © 2025 屈想顺 · <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">AGPL-3.0</a>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import iconImg from './assets/icon-512.png'

const route = useRoute()
const isHome = computed(() => route.path === '/')
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
}

.app-wrap {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  -webkit-app-region: drag;
}

.app-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  -webkit-app-region: no-drag;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  -webkit-app-region: no-drag;
}

.app-logo-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.app-logo-tip {
  display: inline-flex;
  align-items: center;
  color: #909399;
  cursor: help;
  margin-left: 2px;
}

.app-logo-tip:hover {
  color: #409eff;
}

.plugin-tip-content {
  max-width: 320px;
  font-size: 12px;
  line-height: 1.6;
}

.plugin-tip-content .plugin-tip-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #fff;
}

.plugin-tip-content p {
  margin: 0 0 6px 0;
}

.plugin-tip-content p:last-child {
  margin-bottom: 0;
}

.plugin-tip-content code {
  background: rgba(255,255,255,0.2);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.back-home {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  color: #606266;
  font-size: 14px;
  text-decoration: none;
  border-radius: 8px;
  -webkit-app-region: no-drag;
}

.back-home:hover {
  background: #f5f7fa;
  color: #409eff;
}

.app-plugin-market {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  color: #606266;
  font-size: 14px;
  text-decoration: none;
  border-radius: 8px;
  -webkit-app-region: no-drag;
}

.app-plugin-market:hover {
  background: #f5f7fa;
  color: #409eff;
}

.app-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.app-footer {
  padding: 12px 24px;
  font-size: 12px;
  color: #909399;
  text-align: center;
  border-top: 1px solid #ebeef5;
  background: #fff;
}

.app-footer a {
  color: #409eff;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}
</style>
