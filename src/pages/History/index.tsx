import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Card, CardContent, Autocomplete, TextField, Link, Alert } from '@mui/material'
import { listEntities, getEntity, type Entity } from '../../api/broker'
import EntityHistory from '../../components/EntityHistory'

/** History of any entity: search by id, then charts per attribute. */
export default function History() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const entityId = params.get('entity') || ''
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<Entity[]>([])
  const [entity, setEntity] = useState<Entity | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Search as you type (substring match on the id)
  useEffect(() => {
    const timer = setTimeout(() => {
      listEntities({ idPattern: `*${query.trim()}*`, limit: 20, attrs: '_none_' })
        .then((r) => setOptions(r.entities))
        .catch(() => setOptions([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!entityId) {
      setEntity(null)
      return
    }
    getEntity(entityId)
      .then((e) => {
        setEntity(e)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [entityId])

  const units = Object.fromEntries(Object.entries(entity?.attrs ?? {}).map(([k, a]) => [k, a.unit]))

  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>
        {t('history.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('history.subtitle')}
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Autocomplete
            options={options}
            getOptionLabel={(o) => o.id}
            filterOptions={(x) => x}
            value={entity && options.find((o) => o.id === entity.id) ? entity : null}
            onChange={(_, v) => setParams(v ? { entity: v.id } : {}, { replace: true })}
            inputValue={query}
            onInputChange={(_, v, reason) => reason !== 'reset' && setQuery(v)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderOption={(props, o) => (
              <li {...props} key={o.id}>
                <Box>
                  <Typography variant="body2" fontFamily="monospace">
                    {o.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.type}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(p) => <TextField {...p} size="small" label={t('history.pickEntity')} placeholder="plant1:*" />}
            sx={{ maxWidth: 520 }}
          />
          {entity && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              <Link component={RouterLink} to={`/entities/${encodeURIComponent(entity.id)}`} fontFamily="monospace">
                {entity.id}
              </Link>{' '}
              · {entity.type}
            </Typography>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {entity ? (
        <Card>
          <CardContent>
            <EntityHistory key={entity.id} entityId={entity.id} units={units} />
          </CardContent>
        </Card>
      ) : (
        !error && <Alert severity="info">{t('history.pickHint')}</Alert>
      )}
    </Box>
  )
}
