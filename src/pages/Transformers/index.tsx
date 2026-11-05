import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Link,
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
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import { deleteTransformer, listTransformers, saveTransformer, type Transformer } from '../../api/broker'
import { ApiError } from '../../api/client'
import { useCan } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import ConfirmDialog from '../../components/ConfirmDialog'
import TransformerPreview from '../../components/TransformerPreview'
import { CodeTag } from '../../components/Code'
import { MONO } from '../../theme'

const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/

interface Form {
  id: string
  name: string
  description: string
  expression: string
}

const EMPTY: Form = { id: '', name: '', description: '', expression: '' }

/** Library of output transformers (config/transformers.json) used by subscriptions. */
export default function Transformers() {
  const { t } = useTranslation()
  const canEdit = useCan('operator')
  const [items, setItems] = useState<Transformer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ existing?: Transformer } | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Transformer | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await listTransformers())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const open = (existing?: Transformer) => {
    setForm(existing ? { id: existing.id, name: existing.name, description: existing.description ?? '', expression: existing.expression } : EMPTY)
    setSaveError(null)
    setEditing({ existing })
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    try {
      setSaveError(null)
      const saved = await saveTransformer(form.id, { name: form.name.trim() || form.id, description: form.description.trim() || null, expression: form.expression })
      setEditing(null)
      // Use the answer rather than reloading: in a cluster another instance may not have the change yet
      setItems((list) => [...list.filter((x) => x.id !== saved.id), saved].sort((a, b) => a.id.localeCompare(b.id)))
    } catch (err) {
      setSaveError((err as Error).message)
    }
  }

  const remove = async () => {
    const item = deleting
    setDeleting(null)
    if (!item) return
    try {
      await deleteTransformer(item.id)
      setItems((list) => list.filter((x) => x.id !== item.id))
    } catch (err) {
      // 409: still used by subscriptions, listed in the details
      const details = (err as ApiError).details as { subscriptions?: { tenant: string; name: string }[] } | undefined
      const subs = details?.subscriptions
      setError(subs?.length ? `${(err as Error).message}: ${subs.map((s) => `${s.tenant}/${s.name}`).join(', ')}` : (err as Error).message)
    }
  }

  const isNew = !editing?.existing
  const readOnly = !canEdit
  const idValid = ID_RE.test(form.id)

  return (
    <Box>
      <PageHeader
        title={t('transformers.title')}
        subtitle={
          <>
            {t('transformers.subtitle')}{' '}
            <Link href="https://docs.jsonata.org/overview.html" target="_blank" rel="noreferrer">
              {t('transformers.jsonataDocs')}
            </Link>
          </>
        }
        actions={
          canEdit && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>
              {t('transformers.new')}
            </Button>
          )
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Card>
        <CardContent>
          {!items.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              {t('transformers.none')}
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('transformers.name')}</TableCell>
                  <TableCell>Id</TableCell>
                  <TableCell>{t('transformers.description')}</TableCell>
                  <TableCell align="right">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <CodeTag>{item.id}</CodeTag>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {item.description ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title={canEdit ? t('common.edit') : t('transformers.view')}>
                        <IconButton size="small" onClick={() => open(item)}>
                          {canEdit ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip title={t('common.delete')}>
                          <IconButton size="small" onClick={() => setDeleting(item)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="lg" fullWidth>
        <DialogTitle>{isNew ? t('transformers.new') : form.name || form.id}</DialogTitle>
        <DialogContent>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Id"
                    value={form.id}
                    onChange={(e) => set('id', e.target.value.toLowerCase())}
                    disabled={!isNew || readOnly}
                    error={isNew && !!form.id && !idValid}
                    helperText={isNew ? t('transformers.idHelp') : undefined}
                    sx={{ width: 220 }}
                  />
                  <TextField label={t('transformers.name')} value={form.name} onChange={(e) => set('name', e.target.value)} disabled={readOnly} fullWidth />
                </Box>
                <TextField label={t('transformers.description')} value={form.description} onChange={(e) => set('description', e.target.value)} disabled={readOnly} fullWidth />
                <TextField
                  label={t('transformers.expression')}
                  value={form.expression}
                  onChange={(e) => set('expression', e.target.value)}
                  InputProps={{ readOnly }}
                  multiline
                  minRows={12}
                  maxRows={24}
                  fullWidth
                  inputProps={{ spellCheck: false, style: { fontFamily: MONO, fontSize: '0.8125rem' } }}
                  helperText={t('transformers.expressionHelp')}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <TransformerPreview expression={form.expression} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} color="inherit">
            {readOnly ? t('common.close') : t('common.cancel')}
          </Button>
          {!readOnly && (
            <Button variant="contained" onClick={save} disabled={!idValid || !form.expression.trim()}>
              {t('common.save')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title={t('transformers.delete')}
        message={t('transformers.deleteMessage', { name: deleting?.name ?? '' })}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </Box>
  )
}
