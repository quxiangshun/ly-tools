/**
 * 构建后对 exe 应用自定义图标（无需 signAndEditExecutable，避免 winCodeSign 权限问题）
 */
import { rcedit } from 'rcedit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'))
const productName = pkg.build?.productName || pkg.productName || pkg.name
const exePath = path.join(projectRoot, 'dist', 'win-unpacked', `${productName}.exe`)
const iconPath = path.join(projectRoot, 'build', 'icon.ico')

if (process.platform !== 'win32') {
  console.log('跳过 exe 图标应用（仅 Windows）')
  process.exit(0)
}

if (!fs.existsSync(exePath)) {
  console.warn('未找到 exe 文件，跳过图标应用:', exePath)
  process.exit(0)
}

if (!fs.existsSync(iconPath)) {
  console.warn('未找到 icon.ico，跳过:', iconPath)
  process.exit(0)
}

try {
  await rcedit(exePath, { icon: iconPath })
  console.log('已应用图标到 exe:', exePath)
} catch (e) {
  console.error('应用图标失败:', e.message)
  process.exit(1)
}
