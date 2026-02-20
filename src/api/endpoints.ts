import { apiClient } from './client'
import type {
  StatusResponse,
  SourcesResponse,
  Source,
  DataResponse,
  EntitiesResponse,
  StorageConfig,
  StorageHealthResponse,
  StorageTestResult,
  StorageTypeInfo,
} from './types'

// ─── Status ──────────────────────────────────────────────────────────────────

export const getStatus = () =>
  apiClient.get<StatusResponse>('/api/status').then((r) => r.data)

export const getHealth = () =>
  apiClient.get('/api/status/health').then((r) => r.data)

// ─── Sources ─────────────────────────────────────────────────────────────────

export const getSources = () =>
  apiClient.get<SourcesResponse>('/api/sources').then((r) => r.data)

export const startSource = (id: string) =>
  apiClient.post(`/api/sources/${encodeURIComponent(id)}/start`).then((r) => r.data)

export const stopSource = (id: string) =>
  apiClient.post(`/api/sources/${encodeURIComponent(id)}/stop`).then((r) => r.data)

export const restartSource = (id: string) =>
  apiClient.post(`/api/sources/${encodeURIComponent(id)}/restart`).then((r) => r.data)

// ─── Config / Sources CRUD ───────────────────────────────────────────────────

export const createSource = (source: Omit<Source, 'runtime'>) =>
  apiClient.post('/api/config/sources', source).then((r) => r.data)

export const updateSource = (id: string, source: Partial<Omit<Source, 'runtime'>>) =>
  apiClient
    .put(`/api/config/sources/${encodeURIComponent(id)}`, source)
    .then((r) => r.data)

export const deleteSource = (id: string) =>
  apiClient.delete(`/api/config/sources/${encodeURIComponent(id)}`).then((r) => r.data)

export const reloadConfig = () =>
  apiClient.post('/api/config/reload').then((r) => r.data)

// ─── Data ────────────────────────────────────────────────────────────────────

export const getLatestData = (limit = 50, sourceId?: string) => {
  const params: Record<string, unknown> = { limit }
  if (sourceId) params.source = sourceId
  return apiClient.get<DataResponse>('/api/data/latest', { params }).then((r) => r.data)
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

export const getMappedEntities = () =>
  apiClient.get<EntitiesResponse>('/api/mapping/entities').then((r) => r.data)

// ─── Storage ─────────────────────────────────────────────────────────────────

export const getStorageConfig = () =>
  apiClient.get<{ storage: StorageConfig }>('/api/config/storage').then((r) => r.data)

export const updateStorageConfig = (config: StorageConfig) =>
  apiClient.put('/api/config/storage', config).then((r) => r.data)

export const getStorageTypes = () =>
  apiClient.get<{ types: StorageTypeInfo[] }>('/api/config/storage/types').then((r) => r.data)

export const testStorageConnection = (config: StorageConfig) =>
  apiClient
    .post<StorageTestResult>('/api/config/storage/test', config)
    .then((r) => r.data)

export const getStorageHealth = () =>
  apiClient.get<StorageHealthResponse>('/api/config/storage/health').then((r) => r.data)

export const configureStorage = (config: StorageConfig) =>
  apiClient.post('/api/config/storage/configure', config).then((r) => r.data)
