import { AUTH_TYPES, type AccountConfig } from "../types.js"

export interface ApiResponse<TData = unknown> {
  success?: boolean
  message?: string
  data?: TData
  [key: string]: unknown
}

export async function postJson<TData = unknown>(
  account: AccountConfig,
  endpoint: string,
  body: unknown = {},
  extraHeaders: Record<string, string> = {},
): Promise<ApiResponse<TData>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Pragma: "no-cache",
    ...extraHeaders,
  }

  if (typeof account.userId === "number") {
    const userId = String(account.userId)
    headers["X-User-Id"] = userId
    headers["X-User-ID"] = userId
    headers["New-Api-User"] = userId
  }

  if (account.authType === AUTH_TYPES.TOKEN && account.accessToken) {
    headers.Authorization = `Bearer ${account.accessToken}`
  }

  if (account.authType === AUTH_TYPES.COOKIE && account.cookie) {
    headers.Cookie = account.cookie
  }

  const response = await fetch(`${account.baseUrl}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let payload: ApiResponse<TData> | undefined

  try {
    payload = text ? (JSON.parse(text) as ApiResponse<TData>) : undefined
  } catch {
    payload = { message: text }
  }

  if (!response.ok) {
    const message = payload?.message || `HTTP ${response.status}`
    const error = new Error(message)
    ;(error as Error & { statusCode?: number }).statusCode = response.status
    throw error
  }

  return payload ?? {}
}
