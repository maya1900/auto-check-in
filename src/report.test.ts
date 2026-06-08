import { describe, expect, it, vi } from "vitest"

import { CHECKIN_RESULT_STATUS, type CheckinResult } from "./types.js"
import { printReport } from "./report.js"

describe("printReport", () => {
  it("returns non-zero only when failed results exist", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined)
    const results: CheckinResult[] = [
      {
        accountName: "ok",
        siteType: "new-api",
        status: CHECKIN_RESULT_STATUS.SUCCESS,
        message: "ok",
      },
      {
        accountName: "bad",
        siteType: "new-api",
        status: CHECKIN_RESULT_STATUS.FAILED,
        message: "bad",
        diagnostics: { statusCode: 500, timeoutMs: 60_000 },
      },
    ]

    expect(printReport(results)).toBe(1)
    expect(log).toHaveBeenCalledWith(
      "success=1 already_checked=0 failed=1 skipped=0",
    )
    expect(log).toHaveBeenCalledWith("  diag: status=500 timeoutMs=60000")

    log.mockRestore()
  })
})
