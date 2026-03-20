/**
 * 运行时插件加载器：从 ly-plugin:// 协议加载插件
 * 主程序不依赖 plugins 源码，插件需预构建为 App.js（UMD）
 */
import * as Vue from 'vue'
import ElementPlus from 'element-plus'
import * as Icon from '@iconify/vue'

// 插件 UMD 需要这些全局变量
export function exposePluginHost() {
  if (typeof window === 'undefined') return
  window.Vue = Vue
  window.ElementPlus = ElementPlus
  window.Icon = Icon
}

function loadPluginCss(pluginDir) {
  const encoded = encodeURIComponent(pluginDir)
  const url = `ly-plugin://${encoded}/style.css`
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

async function loadPluginByUrl(url, pluginDir) {
  if (pluginDir) loadPluginCss(pluginDir)
  return new Promise((resolve, reject) => {
    const prev = window.__LY_PLUGIN__
    window.__LY_PLUGIN__ = undefined
    const script = document.createElement('script')
    script.src = url
    script.onload = () => {
      const comp = window.__LY_PLUGIN__
      window.__LY_PLUGIN__ = prev
      script.remove()
      resolve(comp || null)
    }
    script.onerror = () => {
      window.__LY_PLUGIN__ = prev
      script.remove()
      reject(new Error(`加载插件失败: ${pluginDir}`))
    }
    document.head.appendChild(script)
  })
}

export async function loadPluginComponent(pluginDir) {
  if (!window.electronAPI?.getPluginEntryUrl) return null
  const url = await window.electronAPI.getPluginEntryUrl(pluginDir)
  if (!url) return null
  return loadPluginByUrl(url, pluginDir)
}

export async function loadPluginComponentById(pluginId) {
  if (!window.electronAPI?.getPluginEntryUrlById) return null
  const url = await window.electronAPI.getPluginEntryUrlById(pluginId)
  if (!url) return null
  const pluginDir = url.match(/ly-plugin:\/\/([^/]+)\//)?.[1]
  return loadPluginByUrl(url, pluginDir ? decodeURIComponent(pluginDir) : null)
}
