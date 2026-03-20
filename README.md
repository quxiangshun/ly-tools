# 栾媛小工具（无用版）

基于 Electron + Vue 3 + Element Plus 的实用小工具集。

## 功能

### 1. 端口查杀
- 输入端口号查询占用进程
- 显示进程详情（PID、进程名、协议、地址、状态）
- 支持单个终止和批量终止
- 使用 `taskkill /F /T`（Windows）或 `kill -9`（Linux）强制杀死进程树
- 操作日志记录

### 2. 图标生成
- 输入文字（1-4 个字符）生成 ICO 图标
- 自定义背景色、文字色（含预设色板）
- 多种字体选择（含中文字体）
- 文字大小、粗体调节
- 图标形状：方形 / 圆角 / 圆形
- 实时预览（256/64/48/32/16 多尺寸）
- 一键下载标准 ICO 文件

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 技术栈

- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [Vue 3](https://vuejs.org/) - 前端框架
- [Element Plus](https://element-plus.org/) - UI 组件库
- [Remix Icon](https://icon-sets.iconify.design/ri/) via [@iconify/vue](https://iconify.design/) - 图标
- [Vite](https://vitejs.dev/) - 构建工具
