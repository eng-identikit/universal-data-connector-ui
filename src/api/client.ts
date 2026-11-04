import axios, { type AxiosRequestConfig } from 'axios'
import { session, type Tokens } from './session'

// Base URL from localStorage (Settings). Empty = same origin (Vite proxy in dev, nginx in Docker).
export const getBaseUrl = () => localStorage.getItem('udc-api-url') || ''

/** WebSocket URL for the given API base URL (same origin → /ws proxy). */
export const getWsUrl = (apiBaseUrl: string) => {
  if (!apiBaseUrl) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}/ws`
  }
  return apiBaseUrl.replace(/^http/, 'ws').replace(':3000', ':3001')
}

/** Error with the HTTP status and the broker error payload. */
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

export const apiClient = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Intercept requests to always use the current base URL, token and tenant
apiClient.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl()
  const tokens = session.getTokens()
  if (tokens && !config.headers.Authorization) config.headers.Authorization = `Bearer ${tokens.accessToken}`
  const tenant = session.getTenant()
  if (tenant && !config.headers['X-Tenant']) config.headers['X-Tenant'] = tenant
  return config
})

// Single in-flight refresh shared by all requests failing with 401
let refreshing: Promise<Tokens | null> | null = null

async function refreshTokens(): Promise<Tokens | null> {
  const tokens = session.getTokens()
  if (!tokens) return null
  try {
    const res = await axios.post(`${getBaseUrl()}/api/v2/auth/refresh`, { refreshToken: tokens.refreshToken })
    const next = { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }
    session.setTokens(next)
    return next
  } catch {
    session.setTokens(null)
    return null
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthCall = original?.url?.includes('/api/v2/auth/')
    if (err.response?.status === 401 && original && !original._retried && !isAuthCall && session.getTokens()) {
      original._retried = true
      refreshing = refreshing || refreshTokens().finally(() => (refreshing = null))
      const tokens = await refreshing
      if (tokens) {
        original.headers = { ...original.headers, Authorization: `Bearer ${tokens.accessToken}` }
        return apiClient(original)
      }
    }

    // Normalize error message
    const data = err.response?.data
    const message = data?.message || data?.error || err.message || 'Unknown error'
    return Promise.reject(new ApiError(message, err.response?.status, data?.error, data?.details))
  },
)
