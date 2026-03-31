/**
 * 源数据库 A → 目标数据库 B：在同类库之间复制表结构与数据（非「导出文件」语义）。
 * 支持 MySQL / PostgreSQL / SQLite（文件）。
 * 由主进程从插件目录加载（plugins/<目录名>/db-sync.js），勿移出本插件目录。
 * Copyright (C) 2025 屈想顺. Licensed under AGPL-3.0.
 */
const fs = require('fs')
const path = require('path')

const BATCH = 200

function noopLog() {}

function ensureLog(log) {
  return typeof log === 'function' ? log : noopLog
}

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function isPgArrayType(pgType) {
  return /\[\]\s*$/i.test(String(pgType || '').trim())
}

/** format_type 为 jsonb[] / json[] 等，避免未带上 typcategory 时漏判 */
function isJsonArrayPgType(pgType) {
  const s = String(pgType || '')
  return /\bjsonb?\s*\[\]/i.test(s) || (/\[\]\s*$/i.test(s.trim()) && /json/i.test(s))
}

/**
 * PostgreSQL 一维数组文本：如 text[] / jsonb[] 的 `{"a","b"}`、`{"{\\\"k\\\":1}"}`（见 pg_dump COPY）。
 */
function parsePgArrayText1D(s) {
  const t = s.trim()
  if (!t.startsWith('{') || !t.endsWith('}')) return null
  const inner = t.slice(1, -1)
  if (inner === '') return []
  const elements = []
  let i = 0
  const len = inner.length
  while (i < len) {
    while (i < len && /\s/.test(inner[i])) i++
    if (i >= len) break
    if (inner.slice(i, i + 4).toUpperCase() === 'NULL') {
      const rest = inner.slice(i + 4)
      if (rest === '' || rest[0] === ',' || /\s/.test(rest[0])) {
        elements.push(null)
        i += 4
        while (i < len && inner[i] !== ',') i++
        if (i < len && inner[i] === ',') i++
        continue
      }
    }
    if (inner[i] === '"') {
      i++
      let buf = ''
      while (i < len) {
        if (inner[i] === '"') {
          if (i + 1 < len && inner[i + 1] === '"') {
            buf += '"'
            i += 2
            continue
          }
          elements.push(buf)
          i++
          break
        }
        if (inner[i] === '\\' && i + 1 < len) {
          buf += inner[i + 1]
          i += 2
          continue
        }
        buf += inner[i]
        i++
      }
      while (i < len && inner[i] !== ',') i++
      if (i < len && inner[i] === ',') i++
      continue
    }
    const start = i
    while (i < len && inner[i] !== ',') i++
    elements.push(inner.slice(start, i).trim())
    if (i < len && inner[i] === ',') i++
  }
  return elements
}

/**
 * 数组列（如 jsonb[]、text[]）：必须交给 node-pg 为 JS 数组。
 * - "[...]"：JSON 数组字符串
 * - "{...}"：PostgreSQL 数组字面量（NetBox core_job.log_entries 等）
 * - 若误走标量 json 分支原样插入字符串，会报 malformed array literal
 */
function normalizePgArrayInsert(val, pgType) {
  if (val === undefined || val === null) return null
  if (val === '') return null
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    const s = val.trim()
    const t = (pgType || '').toLowerCase()
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return parsed
      } catch (_) {
        /* fall through */
      }
    }
    if (s.startsWith('{')) {
      try {
        const asJson = JSON.parse(s)
        if (Array.isArray(asJson)) return asJson
        if (asJson !== null && typeof asJson === 'object' && t.includes('json')) {
          return [asJson]
        }
      } catch (_) {
        /* 非整段 JSON：按 PG 数组文本解析 */
      }
      const pgArr = parsePgArrayText1D(s)
      if (pgArr && Array.isArray(pgArr)) {
        if (t.includes('json')) {
          return pgArr.map((el) => {
            if (el == null) return null
            if (typeof el !== 'string') return el
            try {
              return JSON.parse(el)
            } catch {
              return el
            }
          })
        }
        return pgArr
      }
    }
  }
  return val
}

/**
 * @param {string|{ typ: string, typcategory?: string, typname?: string }} meta
 */
