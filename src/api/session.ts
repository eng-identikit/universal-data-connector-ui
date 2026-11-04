// Broker session (JWT pair) and selected tenant, persisted in localStorage.

export interface Tokens {
  accessToken: string
  refreshToken: string
}

const TOKENS_KEY = 'udc-session'
const TENANT_KEY = 'udc-tenant'

type Listener = () => void
const listeners = new Set<Listener>()

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export const session = {
  getTokens: () => read<Tokens>(TOKENS_KEY),

  setTokens(tokens: Tokens | null) {
    try {
      if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
      else localStorage.removeItem(TOKENS_KEY)
    } catch {
      // storage unavailable: session lasts for this page only
    }
    if (!tokens) listeners.forEach((l) => l())
  },

  getTenant: () => {
    try {
      return localStorage.getItem(TENANT_KEY)
    } catch {
      return null
    }
  },

  setTenant(tenant: string | null) {
    try {
      if (tenant) localStorage.setItem(TENANT_KEY, tenant)
      else localStorage.removeItem(TENANT_KEY)
    } catch {
      // ignore
    }
  },

  /** Called when the session ends (logout or refresh failure). */
  onLogout(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
