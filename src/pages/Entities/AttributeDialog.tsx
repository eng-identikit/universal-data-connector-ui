import { MONO } from '../../theme'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material'
import { ATTR_TYPES, type Attribute, type AttrType } from '../../api/broker'
import { getSources } from '../../api/endpoints'
import type { Source } from '../../api/types'

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/

// Write call templates per connector type ("$value" is replaced by the commanded value)
const COMMAND_TEMPLATES: Record<string, { method: string; args: unknown[] }> = {
  opcua: { method: 'writeNode', args: ['ns=2;s=Setpoint', '$value', 'Double'] },
  modbus: { method: 'writeRegister', args: [100, '$value', 'holding'] },
  s7: { method: 'writeVariable', args: ['DB1,REAL0', '$value'] },
  'siemens-s7': { method: 'writeVariable', args: ['DB1,REAL0', '$value'] },
  cip: { method: 'writeTag', args: ['Setpoint', '$value'] },
  'ethernet-ip': { method: 'writeTag', args: ['Setpoint', '$value'] },
  bacnet: { method: 'writeObject', args: [1234, 2, 1, '$value'] },
  melsec: { method: 'writeDevice', args: ['D', 100, '$value', 'word'] },
  ethercat: { method: 'writeOutput', args: ['EL2008', 'Channel1', '$value'] },
  profinet: { method: 'writeOutput', args: ['device1', 'output1', '$value'] },
  aas: { method: 'writeProperty', args: ['Submodel', 'Property', '$value'] },
  i3x: { method: 'writeValue', args: ['elementId', '$value'] },
  dds: { method: 'writeOutput', args: ['output', '$value'] },
}

interface Props {
  open: boolean
  /** Existing attribute name when editing; undefined to add a new one */
  name?: string
  attr?: Attribute
  existingNames: string[]
  onCancel: () => void
  onSave: (name: string, attr: Partial<Attribute>) => Promise<void>
}

interface FormState {
  name: string
  type: AttrType
  value: string
  boolValue: boolean
  target: string
  unit: string
  quality: string
  source: string
  writable: boolean
  meta: string
  commandConnector: string
  commandMethod: string
  commandArgs: string
}

// datetime-local wants 'YYYY-MM-DDTHH:mm' in local time
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function initialState(name?: string, attr?: Attribute): FormState {
  const type = attr?.type ?? 'float'
  let value = ''
  if (attr?.value !== undefined && attr.value !== null) {
    if (type === 'json') value = JSON.stringify(attr.value, null, 2)
    else if (type === 'datetime') value = toLocalInput(String(attr.value))
    else value = String(attr.value)
  }
  return {
    name: name ?? '',
    type,
    value,
    boolValue: attr?.value === true,
    target: attr?.target ?? '',
    unit: attr?.unit ?? '',
    quality: attr?.quality ?? '',
    source: attr?.source ?? '',
    writable: !!attr?.writable,
    meta: attr?.meta ? JSON.stringify(attr.meta, null, 2) : '',
    commandConnector: String(attr?.command?.connector ?? ''),
    commandMethod: String(attr?.command?.method ?? ''),
    commandArgs: attr?.command?.args ? JSON.stringify(attr.command.args) : '["$value"]',
  }
}

/** Builds the attribute body, or throws a translated validation message key. */
function buildAttr(f: FormState): Partial<Attribute> {
  const attr: Partial<Attribute> = { type: f.type }
  if (f.type === 'relationship') {
    if (!f.target.trim()) throw new Error('attr.errTarget')
    attr.target = f.target.trim()
  } else if (f.type === 'bool') {
    attr.value = f.boolValue
  } else if (f.value.trim() !== '') {
    if (f.type === 'float' || f.type === 'int') {
      const n = Number(f.value)
      if (!Number.isFinite(n) || (f.type === 'int' && !Number.isInteger(n))) throw new Error('attr.errNumber')
      attr.value = n
    } else if (f.type === 'json') {
      try {
        attr.value = JSON.parse(f.value)
      } catch {
        throw new Error('attr.errJson')
      }
    } else if (f.type === 'datetime') {
      attr.value = new Date(f.value).toISOString()
    } else {
      attr.value = f.value
    }
  }
  if (f.type !== 'relationship' && f.unit.trim()) attr.unit = f.unit.trim()
  if (f.quality) attr.quality = f.quality as Attribute['quality']
  if (f.source.trim()) attr.source = f.source.trim()
  if (f.writable) attr.writable = true
  if (f.writable && f.commandConnector.trim()) {
    let args: unknown
    try {
      args = JSON.parse(f.commandArgs || '["$value"]')
    } catch {
      throw new Error('attr.errArgs')
    }
    if (!Array.isArray(args)) throw new Error('attr.errArgs')
    if (!/^write[A-Za-z]*$/.test(f.commandMethod.trim())) throw new Error('attr.errMethod')
    attr.command = { connector: f.commandConnector.trim(), method: f.commandMethod.trim(), args }
  }
  if (f.meta.trim()) {
    try {
      const meta = JSON.parse(f.meta)
      if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error()
      attr.meta = meta
    } catch {
      throw new Error('attr.errMeta')
    }
  }
  return attr
}