function normalizeForPgInsert(val, meta) {
  if (val === undefined) return null
  if (val === null) return null
  const pgType = typeof meta === 'string' ? meta : meta?.typ
  const typcategory = typeof meta === 'string' ? '' : meta?.typcategory || ''
  const typname = typeof meta === 'string' ? '' : meta?.typname || ''
  /** typcategory='A'；typname 如 _jsonb 为数组类型 OID；jsonb[] 等再兜底 */
  const isArrayCol =
    typcategory === 'A' ||
    isPgArrayType(pgType) ||
    isJsonArrayPgType(pgType) ||
    /^_/i.test(String(typname).trim())
  const t = (pgType || '').toLowerCase()

  if (isArrayCol) {
    return normalizePgArrayInsert(val, pgType)
  }

  if (t.includes('json')) {
    if (val === '') return null
    if (typeof val === 'object' && !Buffer.isBuffer(val) && !(val instanceof Date)) {
      return JSON.stringify(val)
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val)
        if (
          Array.isArray(parsed) &&
          (typcategory === 'A' ||
            isPgArrayType(pgType) ||
            isJsonArrayPgType(pgType) ||
            /\[\]/.test(String(pgType || '')) ||
            /^_/i.test(String(typname).trim()))
        ) {
          return parsed
        }
        return val
      } catch {
        return JSON.stringify(val)
      }
    }
  }
  return val
}

function normalizeConn(type, raw) {
  const host = (raw.host || '127.0.0.1').trim()
  let port =
    raw.port != null && raw.port !== ''
      ? Number(raw.port)
      : type === 'postgresql'
        ? 5432
        : type === 'mysql'
          ? 3306
          : null
  if (port != null && Number.isNaN(port)) {
    port = type === 'postgresql' ? 5432 : type === 'mysql' ? 3306 : null
  }
  const user = (raw.user || '').trim()
  const password = raw.password != null ? String(raw.password) : ''
  const database = (raw.database || '').trim()
  const filename = (raw.filename || '').trim()
  return { host, port, user, password, database, filename }
}

async function syncMysql(source, target, log) {
  log = ensureLog(log)
  const mysql = require('mysql2/promise')
  const src = await mysql.createConnection({
    host: source.host,
    port: source.port,
    user: source.user,
    password: source.password,
    database: source.database,
    dateStrings: true,
    multipleStatements: false,
  })
  const dst = await mysql.createConnection({
    host: target.host,
    port: target.port,
    user: target.user,
    password: target.password,
    database: target.database,
    dateStrings: true,
    multipleStatements: false,
  })

  try {
    log(`[${ts()}] MySQL：连接源库与目标库成功`)
    await dst.query('SET FOREIGN_KEY_CHECKS=0')
    await dst.query('SET UNIQUE_CHECKS=0')
    const [tables] = await src.query('SHOW TABLES')
    if (!tables.length) {
      log(`[${ts()}] MySQL：源库无用户表`)
      return { success: true, message: '源库无用户表', tables: 0, rows: 0 }
    }
    const key = Object.keys(tables[0])[0]
    const names = tables.map((r) => r[key]).filter((n) => n && !n.startsWith('mysql'))
    log(`[${ts()}] MySQL：待同步表 ${names.length} 张`)
    let totalRows = 0

    for (const table of names) {
      const t = `\`${table.replace(/`/g, '``')}\``
      log(`[${ts()}] MySQL：处理表 ${table}`)
      await dst.query(`DROP TABLE IF EXISTS ${t}`)
      const [createRows] = await src.query(`SHOW CREATE TABLE ${t}`)
      const createSql = createRows[0]['Create Table']
      await dst.query(createSql)

      const [rows] = await src.query(`SELECT * FROM ${t}`)
      if (!rows.length) {
        log(`[${ts()}] MySQL：表 ${table} 无数据行`)
        continue
      }

      const cols = Object.keys(rows[0])
      const colList = cols.map((c) => `\`${c.replace(/`/g, '``')}\``).join(',')
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH)
        const values = chunk.map((row) => cols.map((c) => row[c]))
        await dst.query(`INSERT INTO ${t} (${colList}) VALUES ?`, [values])
        totalRows += chunk.length
      }
      log(`[${ts()}] MySQL：表 ${table} 已写入 ${rows.length} 行`)
    }

    await dst.query('SET FOREIGN_KEY_CHECKS=1')
    await dst.query('SET UNIQUE_CHECKS=1')
    log(`[${ts()}] MySQL：同步完成`)
    return {
      success: true,
      message: `已同步 ${names.length} 张表，约 ${totalRows} 行数据`,
      tables: names.length,
      rows: totalRows,
    }
  } finally {
    await src.end().catch(() => {})
    await dst.end().catch(() => {})
  }
}

