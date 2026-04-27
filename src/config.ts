import { z } from "zod"

import { AUTH_TYPES, SITE_TYPES, type AccountConfig } from "./types.js"

const accountSchema = z
  .object({
    name: z.string().trim().min(1),
    siteType: z.enum([SITE_TYPES.NEW_API, SITE_TYPES.SUB2API]),
    baseUrl: z.url(),
    authType: z.enum([AUTH_TYPES.TOKEN, AUTH_TYPES.COOKIE]),
    userId: z.number().int().positive().optional(),
    accessToken: z.string().trim().min(1).optional(),
    cookie: z.string().trim().min(1).optional(),
    enabled: z.boolean().optional(),
  })
  .superRefine((account, ctx) => {
    if (account.authType === AUTH_TYPES.TOKEN && !account.accessToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Account ${account.name} requires accessToken for token auth`,
      })
    }

    if (account.authType === AUTH_TYPES.COOKIE && !account.cookie) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Account ${account.name} requires cookie for cookie auth`,
      })
    }
  })

const accountsSchema = z.array(accountSchema).min(1)

function readEnv(name: string): string | undefined {
  const value = process.env[name]
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readAccountNamesFromEnv(): string[] {
  const raw = readEnv("AUTO_CHECKIN_ACCOUNT_NAMES")

  if (!raw) {
    throw new Error("AUTO_CHECKIN_ACCOUNT_NAMES is required")
  }

  const names = raw
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0)

  if (names.length === 0) {
    throw new Error("AUTO_CHECKIN_ACCOUNT_NAMES must contain at least one account name")
  }

  return names
}

function parseUserId(value: string | undefined, accountKey: string): number | undefined {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Account ${accountKey} has invalid AUTO_CHECKIN_${accountKey.toUpperCase()}_USER_ID`)
  }

  return parsed
}

function parseEnabled(value: string | undefined, accountKey: string): boolean | undefined {
  if (!value) {
    return undefined
  }

  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  throw new Error(`Account ${accountKey} has invalid AUTO_CHECKIN_${accountKey.toUpperCase()}_ENABLED`)
}

function readAccountFromPrefixedEnv(accountKey: string): Omit<AccountConfig, "enabled"> & {
  enabled?: boolean
} {
  const prefix = `AUTO_CHECKIN_${accountKey.toUpperCase()}_`
  const name = readEnv(`${prefix}NAME`) ?? accountKey

  return {
    name,
    siteType: readEnv(`${prefix}SITE_TYPE`) as AccountConfig["siteType"],
    baseUrl: readEnv(`${prefix}BASE_URL`) ?? "",
    authType: readEnv(`${prefix}AUTH_TYPE`) as AccountConfig["authType"],
    userId: parseUserId(readEnv(`${prefix}USER_ID`), accountKey),
    accessToken: readEnv(`${prefix}ACCESS_TOKEN`),
    cookie: readEnv(`${prefix}COOKIE`),
    enabled: parseEnabled(readEnv(`${prefix}ENABLED`), accountKey),
  }
}

export function loadAccountsFromEnv(): AccountConfig[] {
  const parsedAccounts = readAccountNamesFromEnv().map((accountKey) =>
    readAccountFromPrefixedEnv(accountKey),
  )

  const result = accountsSchema.safeParse(parsedAccounts)
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join("; "))
  }

  return result.data.map((account) => ({
    ...account,
    enabled: account.enabled ?? true,
    baseUrl: account.baseUrl.replace(/\/+$/, ""),
  }))
}
