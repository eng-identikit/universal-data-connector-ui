import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, type AuthConfig } from '../api/auth'
import { session } from '../api/session'
import { getMe, type Principal } from '../api/bff'
import type { Me, Role } from '../api/broker'
import { useUdcScope } from './UdcScope'

interface PrincipalContextType {
  /** null while unauthenticated; undefined while the stored session is being checked */
  principal: Principal | null | undefined
  config: AuthConfig | null
  /** Error reaching the UI API at startup */
  startupError: string | null
  login: (username: string, password: string) => Promise<void>
  loginKeycloak: () => void
  logout: () => void
  reloadPrincipal: () => Promise<void>
}

const ROLE_RANK: Record<Role, number> = { viewer: 1, operator: 2, admin: 3 }

const PrincipalContext = createContext<PrincipalContextType>({} as PrincipalContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<Principal | null | undefined>(undefined)
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [startupError, setStartupError] = useState<string | null>(null)

  const reloadPrincipal = useCallback(async () => {
    if (!auth.isAuthenticated()) {
      setPrincipal(null)
      return
    }
    try {
      setPrincipal(await getMe())
    } catch {
      session.setTokens(null)
      setPrincipal(null)
    }
  }, [])

  useEffect(() => {
    auth
      .init()
      .then((c) => {
        setConfig(c)
        return reloadPrincipal()
      })
      .catch((err) => {
        setStartupError(err.message)
        setPrincipal(null)
      })
    return session.onLogout(() => setPrincipal(null))
  }, [reloadPrincipal])

  const login = async (username: string, password: string) => {
    await auth.loginLocal(username, password)
    await reloadPrincipal()
  }

  const logout = () => {
    auth.logout()
    setPrincipal(null)
  }

  return (
    <PrincipalContext.Provider
      value={{ principal, config, startupError, login, loginKeycloak: () => auth.loginKeycloak(), logout, reloadPrincipal }}
    >
      {children}
    </PrincipalContext.Provider>
  )
}

/** The UI user (UI API principal) and the session actions. */
export const usePrincipal = () => useContext(PrincipalContext)

/**
 * The caller as the pages of one UDC instance see it: on an instance the UI
 * acts with the instance's service key, so every tenant is reachable with the
 * UI user's role. Outside an instance `tenant` is null and `user.tenants` empty.
 */
export function useAuth() {
  const { principal, logout } = usePrincipal()
  const scope = useUdcScope()
  const role: Role | null = principal?.role ?? null
  const user: Me | null | undefined = principal
    ? {
        kind: 'user',
        id: principal.id,
        username: principal.username,
        displayName: principal.displayName,
        isSuperadmin: principal.role === 'admin',
        tenants: (scope?.tenants ?? []).map((t) => ({ tenant: t.id, name: t.name, role: principal.role })),
      }
    : principal
  return {
    user,
    tenant: scope?.tenant ?? null,
    role,
    logout,
    setTenant: (tenant: string) => scope?.setTenant(tenant),
    reload: async () => {
      await scope?.reload()
    },
  }
}

/** True when the UI user's role is at least `min`. */
export function useCan(min: Role) {
  const { principal } = usePrincipal()
  return !!principal && ROLE_RANK[principal.role] >= ROLE_RANK[min]
}
