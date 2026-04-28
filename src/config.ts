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
const ACCOUNT_MANIFEST_ENV = "AUTO_CHECKIN_ACCOUNT_MANIFEST"
const SLOT_ENV_PREFIX = "AUTO_CHECKIN_SLOT_"

const accountManifestSchema = z.array(z.string().trim().min(1)).min(1)

function readAccountConfigEntriesFromManifest(): Array<[string, string]> {
  const rawManifest = process.env[ACCOUNT_MANIFEST_ENV]
  if (typeof rawManifest !== "string" || rawManifest.trim().length === 0) {
    throw new Error(`${ACCOUNT_MANIFEST_ENV} environment variable is required`)
  }

  let parsedManifest: unknown
  try {
    parsedManifest = JSON.parse(rawManifest)
  } catch (error) {
    throw new Error(
      `${ACCOUNT_MANIFEST_ENV} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const manifestResult = accountManifestSchema.safeParse(parsedManifest)
  if (!manifestResult.success) {
    throw new Error(
      manifestResult.error.issues.map((issue) => issue.message).join("; "),
    )
  }

  const entries: Array<[string, string]> = []
  const seenSlots = new Set<string>()

  for (const slotSuffix of manifestResult.data) {
    const normalizedSlot = slotSuffix.trim()
    if (seenSlots.has(normalizedSlot)) {
      throw new Error(
        `${ACCOUNT_MANIFEST_ENV} contains duplicate slot suffix: ${normalizedSlot}`,
      )
    }
    seenSlots.add(normalizedSlot)

    const envName = `${SLOT_ENV_PREFIX}${normalizedSlot}`
    const rawValue = process.env[envName]
    if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
      throw new Error(
        `${ACCOUNT_MANIFEST_ENV} references missing or empty environment variable: ${envName}`,
      )
    }

    entries.push([envName, rawValue.trim()])
  }

  return entries
}

function parseAccountConfigValue(envName: string, raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(
      `${envName} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export function loadAccountsFromEnv(): AccountConfig[] {
  const parsedAccounts = readAccountConfigEntriesFromManifest().map(([envName, raw]) =>
    parseAccountConfigValue(envName, raw),
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
