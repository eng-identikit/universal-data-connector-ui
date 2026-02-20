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
  description: string
  available: boolean
  requiredFields: string[]
}

export interface StorageConfig {
  type: string
  config: Record<string, unknown>
}

export interface StorageHealthResponse {
  status: string
  type: string
  connected: boolean
  details?: Record<string, unknown>
}

export interface StorageTestResult {
  success: boolean
  message: string
  error?: string
}
