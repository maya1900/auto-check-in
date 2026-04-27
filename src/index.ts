import { loadAccountsFromEnv } from "./config.js"
import { providers } from "./providers/index.js"
import { buildSkippedResult, printReport } from "./report.js"
import type { CheckinResult } from "./types.js"

async function main() {
  const accounts = loadAccountsFromEnv()
  const results: CheckinResult[] = []

  for (const account of accounts) {
    if (!account.enabled) {
      results.push(
        buildSkippedResult(account.name, account.siteType, "account_disabled"),
      )
      continue
    }

    const provider = providers[account.siteType]
    if (!provider) {
      results.push(
        buildSkippedResult(account.name, account.siteType, "no_provider"),
      )
      continue
    }

    const eligibility = provider.canCheckIn(account)
    if (!eligibility.ok) {
      results.push(
        buildSkippedResult(
          account.name,
          account.siteType,
          eligibility.reason ?? "not_eligible",
        ),
      )
      continue
    }

    results.push(await provider.checkIn(account))
  }

  process.exitCode = printReport(results)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
