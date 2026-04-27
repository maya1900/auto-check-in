export const SITE_TYPES = {
  NEW_API: "new-api",
  SUB2API: "sub2api",
} as const

export type SiteType = (typeof SITE_TYPES)[keyof typeof SITE_TYPES]

export const AUTH_TYPES = {
  TOKEN: "token",
  COOKIE: "cookie",
} as const

export type AuthType = (typeof AUTH_TYPES)[keyof typeof AUTH_TYPES]

export const CHECKIN_RESULT_STATUS = {
  SUCCESS: "success",
  ALREADY_CHECKED: "already_checked",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const

export type CheckinResultStatus =
  (typeof CHECKIN_RESULT_STATUS)[keyof typeof CHECKIN_RESULT_STATUS]

export interface AccountConfig {
  name: string
  siteType: SiteType
  baseUrl: string
  authType: AuthType
  userId?: number
  accessToken?: string
  cookie?: string
  enabled: boolean
}

export interface CheckinResult {
  accountName: string
  siteType: SiteType
  status: CheckinResultStatus
  message: string
  reasonCode?: string
}

export interface CheckinProvider {
  canCheckIn(account: AccountConfig): { ok: boolean; reason?: string }
  checkIn(account: AccountConfig): Promise<CheckinResult>
}
