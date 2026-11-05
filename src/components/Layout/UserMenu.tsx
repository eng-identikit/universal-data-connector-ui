import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
import GroupIcon from '@mui/icons-material/Group'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import MapIcon from '@mui/icons-material/Map'
import { getTileUrl } from '../EntityMap'
import { usePrincipal } from '../../context/AuthContext'
import { changeMyPassword } from '../../api/bff'
import { auth } from '../../api/auth'
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
      const res = await changeMyPassword(current, next)
      // The change invalidates older tokens: switch to the new pair
      session.setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken })
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

function MapTilesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [tiles, setTiles] = useState(getTileUrl())
  const save = (url: string) => {
    try {
      if (url.trim()) localStorage.setItem('udc-map-tiles', url.trim())
      else localStorage.removeItem('udc-map-tiles')
    } catch {
      // storage unavailable: keep the default tiles
    }
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} TransitionProps={{ onEnter: () => setTiles(getTileUrl()) }} maxWidth="sm" fullWidth>
      <DialogTitle>{t('settings.mapTiles')}</DialogTitle>
      <DialogContent>
        <TextField value={tiles} onChange={(e) => setTiles(e.target.value)} fullWidth size="small" helperText={t('settings.mapTilesHelp')} sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => save('')}>
          {t('settings.resetDefaults')}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={() => save(tiles)}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/** The UI user: role, own password (local login) or Keycloak account, UI users (admin), logout. */
export default function UserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { principal, logout } = usePrincipal()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [tilesOpen, setTilesOpen] = useState(false)

  if (!principal) return null
  const local = principal.source === 'local'
  const accountUrl = auth.accountUrl()

  return (
    <>
      <Button
        color="inherit"
        size="small"
        startIcon={<AccountCircleIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ textTransform: 'none' }}
      >
        {principal.displayName || principal.username}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {principal.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t(`roles.${principal.role}`)}
            {!local && ' · Keycloak'}
          </Typography>
        </Box>
        <Divider />
        {local && principal.role === 'admin' && (
          <MenuItem
            onClick={() => {
              setAnchor(null)
              navigate('/users')
            }}
          >
            <ListItemIcon>
              <GroupIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('uiUsers.title')}</ListItemText>
          </MenuItem>
        )}
        {local ? (
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
        ) : (
          accountUrl && (
            <MenuItem component="a" href={accountUrl} target="_blank" rel="noreferrer" onClick={() => setAnchor(null)}>
              <ListItemIcon>
                <OpenInNewIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('userMenu.account')}</ListItemText>
            </MenuItem>
          )
        )}
        <MenuItem
          onClick={() => {
            setAnchor(null)
            setTilesOpen(true)
          }}
        >
          <ListItemIcon>
            <MapIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('settings.mapTiles')}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('userMenu.logout')}</ListItemText>
        </MenuItem>
      </Menu>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <MapTilesDialog open={tilesOpen} onClose={() => setTilesOpen(false)} />
    </>
  )
}
