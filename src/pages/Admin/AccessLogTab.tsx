import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Chip,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { AUTH_EVENT_KINDS, listAuthEvents, listUsers, type AuthEvent, type AuthEventKind, type User } from '../../api/broker'
import { describeClient, dateTime } from '../../utils/format'
import { MONO } from '../../theme'

const KIND_COLOR: Record<AuthEventKind, 'success' | 'error' | 'warning' | 'default' | 'info'> = {
  login: 'success',
  login_failed: 'error',
  login_blocked: 'error',
  logout: 'default',
  refresh_reuse: 'warning',
  session_revoked: 'info',
  user_sessions_revoked: 'info',
}

/** datetime-local value → ISO, or undefined */
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined)

/** Superadmin: logins, failed and blocked attempts, logouts and revocations. */
export default function AccessLogTab() {
  const { t } = useTranslation()
  const [events, setEvents] = useState<AuthEvent[]>([])
  const [total, setTotal] = useState(0)
  const [users, setUsers] = useState<User[]>([])
  const [userId, setUserId] = useState('')
  const [kind, setKind] = useState<AuthEventKind | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const r = await listAuthEvents({
        userId: userId || undefined,
        kind: kind || undefined,
        from: toIso(from),
        to: toIso(to),
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      })
      setEvents(r.events)
      setTotal(r.total)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [userId, kind, from, to, page, rowsPerPage])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]))
  }, [])

  // Any filter change starts again from the first page
  const filter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(0)
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField select label={t('sessions.user')} value={userId} onChange={(e) => filter(setUserId)(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">{t('sessions.allUsers')}</MenuItem>
          {users.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.username}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label={t('accessLog.event')} value={kind} onChange={(e) => filter(setKind)(e.target.value as AuthEventKind | '')} sx={{ minWidth: 200 }}>
          <MenuItem value="">{t('accessLog.allEvents')}</MenuItem>
          {AUTH_EVENT_KINDS.map((k) => (
            <MenuItem key={k} value={k}>
              {t(`accessLog.kind.${k}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField type="datetime-local" label={t('accessLog.from')} value={from} onChange={(e) => filter(setFrom)(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="datetime-local" label={t('accessLog.to')} value={to} onChange={(e) => filter(setTo)(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={t('common.refresh')}>
          <IconButton onClick={load}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {!events.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          {t('accessLog.none')}
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('accessLog.time')}</TableCell>
              <TableCell>{t('accessLog.event')}</TableCell>
              <TableCell>{t('sessions.user')}</TableCell>
              <TableCell>{t('sessions.address')}</TableCell>
              <TableCell>{t('sessions.client')}</TableCell>
              <TableCell>{t('accessLog.details')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateTime(e.at)}</TableCell>
                <TableCell>
                  <Chip size="small" color={KIND_COLOR[e.kind] === 'default' ? undefined : KIND_COLOR[e.kind]} label={t(`accessLog.kind.${e.kind}`)} />
                </TableCell>
                <TableCell>{e.username ?? '—'}</TableCell>
                <TableCell sx={{ fontFamily: MONO, fontSize: '0.8125rem' }}>{e.ip ?? '—'}</TableCell>
                <TableCell>
                  <Tooltip title={e.userAgent || ''}>
                    <span>{describeClient(e.userAgent)}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {[e.actor && t('accessLog.by', { actor: e.actor }), e.detail].filter(Boolean).join(' · ') || '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value))
          setPage(0)
        }}
        rowsPerPageOptions={[25, 50, 100, 200]}
        labelRowsPerPage={t('accessLog.rowsPerPage')}
      />
    </Box>
  )
}
