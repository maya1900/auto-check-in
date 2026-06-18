# auto-check-in

一个面向 `new-api` 兼容站点的极简每日自动签到 CLI。

## 功能说明

- 从 `accounts.yaml` 读取要签到的站点配置
- 从环境变量或 GitHub Secrets 读取每个站点的 token
- 对每个已配置的 `new-api` 站点执行每日签到
- 输出简洁的执行摘要，并保留真实成功 / 失败 / 跳过统计
- 默认 HTTP 超时为 60 秒，避免单个站点卡住整个流程

## 当前支持

v1 当前只支持：

- `new-api`
- token 鉴权

v1 暂不包含：

- cookie 鉴权
- 其他站点类型
- 浏览器扩展专用的调度 / 运行时 / 存储逻辑
- Turnstile / 浏览器辅助签到流程
- 重试队列或状态持久化

遇到 Cloudflare / Turnstile / 其他浏览器挑战时，CLI 会尽量识别并标记为 `skipped`。

## 环境要求

- Node.js 20+
- pnpm 9+

## 安装

```bash
pnpm install
```

## 配置方式

项目使用一个可提交的配置文件管理站点地址，用 Secret 管理 token。

复制示例文件：

```bash
cp accounts.example.yaml accounts.yaml
```

编辑 `accounts.yaml`：

```yaml
accounts:
  - name: site-a
    baseUrl: https://site-a.example
    userId: 123
    tokenEnv: NEW_API_TOKEN_SITE_A

  - name: site-b
    baseUrl: https://site-b.example
    tokenEnv: NEW_API_TOKEN_SITE_B
```

字段说明：

- `name`：日志中显示的账号名，必须唯一
- `baseUrl`：new-api 站点根地址
- `userId`：可选；个别站点要求 `New-Api-User` 相关请求头时填写
- `tokenEnv`：token 对应的环境变量名 / GitHub Secret 名
- `enabled`：可选，设为 `false` 时跳过该账号

本地运行时，设置对应环境变量：

```bash
export NEW_API_TOKEN_SITE_A='your-token'
export NEW_API_TOKEN_SITE_B='your-token'
pnpm build
pnpm checkin
```

新增、删除或修改账号时，只需要改：

- `accounts.yaml` 里的站点条目
- 对应的 GitHub Secret token 值

不需要改代码，也不需要改 workflow。

## 本地使用

类型检查：

```bash
pnpm typecheck
```

测试：

```bash
pnpm test
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
- 对失败或跳过账号输出安全诊断信息

退出码规则：

- 单个账号即使请求失败，也不会中断后续账号执行
- 只要存在 `failed` 账号，进程最终返回 `1`
- `skipped` 账号会保留在最终统计里，但不会单独导致进程失败

在 GitHub Actions 里，默认工作流会吞掉签到步骤的非零退出码，避免因为单个站点失败持续触发仓库失败邮件；真实签到状态仍然通过日志和 Telegram 摘要里的统计展示。

## 安全诊断日志

失败诊断默认只打印：

- HTTP 状态码
- 少量安全响应头，例如 `server`、`content-type`、`cf-ray`
- 超时时间

响应 body 不会打印到日志里，避免把站点返回的敏感内容带进 GitHub Actions 日志或 Telegram 摘要。程序仍会在内存里使用短文本片段识别 Cloudflare / Turnstile 等挑战类型。

## GitHub Actions

本仓库内置定时工作流：

- `.github/workflows/daily-checkin.yml`

当前支持：

- 每日定时运行
- 手动 `workflow_dispatch`
- 工作流始终跑完整体流程，不因单个账号失败中断
- Telegram 根据签到摘要中的 `failed=` 统计展示成功或失败

### 默认定时与随机等待

默认工作流会在北京时间每天 08:55 启动：

```yaml
schedule:
  - cron: "55 8 * * *"
    timezone: "Asia/Shanghai"
```

定时触发时，工作流会在执行签到前随机选择当天 `09:00:00` 到 `09:10:00` 之间的一个目标时间，并等待到该时间再开始签到。例如今天可能是 09:03:42，明天可能是 09:08:11。

手动 `workflow_dispatch` 触发时不会等待随机时间，会立即执行，便于测试。

### 自定义定时

如果你想改成自己的执行时间，直接修改：

- `.github/workflows/daily-checkin.yml`

把这一段里的 cron 改掉即可：

```yaml
on:
  schedule:
    - cron: "55 8 * * *"
      timezone: "Asia/Shanghai"
  workflow_dispatch:
```

例如：

- `0 8 * * *` + `timezone: "Asia/Shanghai"`：每天 08:00
- `30 9 * * *` + `timezone: "Asia/Shanghai"`：每天 09:30

### 必需的 GitHub Secrets

请在仓库的 **Secrets and variables -> Actions** 中配置每个 token。

如果 `accounts.yaml` 是：

```yaml
accounts:
  - name: site-a
    baseUrl: https://site-a.example
    tokenEnv: NEW_API_TOKEN_SITE_A
```

那么需要新增一个 Repository Secret：

```text
NEW_API_TOKEN_SITE_A=your-token
```

工作流会把 GitHub Secrets 作为 JSON 传给签到程序，程序只读取 `accounts.yaml` 中声明的 `tokenEnv`。这些值不会输出到日志。

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

这个项目刻意保持极简。它复用了 `new-api` 的签到接口思路，但不移植浏览器扩展那一整套架构。
