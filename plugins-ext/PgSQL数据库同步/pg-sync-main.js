/**
 * PostgreSQL：pg_dump / pg_restore 一次落盘同步（NetBox 等）。
 * 由 invoke-plugin-main 加载；依赖本目录 node_modules 中的 pg。
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

function defaultDumpPath() {
  return path.join(os.tmpdir(), 'netbox.dump')
}

function ensureLog(log) {
  return typeof log === 'function' ? log : () => {}
}

function execFileSyncSafe(file, args, opts) {
  try {
    return execFileSync(file, args, { ...opts, maxBuffer: opts?.maxBuffer ?? 512 * 1024 * 1024 })
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : ''
    const stdout = e.stdout ? e.stdout.toString() : ''
    const msg = [stderr, stdout, e.message].filter(Boolean).join('\n').trim() || String(e)
    const err = new Error(msg)
    err.code = e.code
    throw err
  }
}

function binName(base) {
  return process.platform === 'win32' ? `${base}.exe` : base
}

/** pg_bin 目录或留空使用 PATH */
function resolveTool(pgBin, tool) {
  const dir = pgBin != null ? String(pgBin).trim() : ''
  if (!dir) return binName(tool)
  return path.join(dir, binName(tool))
}

function parsePgDumpVersion(text) {
  const s = String(text || '')
  const m = s.match(/\(PostgreSQL\)\s+(\d+)\.(\d+)/i) || s.match(/(\d+)\.(\d+)/)
  if (!m) return { raw: s.trim(), major: null, minor: null }
  return { raw: s.trim(), major: Number(m[1]), minor: Number(m[2]) }
}

function parseServerVersionNum(num) {
  const n = Number(num)
  if (!Number.isFinite(n)) return null
  return Math.floor(n / 10000)
}

async function queryServerMajor(conn) {
  const { Client } = require('pg')
  const c = new Client({
    host: conn.host,
    port: Number(conn.port) || 5432,
    user: conn.user,
    password: conn.password != null ? String(conn.password) : '',
    database: conn.database,
    ssl: false,
  })
  await c.connect()
  try {
    const { rows } = await c.query('SHOW server_version_num')
    const snum = rows[0]?.server_version_num
    const { rows: vr } = await c.query('SELECT version() AS v')
    return {
      serverVersionNum: snum,
      serverMajor: parseServerVersionNum(snum),
      versionLine: String(vr[0]?.v || '').split('\n')[0].trim(),
    }
  } finally {
    await c.end().catch(() => {})
  }
}

/**
 * 检测本机 pg_dump 客户端版本与源/目标服务器主版本；大版本不一致时给出警告。
 */
async function testVersions(payload, log) {
  const logFn = ensureLog(log)
  const pgBin = payload?.pgBin
  const source = payload?.source
  const target = payload?.target
  const warnings = []

  if (!source?.host || !source?.database) {
    return { success: false, message: '请填写源库主机与数据库名' }
  }

  const pgDumpPath = resolveTool(pgBin, 'pg_dump')
  let clientInfo
  try {
    const out = execFileSyncSafe(pgDumpPath, ['--version'], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    })
    clientInfo = parsePgDumpVersion(out)
    logFn(`客户端 pg_dump：${clientInfo.raw || out.trim()}`)
  } catch (e) {
    return {
      success: false,
      message: `无法执行 pg_dump（请检查「客户端 bin 目录」或 PATH）：${e?.message || e}`,
    }
  }

  let sourceInfo
  try {
    sourceInfo = await queryServerMajor(source)
    logFn(`源库服务器：${sourceInfo.versionLine || ''}（主版本约 ${sourceInfo.serverMajor}）`)
  } catch (e) {
    return { success: false, message: `连接源库失败：${e?.message || e}` }
  }

  if (clientInfo.major != null && sourceInfo.serverMajor != null) {
    if (clientInfo.major < sourceInfo.serverMajor) {
      const w = `客户端主版本（${clientInfo.major}）低于源库服务器主版本（${sourceInfo.serverMajor}），pg_dump 可能报错 “server version mismatch”，请安装与源库主版本一致的客户端（见插件说明）。`
      warnings.push(w)
      logFn(w)
    }
  }

  let targetInfo = null
  if (target?.host && target?.database) {
    try {
      targetInfo = await queryServerMajor(target)
      logFn(`目标库服务器：${targetInfo.versionLine || ''}（主版本约 ${targetInfo.serverMajor}）`)
      if (
        sourceInfo.serverMajor != null &&
        targetInfo.serverMajor != null &&
        sourceInfo.serverMajor !== targetInfo.serverMajor
      ) {
        const w = `源库主版本（${sourceInfo.serverMajor}）与目标库主版本（${targetInfo.serverMajor}）不同，跨大版本恢复请自行评估兼容性；建议目标库 PostgreSQL 版本不低于源库。`
        warnings.push(w)
        logFn(w)
      }
    } catch (e) {
      warnings.push(`未能连接目标库做版本检测：${e?.message || e}`)
      logFn(warnings[warnings.length - 1])
    }
  }

  return {
    success: true,
    clientVersion: clientInfo.raw,
    clientMajor: clientInfo.major,
    sourceServerMajor: sourceInfo.serverMajor,
    targetServerMajor: targetInfo?.serverMajor ?? null,
    warnings,
  }
}

