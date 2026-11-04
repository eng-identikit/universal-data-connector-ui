import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  TextField,
  Autocomplete,
  MenuItem,
  Grid,
  FormControlLabel,
  Checkbox,
  Switch,
  Typography,
  Alert,
  IconButton,
  Chip,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  createSubscription,
  updateSubscription,
  previewSubscription,
  getTypes,
  type Subscription,
  type SubscriptionInput,
  type Channel,
  type TriggerOp,
  type Entity,
} from '../../api/broker'
import FilterEditor from './FilterEditor'

interface Form {
  name: string
  description: string
  types: string[]
  idPattern: string
  ids: string[]
  relatedId: string
  relatedDepth: number
  relatedDirection: 'in' | 'out'
  bbox: string[] // minLon, minLat, maxLon, maxLat
  on: TriggerOp[]
  watched: string[]
  deadband: { attr: string; value: string }[]
  throttleS: string
  periodicS: string
  filter: string
  filterMode: 'level' | 'edge'
  channel: Channel
  url: string
  method: 'POST' | 'PUT' | 'PATCH'
  headers: { key: string; value: string }[]
  topic: string
  qos: 0 | 1 | 2
  retain: boolean
  username: string
  password: string
  subject: string
  projection: string[]
  format: 'full' | 'values'
  perEntity: boolean
  maxRetries: string
  backoffS: string
  expiresAt: string
}

const EMPTY: Form = {
  name: '', description: '', types: [], idPattern: '', ids: [], relatedId: '', relatedDepth: 1, relatedDirection: 'in',
  bbox: ['', '', '', ''], on: ['create', 'update', 'delete'], watched: [], deadband: [], throttleS: '', periodicS: '',
  filter: '', filterMode: 'level', channel: 'http', url: '', method: 'POST', headers: [], topic: 'udc/{tenant}/{entityType}/{entityId}',
  qos: 1, retain: false, username: '', password: '', subject: 'udc.{tenant}.{entityType}', projection: [], format: 'full',
  perEntity: false, maxRetries: '10', backoffS: '1', expiresAt: '',
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function fromSubscription(s: Subscription): Form {
  const n = s.notify
  return {
    ...EMPTY,
    name: s.name,
    description: s.description ?? '',
    types: s.select.types ?? [],
    idPattern: s.select.idPattern ?? '',
    ids: s.select.ids ?? [],
    relatedId: s.select.related?.id ?? '',
    relatedDepth: s.select.related?.depth ?? 1,
    relatedDirection: s.select.related?.direction ?? 'in',
    bbox: s.select.bbox ? s.select.bbox.map(String) : ['', '', '', ''],
    on: s.trigger.on,
    watched: s.trigger.attrs,
    deadband: Object.entries(s.trigger.deadband).map(([attr, value]) => ({ attr, value: String(value) })),
    throttleS: s.throttleMs ? String(s.throttleMs / 1000) : '',
    periodicS: s.periodicMs ? String(s.periodicMs / 1000) : '',
    filter: s.filter ?? '',
    filterMode: s.filterMode,
    channel: n.channel,
    url: n.url ?? '',
    method: n.method ?? 'POST',
    headers: Object.entries(n.headers ?? {}).map(([key, value]) => ({ key, value })),
    topic: n.topic ?? EMPTY.topic,
    qos: n.qos ?? 1,
    retain: !!n.retain,
    username: n.username ?? '',
    password: n.password ?? '',
    subject: n.subject ?? EMPTY.subject,
    projection: n.attrs ?? [],
    format: n.format ?? 'full',
    perEntity: !!n.perEntity,
    maxRetries: String(s.delivery.maxRetries),
    backoffS: String(s.delivery.backoffMs / 1000),
    expiresAt: s.expiresAt ? toLocalInput(s.expiresAt) : '',
  }
}

const seconds = (s: string) => (s.trim() === '' ? null : Math.round(Number(s) * 1000))

function selectOf(f: Form): SubscriptionInput['select'] {
  const bbox = f.bbox.every((v) => v.trim() !== '') ? (f.bbox.map(Number) as [number, number, number, number]) : null
  return {
    types: f.types,
    idPattern: f.idPattern.trim() || null,
    ids: f.ids,
    related: f.relatedId.trim() ? { id: f.relatedId.trim(), depth: f.relatedDepth, direction: f.relatedDirection } : null,
    bbox,
  }
}

function toInput(f: Form): SubscriptionInput {
  const notify: SubscriptionInput['notify'] = {
    channel: f.channel,
    attrs: f.projection,
    format: f.format,
    perEntity: f.perEntity,
  }
  if (f.channel === 'http') {
    Object.assign(notify, {
      url: f.url.trim(),
      method: f.method,
      headers: Object.fromEntries(f.headers.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value])),
    })
  } else if (f.channel === 'mqtt') {
    Object.assign(notify, { url: f.url.trim() || null, topic: f.topic.trim(), qos: f.qos, retain: f.retain, username: f.username || null, password: f.password || null })
  } else if (f.channel === 'nats') {
    Object.assign(notify, { url: f.url.trim() || null, subject: f.subject.trim() })
  }
  return {
    name: f.name.trim(),
    description: f.description || null,
    select: selectOf(f),
    trigger: {
      on: f.on,
      attrs: f.watched,
      deadband: Object.fromEntries(f.deadband.filter((d) => d.attr && d.value !== '').map((d) => [d.attr, Number(d.value)])),
    },
    filter: f.filter.trim() || null,
    filterMode: f.filterMode,
    throttleMs: seconds(f.throttleS),
    periodicMs: seconds(f.periodicS),
    notify,
    delivery: { maxRetries: Number(f.maxRetries), backoffMs: seconds(f.backoffS) ?? 1000 },
    expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : null,
  }
}

