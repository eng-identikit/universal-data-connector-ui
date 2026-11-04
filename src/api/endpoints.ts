import { apiClient } from './client'
import type {
  StatusResponse,
  SourcesResponse,
  Source,
  DataResponse,
  EntitiesResponse,
  StorageConfig,
  StorageHealthResponse,
  StorageConfigResponse,
  StorageTestResult,
  StorageTypeInfo,
  HistoryStatus,
  HistorySource,
  HistoryMeasurement,
  HistorySeriesResponse,
  HistoryRecordsResponse,
} from './types'

// ─── Status ──────────────────────────────────────────────────────────────────

export const getStatus = () =>
  apiClient.get<StatusResponse>('/api/v2/system/status').then((r) => r.data)

export const getHealth = () =>
  apiClient.get('/api/v2/system/status/health').then((r) => r.data)

// ─── Sources ─────────────────────────────────────────────────────────────────

export const getSources = () =>
  apiClient.get<SourcesResponse>('/api/v2/system/sources').then((r) => r.data)

export const startSource = (id: string) =>
  apiClient.post(`/api/v2/system/sources/${encodeURIComponent(id)}/start`).then((r) => r.data)

export const stopSource = (id: string) =>
  apiClient.post(`/api/v2/system/sources/${encodeURIComponent(id)}/stop`).then((r) => r.data)

export const restartSource = (id: string) =>
  apiClient.post(`/api/v2/system/sources/${encodeURIComponent(id)}/restart`).then((r) => r.data)

// ─── Config / Sources CRUD ───────────────────────────────────────────────────

export const createSource = (source: Omit<Source, 'runtime'>) =>
  apiClient.post('/api/v2/system/config/sources', source).then((r) => r.data)

export const updateSource = (id: string, source: Partial<Omit<Source, 'runtime'>>) =>
  apiClient
    .put(`/api/v2/system/config/sources/${encodeURIComponent(id)}`, source)
    .then((r) => r.data)

export const deleteSource = (id: string) =>
  apiClient.delete(`/api/v2/system/config/sources/${encodeURIComponent(id)}`).then((r) => r.data)

/** Re-reads sources.json and (re)starts the connectors: needed after add/update. */
export const reloadSources = () =>
  apiClient.post('/api/v2/system/config/sources/reload', {}, { timeout: 60000 }).then((r) => r.data)

export const reloadConfig = () =>
  apiClient.post('/api/v2/system/config/reload').then((r) => r.data)

// ─── Data ────────────────────────────────────────────────────────────────────

export const getLatestData = (limit = 50, sourceId?: string) => {
  const params: Record<string, unknown> = { limit }
  if (sourceId) params.source = sourceId
  return apiClient.get<DataResponse>('/api/v2/system/data/latest', { params }).then((r) => r.data)
}

// ─── History (TimescaleDB) ───────────────────────────────────────────────────

export interface HistoryRange {
  startTime: string
  endTime: string
}

export const getHistoryStatus = () =>
  apiClient.get<HistoryStatus>('/api/v2/system/history/status').then((r) => r.data)

export const getHistorySources = (range?: HistoryRange) =>
  apiClient
    .get<{ sources: HistorySource[] }>('/api/v2/system/history/sources', { params: range })
    .then((r) => r.data.sources)

export const getHistoryMeasurements = (source: string, range?: HistoryRange) =>
  apiClient
    .get<{ measurements: HistoryMeasurement[] }>('/api/v2/system/history/measurements', {
      params: { source, ...range },
    })
    .then((r) => r.data.measurements)

export const getHistorySeries = (
  source: string,
  measurements: string[],
  range: HistoryRange,
  maxPoints = 400,
) =>
  apiClient
    .get<HistorySeriesResponse>('/api/v2/system/history/series', {
      params: { source, measurements: measurements.join(','), maxPoints, ...range },
      timeout: 30000,
    })
    .then((r) => r.data)

export const getHistoryRecords = (
  source: string | undefined,
  range: HistoryRange,
  limit = 50,
  offset = 0,
) =>
  apiClient
    .get<HistoryRecordsResponse>('/api/v2/system/history/records', {
      params: { source: source || undefined, limit, offset, ...range },
      timeout: 30000,
    })
    .then((r) => r.data)

// ─── Mapping ─────────────────────────────────────────────────────────────────

export const getMappedEntities = () =>
  apiClient.get<EntitiesResponse>('/api/v2/system/mapping/entities').then((r) => r.data)

// ─── Storage ─────────────────────────────────────────────────────────────────

export const getStorageConfig = () =>
  apiClient.get<StorageConfigResponse>('/api/v2/system/config/storage').then((r) => r.data.storage)

/** Save without applying (applied on next reload/restart) */
export const updateStorageConfig = (storage: StorageConfig) =>
  apiClient.put('/api/v2/system/config/storage', { storage }).then((r) => r.data)

export const getStorageTypes = () =>
  apiClient
    .get<{ types: StorageTypeInfo[] }>('/api/v2/system/config/storage/types')
    .then((r) => r.data.types)

/** Non-destructive: connects, runs a health check and disconnects */
export const testStorageConnection = (config: StorageConfig) =>
  apiClient
    .post<StorageTestResult>('/api/v2/system/config/storage/test', config, { timeout: 30000 })
    .then((r) => r.data.test)

export const getStorageHealth = () =>
  apiClient.get<StorageHealthResponse>('/api/v2/system/config/storage/health').then((r) => r.data.storage)

/** Validate, test, switch the running engine to this storage and save it */
export const configureStorage = (config: StorageConfig) =>
  apiClient.post('/api/v2/system/config/storage/configure', config, { timeout: 30000 }).then((r) => r.data)
