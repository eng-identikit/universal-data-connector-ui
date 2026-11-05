import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { createUdc, updateUdc, type Position, type Udc, type UdcInput } from '../../api/bff'

export const UDC_COLORS = ['#4c8dff', '#2fbf71', '#a78bfa', '#f0a63a', '#3fb4e8', '#f0605d', '#ec4899', '#14b8a6']

interface Props {
  open: boolean
  /** Instance to edit; null registers a new one */
  udc: Udc | null
  position: Position
  onClose: () => void
  onSaved: (udc: Udc) => void
}

/** Registers a UDC instance (URL + service key, or superadmin credentials used once) or edits one. */
export default function UdcDialog({ open, udc, position, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', description: '', url: '', publicUrl: '', color: UDC_COLORS[0], apiKey: '', username: '', password: '' })
  const [method, setMethod] = useState<'key' | 'credentials'>('credentials')
  const [force, setForce] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      name: udc?.name ?? '',
      description: udc?.description ?? '',
      url: udc?.url ?? '',
      publicUrl: udc?.publicUrl ?? '',
      color: udc?.color ?? UDC_COLORS[0],
      apiKey: '',
      username: '',
      password: '',
    })
    setMethod(udc ? 'key' : 'credentials')
    setForce(false)
    setError(null)
  }, [open, udc])

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const credentialsGiven = method === 'key' ? !!form.apiKey.trim() : !!form.username.trim() && !!form.password
  const valid = !!form.name.trim() && /^https?:\/\//.test(form.url.trim()) && (udc ? true : credentialsGiven)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const body: Partial<UdcInput> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        url: form.url.trim(),
        publicUrl: form.publicUrl.trim() || null,
        color: form.color,
      }
      if (method === 'key' && form.apiKey.trim()) body.apiKey = form.apiKey.trim()
      if (method === 'credentials' && form.username.trim()) {
        body.username = form.username.trim()
        body.password = form.password
      }
      const saved = udc ? await updateUdc(udc.id, body) : await createUdc({ ...(body as UdcInput), position, force })
      onSaved(saved)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{udc ? t('udcDialog.editTitle', { name: udc.name }) : t('udcDialog.newTitle')}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label={t('common.name')} value={form.name} onChange={(e) => set('name', e.target.value)} size="small" required autoFocus />
          <TextField label={t('common.description')} value={form.description} onChange={(e) => set('description', e.target.value)} size="small" />
          <TextField
            label={t('udcDialog.url')}
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            size="small"
            required
            placeholder="http://udc:3000"
            helperText={t('udcDialog.urlHelp')}
          />
          <TextField
            label={t('udcDialog.publicUrl')}
            value={form.publicUrl}
            onChange={(e) => set('publicUrl', e.target.value)}
            size="small"
            placeholder="https://udc.example.com"
            helperText={t('udcDialog.publicUrlHelp')}
          />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
              {t('udcDialog.color')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {UDC_COLORS.map((c) => (
                <Box
                  key={c}
                  role="button"
                  aria-label={c}
                  onClick={() => set('color', c)}
                  sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#fff' }}
                >
                  {form.color === c && <CheckIcon sx={{ fontSize: 16 }} />}
                </Box>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {t('udcDialog.access')}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
              {udc ? t('udcDialog.accessEditHelp') : t('udcDialog.accessHelp')}
            </Typography>
            <ToggleButtonGroup size="small" exclusive value={method} onChange={(_, v) => v && setMethod(v)} sx={{ mb: 1.5 }}>
              <ToggleButton value="credentials">{t('udcDialog.byCredentials')}</ToggleButton>
              <ToggleButton value="key">{t('udcDialog.byKey')}</ToggleButton>
            </ToggleButtonGroup>
            {method === 'key' ? (
              <TextField
                label={t('udcDialog.serviceKey')}
                value={form.apiKey}
                onChange={(e) => set('apiKey', e.target.value)}
                size="small"
                fullWidth
                placeholder="udc_..."
                helperText={t('udcDialog.serviceKeyHelp')}
              />
            ) : (
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField label={t('login.username')} value={form.username} onChange={(e) => set('username', e.target.value)} size="small" fullWidth autoComplete="off" />
                <TextField label={t('login.password')} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} size="small" fullWidth autoComplete="new-password" />
              </Box>
            )}
          </Box>
          {!udc && (
            <FormControlLabel
              control={<Checkbox size="small" checked={force} onChange={(e) => setForce(e.target.checked)} />}
              label={<Typography variant="body2">{t('udcDialog.force')}</Typography>}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={save} disabled={!valid || busy}>
          {udc ? t('common.save') : t('udcDialog.register')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
