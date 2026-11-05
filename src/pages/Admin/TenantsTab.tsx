import { MONO } from '../../theme'
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
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { listTenants, createTenant, updateTenant, deleteTenant, type Tenant } from '../../api/broker'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/ConfirmDialog'

const TENANT_ID_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/

export default function TenantsTab() {
  const { t } = useTranslation()
  const { reload } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [error, setError] = useState<string | null>(null)
  // null: closed; {} new tenant; { tenant } edit
  const [editing, setEditing] = useState<{ tenant?: Tenant } | null>(null)
  const [form, setForm] = useState({ id: '', name: '', description: '' })
  const [deleting, setDeleting] = useState<Tenant | null>(null)

  const load = useCallback(async () => {
    try {
      setTenants(await listTenants())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const open = (tenant?: Tenant) => {
    setForm({ id: tenant?.id ?? '', name: tenant?.name ?? '', description: tenant?.description ?? '' })
    setEditing({ tenant })
  }

  const run = async (fn: () => Promise<unknown>) => {
    try {
      setError(null)
      await fn()
      await load()
      // Tenant list in the top bar comes from /auth/me
      await reload()
      return true
    } catch (err) {
      setError((err as Error).message)
      return false
    }
  }

  const save = async () => {
    const ok = await run(() =>
      editing?.tenant
        ? updateTenant(editing.tenant.id, { name: form.name, description: form.description })
        : createTenant({ id: form.id, name: form.name || undefined, description: form.description || undefined }),
    )
    if (ok) setEditing(null)
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>
          {t('admin.newTenant')}
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>{t('common.name')}</TableCell>
            <TableCell>{t('admin.description')}</TableCell>
            <TableCell align="right">{t('nav.entities')}</TableCell>
            <TableCell align="right">{t('admin.members')}</TableCell>
            <TableCell align="right">{t('common.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.map((x) => (
            <TableRow key={x.id} hover>
              <TableCell sx={{ fontFamily: MONO }}>{x.id}</TableCell>
              <TableCell>{x.name}</TableCell>
              <TableCell>{x.description ?? '—'}</TableCell>
              <TableCell align="right">{x.entityCount ?? '—'}</TableCell>
              <TableCell align="right">{x.memberCount ?? '—'}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <IconButton size="small" onClick={() => open(x)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={x.id === 'default'} onClick={() => setDeleting(x)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing?.tenant ? t('admin.editTenant') : t('admin.newTenant')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="ID"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              disabled={!!editing?.tenant}
              size="small"
              error={form.id !== '' && !TENANT_ID_RE.test(form.id)}
              helperText={t('admin.tenantIdHelp')}
            />
            <TextField
              label={t('common.name')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              size="small"
            />
            <TextField
              label={t('admin.description')}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              size="small"
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} color="inherit">
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={save} disabled={!editing?.tenant && !TENANT_ID_RE.test(form.id)}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title={t('admin.deleteTenant')}
        message={t('admin.deleteTenantMessage', { id: deleting?.id, count: deleting?.entityCount ?? 0 })}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const x = deleting
          setDeleting(null)
          if (x) run(() => deleteTenant(x.id))
        }}
      />
    </Box>
  )
}
