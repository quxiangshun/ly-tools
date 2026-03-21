/**
 * 获取 Electron API，优先从 provide 注入，否则回退到 window（用于 bootstrap/standalone）
 * 子组件应通过 inject('electronAPI') 获取，实现与 window 解耦
 */
import { inject } from 'vue'

export function useElectronAPI() {
  return inject('electronAPI', typeof window !== 'undefined' ? window.electronAPI ?? {} : {})
}
