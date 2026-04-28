# auto-check-in

一个面向 `new-api` 兼容站点的极简独立每日自动签到 CLI。

## 功能说明

- 通过环境变量读取账号配置
- 对每个已配置的 `new-api` 账号执行每日签到
- 在标准输出中打印简洁的执行结果摘要
- 只要任一账号失败就以状态码 `1` 退出，方便 GitHub Actions 发现失败并告警

## 当前支持

v1 当前支持：
- `new-api`

v1 暂不包含：
- 浏览器扩展专用的调度 / 运行时 / 存储逻辑
- Turnstile / 浏览器辅助签到流程
- 重试队列或状态持久化

## 环境要求

- Node.js 20+
- pnpm 9+

## 安装

```bash
pnpm install
```

## 配置方式

程序支持两种账号加载方式：

1. **直接扫描环境变量**：读取所有以 `AUTO_CHECKIN_CONFIG_` 开头的变量
2. **显式清单模式**：读取 `AUTO_CHECKIN_ACCOUNT_MANIFEST` 指定的账号变量列表

每个账号变量的值都必须是一个完整的账号配置 JSON。

### 直接扫描模式

这是本地最简单的用法。程序会自动扫描所有以 `AUTO_CHECKIN_CONFIG_` 开头的环境变量。

示例：

```bash
export AUTO_CHECKIN_CONFIG_ACC1='{"name":"main-account","siteType":"new-api","baseUrl":"https://example.com","authType":"token","userId":123,"accessToken":"your-token","enabled":true}'

export AUTO_CHECKIN_CONFIG_ACC2='{"name":"backup-account","siteType":"new-api","baseUrl":"https://example2.com","authType":"cookie","cookie":"session=your-cookie","enabled":true}'
```

### 显式清单模式

如果设置了 `AUTO_CHECKIN_ACCOUNT_MANIFEST`，程序会只加载清单里列出的账号，并按清单顺序执行。

示例：

```bash
export AUTO_CHECKIN_ACCOUNT_MANIFEST='[
  {"id":"main","envName":"AUTO_CHECKIN_CONFIG_MAIN"},
  {"id":"backup","envName":"AUTO_CHECKIN_CONFIG_BACKUP"}
]'

export AUTO_CHECKIN_CONFIG_MAIN='{"name":"main-account","siteType":"new-api","baseUrl":"https://example.com","authType":"token","userId":123,"accessToken":"your-token","enabled":true}'

export AUTO_CHECKIN_CONFIG_BACKUP='{"name":"backup-account","siteType":"new-api","baseUrl":"https://example2.com","authType":"cookie","cookie":"session=your-cookie","enabled":true}'
```

在这种模式下：
- `id` 用于标识清单项，并要求唯一
- `envName` 是实际存放账号 JSON 的环境变量名
- 如果某个 `envName` 缺失、为空或重复，程序会直接报错

### 单个账号配置字段说明

每个 `AUTO_CHECKIN_CONFIG_*` 的 JSON 支持这些字段：

- `name`：日志中展示的账号名
- `siteType`：必须为 `new-api`
- `baseUrl`：站点根地址
- `authType`：`token` 或 `cookie`
- `userId`：可选；某些站点需要兼容用户 ID 请求头时可配置
- `accessToken`：当 `authType=token` 时必填
- `cookie`：当 `authType=cookie` 时必填
- `enabled`：可选，默认是 `true`

示例 JSON：

```json
{
  "name": "main-account",
  "siteType": "new-api",
  "baseUrl": "https://example.com",
  "authType": "token",
  "userId": 123,
  "accessToken": "your-token",
  "enabled": true
}
```

后续如果想继续加账号：
1. 新增一个 `AUTO_CHECKIN_CONFIG_ACC3`
2. 把该变量值设为完整账号 JSON

## 本地使用

类型检查：

```bash
pnpm typecheck
```

构建：

```bash
pnpm build
```

运行：

```bash
pnpm checkin
```

开发模式：

```bash
pnpm dev
```

## 输出行为

CLI 会输出：
- 本次处理的账号数量
- `success` / `already_checked` / `failed` / `skipped` 汇总
- 每个账号一行结果

退出码规则：
- 没有失败：`0`
- 只要存在失败账号：`1`

## GitHub Actions

本仓库内置了定时工作流：

- `.github/workflows/daily-checkin.yml`

当前支持：
- 每日定时运行
- 手动 `workflow_dispatch`
- 成功或失败后都可选发送 Telegram 最终统计通知

