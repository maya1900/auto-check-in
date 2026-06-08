import { postJson } from "../http/client.js"
import {
  CHECKIN_RESULT_STATUS,
  SITE_TYPES,
  type AccountConfig,
  type CheckinProvider,
  type CheckinResult,
} from "../types.js"
import {
  buildResult,
  classifySkippableMessage,
  isAlreadyCheckedMessage,
  normalizeMessage,
  resolveErrorResult,
} from "./shared.js"

const ENDPOINT = "/api/user/checkin"

export const newApiProvider: CheckinProvider = {
  canCheckIn(account: AccountConfig) {
    if (account.siteType !== SITE_TYPES.NEW_API) {
      return { ok: false, reason: "site_type_mismatch" }
    }

    if (account.authType === "token" && !account.accessToken) {
      return { ok: false, reason: "missing_access_token" }
    }

    return { ok: true }
  },

  async checkIn(account: AccountConfig): Promise<CheckinResult> {
    try {
      const response = await postJson(account, ENDPOINT, {})
      const message = normalizeMessage(response.message)

      if (message && isAlreadyCheckedMessage(message) && !response.success) {
        return buildResult({
          accountName: account.name,
          siteType: account.siteType,
          status: CHECKIN_RESULT_STATUS.ALREADY_CHECKED,
          message,
          reasonCode: "already_checked",
        })
      }

      if (response.success) {
        return buildResult({
          accountName: account.name,
          siteType: account.siteType,
          status: CHECKIN_RESULT_STATUS.SUCCESS,
          message: message || "Check-in successful",
        })
      }

      const skippable = message
        ? classifySkippableMessage(message, account.baseUrl)
        : undefined
      if (skippable) {
        return buildResult({
          accountName: account.name,
          siteType: account.siteType,
          status: CHECKIN_RESULT_STATUS.SKIPPED,
          message: skippable.message,
          reasonCode: skippable.reasonCode,
          manualCheckinUrl: account.baseUrl,
        })
      }

      return buildResult({
        accountName: account.name,
        siteType: account.siteType,
        status: CHECKIN_RESULT_STATUS.FAILED,
        message: message || "Check-in failed",
        reasonCode: "checkin_failed",
      })
    } catch (error) {
      return resolveErrorResult({
        accountName: account.name,
        siteType: account.siteType,
        error,
        manualCheckinUrl: account.baseUrl,
      })
    }
  },
}
