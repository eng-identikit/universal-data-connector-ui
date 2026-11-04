import { useState } from 'react'
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
import { useAuth } from '../../context/AuthContext'
import { changePassword } from '../../api/broker'
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

export default function UserMenu() {
  const { t } = useTranslation()
  const { user, role, logout } = useAuth()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)

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
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('userMenu.logout')}</ListItemText>
        </MenuItem>
      </Menu>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  )
}
