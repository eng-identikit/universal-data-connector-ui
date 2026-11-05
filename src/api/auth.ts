import axios from 'axios'
import Keycloak from 'keycloak-js'
import { session, type Tokens } from './session'

/**
 * How the UI authenticates against the UI API: its own users (token pair from
 * /basic/login) or Keycloak (the UI API validates Keycloak's tokens). The mode
 * comes from GET /api/v1/basic/config.
 */

export type AuthConfig = { auth: 'local' } | { auth: 'keycloak'; keycloak: { url: string; realm: string; clientId: string } }

let mode: 'local' | 'keycloak' = 'local'
let keycloak: Keycloak | null = null
let refreshing: Promise<string | null> | null = null

async function refreshLocal(): Promise<string | null> {
  const tokens = session.getTokens()
  if (!tokens) return null
  try {
    const res = await axios.post('/api/v1/basic/refresh', { refreshToken: tokens.refreshToken })
    const next: Tokens = { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }
    session.setTokens(next)
    return next.accessToken
  } catch {
    // Another tab may have refreshed meanwhile: adopt its tokens
    const current = session.getTokens()
    if (current && current.refreshToken !== tokens.refreshToken) return current.accessToken
    session.setTokens(null)
    return null
  }
}

async function refreshKeycloak(): Promise<string | null> {
  if (!keycloak) return null
  try {
    await keycloak.updateToken(30)
    return keycloak.token ?? null
  } catch {
    session.setTokens(null)
    return null
  }
}

export const auth = {
  get mode() {
    return mode
  },

  /** Reads the login mode and, with Keycloak, restores an existing Keycloak session. */
  async init(): Promise<AuthConfig> {
    const { data } = await axios.get<AuthConfig>('/api/v1/basic/config')
    if (data.auth === 'keycloak') {
      mode = 'keycloak'
      keycloak = new Keycloak({ url: data.keycloak.url, realm: data.keycloak.realm, clientId: data.keycloak.clientId })
      await keycloak.init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false }).catch(() => false)
      // Keep the token fresh while the UI is open
      keycloak.onTokenExpired = () => {
        auth.refresh()
      }
    }
    return data
  },

  getAccessToken(): string | null {
    return mode === 'keycloak' ? (keycloak?.token ?? null) : (session.getTokens()?.accessToken ?? null)
  },

  isAuthenticated() {
    return !!auth.getAccessToken()
  },

  /** New access token, or null when the session ended (single refresh in flight). */
  refresh(): Promise<string | null> {
    refreshing = refreshing || (mode === 'keycloak' ? refreshKeycloak() : refreshLocal()).finally(() => (refreshing = null))
    return refreshing
  },

  async loginLocal(username: string, password: string) {
    const { data } = await axios.post('/api/v1/basic/login', { username, password }).catch((err) => {
      throw new Error(err.response?.data?.error?.message || err.message)
    })
    session.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
  },

  loginKeycloak() {
    return keycloak?.login()
  },

  logout() {
    if (mode === 'keycloak' && keycloak) {
      session.setTokens(null)
      keycloak.logout({ redirectUri: window.location.origin })
      return
    }
    session.setTokens(null)
  },

  /** Account page of the identity provider (Keycloak only). */
  accountUrl() {
    return mode === 'keycloak' ? (keycloak?.createAccountUrl() ?? null) : null
  },
}
