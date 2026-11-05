import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, Chip, IconButton, MenuItem, TextField, Tooltip, Typography } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { listSessions, listUsers, revokeSession, revokeUserSessions, type Session, type User } from '../../api/broker'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import SessionsTable from '../../components/SessionsTable'

const REFRESH_MS = 15000

/** Superadmin: who is logged in now, with revocation of a session or of all of a user's. */
export default function SessionsTab() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [store, setStore] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [userId, setUserId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<Session | null>(null)
  const [revokingAll, setRevokingAll] = useState<User | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await listSessions(userId || undefined)
      setSessions(r.sessions)
      setStore(r.store)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [userId])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]))
  }, [])

  const online = useMemo(() => new Set(sessions.map((s) => s.userId)).size, [sessions])
  const selectedUser = users.find((u) => u.id === userId) ?? null

  const confirmRevoke = async () => {
    const s = revoking
    setRevoking(null)
    if (!s) return
    try {
      await revokeSession(s.id)
      // Revoking one's own current session is a logout
      if (s.current) return logout()
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const confirmRevokeAll = async () => {
    const u = revokingAll
    setRevokingAll(null)
    if (!u) return
    try {
      const mine = sessions.some((s) => s.userId === u.id && s.current)
      await revokeUserSessions(u.id)
      if (mine) return logout()
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField select label={t('sessions.user')} value={userId} onChange={(e) => setUserId(e.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="">{t('sessions.allUsers')}</MenuItem>
          {users.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.displayName ? `${u.displayName} (${u.username})` : u.username}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">
          {t('sessions.summary', { sessions: sessions.length, users: online })}
        </Typography>
        {store && (
          <Tooltip title={t('sessions.storeHelp')}>
            <Chip size="small" variant="outlined" label={store === 'redis' ? 'Redis' : 'PostgreSQL'} />
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={t('common.refresh')}>
          <IconButton onClick={load}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {selectedUser && (
          <Button variant="outlined" color="error" onClick={() => setRevokingAll(selectedUser)} disabled={!sessions.length}>
            {t('sessions.revokeAll')}
          </Button>
        )}
      </Box>

      <SessionsTable sessions={sessions} showUser onRevoke={setRevoking} onSelectUser={setUserId} />

      <ConfirmDialog
        open={!!revoking}
        title={t('sessions.revokeTitle')}
        message={t(revoking?.current ? 'sessions.revokeOwnMessage' : 'sessions.revokeMessage', {
          user: revoking?.username ?? '',
          ip: revoking?.ip ?? '—',
        })}
        confirmLabel={t('sessions.revoke')}
        onConfirm={confirmRevoke}
        onCancel={() => setRevoking(null)}
      />
      <ConfirmDialog
        open={!!revokingAll}
        title={t('sessions.revokeAll')}
        message={t('sessions.revokeAllMessage', { user: revokingAll?.username ?? '' })}
        confirmLabel={t('sessions.revokeAll')}
        onConfirm={confirmRevokeAll}
        onCancel={() => setRevokingAll(null)}
      />
    </Box>
  )
}
