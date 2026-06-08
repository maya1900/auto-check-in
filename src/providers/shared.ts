import { HttpRequestError } from "../http/client.js"
import {
  CHECKIN_RESULT_STATUS,
  type CheckinDiagnostics,
  type CheckinResult,
} from "../types.js"

const ALREADY_CHECKED_SNIPPETS = ["今天已经签到", "已经签到", "已签到", "already"]
const CLOUDFLARE_CHALLENGE_SNIPPETS = [
  "just a moment...",
  "enable javascript and cookies to continue",
  "challenges.cloudflare.com",
  "cf-challenge",
  "cf-turnstile",
]
const TURNSTILE_SNIPPETS = [
  "turnstile token 为空",
  "turnstile token empty",
  "missing turnstile",
  "turnstile",
]

function buildManualCheckinMessage(manualCheckinUrl?: string): string {
  const base = "需要人工签到，请打开站点处理"
  return manualCheckinUrl ? `${base}: ${manualCheckinUrl}` : base
}

export function normalizeMessage(message: unknown): string {
  return typeof message === "string" ? message.trim() : ""
}

export function isAlreadyCheckedMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return ALREADY_CHECKED_SNIPPETS.some((snippet) =>
    normalized.includes(snippet.toLowerCase()),
  )
}

export function classifySkippableMessage(
  message: string,
  manualCheckinUrl?: string,
):
  | { reasonCode: string; message: string }
  | undefined {
  const normalized = message.toLowerCase()

  if (CLOUDFLARE_CHALLENGE_SNIPPETS.some((snippet) => normalized.includes(snippet))) {
    return {
      reasonCode: "cloudflare_protected",
      message: buildManualCheckinMessage(manualCheckinUrl),
    }
  }

  if (TURNSTILE_SNIPPETS.some((snippet) => normalized.includes(snippet))) {
    return {
      reasonCode: "turnstile_required",
      message: buildManualCheckinMessage(manualCheckinUrl),
    }
  }

  if (normalized.includes("challenge")) {
    return {
      reasonCode: "challenge_required",
      message: buildManualCheckinMessage(manualCheckinUrl),
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
  manualCheckinUrl?: string
}): CheckinResult {
  const message = (() => {
    if (typeof params.error === "string") return params.error
    if (params.error instanceof Error) return params.error.message
    return String(params.error)
  })()

  const diagnostics: CheckinDiagnostics | undefined =
    params.error instanceof HttpRequestError ? params.error.diagnostics : undefined
  const classificationText =
    params.error instanceof HttpRequestError ? params.error.classificationText : undefined

  if (message && isAlreadyCheckedMessage(message)) {
    return buildResult({
      accountName: params.accountName,
      siteType: params.siteType,
      status: CHECKIN_RESULT_STATUS.ALREADY_CHECKED,
      message,
      reasonCode: "already_checked",
      diagnostics,
    })
  }

  const haystack = [message, classificationText]
    .filter(Boolean)
    .join(" ")
  const skippable = haystack
    ? classifySkippableMessage(haystack, params.manualCheckinUrl)
    : undefined
  if (skippable) {
    return buildResult({
      accountName: params.accountName,
      siteType: params.siteType,
      status: CHECKIN_RESULT_STATUS.SKIPPED,
      message: skippable.message,
      reasonCode: skippable.reasonCode,
      manualCheckinUrl: params.manualCheckinUrl,
      diagnostics,
    })
  }

  return buildResult({
    accountName: params.accountName,
    siteType: params.siteType,
    status: CHECKIN_RESULT_STATUS.FAILED,
    message: message || "Unknown error",
    reasonCode: "request_failed",
    diagnostics,
  })
}