interface Props {
  open: boolean
  subscription?: Subscription
  onClose: () => void
  onSaved: (sub: Subscription) => void
}

export default function SubscriptionWizard({ open, subscription, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Form>(EMPTY)
  const [types, setTypes] = useState<string[]>([])
  const [preview, setPreview] = useState<Entity[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setForm(subscription ? fromSubscription(subscription) : EMPTY)
    setPreview(null)
    setError(null)
    getTypes()
      .then((ts) => setTypes(ts.map((x) => x.type)))
      .catch(() => setTypes([]))
  }, [open, subscription])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  // Attribute names seen in the preview feed the autocompletes
  const knownAttrs = useMemo(
    () => [...new Set((preview ?? []).flatMap((e) => Object.keys(e.attrs)))].sort(),
    [preview],
  )

  const runPreview = async (withFilter: boolean) => {
    try {
      setError(null)
      const r = await previewSubscription({ select: selectOf(form), filter: withFilter ? form.filter.trim() || null : null })
      setPreview(r.entities)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const stepValid = [
    form.name.trim() !== '',
    form.on.length > 0,
    true,
    form.channel === 'http' ? /^https?:\/\//.test(form.url.trim()) : form.channel === 'mqtt' ? !!form.topic.trim() : form.channel === 'nats' ? !!form.subject.trim() : true,
  ]

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const body = toInput(form)
      onSaved(subscription ? await updateSubscription(subscription.id, body) : await createSubscription(body))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const previewBox = (
    <Box sx={{ mt: 2 }}>
      {preview && (
        <Alert severity={preview.length ? 'success' : 'warning'} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
          <Typography variant="body2" fontWeight={600}>
            {preview.length ? t('subs.previewCount', { count: preview.length }) : t('subs.previewNone')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {preview.map((e) => (
              <Chip key={e.id} size="small" label={`${e.id} · ${e.type}`} sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
            ))}
          </Box>
        </Alert>
      )}
    </Box>
  )

  const steps = [t('subs.stepSelect'), t('subs.stepTrigger'), t('subs.stepFilter'), t('subs.stepChannel')]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{subscription ? t('subs.editTitle', { name: subscription.name }) : t('subs.newTitle')}</DialogTitle>
      <DialogContent dividers sx={{ minHeight: 480 }}>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {steps.map((label, i) => (
            <Step key={label} completed={i < step && stepValid[i]}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {step === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label={t('common.name')} value={form.name} onChange={(e) => set('name', e.target.value)} fullWidth size="small" required autoFocus />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label={t('admin.description')} value={form.description} onChange={(e) => set('description', e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid item xs={12}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">
                  {t('subs.whichEntities')}
                </Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                freeSolo
                options={types}
                value={form.types}
                onChange={(_, v) => set('types', v)}
                renderInput={(params) => <TextField {...params} size="small" label={t('subs.types')} helperText={t('subs.typesHelp')} />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('entities.idPattern')}
                value={form.idPattern}
                onChange={(e) => set('idPattern', e.target.value)}
                fullWidth
                size="small"
                placeholder="plant1:line3:*"
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={form.ids}
                onChange={(_, v) => set('ids', v)}
                renderInput={(params) => <TextField {...params} size="small" label={t('subs.ids')} helperText={t('subs.idsHelp')} />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('entities.relatedTo')}
                value={form.relatedId}
                onChange={(e) => set('relatedId', e.target.value)}
                fullWidth
                size="small"
                placeholder="plant1:line3"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                select
                label={t('entities.direction')}
                value={form.relatedDirection}
                onChange={(e) => set('relatedDirection', e.target.value as 'in' | 'out')}
                fullWidth
                size="small"
                disabled={!form.relatedId}
              >
                <MenuItem value="in">{t('entities.dirIn')}</MenuItem>
                <MenuItem value="out">{t('entities.dirOut')}</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                select
                label={t('entities.depth')}
                value={form.relatedDepth}
                onChange={(e) => set('relatedDepth', Number(e.target.value))}
                fullWidth
                size="small"
                disabled={!form.relatedId}
              >
                {[1, 2, 3, 4, 5, 10].map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                {t('subs.bbox')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {['minLon', 'minLat', 'maxLon', 'maxLat'].map((label, i) => (
                  <TextField
                    key={label}
                    label={label}
                    size="small"
                    value={form.bbox[i]}
                    onChange={(e) => set('bbox', form.bbox.map((v, j) => (j === i ? e.target.value : v)))}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Button size="small" startIcon={<VisibilityIcon />} onClick={() => runPreview(false)}>
                {t('subs.preview')}
              </Button>
              {previewBox}
            </Grid>
          </Grid>
        )}

        {step === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600}>
                {t('subs.onEvents')}
              </Typography>
              {(['create', 'update', 'delete'] as TriggerOp[]).map((op) => (
                <FormControlLabel
                  key={op}
                  control={
                    <Checkbox
                      checked={form.on.includes(op)}
                      onChange={(e) => set('on', e.target.checked ? [...form.on, op] : form.on.filter((x) => x !== op))}
                    />
                  }
                  label={t(`subs.op.${op}`)}
                />
              ))}
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={knownAttrs}
                value={form.watched}
                onChange={(_, v) => set('watched', v)}
                renderInput={(params) => <TextField {...params} size="small" label={t('subs.watched')} helperText={t('subs.watchedHelp')} />}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600}>
                {t('subs.deadband')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {t('subs.deadbandHelp')}
              </Typography>
              {form.deadband.map((d, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Autocomplete
                    freeSolo
                    options={knownAttrs}
                    inputValue={d.attr}
                    onInputChange={(_, v) => set('deadband', form.deadband.map((x, j) => (j === i ? { ...x, attr: v } : x)))}
                    sx={{ width: 220 }}
                    renderInput={(params) => <TextField {...params} size="small" label={t('attr.name')} />}
                  />
                  <TextField
                    size="small"
                    label="±"
                    value={d.value}
                    onChange={(e) => set('deadband', form.deadband.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    sx={{ width: 120 }}
                  />
                  <IconButton size="small" onClick={() => set('deadband', form.deadband.filter((_, j) => j !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={() => set('deadband', [...form.deadband, { attr: '', value: '' }])}>
                {t('subs.addDeadband')}
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('subs.throttle')}
                value={form.throttleS}
                onChange={(e) => set('throttleS', e.target.value)}
                fullWidth
                size="small"
                type="number"
                helperText={t('subs.throttleHelp')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('subs.periodic')}
                value={form.periodicS}
                onChange={(e) => set('periodicS', e.target.value)}
                fullWidth
                size="small"
                type="number"
                helperText={t('subs.periodicHelp')}
              />
            </Grid>
          </Grid>
        )}

        {step === 2 && (
          <Box>
            <FilterEditor value={form.filter} onChange={(v) => set('filter', v)} knownAttrs={knownAttrs} />
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <ToggleButtonGroup size="small" exclusive value={form.filterMode} onChange={(_, v) => v && set('filterMode', v)}>
                <ToggleButton value="level">{t('subs.modeLevel')}</ToggleButton>
                <ToggleButton value="edge">{t('subs.modeEdge')}</ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary">
                {form.filterMode === 'level' ? t('subs.modeLevelHelp') : t('subs.modeEdgeHelp')}
              </Typography>
            </Box>
            <Button size="small" startIcon={<VisibilityIcon />} onClick={() => runPreview(true)} sx={{ mt: 2 }}>
              {t('subs.previewFilter')}
            </Button>
            {previewBox}
          </Box>
        )}

        {step === 3 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <ToggleButtonGroup exclusive value={form.channel} onChange={(_, v) => v && set('channel', v)} size="small">
                <ToggleButton value="http">HTTP webhook</ToggleButton>
                <ToggleButton value="mqtt">MQTT</ToggleButton>
                <ToggleButton value="nats">NATS</ToggleButton>
                <ToggleButton value="websocket">WebSocket</ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            {form.channel === 'http' && (
              <>
                <Grid item xs={12} sm={9}>
                  <TextField label="URL" value={form.url} onChange={(e) => set('url', e.target.value)} fullWidth size="small" placeholder="https://example.com/hook" />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField select label={t('subs.method')} value={form.method} onChange={(e) => set('method', e.target.value as Form['method'])} fullWidth size="small">
                    {['POST', 'PUT', 'PATCH'].map((m) => (
                      <MenuItem key={m} value={m}>
                        {m}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    {t('subs.headers')}
                  </Typography>
                  {form.headers.map((h, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField size="small" label={t('subs.headerName')} value={h.key} onChange={(e) => set('headers', form.headers.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                      <TextField size="small" label={t('attr.value')} value={h.value} onChange={(e) => set('headers', form.headers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} sx={{ flexGrow: 1 }} />
                      <IconButton size="small" onClick={() => set('headers', form.headers.filter((_, j) => j !== i))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => set('headers', [...form.headers, { key: '', value: '' }])} sx={{ mt: 1 }}>
                    {t('subs.addHeader')}
                  </Button>
                </Grid>
              </>
            )}

            {form.channel === 'mqtt' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField label={t('subs.brokerUrl')} value={form.url} onChange={(e) => set('url', e.target.value)} fullWidth size="small" placeholder="mqtt://host:1883" helperText={t('subs.brokerUrlHelp')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Topic" value={form.topic} onChange={(e) => set('topic', e.target.value)} fullWidth size="small" helperText="{tenant} {subscription} {entityType} {entityId}" />
                </Grid>
                <Grid item xs={4} sm={2}>
                  <TextField select label="QoS" value={form.qos} onChange={(e) => set('qos', Number(e.target.value) as 0 | 1 | 2)} fullWidth size="small">
                    {[0, 1, 2].map((q) => (
                      <MenuItem key={q} value={q}>
                        {q}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={8} sm={2}>
                  <FormControlLabel control={<Switch checked={form.retain} onChange={(e) => set('retain', e.target.checked)} />} label="Retain" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label={t('login.username')} value={form.username} onChange={(e) => set('username', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label={t('login.password')} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} fullWidth size="small" />
                </Grid>
              </>
            )}

            {form.channel === 'nats' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField label={t('subs.brokerUrl')} value={form.url} onChange={(e) => set('url', e.target.value)} fullWidth size="small" placeholder="nats://host:4222" helperText={t('subs.natsUrlHelp')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Subject" value={form.subject} onChange={(e) => set('subject', e.target.value)} fullWidth size="small" helperText="{tenant} {subscription} {entityType} {entityId}" />
                </Grid>
              </>
            )}

            {form.channel === 'websocket' && (
              <Grid item xs={12}>
                <Alert severity="info">{t('subs.websocketHelp')}</Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                freeSolo
                options={knownAttrs}
                value={form.projection}
                onChange={(_, v) => set('projection', v)}
                renderInput={(params) => <TextField {...params} size="small" label={t('subs.projection')} helperText={t('subs.projectionHelp')} />}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField select label={t('subs.format')} value={form.format} onChange={(e) => set('format', e.target.value as Form['format'])} fullWidth size="small">
                <MenuItem value="full">{t('subs.formatFull')}</MenuItem>
                <MenuItem value="values">{t('subs.formatValues')}</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControlLabel control={<Switch checked={form.perEntity} onChange={(e) => set('perEntity', e.target.checked)} />} label={t('subs.perEntity')} />
            </Grid>
            {form.channel !== 'websocket' && (
              <>
                <Grid item xs={6} sm={3}>
                  <TextField label={t('subs.maxRetries')} type="number" value={form.maxRetries} onChange={(e) => set('maxRetries', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label={t('subs.backoff')} type="number" value={form.backoffS} onChange={(e) => set('backoffS', e.target.value)} fullWidth size="small" />
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('subs.expiresAt')}
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => set('expiresAt', e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText={t('admin.expiresHelp')}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t('subs.back')}
        </Button>
        {step < 3 ? (
          <Button variant="contained" disabled={!stepValid[step]} onClick={() => setStep(step + 1)}>
            {t('subs.next')}
          </Button>
        ) : (
          <Button variant="contained" disabled={busy || !stepValid.every(Boolean)} onClick={save}>
            {t('common.save')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