export default function AttributeDialog({ open, name, attr, existingNames, onCancel, onSave }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(() => initialState(name, attr))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const editing = name !== undefined

  useEffect(() => {
    if (open) {
      setForm(initialState(name, attr))
      setError(null)
      getSources()
        .then((r) => setSources(r.sources))
        .catch(() => setSources([]))
    }
  }, [open, name, attr])

  const pickConnector = (id: string) => {
    const template = COMMAND_TEMPLATES[sources.find((s) => s.id === id)?.type ?? '']
    setForm((f) => ({
      ...f,
      commandConnector: id,
      // Prefill only when nothing was configured yet
      ...(template && !f.commandMethod && { commandMethod: template.method, commandArgs: JSON.stringify(template.args) }),
    }))
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const nameError = !editing && form.name !== '' && (!NAME_RE.test(form.name) || existingNames.includes(form.name))

  const handleSave = async () => {
    let body: Partial<Attribute>
    try {
      body = buildAttr(form)
    } catch (err) {
      setError(t((err as Error).message))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave(form.name, body)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const valueField = () => {
    switch (form.type) {
      case 'relationship':
        return (
          <TextField
            label={t('attr.target')}
            value={form.target}
            onChange={(e) => set('target', e.target.value)}
            fullWidth
            size="small"
            helperText={t('attr.targetHelp')}
          />
        )
      case 'bool':
        return (
          <FormControlLabel
            control={<Switch checked={form.boolValue} onChange={(e) => set('boolValue', e.target.checked)} />}
            label={form.boolValue ? 'true' : 'false'}
          />
        )
      case 'json':
        return (
          <TextField
            label={t('attr.value')}
            value={form.value}
            onChange={(e) => set('value', e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={3}
            InputProps={{ sx: { fontFamily: MONO, fontSize: '0.8rem' } }}
          />
        )
      case 'datetime':
        return (
          <TextField
            label={t('attr.value')}
            type="datetime-local"
            value={form.value}
            onChange={(e) => set('value', e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        )
      default:
        return (
          <TextField
            label={t('attr.value')}
            value={form.value}
            onChange={(e) => set('value', e.target.value)}
            fullWidth
            size="small"
            inputMode={form.type === 'string' ? 'text' : 'decimal'}
          />
        )
    }
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? t('attr.editTitle', { name }) : t('attr.addTitle')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={7}>
            <TextField
              label={t('attr.name')}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              disabled={editing}
              fullWidth
              size="small"
              error={nameError}
              helperText={nameError ? t('attr.errName') : ' '}
              autoFocus={!editing}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              select
              label={t('common.type')}
              value={form.type}
              onChange={(e) => set('type', e.target.value as AttrType)}
              fullWidth
              size="small"
            >
              {ATTR_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={form.type === 'relationship' ? 12 : 8}>
            {valueField()}
          </Grid>
          {form.type !== 'relationship' && (
            <Grid item xs={12} sm={4}>
              <TextField
                label={t('attr.unit')}
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
          )}
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label={t('attr.quality')}
              value={form.quality}
              onChange={(e) => set('quality', e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="good">good</MenuItem>
              <MenuItem value="uncertain">uncertain</MenuItem>
              <MenuItem value="bad">bad</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              label={t('attr.source')}
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={<Switch checked={form.writable} onChange={(e) => set('writable', e.target.checked)} />}
              label={t('attr.writable')}
            />
          </Grid>
          {form.writable && (
            <>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label={t('commands.connector')}
                  value={form.commandConnector}
                  onChange={(e) => pickConnector(e.target.value)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">—</MenuItem>
                  {sources.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.id} ({s.type})
                    </MenuItem>
                  ))}
                  {form.commandConnector && !sources.some((s) => s.id === form.commandConnector) && (
                    <MenuItem value={form.commandConnector}>{form.commandConnector}</MenuItem>
                  )}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label={t('commands.method')}
                  value={form.commandMethod}
                  onChange={(e) => set('commandMethod', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="writeNode"
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  label={t('commands.args')}
                  value={form.commandArgs}
                  onChange={(e) => set('commandArgs', e.target.value)}
                  fullWidth
                  size="small"
                  helperText={t('commands.argsHelp')}
                  InputProps={{ sx: { fontFamily: MONO, fontSize: '0.8rem' } }}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <TextField
              label={t('attr.meta')}
              value={form.meta}
              onChange={(e) => set('meta', e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder='{ "sensorModel": "PT100" }'
              InputProps={{ sx: { fontFamily: MONO, fontSize: '0.8rem' } }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={busy || !form.name || nameError}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
