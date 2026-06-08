import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { parse as parseYaml } from "yaml"
import { z } from "zod"

import { AUTH_TYPES, SITE_TYPES, type AccountConfig } from "./types.js"

const DEFAULT_ACCOUNTS_FILE = "accounts.yaml"
const ACCOUNTS_FILE_ENV = "NEW_API_ACCOUNTS_FILE"
const SECRET_VALUES_ENV = "AUTO_CHECKIN_SECRET_VALUES_JSON"

const accountEntrySchema = z.object({
  name: z.string().trim().min(1),
  baseUrl: z.url(),
  userId: z.number().int().positive().optional(),
  tokenEnv: z
    .string()
    .trim()
    .min(1)
    .regex(/^[A-Z_][A-Z0-9_]*$/, "tokenEnv must be an environment variable name"),
  enabled: z.boolean().optional(),
})

const accountsFileSchema = z
  .object({
    accounts: z.array(accountEntrySchema).min(1),
  })
  .superRefine((config, ctx) => {
    const seenNames = new Set<string>()

    for (const [index, account] of config.accounts.entries()) {
      if (seenNames.has(account.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["accounts", index, "name"],
          message: `Duplicate account name: ${account.name}`,
        })
      }
      seenNames.add(account.name)
    }
  })

type AccountEntry = z.infer<typeof accountEntrySchema>

export interface LoadAccountsOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  configPath?: string
}

function parseSecretValues(raw: string | undefined): Record<string, string> {
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    )
  } catch {
    return {}
  }
}

function resolveToken(entry: AccountEntry, env: NodeJS.ProcessEnv): string {
  const directValue = env[entry.tokenEnv]
  if (typeof directValue === "string" && directValue.trim().length > 0) {
    return directValue.trim()
  }

  const secretValues = parseSecretValues(env[SECRET_VALUES_ENV])
  const secretValue = secretValues[entry.tokenEnv]
  if (typeof secretValue === "string" && secretValue.trim().length > 0) {
    return secretValue.trim()
  }

  throw new Error(`Missing token for account ${entry.name}: ${entry.tokenEnv}`)
}

function readAccountsConfig(path: string): unknown {
  try {
    return parseYaml(readFileSync(path, "utf8"))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read accounts config ${path}: ${message}`)
  }
}

export function loadAccountsFromEnv(options: LoadAccountsOptions = {}): AccountConfig[] {
  const env = options.env ?? process.env
  const cwd = options.cwd ?? process.cwd()
  const configPath = resolve(
    cwd,
    options.configPath ?? env[ACCOUNTS_FILE_ENV] ?? DEFAULT_ACCOUNTS_FILE,
  )
  const rawConfig = readAccountsConfig(configPath)

  const result = accountsFileSchema.safeParse(rawConfig)
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join("; "))
  }

  return result.data.accounts.map((account) => ({
    name: account.name,
    siteType: SITE_TYPES.NEW_API,
    baseUrl: account.baseUrl.replace(/\/+$/, ""),
    authType: AUTH_TYPES.TOKEN,
    userId: account.userId,
    accessToken: resolveToken(account, env),
    enabled: account.enabled ?? true,
  }))
}
