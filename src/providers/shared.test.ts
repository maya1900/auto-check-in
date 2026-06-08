import { describe, expect, it } from "vitest"

import { HttpRequestError } from "../http/client.js"
import { CHECKIN_RESULT_STATUS } from "../types.js"
import { resolveErrorResult } from "./shared.js"

describe("resolveErrorResult", () => {
  it("classifies already checked messages", () => {
    expect(
      resolveErrorResult({
        accountName: "main",
        siteType: "new-api",
        error: new Error("今天已经签到"),
      }),
    ).toMatchObject({
      status: CHECKIN_RESULT_STATUS.ALREADY_CHECKED,
      reasonCode: "already_checked",
    })
  })

  it("classifies Cloudflare body text as skipped without logging it as diagnostics", () => {
    expect(
      resolveErrorResult({
        accountName: "main",
        siteType: "new-api",
        error: new HttpRequestError(
          "HTTP 403",
          { statusCode: 403 },
          "Just a moment... cloudflare",
        ),
        manualCheckinUrl: "https://example.com",
      }),
    ).toMatchObject({
      status: CHECKIN_RESULT_STATUS.SKIPPED,
      reasonCode: "cloudflare_protected",
      message: "需要人工签到，请打开站点处理: https://example.com",
      manualCheckinUrl: "https://example.com",
      diagnostics: { statusCode: 403 },
    })
  })
})