async function syncPostgresql(source, target, log) {
  log = ensureLog(log)
  const { Client } = require('pg')
  const src = new Client({
    host: source.host,
    port: source.port,
    user: source.user,
    password: source.password,
    database: source.database,
    ssl: false,
  })
  const dst = new Client({
    host: target.host,
    port: target.port,
    user: target.user,
    password: target.password,
    database: target.database,
    ssl: false,
  })
  await src.connect()
  await dst.connect()
  log(`[${ts()}] PostgreSQL：连接源库与目标库成功`)

  try {
    const { rows: tableRows } = await src.query(`
      SELECT c.relname AS tablename
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.oid
    `)
    const names = tableRows.map((r) => r.tablename)
    if (!names.length) {
      log(`[${ts()}] PostgreSQL：源库 public 下无表`)
      return { success: true, message: '源库 public 下无表', tables: 0, rows: 0 }
    }

    log(`[${ts()}] PostgreSQL：待同步表 ${names.length} 张`)
    await dst.query('SET session_replication_role = replica')
    await dst.query('DROP SCHEMA IF EXISTS public CASCADE')
    await dst.query('CREATE SCHEMA public')
    await dst.query('GRANT ALL ON SCHEMA public TO public')

    let totalRows = 0
    for (const table of names) {
      const safe = table.replace(/"/g, '""')
      const tq = `"${safe}"`
      log(`[${ts()}] PostgreSQL：处理表 ${table}`)

      const { rows: colRows } = await src.query(
        `
        SELECT a.attname AS col,
               pg_catalog.format_type(a.atttypid, a.atttypmod) AS typ,
               COALESCE(t.typcategory, '') AS typcategory,
               t.typname AS typname
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_type t ON t.oid = a.atttypid
        WHERE n.nspname = 'public' AND c.relname = $1
          AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY a.attnum
        `,
        [table]
      )

      if (!colRows.length) continue

      const colDefs = colRows.map((c) => `"${String(c.col).replace(/"/g, '""')}" ${c.typ}`).join(', ')
      await dst.query(`CREATE TABLE ${tq} (${colDefs})`)

      const { rows: data } = await src.query(`SELECT * FROM ${tq}`)
      if (!data.length) {
        log(`[${ts()}] PostgreSQL：表 ${table} 无数据行`)
        continue
      }

      const cols = colRows.map((c) => c.col)
      const metaByCol = {}
      for (const cr of colRows) {
        metaByCol[cr.col] = {
          typ: cr.typ,
          typcategory: cr.typcategory,
          typname: cr.typname,
        }
      }
      const colList = cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
      let rowIdx = 0
      for (const row of data) {
        rowIdx += 1
        const vals = cols.map((c) => normalizeForPgInsert(row[c], metaByCol[c]))
        const ph = vals.map((_, i) => `$${i + 1}`).join(',')
        try {
          await dst.query(`INSERT INTO ${tq} (${colList}) VALUES (${ph})`, vals)
        } catch (e) {
          log(`[${ts()}] PostgreSQL：表 ${table} 第 ${rowIdx} 行插入失败：${e.message || e}`)
          throw e
        }
        totalRows += 1
      }
      log(`[${ts()}] PostgreSQL：表 ${table} 已写入 ${data.length} 行`)
    }

    await dst.query('SET session_replication_role = DEFAULT')
    log(`[${ts()}] PostgreSQL：同步完成`)
    return {
      success: true,
      message: `已同步 ${names.length} 张表，${totalRows} 行数据`,
      tables: names.length,
      rows: totalRows,
    }
  } finally {
    await src.end().catch(() => {})
    await dst.end().catch(() => {})
  }
}

async function syncSqlite(source, target, log) {
  log = ensureLog(log)
  const initSqlJs = require('sql.js')
  const sqlJsRoot = path.dirname(require.resolve('sql.js/package.json'))
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsRoot, 'dist', file),
  })

  if (!source.filename || !target.filename) {
    return { success: false, message: 'SQLite 需填写源与目标的文件路径' }
  }
  if (!fs.existsSync(source.filename)) {
    return { success: false, message: '源 SQLite 文件不存在' }
  }

  log(`[${ts()}] SQLite：读取源文件 ${source.filename}`)
  const srcBuf = fs.readFileSync(source.filename)
  const srcDb = new SQL.Database(srcBuf)

  const targetDir = path.dirname(target.filename)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  if (fs.existsSync(target.filename)) {
    fs.unlinkSync(target.filename)
  }
  const dstDb = new SQL.Database()

  try {
    const meta = srcDb.exec(
      `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    const metaRow = meta && meta[0]
    if (!metaRow || !metaRow.values || !metaRow.values.length) {
      log(`[${ts()}] SQLite：源库无用户表`)
      return { success: true, message: '源库无用户表', tables: 0, rows: 0 }
    }

    let totalRows = 0
    const names = metaRow.values.map((row) => row[0])
    const sqls = metaRow.values.map((row) => row[1])

    log(`[${ts()}] SQLite：待同步表 ${names.length} 张`)
    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      const createSql = sqls[i]
      const safeName = name.replace(/"/g, '""')
      log(`[${ts()}] SQLite：处理表 ${name}`)
      if (createSql) dstDb.run(createSql)

      const dataRes = srcDb.exec(`SELECT * FROM "${safeName}"`)
      const block = dataRes && dataRes[0]
      if (!block || !block.values || !block.values.length) continue

      const colNames = block.columns
      for (const vals of block.values) {
        const placeholders = colNames.map(() => '?').join(',')
        const colList = colNames.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
        dstDb.run(
          `INSERT INTO "${safeName}" (${colList}) VALUES (${placeholders})`,
          vals
        )
        totalRows += 1
      }
      log(`[${ts()}] SQLite：表 ${name} 已写入 ${block.values.length} 行`)
    }

    const data = dstDb.export()
    fs.writeFileSync(target.filename, Buffer.from(data))
    log(`[${ts()}] SQLite：已写入目标文件 ${target.filename}，同步完成`)
    return {
      success: true,
      message: `已同步 ${names.length} 张表，${totalRows} 行数据`,
      tables: names.length,
      rows: totalRows,
    }
  } finally {
    srcDb.close()
    dstDb.close()
  }
}

/**
 * @param {{ source: object, target: object }} payload
 * @param {function(string)?} log 主进程通过第二参数传入，用于推送执行日志
 * source/target: { type: 'mysql'|'postgresql'|'sqlite', host?, port?, user?, password?, database?, filename? }
 */
async function syncDatabases(payload, log) {
  const logFn = ensureLog(log)
  const st = payload?.source?.type
  const tt = payload?.target?.type
  if (!st || !tt) {
    return { success: false, message: '请指定源与目标数据库类型' }
  }
  if (st !== tt) {
    return { success: false, message: '当前仅支持相同类型的数据库之间同步（如 MySQL → MySQL）' }
  }

  const source = normalizeConn(st, payload.source)
  const target = normalizeConn(tt, payload.target)

  try {
    logFn(`[${ts()}] 开始同步：类型 ${st}`)
    if (st === 'sqlite') {
      return await syncSqlite(source, target, logFn)
    }
    if (st === 'mysql') {
      if (!source.database || !target.database) {
        return { success: false, message: '请填写源与目标的数据库名' }
      }
      return await syncMysql(source, target, logFn)
    }
    if (st === 'postgresql') {
      if (!source.database || !target.database) {
        return { success: false, message: '请填写源与目标的数据库名' }
      }
      return await syncPostgresql(source, target, logFn)
    }
    return { success: false, message: `不支持的数据库类型: ${st}` }
  } catch (e) {
    const msg = e?.message || String(e)
    logFn(`[${ts()}] 同步失败：${msg}`)
    return { success: false, message: msg }
  }
}

async function inspectMysql(conn) {
  const mysql = require('mysql2/promise')
  const c = await mysql.createConnection({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    dateStrings: true,
  })
  try {
    const [[{ v: version }]] = await c.query('SELECT VERSION() AS v')
    const [[{ db: database }]] = await c.query('SELECT DATABASE() AS db')
    const [[{ cnt }]] = await c.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type='BASE TABLE'`
    )
    let charset = ''
    let collation = ''
    try {
      const [[charsetRow]] = await c.query(
        `SELECT DEFAULT_CHARACTER_SET_NAME AS charset, DEFAULT_COLLATION_NAME AS collation FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = DATABASE()`
      )
      charset = charsetRow?.charset || ''
      collation = charsetRow?.collation || ''
    } catch (_) {}
    return {
      engine: 'MySQL',
      version: String(version),
      database: database || conn.database,
      host: `${conn.host}:${conn.port}`,
      user: conn.user,
      publicTables: Number(cnt),
      charset,
      collation,
    }
  } finally {
    await c.end().catch(() => {})
  }
}

