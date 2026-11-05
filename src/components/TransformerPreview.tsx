import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Autocomplete, Box, Button, Chip, FormControlLabel, Switch, TextField, Typography } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { getTypes, listEntities, previewTransformer, type TransformerPreview as Preview } from '../api/broker'
import { CodeBlock } from './Code'

interface Props {
  /** Inline expression to try, or the id of a library transformer */
  expression?: string
  transformer?: string
  /** Defaults taken from the subscription being edited */
  types?: string[]
  attrs?: string[]
  format?: 'full' | 'values'
  perEntity?: boolean
}

/** Pretty-prints JSON payloads; text payloads are shown as they are. */
function pretty(payload: string, contentType: string) {
  if (!contentType.includes('json')) return payload
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload
  }
}

/** Runs a transformer on real entities of the current tenant and shows what would be sent. */
export default function TransformerPreview({ expression, transformer, types = [], attrs = [], format = 'full', perEntity: initialPerEntity = false }: Props) {
  const { t } = useTranslation()
  const [knownTypes, setKnownTypes] = useState<string[]>([])
  const [pickTypes, setPickTypes] = useState<string[]>(types)
  const [entityOptions, setEntityOptions] = useState<string[]>([])
  const [entityIds, setEntityIds] = useState<string[]>([])
  const [perEntity, setPerEntity] = useState(initialPerEntity)
  const [result, setResult] = useState<Preview | null>(null)
  const [showInput, setShowInput] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getTypes()
      .then((ts) => setKnownTypes(ts.map((x) => x.type)))
      .catch(() => setKnownTypes([]))
  }, [])

  useEffect(() => {
    listEntities({ limit: 50, ...(pickTypes.length && { type: pickTypes.join(',') }) })
      .then((r) => setEntityOptions(r.entities.map((e) => e.id)))
      .catch(() => setEntityOptions([]))
  }, [pickTypes])

  const canRun = !!(expression?.trim() || transformer)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      setResult(
        await previewTransformer({
          ...(expression?.trim() ? { expression } : { transformer }),
          entityIds: entityIds.length ? entityIds : undefined,
          types: pickTypes.length ? pickTypes : undefined,
          notify: { attrs, format, perEntity },
        }),
      )
    } catch (err) {
      setResult(null)
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle2">{t('transformers.preview')}</Typography>
      <Autocomplete
        multiple
        size="small"
        options={knownTypes}
        value={pickTypes}
        onChange={(_, v) => setPickTypes(v)}
        renderInput={(params) => <TextField {...params} label={t('transformers.previewTypes')} />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={entityOptions}
        value={entityIds}
        onChange={(_, v) => setEntityIds(v.slice(0, 5))}
        renderInput={(params) => <TextField {...params} label={t('transformers.previewEntities')} helperText={t('transformers.previewEntitiesHelp')} />}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <FormControlLabel control={<Switch checked={perEntity} onChange={(e) => setPerEntity(e.target.checked)} />} label={t('transformers.perEntity')} />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={run} disabled={!canRun || busy}>
          {t('transformers.run')}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {result && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {!result.messages.length && <Alert severity="info">{t('transformers.noOutput')}</Alert>}
          {result.messages.map((m, i) => (
            <Box key={i}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip size="small" variant="outlined" label={m.contentType.split(';')[0]} />
                {m.entityId && result.messages.length > 1 && (
                  <Typography variant="caption" color="text.secondary">
                    {m.entityId}
                  </Typography>
                )}
              </Box>
              <CodeBlock maxHeight={260}>{pretty(m.payload, m.contentType)}</CodeBlock>
            </Box>
          ))}
          <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => setShowInput((v) => !v)}>
            {showInput ? t('transformers.hideInput') : t('transformers.showInput')}
          </Button>
          {showInput && <CodeBlock maxHeight={260}>{JSON.stringify(result.input, null, 2)}</CodeBlock>}
        </Box>
      )}
    </Box>
  )
}
