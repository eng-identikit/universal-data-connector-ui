import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  TextField,
  Alert,
  Snackbar,
  Divider,
  CircularProgress,
  Chip,
  Skeleton,
} from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import {
  getStorageConfig,
  getStorageTypes,
  getStorageHealth,
  testStorageConnection,
  configureStorage,
} from '../../api/endpoints'
import type { StorageConfig, StorageTypeInfo, StorageHealthResponse } from '../../api/types'

const STORAGE_ICONS: Record<string, string> = {
  memory: '🧠',
  redis: '🔴',
  timescaledb: '🐘',
}

export default function Storage() {
  const { t } = useTranslation()

  const [current, setCurrent] = useState<StorageConfig | null>(null)
  const [health, setHealth] = useState<StorageHealthResponse | null>(null)
  const [types, setTypes] = useState<StorageTypeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit form state
  const [selectedType, setSelectedType] = useState('memory')
  const [configJson, setConfigJson] = useState('{}')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  })

  const showSnack = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity })

  const defaultConfigs: Record<string, Record<string, unknown>> = {
    memory: { maxRecords: 10000, ttl: 604800000 },
    redis: { host: 'localhost', port: 6379, password: '', db: 0, keyPrefix: 'udc:', ttl: 86400 },
    timescaledb: {
      host: 'localhost',
      port: 5432,
      database: 'udc',
      username: 'postgres',
      password: '',
      table: 'sensor_data',
    },
  }

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [configRes, typesRes, healthRes] = await Promise.allSettled([
        getStorageConfig(),
        getStorageTypes(),
        getStorageHealth(),
      ])

      if (configRes.status === 'fulfilled') {
        setCurrent(configRes.value.storage)
        setSelectedType(configRes.value.storage?.type ?? 'memory')
        setConfigJson(JSON.stringify(configRes.value.storage?.config ?? {}, null, 2))
      }
      if (typesRes.status === 'fulfilled') {
        setTypes(typesRes.value.types ?? [])
      }
      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage info')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType)
    setConfigJson(JSON.stringify(defaultConfigs[newType] ?? {}, null, 2))
    setJsonError(null)
  }

  const parseConfig = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(configJson)
      setJsonError(null)
      return parsed
    } catch {
      setJsonError('Invalid JSON')
      return null
    }
  }

  const handleTest = async () => {
    const config = parseConfig()
    if (!config) return
    setTesting(true)
    try {
      const result = await testStorageConnection({ type: selectedType, config })
      if (result.success) {
        showSnack(t('storage.testSuccess'))
      } else {
        showSnack(result.message || t('storage.testFailed'), 'error')
      }
    } catch (err) {
      showSnack(err instanceof Error ? err.message : t('storage.testFailed'), 'error')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    const config = parseConfig()
    if (!config) return
    setSaving(true)
    try {
      await configureStorage({ type: selectedType, config })
      showSnack(t('storage.saveSuccess'))
      fetchAll()
    } catch (err) {
      showSnack(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>{t('storage.title')}</Typography>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {t('storage.title')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Current status card */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <StorageIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  {t('storage.currentConfig')}
                </Typography>
              </Box>
              {current ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6">
                      {STORAGE_ICONS[current.type] ?? '💾'} {current.type}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      p: 1.5,
                      maxHeight: 120,
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(current.config, null, 2)}
                  </Box>
                </Box>
              ) : (
                <Typography color="text.secondary">{t('common.noData')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                {health?.connected ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
                <Typography variant="subtitle1" fontWeight={600}>
                  {t('storage.health')}
                </Typography>
                <Chip
                  label={health?.connected ? t('connectorStatus.connected') : t('connectorStatus.disconnected')}
                  color={health?.connected ? 'success' : 'error'}
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              </Box>
              {health?.details && (
                <Box
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  {JSON.stringify(health.details, null, 2)}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change storage config */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('storage.changeStorage')}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Storage type cards */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('storage.availableTypes')}
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {[
              { key: 'memory', title: t('storage.memory'), desc: t('storage.memoryDesc') },
              { key: 'redis', title: t('storage.redis'), desc: t('storage.redisDesc') },
              { key: 'timescaledb', title: t('storage.timescaledb'), desc: t('storage.timescaledbDesc') },
            ].map(({ key, title, desc }) => (
              <Grid item xs={12} sm={4} key={key}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    borderColor: selectedType === key ? 'primary.main' : 'divider',
                    borderWidth: selectedType === key ? 2 : 1,
                    transition: 'all 0.15s',
                  }}
                  onClick={() => handleTypeChange(key)}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {STORAGE_ICONS[key]} {title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <TextField
            label={t('storage.config')}
            multiline
            minRows={6}
            maxRows={12}
            fullWidth
            value={configJson}
            onChange={(e) => {
              setConfigJson(e.target.value)
              try { JSON.parse(e.target.value); setJsonError(null) } catch { setJsonError('Invalid JSON') }
            }}
            error={!!jsonError}
            helperText={jsonError}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleTest}
              disabled={testing || !!jsonError}
              startIcon={testing ? <CircularProgress size={16} /> : undefined}
            >
              {t('storage.testConnection')}
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !!jsonError}
              startIcon={saving ? <CircularProgress size={16} /> : undefined}
            >
              {t('storage.applyAndReload')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
