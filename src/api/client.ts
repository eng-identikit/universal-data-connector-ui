import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { auth } from './auth'

/**
 * The UI talks only to universal-data-connector-ui-api (same origin: Vite
 * proxy in dev, nginx in Docker).
 *
 * - `bffClient`: the UI API itself (/api/v1/basic, /api/v1/auth/...).
 * - `apiClient`: one UDC instance. Calls are written against the instance's
 *   API (`/api/v1/entities`, ...) and go through the UI API's proxy of the
 *   instance in scope (`/api/v1/auth/udc/<id>/proxy/entities`), with the
 *   tenant in scope as X-Tenant.
 */

/** Error with the HTTP status and the server's error payload. */
export class ApiError extends Error {
  status?: number
  code?: string
  details?: unknown

  constructor(message: string, status?: number, code?: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

// ─── Instance scope ──────────────────────────────────────────────────────

interface Scope {
  udcId: string | null
  tenant: string | null
}

let scope: Scope = { udcId: null, tenant: null }

/** The UDC instance (and tenant) the instance API calls go to. */
export const apiScope = {
  get: () => scope,
  set(next: Scope) {
    scope = next
  },
}

const proxyBase = (udcId: string) => `/api/v1/auth/udc/${encodeURIComponent(udcId)}/proxy`

/** URL of the authenticated realtime stream of the instance in scope. */
export function getStreamUrl() {
  const origin = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
  const params = new URLSearchParams()
  const token = auth.getAccessToken()
  if (token) params.set('access_token', token)
  if (scope.tenant) params.set('tenant', scope.tenant)
  return `${origin}/api/v1/auth/udc/${encodeURIComponent(scope.udcId ?? '')}/stream?${params}`
}

/** Refreshes the access token (shared with the 401 interceptor); null if the session ended. */
export const refreshSession = () => auth.refresh()

// ─── Clients ─────────────────────────────────────────────────────────────

function errorMessage(data: any, fallback: string) {
  const firstError = Array.isArray(data?.errors) ? data.errors[0] : undefined
  return (
    data?.error?.message ||
    data?.message ||
    (typeof firstError === 'string' ? firstError : firstError?.message) ||
    data?.testResult?.message ||
    (typeof data?.error === 'string' ? data.error : undefined) ||
    fallback ||
    'Unknown error'
  )
}

function withAuth(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    const token = auth.getAccessToken()
    if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
      const isLogin = original?.url?.startsWith('/api/v1/basic/')
      if (err.response?.status === 401 && original && !original._retried && !isLogin && auth.getAccessToken()) {
        original._retried = true
        const token = await auth.refresh()
        if (token) {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` }
          return client(original)
        }
      }
      const data = err.response?.data
      const code = typeof data?.error === 'string' ? data.error : undefined
      return Promise.reject(
        new ApiError(errorMessage(data, err.message), err.response?.status, code, data?.details ?? data?.error?.details),
      )
    },
  )
  return client
}

export const bffClient = withAuth(axios.create({ timeout: 20000, headers: { 'Content-Type': 'application/json' } }))

export const apiClient = withAuth(axios.create({ timeout: 20000, headers: { 'Content-Type': 'application/json' } }))

apiClient.interceptors.request.use((config) => {
  if (!scope.udcId) throw new ApiError('No UDC instance selected')
  if (config.url?.startsWith('/api/v1/')) config.url = proxyBase(scope.udcId) + config.url.slice('/api/v1'.length)
  if (scope.tenant && !config.headers['X-Tenant']) config.headers['X-Tenant'] = scope.tenant
  return config
})
