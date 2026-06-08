import { describe, expect, it, vi } from "vitest"

import type { AccountConfig } from "../types.js"
import { CHECKIN_RESULT_STATUS } from "../types.js"
import { newApiProvider } from "./new-api.js"

const account: AccountConfig = {
  name: "main",
  siteType: "new-api",
  baseUrl: "https://example.com",
  authType: "token",
  accessToken: "token",
  enabled: true,
}

describe("newApiProvider", () => {
  it("skips Turnstile-protected check-ins with a manual site link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, message: "Turnstile token 为空" }),
          { status: 200 },
        ),
      ),
    )

    await expect(newApiProvider.checkIn(account)).resolves.toMatchObject({
      status: CHECKIN_RESULT_STATUS.SKIPPED,
      reasonCode: "turnstile_required",
      message: "需要人工签到，请打开站点处理: https://example.com",
      manualCheckinUrl: "https://example.com",
    })

    vi.unstubAllGlobals()
  })
})
