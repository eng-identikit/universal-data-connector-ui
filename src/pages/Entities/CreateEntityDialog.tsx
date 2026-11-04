import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Alert,
  Tabs,
  Tab,
  Box,
  Grid,
} from '@mui/material'
import { createEntity, type Entity, type EntityInput } from '../../api/broker'

const ID_RE = /^[A-Za-z0-9_\-:.]{1,256}$/
const TYPE_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/

interface Props {
  open: boolean
  types: string[]
  onCancel: () => void
  onCreated: (entity: Entity) => void
}

const JSON_TEMPLATE = `{
  "id": "plant1:line1:machine01",
  "type": "Machine",
  "attrs": {
    "temperature": { "value": 21.5, "unit": "°C" },
    "partOf": { "target": "plant1:line1" }
  }
}`

export default function CreateEntityDialog({ open, types, onCancel, onCreated }: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [id, setId] = useState('')
  const [type, setType] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [json, setJson] = useState(JSON_TEMPLATE)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setId('')
      setType('')
      setLat('')
      setLon('')
      setError(null)
    }
  }, [open])

  const build = (): EntityInput => {
    if (mode === 'json') {
      try {
        return JSON.parse(json)
      } catch {
        throw new Error(t('attr.errJson'))
      }
    }
    const body: EntityInput = { id: id.trim(), type: type.trim() }
    if (lat !== '' || lon !== '') {
      const la = Number(lat)
      const lo = Number(lon)
      if (!Number.isFinite(la) || !Number.isFinite(lo)) throw new Error(t('entities.errLocation'))
      body.location = { type: 'Point', coordinates: [lo, la] }
    }
    return body
  }

  const handleCreate = async () => {
    setBusy(true)
    setError(null)
    try {
      onCreated(await createEntity(build()))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const formValid = ID_RE.test(id.trim()) && TYPE_RE.test(type.trim())

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{t('entities.create')}</DialogTitle>
      <DialogContent>
        <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 2 }}>
          <Tab value="form" label={t('entities.form')} />
          <Tab value="json" label="JSON" />
        </Tabs>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {mode === 'form' ? (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                fullWidth
                size="small"
                autoFocus
                error={id !== '' && !ID_RE.test(id.trim())}
                helperText={t('entities.idHelp')}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={types}
                inputValue={type}
                onInputChange={(_, v) => setType(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('common.type')}
                    size="small"
                    error={type !== '' && !TYPE_RE.test(type.trim())}
                    helperText={t('entities.typeHelp')}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField label={t('entities.latitude')} value={lat} onChange={(e) => setLat(e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField label={t('entities.longitude')} value={lon} onChange={(e) => setLon(e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{t('entities.attrsAfterCreate')}</Box>
            </Grid>
          </Grid>
        ) : (
          <TextField
            value={json}
            onChange={(e) => setJson(e.target.value)}
            fullWidth
            multiline
            minRows={12}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleCreate} variant="contained" disabled={busy || (mode === 'form' && !formValid)}>
          {t('entities.createButton')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
