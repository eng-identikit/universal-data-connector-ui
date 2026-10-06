import { useState, useEffect } from 'react'
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
  Typography,
  Divider,
  Alert,
} from '@mui/material'
import { createSource, updateSource } from '../../api/endpoints'
import type { Source } from '../../api/types'

const CONNECTOR_TYPES = [
  'opcua',
  'mqtt',
  'modbus',
  'http',
  's7',
  'bacnet',
  'profinet',
  'ethercat',
  'fins-tcp',
  'melsec',
  'serial',
  'aas',
  'cip',
]

// Default config fields per type
const TYPE_DEFAULTS: Record<string, Record<string, unknown>> = {
  opcua: { endpointUrl: 'opc.tcp://localhost:4840', securityMode: 'None' },
  mqtt: { url: 'mqtt://localhost:1883', topic: '#', clientId: '' },
  modbus: { connectionType: 'tcp', host: 'localhost', port: 502 },
  http: { url: 'http://localhost/data', method: 'GET', interval: 5000 },
  s7: { host: '192.168.1.1', rack: 0, slot: 1, variables: {} },
  bacnet: { address: '192.168.1.1', port: 47808 },
  profinet: {
    mode: 's7',
    controllerIp: '192.168.0.1',
    rack: 0,
    slot: 1,
    pollingInterval: 100,
    devices: [
      {
        name: 'IO_Device_1',
        stationName: 'et200sp-1',
        inputs: [{ name: 'sensor_1', address: 'I0.0' }],
        outputs: [{ name: 'valve_1', address: 'Q0.0' }],
      },
    ],
  },
  ethercat: {
    mode: 'ads',
    targetAmsNetId: '192.168.1.120.1.1',
    targetAdsPort: 851,
    masterAmsNetId: '192.168.1.120.3.1',
    pollingInterval: 100,
    slaves: [
      {
        name: 'EL1008',
        position: 1,
        inputs: [{ name: 'input_1', symbol: 'GVL_IO.bInput1' }],
        outputs: [],
      },
    ],
  },
  'fins-tcp': { host: '192.168.1.1', port: 9600 },
  melsec: { host: '192.168.1.1', port: 5007 },
  serial: { port: 'COM1', baudRate: 9600 },
  aas: { url: 'http://localhost:4001' },
  cip: { host: '192.168.1.1' },
}

interface ConnectorDialogProps {
  open: boolean
  source: Source | null
  onClose: () => void
  onSaved: () => void
}

export default function ConnectorDialog({ open, source, onClose, onSaved }: ConnectorDialogProps) {
  const { t } = useTranslation()
  const isEdit = !!source

  const [id, setId] = useState('')
  const [type, setType] = useState('opcua')
  const [enabled, setEnabled] = useState(true)
  const [configJson, setConfigJson] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (source) {
        setId(source.id)
        setType(source.type)
        setEnabled(source.enabled)
        setConfigJson(JSON.stringify(source.config, null, 2))
        setTagsInput(source.tags?.join(', ') ?? '')
      } else {
        setId('')
        setType('opcua')
        setEnabled(true)
        setConfigJson(JSON.stringify(TYPE_DEFAULTS['opcua'], null, 2))
        setTagsInput('')
      }
      setJsonError(null)
      setError(null)
    }
  }, [open, source])

  const handleTypeChange = (newType: string) => {
    setType(newType)
    if (!isEdit) {
      setConfigJson(JSON.stringify(TYPE_DEFAULTS[newType] ?? {}, null, 2))
    }
  }

  const validateJson = (val: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(val)
      setJsonError(null)
      return parsed
    } catch {
      setJsonError('Invalid JSON')
      return null
    }
  }

  const handleSave = async () => {
    const config = validateJson(configJson)
    if (!config) return

    if (!id.trim()) {
      setError('Connector ID is required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload: Omit<Source, 'runtime'> = {
        id: id.trim(),
        type,
        enabled,
        config,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }

      if (isEdit) {
        await updateSource(source.id, payload)
      } else {
        await createSource(payload)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? t('connectors.editConnector') : t('connectors.addConnector')}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={7}>
            <TextField
              label={t('connectors.form.id')}
              value={id}
              onChange={(e) => setId(e.target.value)}
              fullWidth
              required
              disabled={isEdit}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              select
              label={t('connectors.form.type')}
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              fullWidth
              size="small"
              disabled={isEdit}
            >
              {CONNECTOR_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              }
              label={t('connectors.form.enabled')}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Dynamic config section — simple JSON editor */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t('connectors.form.advancedConfig')}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {t('connectors.form.advancedConfigHelp')}
            </Typography>
            <TextField
              multiline
              minRows={6}
              maxRows={14}
              fullWidth
              value={configJson}
              onChange={(e) => {
                setConfigJson(e.target.value)
                validateJson(e.target.value)
              }}
              error={!!jsonError}
              helperText={jsonError}
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label={t('connectors.form.tags')}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              fullWidth
              size="small"
              placeholder="tag1, tag2, tag3"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !!jsonError}>
          {saving ? t('common.loading') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
