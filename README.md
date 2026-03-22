# 栾媛小工具 v1.0

Copyright (C) 2025 屈想顺. Licensed under [AGPL-3.0](LICENSE).

基于 Electron + Vue 3 + Element Plus 的实用小工具集。

## 功能

### 插件列表

| 插件 | 说明 |
|------|------|
| **端口查杀** | 根据端口号查询并终止占用进程，支持 Windows/Linux |
| **图标生成** | 文字生成 ICO 图标，自定义颜色、字体、形状，支持多尺寸 |
| **秀恩爱** | 记录纪念日，秀出你们的恩爱 |
| **养龙虾** | 点击加号增加龙虾，减号随机杀掉一只，龙虾从屏幕任意位置爬出 |
| **加减混合** | 一年级/大班口算题生成：基本计算、比大小、填未知数，可导出 Excel 与打印 |
| **锁屏（关灯）** | 全黑关灯，中间两只大眼睛随鼠标转动，简笔画风格 |
| **锁屏（win更新）** | Windows 更新风格假锁屏 |
| **屏保（碎屏）** | 桌面碎屏屏保，覆盖在桌面上展示 |

### 端口查杀（详情）
- 输入端口号查询占用进程
- 显示进程详情（PID、进程名、协议、地址、状态）
- 支持单个终止和批量终止
- 使用 `taskkill /F /T`（Windows）或 `kill -9`（Linux）强制杀死进程树
- 操作日志记录

### 图标生成（详情）
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

主程序构建不包含插件。插件目录为 `~/.ly/tools/plugins`，由用户通过插件市场安装。若需在插件市场上架，将 `plugins/*.zip` 上传至：`http://39.106.39.125:9999/tools/plugins/`

## 技术栈

- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [Vue 3](https://vuejs.org/) - 前端框架
- [Element Plus](https://element-plus.org/) - UI 组件库
- [Remix Icon](https://icon-sets.iconify.design/ri/) via [@iconify/vue](https://iconify.design/) - 图标
- [Vite](https://vitejs.dev/) - 构建工具
