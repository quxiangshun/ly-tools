/**
 * 将 public/icon-512.png 转为 build/icon.ico，供 electron-builder 使用
 */
const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const pngPath = path.join(projectRoot, 'public', 'icon-512.png')
const buildDir = path.join(projectRoot, 'build')
const icoPath = path.join(buildDir, 'icon.ico')

async function main() {
  if (!fs.existsSync(pngPath)) {
    console.warn('public/icon-512.png 不存在，跳过图标生成')
    return
  }
  fs.mkdirSync(buildDir, { recursive: true })
  const pngToIco = (await import('png-to-ico')).default
  const buf = await pngToIco(pngPath)
  fs.writeFileSync(icoPath, buf)
  console.log('已生成 build/icon.ico')
}

main().catch((e) => {
  console.error('生成 icon.ico 失败:', e)
  process.exit(1)
})
