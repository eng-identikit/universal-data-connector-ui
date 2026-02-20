import { useTranslation } from 'react-i18next'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  Avatar,
  LinearProgress,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import MemoryIcon from '@mui/icons-material/Memory'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import DataUsageIcon from '@mui/icons-material/DataUsage'
import DeviceHubIcon from '@mui/icons-material/DeviceHub'
import StatusChip from '../../components/StatusChip'
import { useUDCStatus } from '../../hooks/useUDCStatus'

function formatUptime(seconds: number): string {
  if (!seconds) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  subtitle?: string
}) {
  const theme = useTheme()
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
        <Avatar sx={{ bgcolor: color + '22', color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.disabled">
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { status, loading, error } = useUDCStatus(5000)
  const theme = useTheme()

  if (loading && !status) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          {t('dashboard.title')}
        </Typography>
        <Grid container spacing={2}>
          {[...Array(4)].map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  const isOnline = !!status && !error
  const memPct = status
    ? Math.round((status.memory.used / status.memory.total) * 100)
    : 0

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight={700}>
        {t('dashboard.title')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('dashboard.serverNotReachable')}: {error}
        </Alert>
      )}

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.serverStatus')}
            value={isOnline ? t('dashboard.online') : t('dashboard.offline')}
            icon={isOnline ? <CheckCircleIcon /> : <ErrorIcon />}
            color={isOnline ? theme.palette.success.main : theme.palette.error.main}
            subtitle={status?.system?.nodeVersion ?? undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.uptime')}
            value={formatUptime(status?.system?.uptime ?? 0)}
            icon={<AccessTimeIcon />}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalDataPoints')}
            value={(status?.engine?.totalDataPoints ?? 0).toLocaleString()}
            icon={<DataUsageIcon />}
            color={theme.palette.primary.main}
            subtitle={
              status?.engine?.lastDataReceived
                ? new Date(status.engine.lastDataReceived).toLocaleTimeString()
                : undefined
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.activeConnectors')}
            value={`${status?.connectors?.filter((c) => c.runtime?.status === 'connected').length ?? 0} / ${status?.connectors?.length ?? 0}`}
            icon={<DeviceHubIcon />}
            color={theme.palette.secondary.main}
          />
        </Grid>
      </Grid>

      {/* Memory usage */}
      {status && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <MemoryIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={600}>
                {t('dashboard.memoryUsage')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                {status.memory.used} MB / {status.memory.total} MB
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={memPct}
              color={memPct > 80 ? 'error' : memPct > 60 ? 'warning' : 'primary'}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary">
              RSS: {status.memory.rss} MB &nbsp;·&nbsp; External: {status.memory.external} MB
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Connector overview */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('dashboard.connectorOverview')}
          </Typography>
          {!status?.connectors?.length ? (
            <Typography color="text.secondary" variant="body2">
              {t('dashboard.noConnectors')}
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('connectors.id')}</TableCell>
                    <TableCell>{t('connectors.type')}</TableCell>
                    <TableCell>{t('common.status')}</TableCell>
                    <TableCell align="right">{t('connectors.dataPoints')}</TableCell>
                    <TableCell align="right">{t('connectors.errors')}</TableCell>
                    <TableCell>{t('connectors.lastActivity')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {status.connectors.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {c.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: theme.palette.action.selected,
                            fontFamily: 'monospace',
                          }}
                        >
                          {c.type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={c.runtime?.status ?? 'unknown'} />
                      </TableCell>
                      <TableCell align="right">
                        {c.runtime?.stats?.dataPoints?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={(c.runtime?.stats?.errors ?? 0) > 0 ? 'error.main' : 'text.primary'}
                        >
                          {c.runtime?.stats?.errors ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {c.runtime?.lastActivity
                            ? new Date(c.runtime.lastActivity).toLocaleTimeString()
                            : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* System info */}
      {status?.system && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {t('dashboard.systemInfo')}
            </Typography>
            <Grid container spacing={1}>
              {[
                { label: t('dashboard.nodeVersion'), value: status.system.nodeVersion },
                { label: t('dashboard.platform'), value: `${status.system.platform} (${status.system.arch})` },
                { label: t('dashboard.pid'), value: status.system.pid },
              ].map(({ label, value }) => (
                <Grid item xs={12} sm={4} key={label}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      {value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
