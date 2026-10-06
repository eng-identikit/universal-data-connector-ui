// ─── Status ─────────────────────────────────────────────────────────────────

export type ConnectorStatusType =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error'
  | 'initialized'
  | 'unknown'

export interface ConnectorRuntime {
  status: ConnectorStatusType
  lastActivity: string | null
  stats: {
    dataPoints: number
    errors: number
    connections: number
  }
}

export interface ConnectorInfo {
  id: string
  type: string
  enabled: boolean
  config: Record<string, unknown>
  tags?: string[]
  runtime: ConnectorRuntime
}

export interface EngineStatus {
  isRunning: boolean
  totalDataPoints: number
  totalErrors: number
  lastDataReceived: string | null
}

export interface SystemMemory {
  used: number
  total: number
  rss: number
  external: number
}

export interface SystemInfo {
  status: string
  uptime: number
  startTime: string | null
  nodeVersion: string
  platform: string
  arch: string
  pid: number
}

export interface StatusResponse {
  timestamp: string
  system: SystemInfo
  engine: EngineStatus
  connectors: ConnectorInfo[]
  memory: SystemMemory
}

// ─── Sources ─────────────────────────────────────────────────────────────────

export interface Source {
  id: string
  type: string
  name?: string
  enabled: boolean
  config: Record<string, unknown>
  tags?: string[]
  runtime?: ConnectorRuntime
}

export interface SourcesResponse {
  timestamp: string
  total: number
  enabled: number
  sources: Source[]
}

// ─── Data ────────────────────────────────────────────────────────────────────

export interface DataPoint {
  id: string
  sourceId: string
  timestamp: string
  data: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface DataResponse {
  timestamp: string
  limit: number
  sourceFilter: string | null
  total: number
  data: DataPoint[]
}

// ─── History (TimescaleDB) ───────────────────────────────────────────────────

export interface HistoryStatus {
  timestamp: string
  available: boolean
  configured: boolean
  origin?: string
  table?: string
  recording?: boolean
  activeStorage?: string
  sources?: number
  oldest?: string | null
  newest?: string | null
  reason?: string
}

export interface HistorySource {
  sourceId: string
  records: number
  first: string
  last: string
}

export interface HistoryMeasurement {
  id: string
  type: string | null
  device: string | null
  numeric: boolean
}

export interface HistoryPoint {
  t: string
  avg: number
  min: number
  max: number
  last: number
  samples: number
}

export interface HistorySeriesResponse {
  sourceId: string
  startTime: string
  endTime: string
  bucket: string
  series: Record<string, HistoryPoint[]>
}

export interface HistoryRecord {
  timestamp: string
  sourceId: string
  data: {
    id?: string
    type?: string
    measurements?: { id: string; type?: string; value: unknown }[]
    [key: string]: unknown
  }
}

export interface HistoryRecordsResponse {
  startTime: string
  endTime: string
  limit: number
  offset: number
  hasMore: boolean
  records: HistoryRecord[]
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

export interface MappedEntity {
  id: string
  type: string
  sourceId?: string
  [key: string]: unknown
}

export interface EntitiesResponse {
  success: boolean
  count: number
  entities: MappedEntity[]
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export interface StorageTypeInfo {
  type: string
  name: string
  description: string
  configSchema: Record<string, { type: string; required?: boolean; default?: unknown; description?: string }>
}

export interface StorageConfig {
  type: string
  config: Record<string, unknown>
}

export interface StorageFallback {
  reason: string
  since: string
}

/** What the engine is actually using (may differ from the saved config while in fallback) */
export interface StorageRuntimeInfo {
  type: string
  configuredType: string
  status: 'connected' | 'fallback'
  connected: boolean
  fallback: StorageFallback | null
  retryInterval?: number
  bufferedDataPoints: number
}

export interface StorageConfigResponse {
  timestamp: string
  storage: {
    current: StorageConfig
    alternatives: Record<string, StorageConfig>
    runtime: StorageRuntimeInfo | null
  }
}

export interface StorageHealth {
  type: string
  configuredType: string
  status: 'healthy' | 'unhealthy' | 'fallback' | 'unavailable'
  connected: boolean
  fallback?: StorageFallback | null
  health: Record<string, unknown>
  statistics: Record<string, unknown> | null
  lastCheck: string
}

export interface StorageHealthResponse {
  timestamp: string
  storage: StorageHealth
}

export interface StorageTestResult {
  timestamp: string
  test: {
    type: string
    success: boolean
    message: string
    responseTime: number
    details?: Record<string, unknown>
  }
}
