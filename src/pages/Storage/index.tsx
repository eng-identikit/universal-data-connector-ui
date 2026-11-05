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
import { useNavigate } from 'react-router-dom'
import {
  getStorageConfig,
  getStorageHealth,
  testStorageConnection,
  configureStorage,
} from '../../api/endpoints'
import type { StorageConfig, StorageHealth, StorageRuntimeInfo } from '../../api/types'
import PageHeader from '../../components/PageHeader'
import { CodeBlock, CodeTag } from '../../components/Code'
import { MONO } from '../../theme'
import { useAuth } from '../../context/AuthContext'

export default function Storage() {
  const { t } = useTranslation()

  const navigate = useNavigate()
  // Storage is global infrastructure: only a superadmin may test or change it
  const canManage = !!useAuth().user?.isSuperadmin
  const [current, setCurrent] = useState<StorageConfig | null>(null)
  const [alternatives, setAlternatives] = useState<Record<string, StorageConfig>>({})
  const [runtime, setRuntime] = useState<StorageRuntimeInfo | null>(null)
  const [health, setHealth] = useState<StorageHealth | null>(null)
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
    memory: { maxDataPoints: 10000 },
    redis: { host: 'localhost', port: 6379, password: '', database: 0, keyPrefix: 'udc:', ttl: 86400 },
    timescaledb: {
      host: 'localhost',
      port: 5432,
      database: 'udc',
      username: 'postgres',
      password: '',
      table: 'sensor_data',
      compression: false,
      retentionPolicy: null,
    },
  }

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [configRes, healthRes] = await Promise.allSettled([getStorageConfig(), getStorageHealth()])

      if (configRes.status === 'fulfilled') {
        const { current: cur, alternatives: alts, runtime: rt } = configRes.value
        setCurrent(cur)
        setAlternatives(alts ?? {})
        setRuntime(rt)
        setSelectedType(cur?.type ?? 'memory')
        setConfigJson(JSON.stringify(cur?.config ?? {}, null, 2))
      } else {
        setError(configRes.reason instanceof Error ? configRes.reason.message : 'Failed to load storage info')
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
    // Prefer the saved configuration for this type, then the preset, then defaults
    const saved =
      (current?.type === newType ? current.config : undefined) ??
      alternatives[newType]?.config ??
      defaultConfigs[newType] ??
      {}
    setConfigJson(JSON.stringify(saved, null, 2))
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
        showSnack(`${t('storage.testSuccess')} (${result.responseTime} ms)`)
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
        <PageHeader title={t('storage.title')} />
        <Skeleton variant="rounded" height={140} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={300} />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader title={t('storage.title')} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {runtime?.fallback && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            {t('storage.fallbackTitle', { type: runtime.configuredType })}
          </Typography>
          <Typography variant="body2">
            {runtime.fallback.reason} · {t('storage.fallbackSince')} {new Date(runtime.fallback.since).toLocaleString()}
            {runtime.retryInterval ? ` · ${t('storage.fallbackRetry', { seconds: Math.round(runtime.retryInterval / 1000) })}` : ''}
          </Typography>
        </Alert>
      )}

      {/* Current status card */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <StorageIcon color="primary" />
                <Typography variant="subtitle1">
                  {t('storage.currentConfig')}
                </Typography>
              </Box>
              {current ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <CodeTag>{current.type}</CodeTag>
                    {runtime && runtime.type !== current.type && (
                      <Chip size="small" color="warning" variant="outlined" label={t('storage.activeNow', { type: runtime.type })} />
                    )}
                    {current.type === 'timescaledb' && (
                      <Button size="small" sx={{ ml: 'auto' }} onClick={() => navigate('/history')}>
                        {t('storage.openHistory')}
                      </Button>
                    )}
                  </Box>
                  <CodeBlock maxHeight={160}>{JSON.stringify(current.config, null, 2)}</CodeBlock>
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
                <Typography variant="subtitle1">
                  {t('storage.health')}
                </Typography>
                <Chip
                  label={
                    health?.status === 'fallback'
                      ? t('storage.statusFallback')
                      : health?.connected
                        ? t('connectorStatus.connected')
                        : t('connectorStatus.disconnected')
                  }
                  color={health?.status === 'fallback' ? 'warning' : health?.connected ? 'success' : 'error'}
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              </Box>
              {health?.statistics && (
                <CodeBlock maxHeight={160}>{JSON.stringify(health.statistics, null, 2)}</CodeBlock>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change storage config */}
      {canManage && (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
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
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    borderColor: selectedType === key ? 'primary.main' : 'divider',
                    bgcolor: selectedType === key ? 'action.selected' : undefined,
                    transition: 'border-color 0.15s, background-color 0.15s',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                  onClick={() => handleTypeChange(key)}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" color={selectedType === key ? 'primary' : undefined}>
                      {title}
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
            InputProps={{ sx: { fontFamily: MONO, fontSize: '0.8rem' } }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
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
      )}

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
