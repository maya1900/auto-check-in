import {
  CHECKIN_RESULT_STATUS,
  SITE_TYPES,
  type AccountConfig,
  type CheckinProvider,
} from "../types.js"
import { buildResult } from "./shared.js"

export const sub2apiProvider: CheckinProvider = {
  canCheckIn(account: AccountConfig) {
    if (account.siteType !== SITE_TYPES.SUB2API) {
      return { ok: false, reason: "site_type_mismatch" }
    }

    return { ok: true }
  },

  async checkIn(account: AccountConfig) {
    return buildResult({
      accountName: account.name,
      siteType: account.siteType,
      status: CHECKIN_RESULT_STATUS.SKIPPED,
      message: "sub2api is not supported yet in v1",
      reasonCode: "unsupported_site_type",
    })
  },
}
