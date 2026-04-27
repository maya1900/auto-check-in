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

先设置 `AUTO_CHECKIN_ACCOUNT_NAMES`，它是一个逗号分隔的账号 key 列表；然后为每个账号 key 配置一组对应的环境变量。

示例：

```bash
export AUTO_CHECKIN_ACCOUNT_NAMES=acc1,acc2

export AUTO_CHECKIN_ACC1_NAME=main-account
export AUTO_CHECKIN_ACC1_SITE_TYPE=new-api
export AUTO_CHECKIN_ACC1_BASE_URL=https://example.com
export AUTO_CHECKIN_ACC1_AUTH_TYPE=token
export AUTO_CHECKIN_ACC1_USER_ID=123
export AUTO_CHECKIN_ACC1_ACCESS_TOKEN=your-token
export AUTO_CHECKIN_ACC1_ENABLED=true

export AUTO_CHECKIN_ACC2_NAME=backup-account
export AUTO_CHECKIN_ACC2_SITE_TYPE=new-api
export AUTO_CHECKIN_ACC2_BASE_URL=https://example2.com
export AUTO_CHECKIN_ACC2_AUTH_TYPE=cookie
export AUTO_CHECKIN_ACC2_COOKIE='session=your-cookie'
```

### 账号环境变量说明

如果账号 key 是 `acc1`，则可使用下面这些变量：

- `AUTO_CHECKIN_ACC1_NAME`：可选，日志中展示的账号名，默认回退为 `acc1`
- `AUTO_CHECKIN_ACC1_SITE_TYPE`：必须为 `new-api`
- `AUTO_CHECKIN_ACC1_BASE_URL`：站点根地址
- `AUTO_CHECKIN_ACC1_AUTH_TYPE`：`token` 或 `cookie`
- `AUTO_CHECKIN_ACC1_USER_ID`：可选；某些站点需要兼容用户 ID 请求头时可配置
- `AUTO_CHECKIN_ACC1_ACCESS_TOKEN`：当 `AUTH_TYPE=token` 时必填
- `AUTO_CHECKIN_ACC1_COOKIE`：当 `AUTH_TYPE=cookie` 时必填
- `AUTO_CHECKIN_ACC1_ENABLED`：可选；只能填 `true` 或 `false`，默认是 `true`

后续如果想继续加账号：
1. 把新账号 key 追加到 `AUTO_CHECKIN_ACCOUNT_NAMES`
2. 新增对应的 `AUTO_CHECKIN_<KEY>_*` 环境变量和 secrets

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
- 失败时可选发送 Telegram 通知

### 必需的 GitHub Variables

请在仓库的 Variables 中添加：

- `AUTO_CHECKIN_ACCOUNT_NAMES`
- `AUTO_CHECKIN_ACC1_NAME`
- `AUTO_CHECKIN_ACC1_SITE_TYPE`
- `AUTO_CHECKIN_ACC1_BASE_URL`
- `AUTO_CHECKIN_ACC1_AUTH_TYPE`
- `AUTO_CHECKIN_ACC1_USER_ID`
- `AUTO_CHECKIN_ACC1_ENABLED`
- `AUTO_CHECKIN_ACC2_NAME`
- `AUTO_CHECKIN_ACC2_SITE_TYPE`
- `AUTO_CHECKIN_ACC2_BASE_URL`
- `AUTO_CHECKIN_ACC2_AUTH_TYPE`
- `AUTO_CHECKIN_ACC2_USER_ID`
- `AUTO_CHECKIN_ACC2_ENABLED`

如果暂时只用一个账号，可以先把 `acc2` 这一组变量留空，等需要时再补。

### 必需的 GitHub Secrets

按每个账号的认证方式添加 secrets：

- `AUTO_CHECKIN_ACC1_ACCESS_TOKEN`
- `AUTO_CHECKIN_ACC1_COOKIE`
- `AUTO_CHECKIN_ACC2_ACCESS_TOKEN`
- `AUTO_CHECKIN_ACC2_COOKIE`

说明：
- 如果使用 `token` 认证，就填写 `ACCESS_TOKEN`，`COOKIE` 留空
- 如果使用 `cookie` 认证，就填写 `COOKIE`，`ACCESS_TOKEN` 留空

### 双账号配置示例

- `AUTO_CHECKIN_ACCOUNT_NAMES=acc1,acc2`
- `AUTO_CHECKIN_ACC1_SITE_TYPE=new-api`
- `AUTO_CHECKIN_ACC1_BASE_URL=https://example.com`
- `AUTO_CHECKIN_ACC1_AUTH_TYPE=token`
- `AUTO_CHECKIN_ACC2_SITE_TYPE=new-api`
- `AUTO_CHECKIN_ACC2_BASE_URL=https://example2.com`
- `AUTO_CHECKIN_ACC2_AUTH_TYPE=cookie`

以后如果要新增 `acc3`：
1. 把 `AUTO_CHECKIN_ACCOUNT_NAMES` 改成 `acc1,acc2,acc3`
2. 新增 `AUTO_CHECKIN_ACC3_*` Variables
3. 新增 `AUTO_CHECKIN_ACC3_ACCESS_TOKEN` 或 `AUTO_CHECKIN_ACC3_COOKIE` Secrets
4. 复制 `.github/workflows/daily-checkin.yml` 里的 `acc2` 环境变量块，改名为 `acc3`

### 可选的 Telegram Secrets

如果要在失败时收到 Telegram 通知，请额外添加：

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

当工作流执行失败时，GitHub Actions 发送的消息会包含：
- 仓库名
- 分支名
- run 编号
- 失败运行的直达链接

## 说明

这个项目刻意保持极简。它复用了上游 `new-api` 签到思路，但不打算移植浏览器扩展那一整套架构。