async function inspectPostgresql(conn) {
  const { Client } = require('pg')
  const c = new Client({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    ssl: false,
  })
  await c.connect()
  try {
    const { rows: vr } = await c.query('SELECT version() AS v')
    const { rows: dr } = await c.query('SELECT current_database() AS n, current_user AS u')
    const { rows: tr } = await c.query(
      `SELECT count(*)::int AS c FROM pg_tables WHERE schemaname = 'public'`
    )
    const { rows: sr } = await c.query(
      `SELECT pg_size_pretty(pg_database_size(current_database())) AS s, pg_database_size(current_database())::bigint AS b`
    )
    return {
      engine: 'PostgreSQL',
      version: String(vr[0]?.v || '').split('\n')[0].trim(),
      database: dr[0]?.n || conn.database,
      user: dr[0]?.u || conn.user,
      host: `${conn.host}:${conn.port}`,
      publicTables: tr[0]?.c ?? 0,
      databaseSize: sr[0]?.s || '',
      databaseSizeBytes: sr[0]?.b != null ? String(sr[0].b) : '',
    }
  } finally {
    await c.end().catch(() => {})
  }
}

async function inspectSqlite(conn) {
  if (!conn.filename) {
    throw new Error('请填写 SQLite 文件路径')
  }
  if (!fs.existsSync(conn.filename)) {
    throw new Error('SQLite 文件不存在')
  }
  const initSqlJs = require('sql.js')
  const sqlJsRoot = path.dirname(require.resolve('sql.js/package.json'))
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsRoot, 'dist', file),
  })
  const buf = fs.readFileSync(conn.filename)
  const st = fs.statSync(conn.filename)
  const db = new SQL.Database(buf)
  try {
    const r = db.exec(
      `SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    )
    const cnt = r && r[0] && r[0].values && r[0].values[0] ? r[0].values[0][0] : 0
    return {
      engine: 'SQLite',
      file: conn.filename,
      fileBytes: st.size,
      userTables: Number(cnt),
    }
  } finally {
    db.close()
  }
}

/**
 * 根据已填连接信息探测库版本、表数量等（不执行同步）。
 * @param {{ type: string, side?: string } & object} payload 与单端连接字段同 sync（含 type）
 */
async function inspectConnection(payload) {
  const type = payload?.type
  if (!type) {
    return { success: false, message: '请指定数据库类型' }
  }
  const raw = { ...payload }
  delete raw.type
  delete raw.side
  const conn = normalizeConn(type, raw)

  try {
    if (type === 'sqlite') {
      if (!conn.filename) {
        return { success: false, message: '请填写数据库文件路径' }
      }
      const info = await inspectSqlite(conn)
      return { success: true, side: payload.side || '', info }
    }
    if (type === 'mysql') {
      if (!conn.database) {
        return { success: false, message: '请填写数据库名' }
      }
      const info = await inspectMysql(conn)
      return { success: true, side: payload.side || '', info }
    }
    if (type === 'postgresql') {
      if (!conn.database) {
        return { success: false, message: '请填写数据库名' }
      }
      const info = await inspectPostgresql(conn)
      return { success: true, side: payload.side || '', info }
    }
    return { success: false, message: `不支持的数据库类型: ${type}` }
  } catch (e) {
    return { success: false, message: e?.message || String(e) }
  }
}

module.exports = { syncDatabases, inspectConnection }
