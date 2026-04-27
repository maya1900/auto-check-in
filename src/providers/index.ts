import { newApiProvider } from "./new-api.js"
import { sub2apiProvider } from "./sub2api.js"

export const providers = {
  "new-api": newApiProvider,
  sub2api: sub2apiProvider,
} as const
