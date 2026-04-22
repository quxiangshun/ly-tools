# NetBox 数据库远程同步：从 A 到 B（pg_dump / pg_restore）

Copyright (C) 2025 屈想顺. Licensed under AGPL-3.0.

本文档说明：**在栾媛小工具「数据库同步」插件之外**，如何用 PostgreSQL 官方客户端做 **A → B 的完整逻辑备份与恢复**，适合 **NetBox** 等对**约束、索引、序列、扩展**与 **pg_dump 语义**一致的场景。

> **图形界面**：仓库内 **「PgSQL 备份恢复」** 插件（`plugins-ext/PgSQL数据库同步/`，`manifest.id`：`pgsql-sync`）在桌面版中调用本机 `pg_dump` / `pg_restore`，并提供 **版本检测**（客户端主版本低于源库时会提示可能同步失败）。构建：`npm run build:plugins -- PgSQL数据库同步`。

> **安全**：请勿在聊天、截图、仓库中粘贴真实 **密码**。下文用占位符 `A_PASS` / `B_PASS`；生产环境建议用 **`.pgpass`** 文件或环境变量，并限制文件权限。

---

## 与本插件内置同步的差异

栾媛小工具插件内的 **PostgreSQL 同步**（`db-sync.js`）为**简化实现**，仅：

- 扫描 **`public`** 下**普通表**（`relkind = 'r'`）；
- 用列名 + `format_type` 生成**不含**主键、外键、默认值、`CHECK`、**索引**、**触发器**、**序列** 等的 `CREATE TABLE`；
- 再逐行 `INSERT` 数据。

因此可能出现：

- 与 **Django / NetBox** 期望的库结构不一致（迁移、约束、自增序列等）；
- 某些复杂类型或边界行曾需专门处理（插件会持续改进，但**不等价于** `pg_dump`）。

若你发现 **「始终缺数据」**、迁移报错、或序列/约束异常，**请改用本节官方工具链**做一次性全库迁移或灾备。

---

## 一、仅安装客户端（不装 PostgreSQL 服务）

在**你的电脑**上安装 **`pg_dump` / `pg_restore` / `psql`** 即可，无需安装完整数据库服务。

### Windows（常用）

**方法 1：官方安装包（推荐）**

1. 打开：<https://www.enterprisedb.com/downloads/postgres-postgresql-downloads>  
2. 选择 **Windows** → 版本 **15/16** → 下载 **installer**  
3. 安装时**只勾选** **Command Line Tools**；**取消** PostgreSQL Server、pgAdmin、Stack Builder 等  
4. 将 **`bin`** 加入 **PATH**（示例）：  
   `C:\Program Files\PostgreSQL\16\bin`  
5. **新开**终端验证：

```bat
pg_dump --version
psql --version
```

**方法 2：zip 绿色版**

- 在 EDB 或 PostgreSQL 官网下载 **Windows x86_64 binaries**，解压后把 **`bin`** 加入 **PATH**。

### macOS

```bash
brew install libpq
brew link --force libpq
pg_dump --version
```

