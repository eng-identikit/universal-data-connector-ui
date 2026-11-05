import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { session } from '../api/session'
import { getMe, login as apiLogin, logoutSession, type Me, type Role } from '../api/broker'

interface AuthContextType {
  /** null while unauthenticated; undefined while the stored session is being checked */
  user: Me | null | undefined
  tenant: string | null
  /** Caller's role on the selected tenant */
  role: Role | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setTenant: (tenant: string) => void
  reload: () => Promise<void>
}

const ROLE_RANK: Record<Role, number> = { viewer: 1, operator: 2, admin: 3 }

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

function pickTenant(user: Me): string | null {
  const stored = session.getTenant()
  if (stored && user.tenants.some((t) => t.tenant === stored)) return stored
  return user.tenants[0]?.tenant ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null | undefined>(session.getTokens() ? undefined : null)
  const [tenant, setTenantState] = useState<string | null>(null)

  const applyUser = useCallback((me: Me) => {
    const next = pickTenant(me)
    session.setTenant(next)
    setTenantState(next)
    setUser(me)
  }, [])

  const reload = useCallback(async () => {
    try {
      applyUser(await getMe())
    } catch {
      session.setTokens(null)
      setUser(null)
    }
  }, [applyUser])

  useEffect(() => {
    if (session.getTokens()) reload()
    return session.onLogout(() => setUser(null))
  }, [reload])

  const login = async (username: string, password: string) => {
    const s = await apiLogin(username, password)
    session.setTokens({ accessToken: s.accessToken, refreshToken: s.refreshToken })
    applyUser({ kind: 'user', ...s.user })
  }

  const logout = () => {
    // Ends the session on the server too (best effort: the tokens are dropped anyway)
    const tokens = session.getTokens()
    if (tokens) logoutSession(tokens.accessToken).catch(() => {})
    session.setTokens(null)
    setUser(null)
  }

  const setTenant = (next: string) => {
    session.setTenant(next)
    setTenantState(next)
  }

  const role = user?.tenants.find((t) => t.tenant === tenant)?.role ?? null

  return (
    <AuthContext.Provider value={{ user, tenant, role, login, logout, setTenant, reload }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

/** True when the current role on the selected tenant is at least `min`. */
export function useCan(min: Role) {
  const { role } = useAuth()
  return !!role && ROLE_RANK[role] >= ROLE_RANK[min]
}
