import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Typography,
} from '@mui/material'
import { listCommands, sendCommand, type Attribute, type Command, type CommandStatus } from '../../api/broker'
import { formatTime } from './format'

const statusColor: Record<CommandStatus, 'default' | 'info' | 'success' | 'error'> = {
  pending: 'default',
  sent: 'info',
  succeeded: 'success',
  failed: 'error',
}

export function CommandStatusChip({ status }: { status: CommandStatus }) {
  const { t } = useTranslation()
  return <Chip size="small" color={statusColor[status]} label={t(`commands.status.${status}`)} />
}

/** Commands sent to an entity; refreshes while some are still in flight. */
export function CommandsList({ entityId, refreshKey }: { entityId: string; refreshKey: number }) {
  const { t } = useTranslation()
  const [commands, setCommands] = useState<Command[]>([])

  const load = useCallback(() => listCommands({ entityId, limit: 100 }).then(setCommands).catch(() => {}), [entityId])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const inFlight = commands.some((c) => c.status === 'pending' || c.status === 'sent')
  useEffect(() => {
    if (!inFlight) return
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [inFlight, load])

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{t('commands.created')}</TableCell>
          <TableCell>{t('attr.name')}</TableCell>
          <TableCell>{t('attr.value')}</TableCell>
          <TableCell>{t('common.status')}</TableCell>
          <TableCell>{t('commands.connector')}</TableCell>
          <TableCell>{t('commands.by')}</TableCell>
          <TableCell>{t('subs.error')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {commands.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>
              {t('commands.none')}
            </TableCell>
          </TableRow>
        )}
        {commands.map((c) => (
          <TableRow key={c.id} hover>
            <TableCell>{formatTime(c.createdAt)}</TableCell>
            <TableCell sx={{ fontFamily: 'monospace' }}>{c.attr}</TableCell>
            <TableCell sx={{ fontFamily: 'monospace' }}>{JSON.stringify(c.value)}</TableCell>
            <TableCell>
              <CommandStatusChip status={c.status} />
            </TableCell>
            <TableCell sx={{ fontSize: '0.75rem' }}>
              {c.connector}
              {c.target && (
                <Typography variant="caption" color="text.secondary" display="block" fontFamily="monospace">
                  {c.target.method}({(c.target.args ?? []).map((a) => JSON.stringify(a)).join(', ')})
                </Typography>
              )}
            </TableCell>
            <TableCell>{c.createdBy ?? '—'}</TableCell>
            <TableCell sx={{ color: 'error.main', fontSize: '0.75rem' }}>{c.error ?? ''}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface DialogProps {
  open: boolean
  entityId: string
  name: string
  attr?: Attribute
  onClose: () => void
  onSent: () => void
}

/** Sends a value to the device behind a writable attribute. */
export function CommandDialog({ open, entityId, name, attr, onClose, onSent }: DialogProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [bool, setBool] = useState(false)
  const [result, setResult] = useState<Command | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setValue(attr?.value !== undefined && attr.type !== 'bool' ? String(typeof attr.value === 'object' ? JSON.stringify(attr.value) : attr.value) : '')
    setBool(attr?.value === true)
    setResult(null)
    setError(null)
  }, [open, attr])

  const parse = (): unknown => {
    if (attr?.type === 'bool') return bool
    if (attr?.type === 'float' || attr?.type === 'int') {
      const n = Number(value)
      if (!Number.isFinite(n)) throw new Error(t('attr.errNumber'))
      return n
    }
    if (attr?.type === 'json') {
      try {
        return JSON.parse(value)
      } catch {
        throw new Error(t('attr.errJson'))
      }
    }
    return value
  }

  const send = async () => {
    let v: unknown
    try {
      v = parse()
    } catch (err) {
      setError((err as Error).message)
      return
    }
    setBusy(true)
    setError(null)
    try {
      setResult(await sendCommand(entityId, name, v))
      onSent()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('commands.sendTitle', { name })}</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          {attr?.command
            ? `${String(attr.command.connector)} · ${String(attr.command.method)}`
            : t('commands.noTarget')}
        </Typography>
        {attr?.type === 'bool' ? (
          <FormControlLabel control={<Switch checked={bool} onChange={(e) => setBool(e.target.checked)} />} label={String(bool)} />
        ) : (
          <TextField
            label={t('attr.value')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            InputProps={{ endAdornment: attr?.unit ? <Box sx={{ color: 'text.secondary', ml: 1 }}>{attr.unit}</Box> : undefined }}
          />
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {result && (
          <Alert severity={result.status === 'failed' ? 'error' : result.status === 'succeeded' ? 'success' : 'info'} sx={{ mt: 2 }}>
            {t(`commands.status.${result.status}`)}
            {result.error ? `: ${result.error}` : ''}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.close')}
        </Button>
        <Button variant="contained" onClick={send} disabled={busy || !attr?.command}>
          {t('commands.send')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
