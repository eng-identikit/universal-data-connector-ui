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
  /** Present on `near` queries: distance from the reference point in meters */
  distanceM?: number
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
  /** minLon,minLat,maxLon,maxLat */
  bbox?: string
  /** lon,lat — results ordered by distance, within maxDistance meters */
  near?: string
  maxDistance?: number
  georel?: 'within' | 'intersects' | 'disjoint' | 'contains'
  geometry?: string
  located?: boolean
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

export const patchEntity = (id: string, body: Partial<EntityInput>, version?: number) =>
  apiClient.patch<Entity>(`${V2}/entities/${enc(id)}`, body, ifMatch(version)).then((r) => r.data)

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

// ─── Subscriptions ───────────────────────────────────────────────────────────

export type Channel = 'http' | 'mqtt' | 'nats' | 'websocket'
export type TriggerOp = 'create' | 'update' | 'delete'

export interface SubscriptionSelect {
  types?: string[]
  idPattern?: string | null
  ids?: string[]
  related?: { id: string; depth: number; direction: 'in' | 'out' } | null
  bbox?: [number, number, number, number] | null
}

export interface SubscriptionNotify {
  channel: Channel
  url?: string | null
  method?: 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  timeoutMs?: number
  topic?: string
  qos?: 0 | 1 | 2
  retain?: boolean
  username?: string | null
  password?: string | null
  subject?: string
  attrs?: string[]
  format?: 'full' | 'values'
  perEntity?: boolean
}

export interface SubscriptionStats {
  matched: number
  delivered: number
  failedAttempts: number
  dead: number
  dlq: number
  lastNotificationAt: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastError: string | null
  lastLatencyMs: number | null
}

export interface SubscriptionInput {
  name: string
  description?: string | null
  enabled?: boolean
  select?: SubscriptionSelect
  trigger?: { on?: TriggerOp[]; attrs?: string[]; deadband?: Record<string, number> }
  filter?: string | null
  filterMode?: 'level' | 'edge'
  throttleMs?: number | null
  periodicMs?: number | null
  notify: SubscriptionNotify
  delivery?: { maxRetries?: number; backoffMs?: number }
  expiresAt?: string | null
}

export interface Subscription extends Required<Omit<SubscriptionInput, 'description' | 'filter' | 'throttleMs' | 'periodicMs' | 'expiresAt'>> {
  id: string
  tenant: string
  description: string | null
  filter: string | null
  throttleMs: number | null
  periodicMs: number | null
  expiresAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  trigger: { on: TriggerOp[]; attrs: string[]; deadband: Record<string, number> }
  select: SubscriptionSelect
  delivery: { maxRetries: number; backoffMs: number }
  stats?: SubscriptionStats
}

export interface Notification {
  id: string
  subscriptionId: string
  subscriptionName: string
  tenant: string
  reason: 'create' | 'update' | 'delete' | 'periodic' | 'test'
  timestamp: string
  entities: Record<string, unknown>[]
  replayOf?: string
}

export interface DlqItem {
  id: string
  notification: Notification
  error: string | null
  attempts: number
  failedAt: string
}

export const listSubscriptions = () =>
  apiClient.get<{ subscriptions: Subscription[] }>(`${V2}/subscriptions`).then((r) => r.data.subscriptions)

export const getSubscription = (id: string) =>
  apiClient.get<Subscription>(`${V2}/subscriptions/${enc(id)}`).then((r) => r.data)

export const createSubscription = (sub: SubscriptionInput) =>
  apiClient.post<Subscription>(`${V2}/subscriptions`, sub).then((r) => r.data)

export const updateSubscription = (id: string, changes: Partial<SubscriptionInput>) =>
  apiClient.patch<Subscription>(`${V2}/subscriptions/${enc(id)}`, changes).then((r) => r.data)

export const deleteSubscription = (id: string) => apiClient.delete(`${V2}/subscriptions/${enc(id)}`)

