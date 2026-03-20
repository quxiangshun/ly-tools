/**
 * 生成插件市场 index.json
 * 从远程 HTML 解析 zip 列表，结合本地已安装插件的 manifest.title 生成中文名称映射
 * 输出到 plugins-market-index.json，可部署到 http://39.106.39.125:9999/tools/plugins/index.json
 *
 * 运行: node scripts/generate-plugin-index.js
 */
const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')

const PLUGIN_MARKET_BASE = 'http://39.106.39.125:9999/tools/plugins/'
const OUTPUT = path.join(__dirname, '..', 'plugins-market-index.json')

function fetch(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get
    get(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function parseZipLinks(html) {
  const list = []
  const re = /href=["']([^"']+\.zip)["']/gi
  let m
  const seen = new Set()
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    const filename = raw.split('/').pop().replace(/%20/g, ' ')
    if (!filename.endsWith('.zip') || seen.has(filename)) continue
    seen.add(filename)
    list.push(filename)
  }
  return list
}

function getLocalPluginTitles() {
  const dirs = [
    path.join(__dirname, '..', 'plugins-ext'),
    path.join(os.homedir(), '.ly', 'tools', 'plugins'),
  ]
  const map = {}
  for (const pluginsRoot of dirs) {
    if (!fs.existsSync(pluginsRoot)) continue
    try {
      const names = fs.readdirSync(pluginsRoot, { withFileTypes: true })
      for (const d of names) {
        if (!d.isDirectory()) continue
        const manifestPath = path.join(pluginsRoot, d.name, 'manifest.json')
        if (!fs.existsSync(manifestPath)) continue
        try {
          const raw = fs.readFileSync(manifestPath, 'utf-8')
          const manifest = JSON.parse(raw)
          const title = manifest.title ?? d.name
          map[d.name] = title
        } catch (_) {}
      }
    } catch (_) {}
  }
  return map
}

async function main() {
  console.log('正在获取插件市场列表...')
  const html = await fetch(PLUGIN_MARKET_BASE)
  const filenames = parseZipLinks(html)
  console.log(`解析到 ${filenames.length} 个插件:`, filenames)

  const titleMap = getLocalPluginTitles()
  console.log('本地插件标题映射:', titleMap)

  const plugins = filenames.map((filename) => {
    const name = filename.replace(/\.zip$/i, '')
    let decoded = name
    try {
      decoded = decodeURIComponent(name)
    } catch {
      decoded = name
    }
    const title = titleMap[decoded] || titleMap[name] || decoded
    return { filename, title }
  })

  const indexJson = { plugins }
  fs.writeFileSync(OUTPUT, JSON.stringify(indexJson, null, 2), 'utf-8')
  console.log(`已生成 ${OUTPUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
