import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SendIcon from '@mui/icons-material/Send'
import ReplayIcon from '@mui/icons-material/Replay'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  getSubscription,
  deleteSubscription,
  pauseSubscription,
  resumeSubscription,
  testSubscription,
  resetSubscriptionStats,
  listDlq,
  replayDlq,
  purgeDlq,
  type Subscription,
  type DlqItem,
  type Notification,
} from '../../api/broker'
import { useCan } from '../../context/AuthContext'
import { useBrokerStream } from '../../hooks/useBrokerStream'
import ConfirmDialog from '../../components/ConfirmDialog'
import SubscriptionWizard from './SubscriptionWizard'
import { channelIcon } from './channelIcon'
import { destination, selectorSummary, statusColor, statusOf } from './format'
import { formatTime } from '../Entities/format'
import PageHeader from '../../components/PageHeader'
import { CodeBlock } from '../../components/Code'
import { MONO } from '../../theme'

const MAX_LIVE = 100

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {label}
        </Typography>
        <Typography variant="h6" color={color} noWrap>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

function NotificationRow({ n, extra }: { n: Notification; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            <ExpandMoreIcon fontSize="small" sx={{ transform: open ? 'rotate(180deg)' : undefined }} />
          </IconButton>
        </TableCell>
        <TableCell>{formatTime(n.timestamp)}</TableCell>
        <TableCell>
          <Chip size="small" label={n.reason} variant="outlined" />
        </TableCell>
        <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem' }}>
          {n.entities.map((e) => String(e.id)).slice(0, 3).join(', ')}
          {n.entities.length > 3 && ` +${n.entities.length - 3}`}
        </TableCell>
        {extra}
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, border: open ? undefined : 'none' }}>
          <Collapse in={open}>
            <CodeBlock maxHeight={300} sx={{ my: 1 }}>{JSON.stringify(n, null, 2)}</CodeBlock>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function SubscriptionDetail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const canWrite = useCan('operator')
  const [sub, setSub] = useState<Subscription | null>(null)
  const [dlq, setDlq] = useState<DlqItem[]>([])
  const [live, setLive] = useState<Notification[]>([])
  const [tab, setTab] = useState<'overview' | 'dlq' | 'live'>('overview')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([getSubscription(id), listDlq(id)])
      setSub(s)
      setDlq(d)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [id])

  // Polling pauses while the edit dialog is open, so the form is not reset under the user
  useEffect(() => {
    if (editing) return
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [load, editing])

  const isWs = sub?.notify.channel === 'websocket'
  const stream = useBrokerStream(
    [{ id: 'notif', subscription: id }],
    (msg) => {
      if (msg.type === 'notification') setLive((l) => [msg.notification, ...l].slice(0, MAX_LIVE))
    },
    isWs && tab === 'live',
  )

  const run = async (fn: () => Promise<unknown>, message?: string) => {
    try {
      setError(null)
      await fn()
      if (message) setInfo(message)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (!sub) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} color="inherit" onClick={() => navigate('/subscriptions')} sx={{ mb: 2, ml: -1 }}>
          {t('entity.back')}
        </Button>
        {error ? <Alert severity="error">{error}</Alert> : <Skeleton variant="rounded" height={240} />}
      </Box>
    )
  }

  const status = statusOf(sub)
  const st = sub.stats

  return (
    <Box>
      <PageHeader
        overline={
          <Button startIcon={<ArrowBackIcon />} color="inherit" onClick={() => navigate('/subscriptions')} sx={{ mb: 1, ml: -1 }}>
            {t('entity.back')}
          </Button>
        }
        title={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            {sub.name}
            <Chip size="small" color={statusColor[status]} label={t(`subs.status.${status}`)} />
          </Box>
        }
        subtitle={
          <>
            {sub.description && <Box>{sub.description}</Box>}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
              {channelIcon[sub.notify.channel]}
              <Typography variant="caption" fontFamily={MONO}>
                {destination(sub)}
              </Typography>
            </Box>
          </>
        }
        actions={canWrite && (
          <>
            <Button
              variant="outlined"
              startIcon={<SendIcon />}
              onClick={() =>
                run(async () => {
                  const r = await testSubscription(sub.id)
                  if (!r.ok) throw new Error(t('subs.testFailed', { error: r.error }))
                  setInfo(t('subs.testOk', { ms: r.latencyMs }))
                })
              }
            >
              {t('subs.test')}
            </Button>
            {sub.enabled ? (
              <Button variant="outlined" startIcon={<PauseIcon />} onClick={() => run(() => pauseSubscription(sub.id))}>
                {t('subs.pause')}
              </Button>
            ) : (
              <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={() => run(() => resumeSubscription(sub.id))}>
                {t('subs.resume')}
              </Button>
            )}
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>
              {t('common.delete')}
            </Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
          </>
        )}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>
          {info}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Stat label={t('subs.matched')} value={st?.matched ?? 0} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Stat label={t('subs.delivered')} value={st?.delivered ?? 0} color="success.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          {/* Waiting for their next attempt now; the total of failed attempts is in the list */}
          <Stat label={t('subs.retrying')} value={st?.retrying ?? 0} color={st?.retrying ? 'warning.main' : undefined} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Stat label="DLQ" value={st?.dlq ?? 0} color={st?.dlq ? 'error.main' : undefined} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Stat label={t('subs.latency')} value={st?.lastLatencyMs != null ? `${st.lastLatencyMs} ms` : '—'} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Stat label={t('subs.lastNotification')} value={st?.lastNotificationAt ? new Date(st.lastNotificationAt).toLocaleTimeString() : '—'} />
        </Grid>
      </Grid>
      {st?.lastError && status === 'failing' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('subs.lastError')}: {st.lastError} ({formatTime(st.lastFailureAt)})
        </Alert>
      )}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="overview" label={t('subs.configuration')} />
          <Tab value="dlq" label={`DLQ (${dlq.length})`} />
          {isWs && <Tab value="live" label={t('subs.live')} />}
        </Tabs>

        {tab === 'overview' && (
          <CardContent>
            <Grid container spacing={2}>
              {[
                [t('subs.selector'), selectorSummary(sub)],
                [t('subs.onEvents'), sub.trigger.on.map((o) => t(`subs.op.${o}`)).join(', ')],
                [t('subs.watched'), sub.trigger.attrs.join(', ') || t('subs.allAttrs')],
                [t('subs.deadband'), Object.entries(sub.trigger.deadband).map(([k, v]) => `${k} ±${v}`).join(', ') || '—'],
                [t('subs.filter'), sub.filter ? `${sub.filter} (${sub.filterMode})` : '—'],
                [t('subs.throttle'), sub.throttleMs ? `${sub.throttleMs / 1000}` : '—'],
                [t('subs.periodic'), sub.periodicMs ? `${sub.periodicMs / 1000}` : '—'],
                [t('subs.projection'), sub.notify.attrs?.join(', ') || t('subs.allAttrs')],
                [t('subs.format'), `${sub.notify.format}${sub.notify.perEntity ? ` · ${t('subs.perEntity')}` : ''}`],
                [
                  t('subs.output'),
                  sub.notify.transform?.expression
                    ? t('subs.outputCustom')
                    : sub.notify.transformer
                      ? `${t('subs.outputLibrary')}: ${sub.notify.transformer}`
                      : t('subs.outputNone'),
                ],
                [t('subs.delivery'), `${sub.delivery.maxRetries} × ${sub.delivery.backoffMs / 1000}s`],
                [t('subs.expiresAt'), formatTime(sub.expiresAt)],
                [t('subs.createdBy'), `${sub.createdBy ?? '—'} · ${formatTime(sub.createdAt)}`],
              ].map(([label, value]) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" fontFamily={label === t('subs.filter') ? MONO : undefined} sx={{ wordBreak: 'break-word' }}>
                    {value}
                  </Typography>
                </Grid>
              ))}
            </Grid>
            {canWrite && (
              <Button size="small" startIcon={<RestartAltIcon />} sx={{ mt: 2 }} onClick={() => run(() => resetSubscriptionStats(sub.id))}>
                {t('subs.resetStats')}
              </Button>
            )}
          </CardContent>
        )}

        {tab === 'dlq' && (
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('subs.dlqHelp')}
            </Typography>
            {canWrite && dlq.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button size="small" variant="contained" startIcon={<ReplayIcon />} onClick={() => run(() => replayDlq(sub.id), t('subs.replayed'))}>
                  {t('subs.replayAll')}
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteSweepIcon />} onClick={() => run(() => purgeDlq(sub.id))}>
                  {t('subs.purgeAll')}
                </Button>
              </Box>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={40} />
                  <TableCell>{t('subs.failedAt')}</TableCell>
                  <TableCell>{t('subs.reason')}</TableCell>
                  <TableCell>{t('nav.entities')}</TableCell>
                  <TableCell>{t('subs.error')}</TableCell>
                  <TableCell align="right">{t('subs.attempts')}</TableCell>
                  {canWrite && <TableCell align="right">{t('common.actions')}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {dlq.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>
                      {t('subs.dlqEmpty')}
                    </TableCell>
                  </TableRow>
                )}
                {dlq.map((d) => (
                  <NotificationRow
                    key={d.id}
                    n={{ ...d.notification, timestamp: d.failedAt }}
                    extra={
                      <>
                        <TableCell sx={{ color: 'error.main', fontSize: '0.75rem' }}>{d.error}</TableCell>
                        <TableCell align="right">{d.attempts}</TableCell>
                        {canWrite && (
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Tooltip title={t('subs.replay')}>
                              <IconButton size="small" onClick={() => run(() => replayDlq(sub.id, [d.id]), t('subs.replayed'))}>
                                <ReplayIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('common.delete')}>
                              <IconButton size="small" color="error" onClick={() => run(() => purgeDlq(sub.id, [d.id]))}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </>
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}

        {tab === 'live' && (
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip size="small" color={stream.connected ? 'success' : 'default'} label={stream.connected ? t('dashboard.online') : t('dashboard.offline')} />
              <Typography variant="caption" color="text.secondary">
                {t('subs.liveHelp')}
              </Typography>
            </Box>
            <Table size="small">
              <TableBody>
                {live.length === 0 && (
                  <TableRow>
                    <TableCell align="center" sx={{ color: 'text.secondary' }}>
                      {t('subs.liveWaiting')}
                    </TableCell>
                  </TableRow>
                )}
                {live.map((n) => (
                  <NotificationRow key={n.id} n={n} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      <SubscriptionWizard
        open={editing}
        subscription={sub}
        onClose={() => setEditing(false)}
        onSaved={(s) => {
          setEditing(false)
          setSub({ ...s, stats: sub.stats })
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t('subs.deleteTitle')}
        message={t('subs.deleteMessage', { name: sub.name })}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          run(async () => {
            await deleteSubscription(sub.id)
            navigate('/subscriptions')
          })
        }}
      />
    </Box>
  )
}
