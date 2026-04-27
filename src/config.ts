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

export function loadAccountsFromEnv(): AccountConfig[] {
  const raw = process.env.AUTO_CHECKIN_ACCOUNTS

  if (!raw || raw.trim().length === 0) {
    throw new Error("AUTO_CHECKIN_ACCOUNTS is required")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(
      `AUTO_CHECKIN_ACCOUNTS must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const result = accountsSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join("; "))
  }

  return result.data.map((account) => ({
    ...account,
    enabled: account.enabled ?? true,
    baseUrl: account.baseUrl.replace(/\/+$/, ""),
  }))
}
