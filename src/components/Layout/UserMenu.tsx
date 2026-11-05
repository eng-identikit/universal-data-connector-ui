import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Box,
  Typography,
} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import KeyIcon from '@mui/icons-material/Key'
import DevicesIcon from '@mui/icons-material/Devices'
import { useAuth } from '../../context/AuthContext'
import { changePassword, listMySessions, revokeMySession, type Session } from '../../api/broker'
import SessionsTable from '../SessionsTable'
import { session } from '../../api/session'

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirm('')
    setError(null)
    setDone(false)
  }

  const submit = async () => {
    if (next !== confirm) {
      setError(t('userMenu.passwordMismatch'))
      return
    }
    try {
      setError(null)
      const s = await changePassword(current, next)
      // The change revokes old tokens: switch to the new pair
      session.setTokens({ accessToken: s.accessToken, refreshToken: s.refreshToken })
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} TransitionProps={{ onExited: reset }} maxWidth="xs" fullWidth>
      <DialogTitle>{t('userMenu.changePassword')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {done ? (
          <Alert severity="success">{t('userMenu.passwordChanged')}</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label={t('userMenu.currentPassword')} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} size="small" autoComplete="current-password" />
            <TextField label={t('userMenu.newPassword')} type="password" value={next} onChange={(e) => setNext(e.target.value)} size="small" autoComplete="new-password" helperText={t('admin.passwordHelp')} />
            <TextField label={t('userMenu.confirmPassword')} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} size="small" autoComplete="new-password" />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.close')}
        </Button>
        {!done && (
          <Button variant="contained" onClick={submit} disabled={!current || next.length < 8}>
            {t('common.save')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

function MySessionsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      setSessions(await listMySessions())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const revoke = async (s: Session) => {
    if (s.current) return logout()
    try {
      await revokeMySession(s.id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('sessions.mine')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('sessions.mineHelp')}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <SessionsTable sessions={sessions} onRevoke={revoke} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function UserMenu() {
  const { t } = useTranslation()
  const { user, role, logout } = useAuth()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)

  if (!user) return null

  return (
    <>
      <Button
        color="inherit"
        size="small"
        startIcon={<AccountCircleIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ textTransform: 'none' }}
      >
        {user.displayName || user.username}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {user.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.isSuperadmin ? 'superadmin' : role ? t(`roles.${role}`) : '—'}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null)
            setPasswordOpen(true)
          }}
        >
          <ListItemIcon>
            <KeyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('userMenu.changePassword')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null)
            setSessionsOpen(true)
          }}
        >
          <ListItemIcon>
            <DevicesIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('sessions.mine')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('userMenu.logout')}</ListItemText>
        </MenuItem>
      </Menu>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <MySessionsDialog open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
    </>
  )
}