### 默认定时

默认 cron 为：

```yaml
17 1 * * *
```

工作流里同时设置了：

- `TZ: Asia/Shanghai`

也就是说，默认会按上海时区每日执行一次。

### 自定义定时

如果你想改成自己的执行时间，直接修改：

- `.github/workflows/daily-checkin.yml`

把这一段里的 cron 改掉即可：

```yaml
on:
  schedule:
    - cron: "17 1 * * *"
  workflow_dispatch:
```

例如：
- `0 0 * * *`：每天 08:00（Asia/Shanghai）
- `30 1 * * *`：每天 09:30（Asia/Shanghai）

GitHub Actions 的 `schedule` 不能从 secret 动态读取，所以这里最简单可靠的方式就是直接改 workflow 文件。

### 必需的 GitHub Secrets / Variables

请在仓库的 **Secrets and variables → Actions** 中配置：

#### Repository Variable

- `AUTO_CHECKIN_ACCOUNT_MANIFEST`

值为 JSON 数组，每项指定一个用户可读的账号 ID 和它绑定的 slot：

```json
[
  { "id": "main", "slot": "01" },
  { "id": "backup", "slot": "02" },
  { "id": "ciallo", "slot": "03" }
]
```

规则：
- `id` 由你自定义，用来表示这个账号
- `slot` 对应 workflow 里预留的 secret 槽位
- 每个 `id` 和 `slot` 都必须唯一

#### Repository Secrets

每个 slot 对应一个独立 secret，secret 值为完整账号 JSON。

当前 workflow 预留了这些 slot：

- `AUTO_CHECKIN_SLOT_01`
- `AUTO_CHECKIN_SLOT_02`
- `AUTO_CHECKIN_SLOT_03`
- `AUTO_CHECKIN_SLOT_04`
- `AUTO_CHECKIN_SLOT_05`
- `AUTO_CHECKIN_SLOT_06`
- `AUTO_CHECKIN_SLOT_07`
- `AUTO_CHECKIN_SLOT_08`
- `AUTO_CHECKIN_SLOT_09`
- `AUTO_CHECKIN_SLOT_10`
- `AUTO_CHECKIN_SLOT_11`
- `AUTO_CHECKIN_SLOT_12`
- `AUTO_CHECKIN_SLOT_13`
- `AUTO_CHECKIN_SLOT_14`
- `AUTO_CHECKIN_SLOT_15`
- `AUTO_CHECKIN_SLOT_16`
- `AUTO_CHECKIN_SLOT_17`
- `AUTO_CHECKIN_SLOT_18`
- `AUTO_CHECKIN_SLOT_19`
- `AUTO_CHECKIN_SLOT_20`

例如：

`AUTO_CHECKIN_SLOT_01`:

```json
{
  "name": "main-account",
  "siteType": "new-api",
  "baseUrl": "https://example.com",
  "authType": "token",
  "userId": 123,
  "accessToken": "your-token",
  "enabled": true
}
```

`AUTO_CHECKIN_SLOT_02`:

```json
{
  "name": "backup-account",
  "siteType": "new-api",
  "baseUrl": "https://example2.com",
  "authType": "cookie",
  "cookie": "session=your-cookie",
  "enabled": true
}
```

以后如果要新增账号：
1. 选一个空闲 slot，例如 `04`
2. 新增或编辑对应 secret，例如 `AUTO_CHECKIN_SLOT_04`
3. 把 `{ "id": "your-name", "slot": "04" }` 加进 `AUTO_CHECKIN_ACCOUNT_MANIFEST`
4. 不需要修改 workflow 文件

如果 20 个 slot 不够，再扩容 workflow 里的 slot 列表即可。

### 可选的 Telegram Secrets

如果要收到 Telegram 通知，请额外添加：

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

获取方式：

1. 用 `@BotFather` 创建一个 bot，并拿到 bot token
2. 把这个 bot 拉进目标聊天或群组
3. 获取 chat id
   - 如果是私聊，先给 bot 发一条消息
   - 然后打开：
     `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - 在返回结果里找到数字形式的 `chat.id`

当工作流执行结束后，只要配置了 Telegram secrets，就会发送一条最终通知。消息会包含：
- 成功 / 失败状态
- 仓库名
- 分支名
- run 编号
- 该次运行的直达链接
- 本次签到的最终统计与账号结果摘要

## 说明

这个项目刻意保持极简。它复用了上游 `new-api` 签到思路，但不打算移植浏览器扩展那一整套架构。
