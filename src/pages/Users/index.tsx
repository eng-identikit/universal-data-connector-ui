import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { createUiUser, deleteUiUser, listUiUsers, updateUiUser, type UiUser } from '../../api/bff'
import { ROLES, type Role } from '../../api/broker'
import { usePrincipal } from '../../context/AuthContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import HeaderControls from '../../components/Layout/HeaderControls'
import PageHeader from '../../components/PageHeader'
import { dateTime } from '../../utils/format'

interface FormState {
  username: string
  displayName: string
  password: string
  role: Role
  disabled: boolean
}

const EMPTY: FormState = { username: '', displayName: '', password: '', role: 'viewer', disabled: false }

/** Users of the UI (local login): who can see the board and what they can change. */
export default function UiUsers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { principal } = usePrincipal()
  const [users, setUsers] = useState<UiUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<UiUser | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<UiUser | null>(null)

  const load = useCallback(async () => {
    try {
      setUsers(await listUiUsers())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const open = (user: UiUser | 'new') => {
    setEditing(user)
    setFormError(null)
    setForm(user === 'new' ? EMPTY : { username: user.username, displayName: user.displayName ?? '', password: '', role: user.role, disabled: user.disabled })
  }

  const save = async () => {
    try {
      setFormError(null)
      if (editing === 'new') {
        await createUiUser({ username: form.username.trim(), password: form.password, displayName: form.displayName.trim() || undefined, role: form.role })
      } else if (editing) {
        await updateUiUser(editing.id, {
          displayName: form.displayName.trim() || null,
          role: form.role,
          disabled: form.disabled,
          ...(form.password && { password: form.password }),
        })
      }
      setEditing(null)
      await load()
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  const confirmRemove = async () => {
    const u = removing
    setRemoving(null)
    if (!u) return
    try {
      await deleteUiUser(u.id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const isNew = editing === 'new'
  const valid = isNew ? form.username.trim().length >= 3 && form.password.length >= 8 : !form.password || form.password.length >= 8

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ height: 60, display: 'flex', alignItems: 'center', gap: 1, px: 2.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          {t('board.back')}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <HeaderControls />
      </Box>
      <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
        <PageHeader
          title={t('uiUsers.title')}
          subtitle={t('uiUsers.subtitle')}
          actions={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => open('new')}>
              {t('uiUsers.add')}
            </Button>
          }
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Card>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('login.username')}</TableCell>
                <TableCell>{t('admin.displayName')}</TableCell>
                <TableCell>{t('admin.role')}</TableCell>
                <TableCell>{t('board.state')}</TableCell>
                <TableCell>{t('uiUsers.created')}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {u.username}
                      {u.id === principal?.id && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({t('uiUsers.you')})
                        </Typography>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>{u.displayName ?? '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={t(`roles.${u.role}`)} color={u.role === 'admin' ? 'primary' : 'default'} variant={u.role === 'admin' ? 'filled' : 'outlined'} />
                  </TableCell>
                  <TableCell>{u.disabled ? <Chip size="small" color="warning" variant="outlined" label={t('board.disabled')} /> : t('board.enabled')}</TableCell>
                  <TableCell>{dateTime(u.createdAt)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={t('common.edit')}>
                      <IconButton size="small" onClick={() => open(u)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                      <span>
                        <IconButton size="small" color="error" disabled={u.id === principal?.id} onClick={() => setRemoving(u)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
          {t('uiUsers.rolesHelp')}
        </Typography>
      </Box>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{isNew ? t('uiUsers.add') : t('uiUsers.edit', { name: typeof editing === 'object' && editing ? editing.username : '' })}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label={t('login.username')} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} size="small" disabled={!isNew} autoFocus={isNew} />
            <TextField label={t('admin.displayName')} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} size="small" />
            <TextField
              label={isNew ? t('login.password') : t('uiUsers.newPassword')}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              size="small"
              autoComplete="new-password"
              helperText={t('admin.passwordHelp')}
            />
            <TextField select label={t('admin.role')} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} size="small">
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {t(`roles.${r}`)}
                </MenuItem>
              ))}
            </TextField>
            {!isNew && (
              <FormControlLabel control={<Switch checked={form.disabled} onChange={(e) => setForm({ ...form, disabled: e.target.checked })} />} label={t('uiUsers.disabled')} />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} color="inherit">
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={save} disabled={!valid}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        title={t('uiUsers.deleteTitle')}
        message={t('uiUsers.deleteMessage', { name: removing?.username ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </Box>
  )
}
