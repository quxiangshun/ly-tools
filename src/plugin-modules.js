/**
 * 插件模块 glob，与 main.js 使用相同路径基准（src/ -> ../plugins）
 * 确保 router 与 standalone 使用一致的 key 格式
 */
export const pluginModules = import.meta.glob('../plugins/*/App.vue')
