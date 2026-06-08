import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { loadAccountsFromEnv } from "./config.js"

function writeAccountsConfig(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "auto-check-in-"))
  const path = join(dir, "accounts.yaml")
  writeFileSync(path, contents)
  return path
}

describe("loadAccountsFromEnv", () => {
  it("loads new-api accounts from yaml and direct env token", () => {
    const configPath = writeAccountsConfig(`
accounts:
  - name: main
    baseUrl: https://example.com/
    tokenEnv: NEW_API_TOKEN_MAIN
`)

    expect(
      loadAccountsFromEnv({
        configPath,
        env: { NEW_API_TOKEN_MAIN: " token-value " },
      }),
    ).toEqual([
      {
        name: "main",
        siteType: "new-api",
        baseUrl: "https://example.com",
        authType: "token",
        accessToken: "token-value",
        enabled: true,
      },
    ])
  })

  it("loads tokens from GitHub secrets json fallback", () => {
    const configPath = writeAccountsConfig(`
accounts:
  - name: secondary
    baseUrl: https://secondary.example
    tokenEnv: NEW_API_TOKEN_SECONDARY
    enabled: false
`)

    const accounts = loadAccountsFromEnv({
      configPath,
      env: {
        AUTO_CHECKIN_SECRET_VALUES_JSON: JSON.stringify({
          NEW_API_TOKEN_SECONDARY: "secret-token",
        }),
      },
    })

    expect(accounts[0]?.accessToken).toBe("secret-token")
    expect(accounts[0]?.enabled).toBe(false)
  })

  it("rejects duplicate account names and missing tokens", () => {
    const duplicateConfigPath = writeAccountsConfig(`
accounts:
  - name: duplicated
    baseUrl: https://a.example
    tokenEnv: NEW_API_TOKEN_A
  - name: duplicated
    baseUrl: https://b.example
    tokenEnv: NEW_API_TOKEN_B
`)

    expect(() =>
      loadAccountsFromEnv({
        configPath: duplicateConfigPath,
        env: { NEW_API_TOKEN_A: "a", NEW_API_TOKEN_B: "b" },
      }),
    ).toThrow("Duplicate account name")

    const missingTokenConfigPath = writeAccountsConfig(`
accounts:
  - name: missing
    baseUrl: https://missing.example
    tokenEnv: NEW_API_TOKEN_MISSING
`)

    expect(() => loadAccountsFromEnv({ configPath: missingTokenConfigPath, env: {} }))
      .toThrow("Missing token for account missing")
  })
})