（或使用 [Postgres.app](https://postgresapp.com) 自带的客户端。）

### Linux（Ubuntu/Debian）

```bash
sudo apt update
sudo apt install -y postgresql-client
```

### Linux（RHEL/CentOS/Rocky 等）

使用发行版或 [PostgreSQL 官方 YUM/DNF 仓库](https://www.postgresql.org/download/linux/) 安装 **`postgresql16-client`**（版本号按需选择）。

---

## 二、客户端版本建议

- 本地 **`pg_dump` 主版本 ≥ 源库/目标库服务器主版本** 更稳妥（例如服务器为 17，客户端尽量用 **17 客户端**；若只有 16 客户端，多数场景仍可用，遇格式问题再升级客户端）。
- 若提示版本不兼容，请安装与服务器主版本一致的 **client**。

---

## 三、网络与权限

- **防火墙**：确保你的电脑到 **A、B 的 5432**（或实际端口）**可访问**。  
- **权限**：  
  - **重建库**通常需要 **超级用户**或具有 **`CREATEDB`** 的账号（示例中用 **`postgres`** 连到维护库 **`postgres`**）。  
  - **`pg_dump` A** 需对 A 库有读权限；**`pg_restore` 到 B** 需对 B 库有写权限（或先建空库再由 owner 恢复）。

---

## 四、推荐流程（自定义格式 + 管道或落盘）

### 4.1 在 B 上重建空库（示例）

以下用 **占位符**；请替换为真实 IP、用户、密码。**勿**把密码提交到 Git。

**Linux / macOS**（`psql` 连接串）：

```bash
export PGPASSWORD='B_SUPER_PASS'
psql -h B_IP -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'netbox' AND pid <> pg_backend_pid();
"
psql -h B_IP -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS netbox;"
psql -h B_IP -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE netbox OWNER netbox;"
unset PGPASSWORD
```

说明：若 B 上 **`netbox` 用户** 与 **库 owner** 与你们环境不一致，请按实际 DBA 要求修改 `OWNER`、`GRANT`。

### 4.2 A → B：自定义格式 + 压缩（推荐两段式，便于排错）

#### 先导出到文件（可重复执行 `pg_restore`）

**Linux / macOS**（`bash`）：

```bash
export PGPASSWORD='A_PASS'
pg_dump -h A_IP -p 5432 -U netbox -d netbox -F c -Z 6 -f netbox.dump
unset PGPASSWORD
```

**Windows CMD**（`cmd.exe`）：密码用环境变量 **`set`**，**等号两侧不要加空格**；同一窗口内先 `set` 再执行 `pg_dump`。

```bat
set PGPASSWORD=A_PASS
pg_dump -h 10.8.182.49 -p 5432 -U netbox -d netbox -F c -Z 6 -f netbox.dump
set PGPASSWORD=
```

最后一行 `set PGPASSWORD=` 表示清空该变量，避免密码残留在当前会话（可选但建议）。

**Windows PowerShell**：

```powershell
$env:PGPASSWORD = "A_PASS"
pg_dump -h 10.8.182.49 -p 5432 -U netbox -d netbox -F c -Z 6 -f netbox.dump
Remove-Item Env:PGPASSWORD
```

将 `A_PASS`、`10.8.182.49` 换成你的实际密码与源库地址。

#### 再恢复到 B

目标库上常用 **超级用户**（如 **`postgres`**）执行 `pg_restore`，与源库用 **`netbox` 做 `pg_dump` 可以不同**；配合 **`--no-owner --no-acl`** 时，对象属主会按目标库默认规则创建，一般与 NetBox 迁移场景兼容。

**Linux / macOS**：

```bash
export PGPASSWORD='B_SUPER_PASS'
pg_restore -h B_IP -p 5432 -U postgres -d netbox --no-owner --no-acl -v netbox.dump
unset PGPASSWORD
```

**Windows CMD**（常见正确写法：先 `set PGPASSWORD`，再 `pg_restore`）：

```bat
set PGPASSWORD=B_SUPER_PASS
pg_restore -h 10.12.31.205 -p 5432 -U postgres -d netbox --no-owner --no-acl -v netbox.dump
set PGPASSWORD=
```

将 `B_SUPER_PASS`、`10.12.31.205` 换成目标机 **postgres**（或你实际使用的还原账号）的密码与 B 库地址。若目标库只允许 **`netbox`** 连接，则把 **`-U postgres`** 改为 **`-U netbox`**，并使用该用户的密码。

**Windows PowerShell**：

```powershell
$env:PGPASSWORD = "B_SUPER_PASS"
pg_restore -h 10.12.31.205 -p 5432 -U postgres -d netbox --no-owner --no-acl -v netbox.dump
Remove-Item Env:PGPASSWORD
```

- **`--no-owner --no-acl`**：在目标机用户与源不完全相同时常用；若需完全一致 owner/ACL，去掉这两项并确保 B 上角色存在。  
- 若对象已存在报错，可先对 B **清空库**再执行（见 **4.1**），或使用 `pg_restore --clean`（需谨慎）。

### 4.3 一行管道（Linux / macOS；PowerShell 可自行试）

```bash
export PGPASSWORD='A_PASS'
pg_dump -h A_IP -p 5432 -U netbox -d netbox -F c -Z 6 | \
  PGPASSWORD='B_PASS' pg_restore -h B_IP -p 5432 -U netbox -d netbox --no-owner --no-acl -v
unset PGPASSWORD
```

**Windows CMD** 对管道与 `PGPASSWORD` 组合较别扭，**优先用 4.2 两段式**（`set PGPASSWORD=…` + `pg_dump` / `pg_restore`）。

---

## 五、常见问题

| 现象 | 可能原因 |
|------|----------|
| 命令找不到 | **PATH** 未包含 `pg_dump` 所在 `bin` |
| 连接超时 | 防火墙/安全组未放行 **你的 IP → 服务器:5432** |
| `password authentication failed` | 用户或密码错误；或 **`.pgpass` / 环境变量** 未配置 |
| `version mismatch` | 升级本地 **client** 与服务器主版本对齐 |
| `pg_restore` 部分失败 | 目标已有对象冲突 → 先 **DROP DATABASE** 重建空库再恢复，或加 `--clean`（慎用） |

---

## 六、与栾媛小工具「数据库同步」插件如何配合

- **日常小表、同结构库**：可在工具内用插件做 **MySQL / SQLite / 简单 PG** 表级同步。  
- **NetBox 全库、生产迁移、必须对齐 Django 迁移与约束**：**优先使用本文 `pg_dump` / `pg_restore`**。

插件目录内 **[开发说明.md](./开发说明.md) §9** 说明了插件在 PostgreSQL 上的**能力边界**。

---

## 相关链接

- PostgreSQL 文档：[pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)、[pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)  
- NetBox 官方对数据库的要求以 **当前 NetBox 文档** 为准（版本升级时请先阅读发行说明）。
