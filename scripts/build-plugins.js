/**
 * 构建插件：将 plugins-ext 下各目录的 App.vue 编译为 App.js（UMD）
 * 主程序不依赖 plugins-ext 源码，插件在运行时从插件目录加载
 */
const path = require('path')
const fs = require('fs')
const { build } = require('vite')
const vue = require('@vitejs/plugin-vue')

const pluginsRoot = path.join(__dirname, '..', 'plugins-ext')
if (!fs.existsSync(pluginsRoot)) {
  console.log('plugins-ext 目录不存在，跳过')
  process.exit(0)
}
const dirs = fs.readdirSync(pluginsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .filter((d) => fs.existsSync(path.join(pluginsRoot, d.name, 'App.vue')))
  .map((d) => d.name)

if (dirs.length === 0) {
  console.log('无插件需要构建')
  process.exit(0)
}

async function buildOne(dir) {
  const entry = path.join(pluginsRoot, dir, 'App.vue')
  const outDir = path.join(pluginsRoot, dir)
  await build({
    configFile: false,
    plugins: [vue()],
    build: {
      outDir,
      emptyOutDir: false,
      cssCodeSplit: false,
      lib: {
        entry,
        name: '__LY_PLUGIN__',
        formats: ['umd'],
        fileName: () => 'App.js',
      },
      rollupOptions: {
        external: ['vue', 'element-plus', '@iconify/vue'],
        output: {
          format: 'umd',
          globals: {
            vue: 'Vue',
            'element-plus': 'ElementPlus',
            '@iconify/vue': 'Icon',
          },
        },
      },
    },
  })
  console.log(`  ✓ ${dir}/App.js`)
}

async function main() {
  console.log(`构建 ${dirs.length} 个插件...`)
  for (const dir of dirs) {
    await buildOne(dir)
  }
  console.log('完成')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
