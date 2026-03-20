/**
 * 构建插件：将 plugins-ext 下各目录的 App.vue 编译为 App.js（UMD）
 * 输出到 plugins/<插件名>/，并打包为 plugins/<插件名>.zip
 */
const path = require('path')
const fs = require('fs')
const { build } = require('vite')
const vue = require('@vitejs/plugin-vue')
const AdmZip = require('adm-zip')

const srcRoot = path.join(__dirname, '..', 'plugins-ext')
const outRoot = path.join(__dirname, '..', 'plugins')

if (!fs.existsSync(srcRoot)) {
  console.log('plugins-ext 目录不存在，跳过')
  process.exit(0)
}

const dirs = fs.readdirSync(srcRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .filter((d) => fs.existsSync(path.join(srcRoot, d.name, 'App.vue')))
  .map((d) => d.name)

if (dirs.length === 0) {
  console.log('无插件需要构建')
  process.exit(0)
}

function copyDirExcluding(srcDir, destDir, exclude) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })
  for (const e of entries) {
    if (exclude(e.name)) continue
    const src = path.join(srcDir, e.name)
    const dest = path.join(destDir, e.name)
    if (e.isDirectory()) {
      copyDirExcluding(src, dest, exclude)
    } else {
      fs.copyFileSync(src, dest)
    }
  }
}

async function buildOne(dir) {
  const srcDir = path.join(srcRoot, dir)
  const outDir = path.join(outRoot, dir)

  // 1. 复制非源码文件到 plugins/dir（排除 App.vue、style.css、node_modules 等）
  const excludeNames = new Set(['App.vue', 'style.css', 'node_modules', '.git', '.DS_Store'])
  copyDirExcluding(srcDir, outDir, (name) => excludeNames.has(name))

  // 2. 构建 App.vue -> App.js（及 style.css）
  const entry = path.join(srcDir, 'App.vue')
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
  console.log(`  ✓ ${dir}/`)
}

function zipPlugin(dir) {
  const pluginDir = path.join(outRoot, dir)
  const zipPath = path.join(outRoot, `${dir}.zip`)
  const zip = new AdmZip()
  zip.addLocalFolder(pluginDir, '')
  zip.writeZip(zipPath)
  console.log(`  ✓ ${dir}.zip`)
}

async function main() {
  if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true })

  console.log(`构建 ${dirs.length} 个插件...`)
  for (const dir of dirs) {
    await buildOne(dir)
  }

  console.log('\n打包 zip...')
  for (const dir of dirs) {
    zipPlugin(dir)
  }

  console.log('完成')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