export const pauseSubscription = (id: string) =>
  apiClient.post<Subscription>(`${V2}/subscriptions/${enc(id)}/pause`).then((r) => r.data)

export const resumeSubscription = (id: string) =>
  apiClient.post<Subscription>(`${V2}/subscriptions/${enc(id)}/resume`).then((r) => r.data)

export const resetSubscriptionStats = (id: string) => apiClient.delete(`${V2}/subscriptions/${enc(id)}/stats`)

export const testSubscription = (id: string, entityId?: string) =>
  apiClient
    .post<{ ok: boolean; latencyMs: number; error?: string; entityId: string }>(`${V2}/subscriptions/${enc(id)}/test`, { entityId }, { timeout: 70000 })
    .then((r) => r.data)

export const previewSubscription = (draft: Partial<SubscriptionInput>) =>
  apiClient.post<{ entities: Entity[]; count: number }>(`${V2}/subscriptions/preview`, draft).then((r) => r.data)

export const validateExpression = (expression: string) =>
  apiClient
    .post<{ valid: boolean; attrs?: string[]; error?: string; position?: number | null }>(`${V2}/expressions/validate`, { expression })
    .then((r) => r.data)

export const listDlq = (id: string) =>
  apiClient.get<{ items: DlqItem[] }>(`${V2}/subscriptions/${enc(id)}/dlq`).then((r) => r.data.items)

export const replayDlq = (id: string, ids?: string[]) =>
  apiClient.post<{ replayed: number }>(`${V2}/subscriptions/${enc(id)}/dlq/replay`, { ids }).then((r) => r.data)

export const purgeDlq = (id: string, ids?: string[]) =>
  apiClient.delete<{ purged: number }>(`${V2}/subscriptions/${enc(id)}/dlq`, { data: { ids } }).then((r) => r.data)

// ─── History, commands, ingest ───────────────────────────────────────────────

export interface HistoryBucket {
  t: string
  avg: number | null
  min: number | null
  max: number | null
  last: unknown
  samples: number
}

export interface HistorySeries {
  from: string
  to: string
  bucketMs: number
  series: Record<string, HistoryBucket[]>
}

export interface HistoryAttribute {
  attr: string
  samples: number
  numeric: boolean
  first: string
  last: string
}

export type CommandStatus = 'pending' | 'sent' | 'succeeded' | 'failed'

export interface Command {
  id: string
  entityId: string
  attr: string
  value: unknown
  status: CommandStatus
  connector: string | null
  target: { connector: string; method: string; args: unknown[] } | null
  error: string | null
  createdBy: string | null
  createdAt: string
  completedAt: string | null
}

export const getHistory = (id: string, params: { attrs?: string; from?: string; to?: string; maxPoints?: number }) =>
  apiClient.get<HistorySeries>(`${V2}/entities/${enc(id)}/history`, { params, timeout: 30000 }).then((r) => r.data)

export const getHistoryAttributes = (id: string) =>
  apiClient.get<{ attributes: HistoryAttribute[] }>(`${V2}/entities/${enc(id)}/history/attributes`).then((r) => r.data.attributes)

export const getHistoryRaw = (id: string, attr: string, params: { from?: string; to?: string; limit?: number }) =>
  apiClient
    .get<{ samples: { t: string; value: unknown; quality: string | null }[] }>(`${V2}/entities/${enc(id)}/history/${enc(attr)}/raw`, { params })
    .then((r) => r.data.samples)

export const sendCommand = (id: string, attr: string, value: unknown) =>
  apiClient.post<Command>(`${V2}/entities/${enc(id)}/attrs/${enc(attr)}/command`, { value }, { timeout: 20000 }).then((r) => r.data)

export const listCommands = (params: { entityId?: string; status?: CommandStatus; limit?: number } = {}) =>
  apiClient.get<{ commands: Command[] }>(`${V2}/commands`, { params }).then((r) => r.data.commands)
