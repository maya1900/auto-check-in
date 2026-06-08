import { describe, expect, it, vi } from "vitest"

import { HttpRequestError, postJson } from "./client.js"
import type { AccountConfig } from "../types.js"

const account: AccountConfig = {
  name: "main",
  siteType: "new-api",
  baseUrl: "https://example.com",
  authType: "token",
  accessToken: "token",
  enabled: true,
}

describe("postJson", () => {
  it("sets auth headers and returns parsed json", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: "ok" }), {
        status: 200,
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(postJson(account, "/api/user/checkin")).resolves.toEqual({
      success: true,
      message: "ok",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/user/checkin",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        }),
      }),
    )

    vi.unstubAllGlobals()
  })

  it("keeps response body out of safe diagnostics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response("<html>secret body</html>", {
            status: 403,
            headers: {
              server: "cloudflare",
              "content-type": "text/html",
            },
          }),
        ),
      ),
    )

    await expect(postJson(account, "/blocked")).rejects.toMatchObject({
      diagnostics: {
        statusCode: 403,
        headers: {
          server: "cloudflare",
          "content-type": "text/html",
        },
      },
    })

    try {
      await postJson(account, "/blocked")
    } catch (error) {
      expect(error).toBeInstanceOf(HttpRequestError)
      expect((error as HttpRequestError).diagnostics).not.toHaveProperty("bodySnippet")
      expect((error as HttpRequestError).classificationText).toContain("secret body")
    }

    vi.unstubAllGlobals()
  })

  it("aborts requests after the configured timeout", async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted")))
        }),
      ),
    )

    const assertion = expect(postJson(account, "/slow", {}, 10)).rejects.toMatchObject({
      message: "Request timed out after 10ms",
      diagnostics: { timeoutMs: 10 },
    })
    await vi.advanceTimersByTimeAsync(10)

    await assertion

    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
})
