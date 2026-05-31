import { AUTH_TYPES, type AccountConfig, type CheckinDiagnostics } from "../types.js"

export interface ApiResponse<TData = unknown> {
  success?: boolean
  message?: string
  data?: TData
  [key: string]: unknown
}

export class HttpRequestError extends Error {
  statusCode?: number
  diagnostics: CheckinDiagnostics

  constructor(message: string, diagnostics: CheckinDiagnostics) {
    super(message)
    this.name = "HttpRequestError"
    this.statusCode = diagnostics.statusCode
    this.diagnostics = diagnostics
  }
}

const DIAGNOSTIC_HEADERS = [
  "server",
  "content-type",
  "cf-ray",
  "cf-mitigated",
  "cf-cache-status",
  "x-frame-options",
  "x-cf-challenge",
] as const

function pickDiagnosticHeaders(headers: Headers): Record<string, string> {
  const picked: Record<string, string> = {}
  for (const name of DIAGNOSTIC_HEADERS) {
    const value = headers.get(name)
    if (value) picked[name] = value
  }
  return picked
}

function snippet(text: string, max = 200): string {
  const collapsed = text.replace(/\s+/g, " ").trim()
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed
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
    ...(account.extraHeaders ?? {}),
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
    throw new HttpRequestError(message, {
      statusCode: response.status,
      headers: pickDiagnosticHeaders(response.headers),
      bodySnippet: text ? snippet(text) : undefined,
    })
  }

  return payload ?? {}
}
