import { bffClient } from './client'
import type { Channel, Role, Subscription } from './broker'

// UI API (universal-data-connector-ui-api): UI users, the UDC catalog and the flow of each instance.

const V1 = '/api/v1/auth'
const enc = encodeURIComponent

// ─── Types ───────────────────────────────────────────────────────────────

export interface Principal {
  id: string
  username: string
  displayName: string | null
  role: Role
  source: 'local' | 'keycloak'
  auth: 'local' | 'keycloak'
}

export interface UiUser {
  id: string
  username: string
  displayName: string | null
  role: Role
  disabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Position {
  x: number
  y: number
}

export interface UdcStatus {
  reachable: boolean
  ready: boolean
  keyValid: boolean
  latencyMs: number | null
  cluster?: boolean
  messaging?: string | null
  sessions?: string | null
  defaultBrokers?: { mqtt?: boolean; nats?: boolean } | null
  error: string | null
}

export interface Udc {
  id: string
  name: string
  description: string | null
  url: string
  publicUrl: string | null
  color: string | null
  position: Position
  createdBy: string | null
  createdAt: string
  updatedAt: string
  status: UdcStatus
}

export type SourceStatus = 'running' | 'stopped' | 'error' | 'disabled' | 'unknown' | string

export interface FlowSource {
  key: string
  id: string
  name: string
  type: string
  enabled: boolean
  tenant: string
  tags: string[]
  entityIdPrefix: string | null
  status: SourceStatus
  stats: Record<string, unknown> | null
  lastActivity: string | null
  /** Cluster: the replica running the connector */
  instance: string | null
  config: Record<string, unknown>
}

export type SinkStatus = 'ok' | 'failing' | 'paused' | 'idle' | 'disabled'

export interface SubscriptionSink {
  key: string
  kind: 'subscription'
  id: string
  tenant: string
  name: string
  enabled: boolean
  channel: Channel
  target: string
  transformer: { kind: 'library'; id: string } | { kind: 'inline'; expression: string } | null
  status: SinkStatus
  stats: Subscription['stats'] | null
  subscription: Subscription
}

export interface McpSink {
  key: 'sink:mcp'
  kind: 'mcp'
  enabled: boolean
  status: SinkStatus
  url: string
  transport: string
  tools: { name: string; title?: string; description?: string }[]
}

export type FlowSink = SubscriptionSink | McpSink

export interface Flow {
  udc: Omit<Udc, 'status'> & { status: UdcStatus }
  sources: FlowSource[]
  sinks: FlowSink[]
  transformers: { id: string; name: string; description?: string }[]
  tenants: { id: string; name: string }[]
  layout: Record<string, Position>
  errors: { section: string; message: string }[]
}

export interface UdcInput {
  name: string
  description?: string | null
  url: string
  publicUrl?: string | null
  color?: string | null
  position?: Position
  apiKey?: string
  username?: string
  password?: string
  force?: boolean
}

// ─── Profile and users ───────────────────────────────────────────────────

export const getMe = () => bffClient.get<Principal>(`${V1}/me`).then((r) => r.data)

export const changeMyPassword = (currentPassword: string, newPassword: string) =>
  bffClient.post(`${V1}/me/password`, { currentPassword, newPassword })

export const listUiUsers = () => bffClient.get<{ users: UiUser[] }>(`${V1}/users`).then((r) => r.data.users)

export const createUiUser = (body: { username: string; password: string; displayName?: string; role: Role }) =>
  bffClient.post<UiUser>(`${V1}/users`, body).then((r) => r.data)

export const updateUiUser = (id: string, body: Partial<{ password: string; displayName: string | null; role: Role; disabled: boolean }>) =>
  bffClient.patch<UiUser>(`${V1}/users/${enc(id)}`, body).then((r) => r.data)

export const deleteUiUser = (id: string) => bffClient.delete(`${V1}/users/${enc(id)}`)

// ─── UDC catalog ─────────────────────────────────────────────────────────

export const listUdcs = () => bffClient.get<{ udcs: Udc[] }>(`${V1}/udc`).then((r) => r.data.udcs)

export const getUdc = (id: string) => bffClient.get<Udc>(`${V1}/udc/${enc(id)}`).then((r) => r.data)

export const createUdc = (body: UdcInput) => bffClient.post<Udc>(`${V1}/udc`, body, { timeout: 30000 }).then((r) => r.data)

export const updateUdc = (id: string, body: Partial<UdcInput>) =>
  bffClient.patch<Udc>(`${V1}/udc/${enc(id)}`, body).then((r) => r.data)

export const deleteUdc = (id: string) => bffClient.delete(`${V1}/udc/${enc(id)}`)

// ─── Flow, layout and blocks ─────────────────────────────────────────────

export const getFlow = (id: string) => bffClient.get<Flow>(`${V1}/udc/${enc(id)}/flow`).then((r) => r.data)

/** Positions of blocks by node key; null forgets one. */
export const saveLayout = (id: string, layout: Record<string, Position | null>) =>
  bffClient.put(`${V1}/udc/${enc(id)}/layout`, layout)

export const deleteSourceBlock = (id: string, sourceId: string) =>
  bffClient.delete(`${V1}/udc/${enc(id)}/sources/${enc(sourceId)}`)

export const deleteSinkBlock = (id: string, tenant: string, subscriptionId: string) =>
  bffClient.delete(`${V1}/udc/${enc(id)}/sinks/${enc(tenant)}/${enc(subscriptionId)}`)

export const sourceKey = (id: string) => `source:${id}`
export const subscriptionKey = (tenant: string, id: string) => `sink:subscription:${tenant}:${id}`
