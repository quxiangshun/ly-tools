/**
 * afterPack 钩子：在打包进安装程序前对 exe 应用自定义图标
 * 这样安装后的程序和桌面快捷方式都会显示正确图标
 */
const path = require('path')
const fs = require('fs')

module.exports = async function (context) {
  if (process.platform !== 'win32') return

  const projectRoot = path.join(__dirname, '..')
  const iconPath = path.join(projectRoot, 'build', 'icon.ico')
  if (!fs.existsSync(iconPath)) return

  const productName = context.packager?.info?.productName || '栾媛小工具'
  const exePath = path.join(context.appOutDir, `${productName}.exe`)
  if (!fs.existsSync(exePath)) return

  try {
    const { rcedit } = await import('rcedit')
    await rcedit(exePath, { icon: iconPath })
    console.log('已应用图标到 exe（安装包内）:', exePath)
  } catch (e) {
    console.error('afterPack 应用图标失败:', e.message)
  }
}
