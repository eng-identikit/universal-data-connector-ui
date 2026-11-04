import { apiClient } from './client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'operator' | 'viewer'
export type AttrType = 'float' | 'int' | 'bool' | 'string' | 'datetime' | 'json' | 'relationship'
export type Quality = 'good' | 'bad' | 'uncertain'

export const ATTR_TYPES: AttrType[] = ['float', 'int', 'bool', 'string', 'datetime', 'json', 'relationship']
export const ROLES: Role[] = ['admin', 'operator', 'viewer']

export interface Attribute {
  type: AttrType
  value?: unknown
  target?: string
  unit?: string
  ts?: string
  quality?: Quality
  source?: string
  meta?: Record<string, unknown>
  writable?: boolean
  command?: Record<string, unknown>
}

export interface GeoJsonGeometry {
  type: string
  coordinates: unknown[]
}

export interface Entity {
  id: string
  type: string
  version: number
  createdAt: string
  updatedAt: string
  location?: GeoJsonGeometry
  attrs: Record<string, Attribute>
}

/** Body for create/replace: attributes may omit type and ts. */
export interface EntityInput {
  id: string
  type: string
  location?: GeoJsonGeometry | null
  attrs?: Record<string, Partial<Attribute> | null>
}

export interface EntityList {
  entities: Entity[]
  total: number
  limit: number
  offset: number
}

export interface EntityQuery {
  type?: string
  idPattern?: string
  related?: string
  depth?: number
  direction?: 'in' | 'out'
  attrs?: string
  orderBy?: string
  limit?: number
  offset?: number
}

export interface EntityGraph {
  root: string
  nodes: { id: string; type: string | null }[]
  edges: { source: string; attr: string; target: string }[]
}

export interface TenantMembership {
  tenant: string
  name: string
  role: Role
}

export interface Me {
  kind: 'user'
  id: string
  username: string
  displayName: string | null
  isSuperadmin: boolean
  tenants: TenantMembership[]
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: Omit<Me, 'kind'>
}

export interface Tenant {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  entityCount?: number
  memberCount?: number
}

export interface User {
  id: string
  username: string
  displayName: string | null
  isSuperadmin: boolean
  disabled: boolean
  createdAt: string
  updatedAt: string
  tenants?: { tenant: string; role: Role }[]
}

export interface Member {
  userId: string
  username: string
  displayName: string | null
  disabled: boolean
  role: Role
}

export interface ApiKey {
  id: string
  tenant: string
  name: string
  prefix: string
  role: Role
  allowedTypes: string[] | null
  createdBy: string | null
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  lastUsedAt: string | null
}

const V2 = '/api/v2'
const enc = encodeURIComponent
const ifMatch = (version?: number) => (version ? { headers: { 'If-Match': String(version) } } : undefined)

// ─── Auth ────────────────────────────────────────────────────────────────────

export const login = (username: string, password: string) =>
  apiClient.post<Session>(`${V2}/auth/login`, { username, password }).then((r) => r.data)

export const getMe = () => apiClient.get<Me>(`${V2}/auth/me`).then((r) => r.data)

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiClient.post<Session>(`${V2}/auth/password`, { currentPassword, newPassword }).then((r) => r.data)

// ─── Entities ────────────────────────────────────────────────────────────────

export const listEntities = (query: EntityQuery) =>
  apiClient.get<EntityList>(`${V2}/entities`, { params: query }).then((r) => r.data)

export const getEntity = (id: string) =>
  apiClient.get<Entity>(`${V2}/entities/${enc(id)}`).then((r) => r.data)

export const getEntityGraph = (id: string, depth = 1, direction: 'in' | 'out' | 'both' = 'both') =>
  apiClient.get<EntityGraph>(`${V2}/entities/${enc(id)}/graph`, { params: { depth, direction } }).then((r) => r.data)

export const getTypes = () =>
  apiClient.get<{ types: { type: string; count: number }[] }>(`${V2}/types`).then((r) => r.data.types)

export const createEntity = (entity: EntityInput) =>
  apiClient.post<Entity>(`${V2}/entities`, entity).then((r) => r.data)

export const replaceEntity = (id: string, entity: EntityInput, version?: number) =>
  apiClient.put<Entity>(`${V2}/entities/${enc(id)}`, entity, ifMatch(version)).then((r) => r.data)

export const deleteEntity = (id: string, version?: number) =>
  apiClient.delete(`${V2}/entities/${enc(id)}`, ifMatch(version))

export const putAttribute = (id: string, name: string, attr: Partial<Attribute>, version?: number) =>
  apiClient.put<Entity>(`${V2}/entities/${enc(id)}/attrs/${enc(name)}`, attr, ifMatch(version)).then((r) => r.data)

export const deleteAttribute = (id: string, name: string, version?: number) =>
  apiClient.delete<Entity>(`${V2}/entities/${enc(id)}/attrs/${enc(name)}`, ifMatch(version)).then((r) => r.data)

// ─── Tenants & members ───────────────────────────────────────────────────────

export const listTenants = () =>
  apiClient.get<{ tenants: Tenant[] }>(`${V2}/tenants`).then((r) => r.data.tenants)

export const createTenant = (tenant: { id: string; name?: string; description?: string }) =>
  apiClient.post<Tenant>(`${V2}/tenants`, tenant).then((r) => r.data)

export const updateTenant = (id: string, changes: { name?: string; description?: string }) =>
  apiClient.patch<Tenant>(`${V2}/tenants/${enc(id)}`, changes).then((r) => r.data)

export const deleteTenant = (id: string) => apiClient.delete(`${V2}/tenants/${enc(id)}`)

export const listMembers = (tenant: string) =>
  apiClient.get<{ members: Member[] }>(`${V2}/tenants/${enc(tenant)}/members`).then((r) => r.data.members)

export const addMember = (tenant: string, username: string, role: Role) =>
  apiClient.post(`${V2}/tenants/${enc(tenant)}/members`, { username, role })

export const setMemberRole = (tenant: string, userId: string, role: Role) =>
  apiClient.put(`${V2}/tenants/${enc(tenant)}/members/${enc(userId)}`, { role })

export const removeMember = (tenant: string, userId: string) =>
  apiClient.delete(`${V2}/tenants/${enc(tenant)}/members/${enc(userId)}`)

// ─── Users (superadmin) ──────────────────────────────────────────────────────

export const listUsers = () => apiClient.get<{ users: User[] }>(`${V2}/users`).then((r) => r.data.users)

export const createUser = (user: {
  username: string
  password: string
  displayName?: string
  isSuperadmin?: boolean
  tenants?: { tenant: string; role: Role }[]
}) => apiClient.post<User>(`${V2}/users`, user).then((r) => r.data)

export const updateUser = (
  id: string,
  changes: { displayName?: string; password?: string; isSuperadmin?: boolean; disabled?: boolean },
) => apiClient.patch<User>(`${V2}/users/${enc(id)}`, changes).then((r) => r.data)

export const deleteUser = (id: string) => apiClient.delete(`${V2}/users/${enc(id)}`)

// ─── API keys (tenant admin) ─────────────────────────────────────────────────

export const listApiKeys = () => apiClient.get<{ apiKeys: ApiKey[] }>(`${V2}/apikeys`).then((r) => r.data.apiKeys)

export const createApiKey = (key: { name: string; role: Role; allowedTypes?: string[]; expiresAt?: string }) =>
  apiClient.post<ApiKey & { key: string }>(`${V2}/apikeys`, key).then((r) => r.data)

export const revokeApiKey = (id: string) => apiClient.delete(`${V2}/apikeys/${enc(id)}`)
