import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress } from '@mui/material'
import { apiScope } from '../api/client'
import { tenantMemory } from '../api/session'
import { listTenants, type Tenant } from '../api/broker'

interface UdcScopeType {
  udcId: string
  tenants: Tenant[]
  tenant: string | null
  setTenant: (tenant: string) => void
  reload: () => Promise<void>
  /** Path inside this instance's workspace, e.g. path('/entities') */
  path: (p: string) => string
}

const UdcScopeContext = createContext<UdcScopeType | null>(null)

/**
 * Points the instance API calls (apiClient, stream) at one UDC through the UI
 * API's proxy, with its tenants and the selected one. Children render once
 * the tenants are known, so their first calls already carry the tenant.
 */
export function UdcScopeProvider({
  udcId,
  initialTenant,
  quiet,
  children,
}: {
  udcId: string
  initialTenant?: string
  /** No spinner or error of its own: nothing until the tenants are known (children on error) */
  quiet?: boolean
  children: ReactNode
}) {
  const [tenants, setTenants] = useState<Tenant[] | null>(null)
  const [tenant, setTenantState] = useState<string | null>(initialTenant ?? tenantMemory.get(udcId))
  const [error, setError] = useState<string | null>(null)

  // Set during render: children's effects run before this component's
  apiScope.set({ udcId, tenant })

  const reload = useCallback(async () => {
    try {
      const list = await listTenants()
      setTenants(list)
      setError(null)
      setTenantState((current) => (current && list.some((t) => t.id === current) ? current : (list[0]?.id ?? null)))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [udcId])

  useEffect(() => {
    setTenants(null)
    reload()
  }, [reload])

  const setTenant = useCallback(
    (next: string) => {
      tenantMemory.set(udcId, next)
      setTenantState(next)
    },
    [udcId],
  )

  const value = useMemo<UdcScopeType>(
    () => ({
      udcId,
      tenants: tenants ?? [],
      tenant,
      setTenant,
      reload,
      path: (p: string) => `/udc/${encodeURIComponent(udcId)}${p === '/' ? '' : p}`,
    }),
    [udcId, tenants, tenant, setTenant, reload],
  )

  // Quiet: an error shows up in the children's own calls
  if (quiet && !tenants && !error) return null
  if (quiet && !tenants) return <UdcScopeContext.Provider value={value}>{children}</UdcScopeContext.Provider>
  if (error && !tenants) {
    return (
      <Alert severity="error" action={<Button color="inherit" onClick={reload}>Retry</Button>} sx={{ m: 3 }}>
        {error}
      </Alert>
    )
  }
  if (!tenants) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }
  return <UdcScopeContext.Provider value={value}>{children}</UdcScopeContext.Provider>
}

export const useUdcScope = () => useContext(UdcScopeContext)

/** navigate() for paths inside the current instance's workspace ('/entities' → '/udc/<id>/entities'). */
export function useScopedNavigate() {
  const navigate = useNavigate()
  const scope = useUdcScope()
  return useCallback(
    (to: string | number) => {
      if (typeof to === 'number') return navigate(to)
      navigate(scope && to.startsWith('/') ? scope.path(to) : to)
    },
    [navigate, scope],
  )
}

/** Path inside the current instance's workspace (for links). */
export function useScopedPath() {
  const scope = useUdcScope()
  return useCallback((p: string) => (scope ? scope.path(p) : p), [scope])
}
