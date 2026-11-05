import { MONO } from '../../theme'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import RouterLink from '../../components/ScopedLink'
import { Box, Typography, Card, CardContent, Autocomplete, TextField, Link, Alert } from '@mui/material'
import { listEntities, getEntity, type Entity } from '../../api/broker'
import EntityHistory from '../../components/EntityHistory'
import PageHeader from '../../components/PageHeader'

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
      <PageHeader title={t('history.title')} subtitle={t('history.subtitle')} />

      <Card sx={{ mb: 2 }}>
        <CardContent>
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
                  <Typography variant="body2" fontFamily={MONO}>
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
              <Link component={RouterLink} to={`/entities/${encodeURIComponent(entity.id)}`} fontFamily={MONO}>
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