function runPgDump(source, pgBin, dumpFile, log) {
  const logFn = ensureLog(log)
  const pgDump = resolveTool(pgBin, 'pg_dump')
  const env = { ...process.env, PGPASSWORD: source.password != null ? String(source.password) : '' }
  const args = [
    '-h',
    String(source.host),
    '-p',
    String(source.port || 5432),
    '-U',
    String(source.user),
    '-d',
    String(source.database),
    '-Fc',
    '--no-owner',
    '--no-acl',
    '-f',
    path.resolve(String(dumpFile)),
    '-v',
  ]
  logFn(`执行：${pgDump} ... -f ${args[args.length - 2]}`)
  const out = execFileSyncSafe(pgDump, args, {
    env,
    encoding: 'utf8',
  })
  if (out) logFn(out.slice(-4000))
  return { ok: true }
}

function runPgRestore(target, pgBin, dumpFile, log) {
  const logFn = ensureLog(log)
  const pgRestore = resolveTool(pgBin, 'pg_restore')
  const env = { ...process.env, PGPASSWORD: target.password != null ? String(target.password) : '' }
  const args = [
    '-h',
    String(target.host),
    '-p',
    String(target.port || 5432),
    '-U',
    String(target.user),
    '-d',
    String(target.database),
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-acl',
    '--verbose',
    path.resolve(String(dumpFile)),
  ]
  logFn(`执行：${pgRestore} ... ${args[args.length - 1]}`)
  const out = execFileSyncSafe(pgRestore, args, {
    env,
    encoding: 'utf8',
  })
  if (out) logFn(out.slice(-8000))
  return { ok: true }
}

function runPsqlQuery(target, pgBin, sql, log) {
  const logFn = ensureLog(log)
  const psql = resolveTool(pgBin, 'psql')
  const env = { ...process.env, PGPASSWORD: target.password != null ? String(target.password) : '' }
  const args = [
    '-h',
    String(target.host),
    '-p',
    String(target.port || 5432),
    '-U',
    String(target.user),
    '-d',
    String(target.database),
    '-c',
    sql,
  ]
  const out = execFileSyncSafe(psql, args, {
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  logFn(out.trim())
  return { ok: true, output: out }
}

async function exportDump(payload, log) {
  const logFn = ensureLog(log)
  const { source, pgBin, dumpFile } = payload || {}
  if (!source?.host || !source?.database) {
    return { success: false, message: '请填写源库连接与 dump 路径' }
  }
  const df = dumpFile || defaultDumpPath()
  try {
    runPgDump(source, pgBin, df, logFn)
    logFn('导出完成')
    return { success: true, message: '导出完成', dumpFile: path.resolve(String(df)) }
  } catch (e) {
    const msg = e?.stderr?.toString() || e?.message || String(e)
    logFn(`导出失败：${msg}`)
    return { success: false, message: msg }
  }
}

async function importDump(payload, log) {
  const logFn = ensureLog(log)
  const { target, pgBin, dumpFile } = payload || {}
  if (!target?.host || !target?.database) {
    return { success: false, message: '请填写目标库连接与 dump 路径' }
  }
  const df = dumpFile || defaultDumpPath()
  const abs = path.resolve(String(df))
  if (!fs.existsSync(abs)) {
    return { success: false, message: `找不到 dump 文件：${abs}` }
  }
  try {
    runPgRestore(target, pgBin, abs, logFn)
    logFn('导入完成')
    return { success: true, message: '导入完成' }
  } catch (e) {
    const msg = e?.stderr?.toString() || e?.message || String(e)
    logFn(`导入失败：${msg}`)
    return { success: false, message: msg }
  }
}

async function cleanDump(payload, log) {
  const logFn = ensureLog(log)
  const df = payload?.dumpFile || defaultDumpPath()
  const abs = path.resolve(String(df))
  try {
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs)
      logFn(`已删除：${abs}`)
    } else {
      logFn(`文件不存在，跳过：${abs}`)
    }
    return { success: true, message: '已清理' }
  } catch (e) {
    return { success: false, message: e?.message || String(e) }
  }
}

async function verifyMigrations(payload, log) {
  const logFn = ensureLog(log)
  const { target, pgBin } = payload || {}
  if (!target?.host || !target?.database) {
    return { success: false, message: '请填写目标库连接' }
  }
  try {
    runPsqlQuery(target, pgBin, 'SELECT COUNT(*) AS c FROM django_migrations;', logFn)
    return { success: true, message: '校验查询已执行（见日志）' }
  } catch (e) {
    const msg = e?.stderr?.toString() || e?.message || String(e)
    return { success: false, message: msg }
  }
}

module.exports = {
  testVersions,
  exportDump,
  importDump,
  cleanDump,
  verifyMigrations,
}
