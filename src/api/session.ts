// Local-login session (the UI API's token pair), persisted in localStorage.

export interface Tokens {
  accessToken: string
  refreshToken: string
}

const TOKENS_KEY = 'udc-ui-session'

type Listener = () => void
const listeners = new Set<Listener>()

export const session = {
  getTokens(): Tokens | null {
    try {
      const raw = localStorage.getItem(TOKENS_KEY)
      return raw ? (JSON.parse(raw) as Tokens) : null
    } catch {
      return null
    }
  },

  setTokens(tokens: Tokens | null) {
    try {
      if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
      else localStorage.removeItem(TOKENS_KEY)
    } catch {
      // storage unavailable: session lasts for this page only
    }
    if (!tokens) listeners.forEach((l) => l())
  },

  /** Called when the session ends (logout or refresh failure). */
  onLogout(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** Tenant last used on each UDC instance. */
export const tenantMemory = {
  get(udcId: string) {
    try {
      return localStorage.getItem(`udc-tenant:${udcId}`)
    } catch {
      return null
    }
  },
  set(udcId: string, tenant: string) {
    try {
      localStorage.setItem(`udc-tenant:${udcId}`, tenant)
    } catch {
      // ignore
    }
  },
}
