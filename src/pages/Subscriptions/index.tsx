import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  Skeleton,
  Snackbar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SendIcon from '@mui/icons-material/Send'
import {
  listSubscriptions,
  pauseSubscription,
  resumeSubscription,
  testSubscription,
  type Subscription,
} from '../../api/broker'
import { useCan } from '../../context/AuthContext'
import SubscriptionWizard from './SubscriptionWizard'
import { channelIcon } from './channelIcon'
import { destination, selectorSummary, statusColor, statusOf } from './format'
import { formatTime } from '../Entities/format'

const REFRESH_MS = 5000

export default function Subscriptions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canWrite = useCan('operator')
  const [subs, setSubs] = useState<Subscription[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setSubs(await listSubscriptions())
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const act = async (e: React.MouseEvent, fn: () => Promise<unknown>) => {
    e.stopPropagation()
    try {
      await fn()
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const runTest = (e: React.MouseEvent, s: Subscription) =>
    act(e, async () => {
      const r = await testSubscription(s.id)
      setToast(r.ok ? t('subs.testOk', { ms: r.latencyMs }) : t('subs.testFailed', { error: r.error }))
    })

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t('subs.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('subs.subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('common.refresh')}>
            <IconButton onClick={load} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {canWrite && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setWizardOpen(true)} size="small">
              {t('subs.new')}
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('subs.selector')}</TableCell>
                <TableCell>{t('subs.channel')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('subs.delivered')}</TableCell>
                <TableCell align="right">{t('subs.failed')}</TableCell>
                <TableCell align="right">DLQ</TableCell>
                <TableCell>{t('subs.lastNotification')}</TableCell>
                {canWrite && <TableCell align="right">{t('common.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {!subs &&
                [0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ))}
              {subs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('subs.empty')}
                  </TableCell>
                </TableRow>
              )}
              {subs?.map((s) => {
                const status = statusOf(s)
                return (
                  <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/subscriptions/${s.id}`)}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {s.name}
                      </Typography>
                      {s.filter && (
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace" sx={{ display: 'block', maxWidth: 320 }} noWrap>
                          {s.filter}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {selectorSummary(s)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {channelIcon[s.notify.channel]}
                        <Typography variant="caption" noWrap sx={{ maxWidth: 220 }}>
                          {destination(s)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={status === 'failing' ? s.stats?.lastError ?? '' : ''}>
                        <Chip size="small" color={statusColor[status]} label={t(`subs.status.${status}`)} />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{s.stats?.delivered ?? 0}</TableCell>
                    <TableCell align="right">{s.stats?.failedAttempts ?? 0}</TableCell>
                    <TableCell align="right">
                      {s.stats?.dlq ? <Chip size="small" color="error" label={s.stats.dlq} /> : 0}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(s.stats?.lastNotificationAt)}
                      </Typography>
                    </TableCell>
                    {canWrite && (
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title={t('subs.test')}>
                          <IconButton size="small" onClick={(e) => runTest(e, s)}>
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {s.enabled ? (
                          <Tooltip title={t('subs.pause')}>
                            <IconButton size="small" onClick={(e) => act(e, () => pauseSubscription(s.id))}>
                              <PauseIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title={t('subs.resume')}>
                            <IconButton size="small" onClick={(e) => act(e, () => resumeSubscription(s.id))}>
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <SubscriptionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={(s) => {
          setWizardOpen(false)
          navigate(`/subscriptions/${s.id}`)
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />
    </Box>
  )
}
