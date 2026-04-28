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
const CONFIG_PREFIX = "AUTO_CHECKIN_CONFIG_"
const ACCOUNT_MANIFEST_ENV = "AUTO_CHECKIN_ACCOUNT_MANIFEST"

const accountManifestSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1),
      envName: z.string().trim().min(1),
    }),
  )
  .min(1)

function readAccountConfigEntriesFromEnv(): Array<[string, string]> {
  const entries: Array<[string, string]> = []

  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith(CONFIG_PREFIX) || typeof value !== "string") {
      continue
    }

    const trimmed = value.trim()
    if (trimmed.length === 0) {
      continue
    }

    entries.push([name, trimmed])
  }

  entries.sort(([left], [right]) => left.localeCompare(right))

  if (entries.length === 0) {
    throw new Error(`At least one ${CONFIG_PREFIX}* environment variable is required`)
  }

  return entries
}

function readAccountConfigEntriesFromManifest(): Array<[string, string]> | null {
  const rawManifest = process.env[ACCOUNT_MANIFEST_ENV]
  if (typeof rawManifest !== "string" || rawManifest.trim().length === 0) {
    return null
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
  const seenIds = new Set<string>()
  const seenEnvNames = new Set<string>()

  for (const entry of manifestResult.data) {
    if (seenIds.has(entry.id)) {
      throw new Error(`${ACCOUNT_MANIFEST_ENV} contains duplicate account id: ${entry.id}`)
    }
    seenIds.add(entry.id)

    if (seenEnvNames.has(entry.envName)) {
      throw new Error(
        `${ACCOUNT_MANIFEST_ENV} contains duplicate envName: ${entry.envName}`,
      )
    }
    seenEnvNames.add(entry.envName)

    const rawValue = process.env[entry.envName]
    if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
      throw new Error(
        `${ACCOUNT_MANIFEST_ENV} references missing or empty environment variable: ${entry.envName}`,
      )
    }

    entries.push([entry.envName, rawValue.trim()])
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
  const entries = readAccountConfigEntriesFromManifest() ?? readAccountConfigEntriesFromEnv()
  const parsedAccounts = entries.map(([envName, raw]) => parseAccountConfigValue(envName, raw))

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
