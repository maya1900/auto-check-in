import {
  CHECKIN_RESULT_STATUS,
  type CheckinResult,
  type CheckinResultStatus,
} from "./types.js"

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
  }

  return 0
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
