import {
  CHECKIN_RESULT_STATUS,
  type CheckinDiagnostics,
  type CheckinResult,
  type CheckinResultStatus,
} from "./types.js"

function formatDiagnostics(diag: CheckinDiagnostics): string {
  const parts: string[] = []
  if (typeof diag.statusCode === "number") parts.push(`status=${diag.statusCode}`)

  const headers = diag.headers ?? {}
  for (const [key, value] of Object.entries(headers)) {
    parts.push(`${key}=${JSON.stringify(value)}`)
  }

  if (diag.bodySnippet) parts.push(`body=${JSON.stringify(diag.bodySnippet)}`)
  return parts.join(" ")
}

export function printReport(results: CheckinResult[]): number {
  const counts: Record<CheckinResultStatus, number> = {
    success: 0,
    already_checked: 0,
    failed: 0,
    skipped: 0,
  }

  for (const result of results) {
    counts[result.status] += 1
  }

  console.log(`Processed ${results.length} account(s)`)
  console.log(
    `success=${counts.success} already_checked=${counts.already_checked} failed=${counts.failed} skipped=${counts.skipped}`,
  )

  for (const result of results) {
    console.log(
      `[${result.status}] ${result.accountName} (${result.siteType}) - ${result.message}`,
    )
    if (
      result.diagnostics &&
      result.status !== CHECKIN_RESULT_STATUS.SUCCESS &&
      result.status !== CHECKIN_RESULT_STATUS.ALREADY_CHECKED
    ) {
      const formatted = formatDiagnostics(result.diagnostics)
      if (formatted) console.log(`  diag: ${formatted}`)
    }
  }

  return counts.failed > 0 ? 1 : 0
}

export function buildSkippedResult(
  accountName: string,
  siteType: string,
  reason: string,
): CheckinResult {
  return {
    accountName,
    siteType: siteType as CheckinResult["siteType"],
    status: CHECKIN_RESULT_STATUS.SKIPPED,
    message: reason,
    reasonCode: reason,
  }
}
