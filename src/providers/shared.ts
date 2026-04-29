import { CHECKIN_RESULT_STATUS, type CheckinResult } from "../types.js"

const ALREADY_CHECKED_SNIPPETS = ["今天已经签到", "已经签到", "已签到", "already"]
const CLOUDFLARE_SNIPPETS = [
  "just a moment...",
  "enable javascript and cookies to continue",
  "challenges.cloudflare.com",
  "cloudflare",
]
const TURNSTILE_SNIPPETS = ["turnstile token 为空", "turnstile"]

export function normalizeMessage(message: unknown): string {
  return typeof message === "string" ? message.trim() : ""
}

export function isAlreadyCheckedMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return ALREADY_CHECKED_SNIPPETS.some((snippet) =>
    normalized.includes(snippet.toLowerCase()),
  )
}

function classifySkippableMessage(message: string):
  | { reasonCode: string; message: string }
  | undefined {
  const normalized = message.toLowerCase()

  if (CLOUDFLARE_SNIPPETS.some((snippet) => normalized.includes(snippet))) {
    return {
      reasonCode: "cloudflare_protected",
      message: "Cloudflare challenge required",
    }
  }

  if (TURNSTILE_SNIPPETS.some((snippet) => normalized.includes(snippet))) {
    return {
      reasonCode: "turnstile_required",
      message: "Turnstile token required",
    }
  }
}

export function buildResult(result: CheckinResult): CheckinResult {
  return result
}

export function resolveErrorResult(params: {
  accountName: string
  siteType: CheckinResult["siteType"]
  error: unknown
}): CheckinResult {
  const message = (() => {
    if (typeof params.error === "string") return params.error
    if (params.error instanceof Error) return params.error.message
    return String(params.error)
  })()

  if (message && isAlreadyCheckedMessage(message)) {
    return buildResult({
      accountName: params.accountName,
      siteType: params.siteType,
      status: CHECKIN_RESULT_STATUS.ALREADY_CHECKED,
      message,
      reasonCode: "already_checked",
    })
  }

  const skippable = message ? classifySkippableMessage(message) : undefined
  if (skippable) {
    return buildResult({
      accountName: params.accountName,
      siteType: params.siteType,
      status: CHECKIN_RESULT_STATUS.SKIPPED,
      message: skippable.message,
      reasonCode: skippable.reasonCode,
    })
  }

  return buildResult({
    accountName: params.accountName,
    siteType: params.siteType,
    status: CHECKIN_RESULT_STATUS.FAILED,
    message: message || "Unknown error",
    reasonCode: "request_failed",
  })
}
