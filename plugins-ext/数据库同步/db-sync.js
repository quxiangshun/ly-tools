/**
 * 源数据库 A → 目标数据库 B：在同类库之间复制表结构与数据（非「导出文件」语义）。
 * 支持 MySQL / PostgreSQL / SQLite（文件）。
 * 由主进程从插件目录加载（plugins/<目录名>/db-sync.js），勿移出本插件目录。
 * Copyright (C) 2025 屈想顺. Licensed under AGPL-3.0.
 */
const fs = require('fs')
const path = require('path')

const BATCH = 200

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

async function syncMysql(source, target) {
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
    await dst.query('SET FOREIGN_KEY_CHECKS=0')
    await dst.query('SET UNIQUE_CHECKS=0')
    const [tables] = await src.query('SHOW TABLES')
    if (!tables.length) {
      return { success: true, message: '源库无用户表', tables: 0, rows: 0 }
    }
    const key = Object.keys(tables[0])[0]
    const names = tables.map((r) => r[key]).filter((n) => n && !n.startsWith('mysql'))
    let totalRows = 0

    for (const table of names) {
      const t = `\`${table.replace(/`/g, '``')}\``
      await dst.query(`DROP TABLE IF EXISTS ${t}`)
      const [createRows] = await src.query(`SHOW CREATE TABLE ${t}`)
      const createSql = createRows[0]['Create Table']
      await dst.query(createSql)

      const [rows] = await src.query(`SELECT * FROM ${t}`)
      if (!rows.length) continue

      const cols = Object.keys(rows[0])
      const colList = cols.map((c) => `\`${c.replace(/`/g, '``')}\``).join(',')
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH)
        const values = chunk.map((row) => cols.map((c) => row[c]))
        await dst.query(`INSERT INTO ${t} (${colList}) VALUES ?`, [values])
        totalRows += chunk.length
      }
    }

    await dst.query('SET FOREIGN_KEY_CHECKS=1')
    await dst.query('SET UNIQUE_CHECKS=1')
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

async function syncPostgresql(source, target) {
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
      return { success: true, message: '源库 public 下无表', tables: 0, rows: 0 }
    }

    await dst.query('SET session_replication_role = replica')
    await dst.query('DROP SCHEMA IF EXISTS public CASCADE')
    await dst.query('CREATE SCHEMA public')
    await dst.query('GRANT ALL ON SCHEMA public TO public')

    let totalRows = 0
    for (const table of names) {
      const safe = table.replace(/"/g, '""')
      const tq = `"${safe}"`

      const { rows: colRows } = await src.query(
        `
        SELECT a.attname AS col,
               pg_catalog.format_type(a.atttypid, a.atttypmod) AS typ
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
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
      if (!data.length) continue

      const cols = colRows.map((c) => c.col)
      const colList = cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
      for (const row of data) {
        const vals = cols.map((c) => row[c])
        const ph = vals.map((_, i) => `$${i + 1}`).join(',')
        await dst.query(`INSERT INTO ${tq} (${colList}) VALUES (${ph})`, vals)
        totalRows += 1
      }
    }

    await dst.query('SET session_replication_role = DEFAULT')
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

async function syncSqlite(source, target) {
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
      return { success: true, message: '源库无用户表', tables: 0, rows: 0 }
    }

    let totalRows = 0
    const names = metaRow.values.map((row) => row[0])
    const sqls = metaRow.values.map((row) => row[1])

    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      const createSql = sqls[i]
      const safeName = name.replace(/"/g, '""')
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
    }

    const data = dstDb.export()
    fs.writeFileSync(target.filename, Buffer.from(data))
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
 * source/target: { type: 'mysql'|'postgresql'|'sqlite', host?, port?, user?, password?, database?, filename? }
 */
async function syncDatabases(payload) {
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

  if (st === 'sqlite') {
    return syncSqlite(source, target)
  }
  if (st === 'mysql') {
    if (!source.database || !target.database) {
      return { success: false, message: '请填写源与目标的数据库名' }
    }
    return syncMysql(source, target)
  }
  if (st === 'postgresql') {
    if (!source.database || !target.database) {
      return { success: false, message: '请填写源与目标的数据库名' }
    }
    return syncPostgresql(source, target)
  }
  return { success: false, message: `不支持的数据库类型: ${st}` }
}

module.exports = { syncDatabases }
