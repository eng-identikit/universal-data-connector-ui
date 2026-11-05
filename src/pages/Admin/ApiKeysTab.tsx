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
  MenuItem,
  IconButton,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import BlockIcon from '@mui/icons-material/Block'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { listApiKeys, createApiKey, revokeApiKey, getTypes, ROLES, type ApiKey, type Role } from '../../api/broker'
import ConfirmDialog from '../../components/ConfirmDialog'
import { formatTime } from '../Entities/format'

function CreateKeyDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('operator')
  const [allowedTypes, setAllowedTypes] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState('')
  const [knownTypes, setKnownTypes] = useState<string[]>([])
  const [created, setCreated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setRole('operator')
    setAllowedTypes([])
    setExpiresAt('')
    setCreated(null)
    setError(null)
    getTypes()
      .then((types) => setKnownTypes(types.map((x) => x.type)))
      .catch(() => setKnownTypes([]))
  }, [open])

  const handleCreate = async () => {
    try {
      setError(null)
      const key = await createApiKey({
        name: name.trim(),
        role,
        allowedTypes: allowedTypes.length ? allowedTypes : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      })
      setCreated(key.key)
      onCreated()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('admin.newApiKey')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {created ? (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('admin.keyShownOnce')}
            </Alert>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography fontFamily={MONO} fontSize="0.85rem" sx={{ wordBreak: 'break-all', flexGrow: 1 }}>
                {created}
              </Typography>
              <Tooltip title={t('admin.copy')}>
                <IconButton size="small" onClick={() => navigator.clipboard?.writeText(created)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('admin.keyUsage')}
            </Typography>
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} size="small" autoFocus />
            <TextField select label={t('admin.role')} value={role} onChange={(e) => setRole(e.target.value as Role)} size="small">
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {t(`roles.${r}`)}
                </MenuItem>
              ))}
            </TextField>
            <Autocomplete
              multiple
              freeSolo
              options={knownTypes}
              value={allowedTypes}
              onChange={(_, v) => setAllowedTypes(v)}
              renderInput={(params) => (
                <TextField {...params} size="small" label={t('admin.allowedTypes')} helperText={t('admin.allowedTypesHelp')} />
              )}
            />
            <TextField
              label={t('admin.expiresAt')}
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              helperText={t('admin.expiresHelp')}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.close')}
        </Button>
        {!created && (
          <Button variant="contained" onClick={handleCreate} disabled={!name.trim()}>
            {t('admin.generate')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default function ApiKeysTab({ tenant }: { tenant: string }) {
  const { t } = useTranslation()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)

  const load = useCallback(async () => {
    try {
      setKeys(await listApiKeys())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, tenant])

  const status = (k: ApiKey) => {
    if (k.revokedAt) return <Chip size="small" label={t('admin.revoked')} />
    if (k.expiresAt && new Date(k.expiresAt) < new Date()) return <Chip size="small" color="warning" label={t('admin.expired')} />
    return <Chip size="small" color="success" label={t('admin.active')} />
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          {t('admin.newApiKey')}
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('common.name')}</TableCell>
            <TableCell>{t('admin.prefix')}</TableCell>
            <TableCell>{t('admin.role')}</TableCell>
            <TableCell>{t('admin.allowedTypes')}</TableCell>
            <TableCell>{t('common.status')}</TableCell>
            <TableCell>{t('admin.lastUsed')}</TableCell>
            <TableCell>{t('admin.expiresAt')}</TableCell>
            <TableCell align="right">{t('common.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {keys.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ color: 'text.secondary' }}>
                {t('admin.noKeys')}
              </TableCell>
            </TableRow>
          )}
          {keys.map((k) => (
            <TableRow key={k.id} hover sx={{ opacity: k.revokedAt ? 0.5 : 1 }}>
              <TableCell>
                {k.name}
                <Typography variant="caption" color="text.secondary" display="block">
                  {k.createdBy ?? '—'} · {formatTime(k.createdAt)}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontFamily: MONO }}>{k.prefix}…</TableCell>
              <TableCell>{t(`roles.${k.role}`)}</TableCell>
              <TableCell>
                {k.allowedTypes?.map((x) => <Chip key={x} size="small" label={x} sx={{ mr: 0.5 }} />) ?? t('admin.allTypes')}
              </TableCell>
              <TableCell>{status(k)}</TableCell>
              <TableCell>{formatTime(k.lastUsedAt)}</TableCell>
              <TableCell>{formatTime(k.expiresAt)}</TableCell>
              <TableCell align="right">
                {!k.revokedAt && (
                  <Tooltip title={t('admin.revoke')}>
                    <IconButton size="small" onClick={() => setRevoking(k)}>
                      <BlockIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateKeyDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <ConfirmDialog
        open={!!revoking}
        title={t('admin.revoke')}
        message={t('admin.revokeMessage', { name: revoking?.name })}
        onCancel={() => setRevoking(null)}
        onConfirm={async () => {
          const k = revoking
          setRevoking(null)
          if (!k) return
          try {
            await revokeApiKey(k.id)
            await load()
          } catch (err) {
            setError((err as Error).message)
          }
        }}
      />
    </Box>
  )
}
