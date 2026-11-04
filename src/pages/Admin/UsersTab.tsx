import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listTenants,
  ROLES,
  type User,
  type Role,
  type Tenant,
} from '../../api/broker'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/ConfirmDialog'

interface FormState {
  username: string
  displayName: string
  password: string
  isSuperadmin: boolean
  disabled: boolean
  tenant: string
  role: Role
}

const EMPTY: FormState = { username: '', displayName: '', password: '', isSuperadmin: false, disabled: false, tenant: '', role: 'viewer' }

export default function UsersTab() {
  const { t } = useTranslation()
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ user?: User } | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [deleting, setDeleting] = useState<User | null>(null)

  const load = useCallback(async () => {
    try {
      const [u, tn] = await Promise.all([listUsers(), listTenants()])
      setUsers(u)
      setTenants(tn)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const open = (user?: User) => {
    setForm(
      user
        ? { ...EMPTY, username: user.username, displayName: user.displayName ?? '', isSuperadmin: user.isSuperadmin, disabled: user.disabled }
        : { ...EMPTY, tenant: tenants[0]?.id ?? '' },
    )
    setEditing({ user })
  }

  const save = async () => {
    try {
      setError(null)
      if (editing?.user) {
        await updateUser(editing.user.id, {
          displayName: form.displayName,
          isSuperadmin: form.isSuperadmin,
          disabled: form.disabled,
          password: form.password || undefined,
        })
      } else {
        await createUser({
          username: form.username.trim(),
          password: form.password,
          displayName: form.displayName || undefined,
          isSuperadmin: form.isSuperadmin,
          tenants: form.tenant ? [{ tenant: form.tenant, role: form.role }] : [],
        })
      }
      setEditing(null)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const isNew = !editing?.user
  const canSave = isNew ? form.username.trim().length >= 3 && form.password.length >= 8 : form.password === '' || form.password.length >= 8

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>
          {t('admin.newUser')}
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('login.username')}</TableCell>
            <TableCell>{t('admin.displayName')}</TableCell>
            <TableCell>{t('admin.tenantsRoles')}</TableCell>
            <TableCell>{t('common.status')}</TableCell>
            <TableCell align="right">{t('common.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} hover>
              <TableCell>
                {u.username}
                {u.isSuperadmin && <Chip size="small" color="secondary" label="superadmin" sx={{ ml: 1 }} />}
              </TableCell>
              <TableCell>{u.displayName ?? '—'}</TableCell>
              <TableCell>
                {u.tenants?.map((m) => (
                  <Chip key={m.tenant} size="small" variant="outlined" label={`${m.tenant}: ${t(`roles.${m.role}`)}`} sx={{ mr: 0.5 }} />
                ))}
              </TableCell>
              <TableCell>
                {u.disabled ? <Chip size="small" label={t('admin.disabled')} /> : <Chip size="small" color="success" label={t('admin.active')} />}
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <IconButton size="small" onClick={() => open(u)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={u.id === me?.id} onClick={() => setDeleting(u)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{isNew ? t('admin.newUser') : t('admin.editUser', { user: editing?.user?.username })}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('login.username')}
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              disabled={!isNew}
              size="small"
            />
            <TextField
              label={t('admin.displayName')}
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              size="small"
            />
            <TextField
              label={isNew ? t('login.password') : t('admin.newPasswordOptional')}
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              size="small"
              autoComplete="new-password"
              helperText={t('admin.passwordHelp')}
            />
            {isNew && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  select
                  label={t('admin.tenant')}
                  value={form.tenant}
                  onChange={(e) => set('tenant', e.target.value)}
                  size="small"
                  sx={{ flexGrow: 1 }}
                >
                  <MenuItem value="">—</MenuItem>
                  {tenants.map((x) => (
                    <MenuItem key={x.id} value={x.id}>
                      {x.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label={t('admin.role')}
                  value={form.role}
                  onChange={(e) => set('role', e.target.value as Role)}
                  size="small"
                  sx={{ width: 140 }}
                  disabled={!form.tenant}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {t(`roles.${r}`)}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            )}
            <FormControlLabel
              control={<Switch checked={form.isSuperadmin} onChange={(e) => set('isSuperadmin', e.target.checked)} />}
              label="Superadmin"
            />
            {!isNew && (
              <FormControlLabel
                control={<Switch checked={form.disabled} onChange={(e) => set('disabled', e.target.checked)} />}
                label={t('admin.disabled')}
                disabled={editing?.user?.id === me?.id}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} color="inherit">
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={save} disabled={!canSave}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title={t('admin.deleteUser')}
        message={t('admin.deleteUserMessage', { user: deleting?.username })}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const u = deleting
          setDeleting(null)
          if (!u) return
          try {
            await deleteUser(u.id)
            await load()
          } catch (err) {
            setError((err as Error).message)
          }
        }}
      />
    </Box>
  )
}
