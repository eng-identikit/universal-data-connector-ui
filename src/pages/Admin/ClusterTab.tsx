import { MONO } from '../../theme'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Tooltip,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { getCluster, type ClusterStatus } from '../../api/broker'

const REFRESH_MS = 5000

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

const ageS = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000))

/** Instances, work split (leases) and queue backlogs. */
export default function ClusterTab() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ClusterStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setStatus(await getCluster())
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  if (error) return <Alert severity="error">{error}</Alert>
  if (!status) return null

  const owned = (id: string, prefix: string) =>
    status.leases.filter((l) => l.valid && l.owner === id && l.resource.startsWith(prefix)).map((l) => l.resource.slice(prefix.length))
  const alive = status.instances.filter((i) => i.alive)
  const q = status.queues

  return (
    <Box>
      {!status.enabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('cluster.single')}
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <Metric label={t('cluster.instances')} value={`${alive.length} / ${status.instances.length}`} hint={t('cluster.alive')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <Metric
            label={t('cluster.ingestBacklog')}
            value={q.ingest ? q.ingest.pending : '—'}
            hint={q.ingest ? t('cluster.inFlight', { n: q.ingest.inFlight }) : undefined}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Metric
            label={t('cluster.notifyBacklog')}
            value={q.notify ? q.notify.pending : '—'}
            hint={q.notify ? t('cluster.inFlight', { n: q.notify.inFlight }) : undefined}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Metric
            label={t('cluster.ingested')}
            value={q.ingestStats.written.toLocaleString()}
            hint={t('cluster.rejected', { n: q.ingestStats.rejected })}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {t('cluster.instances')}
      </Typography>
      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>{t('cluster.instance')}</TableCell>
            <TableCell>{t('common.status')}</TableCell>
            <TableCell align="right">{t('cluster.heartbeat')}</TableCell>
            {status.enabled && <TableCell align="right">{t('cluster.subPartitions')}</TableCell>}
            {status.enabled && <TableCell align="right">{t('cluster.ingestPartitions')}</TableCell>}
            {status.enabled && <TableCell>{t('cluster.connectors')}</TableCell>}
            <TableCell align="right">
              <Tooltip title={t('cluster.loopHelp')}>
                <span>{t('cluster.loop')}</span>
              </Tooltip>
            </TableCell>
            <TableCell align="right">{t('cluster.apply')}</TableCell>
            <TableCell align="right">{t('cluster.memory')}</TableCell>
            <TableCell align="right">{t('cluster.streamClients')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {status.instances.map((i) => (
            <TableRow key={i.id} sx={{ opacity: i.alive ? 1 : 0.5 }}>
              <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem' }}>
                {i.id}
                {i.id === status.self && <Chip size="small" label={t('cluster.this')} sx={{ ml: 1, height: 18 }} />}
              </TableCell>
              <TableCell>
                {i.alive ? <CheckCircleIcon fontSize="small" color="success" /> : <CancelIcon fontSize="small" color="disabled" />}
              </TableCell>
              <TableCell align="right">{ageS(i.heartbeatAt)} s</TableCell>
              {status.enabled && <TableCell align="right">{owned(i.id, 'sub:').length}</TableCell>}
              {status.enabled && <TableCell align="right">{owned(i.id, 'ingest:').length}</TableCell>}
              {status.enabled && (
                <TableCell sx={{ fontSize: '0.75rem' }}>{owned(i.id, 'connector:').join(', ') || '—'}</TableCell>
              )}
              <TableCell align="right">
                {i.info.loopDelayP99Ms !== undefined ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    color={i.info.loopDelayP99Ms > 200 ? 'warning' : 'default'}
                    label={`${i.info.loopDelayP99Ms} ms`}
                  />
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell align="right">{i.info.ingest?.applyMsAvg != null ? `${i.info.ingest.applyMsAvg} ms` : '—'}</TableCell>
              <TableCell align="right">{i.info.memoryMb != null ? `${i.info.memoryMb} MB` : '—'}</TableCell>
              <TableCell align="right">{i.info.stream?.clients ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {q.ingestStats.lastError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('cluster.lastIngestError')}: {q.ingestStats.lastError}
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary">
        {status.enabled ? t('cluster.help', { partitions: status.partitions, tick: (status.tickMs ?? 0) / 1000 }) : t('cluster.singleHelp')}
      </Typography>
    </Box>
  )
}
