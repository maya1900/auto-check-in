# auto-check-in

A minimal standalone daily auto check-in CLI for `new-api` compatible sites.

## What it does

- Reads account configuration from one environment variable: `AUTO_CHECKIN_ACCOUNTS`
- Executes daily check-in for each configured `new-api` account
- Prints a concise summary to stdout
- Exits with code `1` if any account fails, so GitHub Actions can alert on failures

## Supported site types

Current v1 support:
- `new-api`

Not included in v1:
- browser-extension-only scheduling/runtime/storage logic
- Turnstile/browser-assisted flows
- retry queue/state persistence

## Requirements

- Node.js 20+
- pnpm 9+

## Install

```bash
pnpm install
```

## Configuration

Set `AUTO_CHECKIN_ACCOUNTS` to a JSON array.

Example:

```bash
export AUTO_CHECKIN_ACCOUNTS='[
  {
    "name": "example-newapi",
    "siteType": "new-api",
    "baseUrl": "https://example.com",
    "authType": "token",
    "userId": 123,
    "accessToken": "your-token"
  }
]'
```

### Account fields

- `name`: display name used in logs
- `siteType`: must be `new-api`
- `baseUrl`: site base URL
- `authType`: `token` or `cookie`
- `userId`: optional, but useful for sites that require user-id compatibility headers
- `accessToken`: required when `authType=token`
- `cookie`: required when `authType=cookie`
- `enabled`: optional, defaults to `true`

## Local usage

Typecheck:

```bash
pnpm typecheck
```

Build:

```bash
pnpm build
```

Run:

```bash
pnpm checkin
```

Development mode:

```bash
pnpm dev
```

## Output behavior

The CLI prints:
- processed account count
- `success` / `already_checked` / `failed` / `skipped` totals
- one line per account

Exit code rules:
- no failures: `0`
- any failed account: `1`

## GitHub Actions

This repo includes a scheduled workflow at:

- `.github/workflows/daily-checkin.yml`

It supports:
- daily scheduled run
- manual `workflow_dispatch`
- Telegram failure notification when configured

### Required GitHub secret

Add this repository secret:

- `AUTO_CHECKIN_ACCOUNTS`

Its value should be the same JSON array shown above.

### Optional Telegram secrets

To enable failure notifications, add these repository secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

You can get them like this:

1. Create a bot with `@BotFather` and copy the bot token
2. Add the bot to your target chat or group
3. Get the chat id
   - for a private chat, send the bot a message first
   - then open:
     `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - find the numeric `chat.id`

When a workflow run fails, GitHub Actions will send a message containing:
- repository
- branch
- run number
- direct link to the failed run

## Notes

This project is intentionally minimal. It reuses the upstream `new-api` check-in idea, but does not try to port the browser extension architecture.
