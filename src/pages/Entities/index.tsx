import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  Skeleton,
  Grid,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import ClearIcon from '@mui/icons-material/Clear'
import { listEntities, getTypes, type Entity, type EntityQuery } from '../../api/broker'
import { useCan } from '../../context/AuthContext'
import CreateEntityDialog from './CreateEntityDialog'
import { formatTime, formatValue } from './format'

const ORDER_OPTIONS = ['id', '-id', 'type', '-updatedAt', 'updatedAt', '-createdAt']

/** Up to three attributes as a compact preview. */
function AttrPreview({ entity }: { entity: Entity }) {
  const entries = Object.entries(entity.attrs)
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {entries.slice(0, 3).map(([name, attr]) => (
        <Chip
          key={name}
          size="small"
          variant="outlined"
          label={`${name}: ${formatValue(attr)}`}
          sx={{ maxWidth: 220, fontSize: '0.7rem' }}
        />
      ))}
      {entries.length > 3 && <Chip size="small" label={`+${entries.length - 3}`} sx={{ fontSize: '0.7rem' }} />}
    </Box>
  )
}

export default function Entities() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canWrite = useCan('operator')
  // Filters live in the URL so they survive navigation to an entity and back
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<{ entities: Entity[]; total: number } | null>(null)
  const [types, setTypes] = useState<{ type: string; count: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const page = Number(params.get('page') || 0)
  const rowsPerPage = Number(params.get('size') || 25)
  const filters = {
    type: params.get('type') || '',
    idPattern: params.get('idPattern') || '',
    related: params.get('related') || '',
    depth: params.get('depth') || '1',
    direction: params.get('direction') || 'in',
    orderBy: params.get('orderBy') || 'id',
  }
  const [draft, setDraft] = useState({ idPattern: filters.idPattern, related: filters.related })

  const update = (changes: Record<string, string | number>, resetPage = true) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === '' || v === undefined) next.delete(k)
      else next.set(k, String(v))
    }
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  const fetch = useCallback(async () => {
    const query: EntityQuery = {
      orderBy: filters.orderBy,
      limit: rowsPerPage,
      offset: page * rowsPerPage,
    }
    if (filters.type) query.type = filters.type
    if (filters.idPattern) query.idPattern = filters.idPattern
    if (filters.related) {
      query.related = filters.related
      query.depth = Number(filters.depth)
      query.direction = filters.direction as 'in' | 'out'
    }
    try {
      setError(null)
      const [list, typeList] = await Promise.all([listEntities(query), getTypes()])
      setData(list)
      setTypes(typeList)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()])

  useEffect(() => {
    fetch()
  }, [fetch])

  const applyText = () => update({ idPattern: draft.idPattern.trim(), related: draft.related.trim() })

  const clearFilters = () => {
    setDraft({ idPattern: '', related: '' })
    setParams(new URLSearchParams(), { replace: true })
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t('entities.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('entities.subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('common.refresh')}>
            <IconButton onClick={fetch} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {canWrite && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} size="small">
              {t('entities.create')}
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                label={t('common.type')}
                value={filters.type}
                onChange={(e) => update({ type: e.target.value })}
                fullWidth
                size="small"
              >
                <MenuItem value="">{t('entities.allTypes')}</MenuItem>
                {types.map((x) => (
                  <MenuItem key={x.type} value={x.type}>
                    {x.type} ({x.count})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label={t('entities.idPattern')}
                placeholder="plant1:line3:*"
                value={draft.idPattern}
                onChange={(e) => setDraft((d) => ({ ...d, idPattern: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && applyText()}
                onBlur={applyText}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label={t('entities.relatedTo')}
                placeholder="plant1:line3"
                value={draft.related}
                onChange={(e) => setDraft((d) => ({ ...d, related: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && applyText()}
                onBlur={applyText}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1}>
              <TextField
                select
                label={t('entities.direction')}
                value={filters.direction}
                onChange={(e) => update({ direction: e.target.value })}
                fullWidth
                size="small"
                disabled={!filters.related}
              >
                <MenuItem value="in">{t('entities.dirIn')}</MenuItem>
                <MenuItem value="out">{t('entities.dirOut')}</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={1}>
              <TextField
                select
                label={t('entities.depth')}
                value={filters.depth}
                onChange={(e) => update({ depth: e.target.value })}
                fullWidth
                size="small"
                disabled={!filters.related}
              >
                {[1, 2, 3, 4, 5, 10].map((d) => (
                  <MenuItem key={d} value={String(d)}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={10} sm={5} md={1.5}>
              <TextField
                select
                label={t('entities.orderBy')}
                value={filters.orderBy}
                onChange={(e) => update({ orderBy: e.target.value })}
                fullWidth
                size="small"
              >
                {ORDER_OPTIONS.map((o) => (
                  <MenuItem key={o} value={o}>
                    {o.startsWith('-') ? `${o.slice(1)} ↓` : `${o} ↑`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={2} sm={1} md={0.5}>
              <Tooltip title={t('entities.clearFilters')}>
                <IconButton onClick={clearFilters} size="small">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
          {filters.related && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {filters.direction === 'in'
                ? t('entities.relatedInHelp', { id: filters.related, depth: filters.depth })
                : t('entities.relatedOutHelp', { id: filters.related, depth: filters.depth })}
            </Typography>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>{t('common.type')}</TableCell>
                <TableCell>{t('entities.attributes')}</TableCell>
                <TableCell align="right">{t('entities.version')}</TableCell>
                <TableCell>{t('entities.updated')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!data &&
                [0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ))}
              {data?.entities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('entities.empty')}
                  </TableCell>
                </TableRow>
              )}
              {data?.entities.map((e) => (
                <TableRow
                  key={e.id}
                  hover
                  onClick={() => navigate(`/entities/${encodeURIComponent(e.id)}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={500}>
                      {e.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={e.type} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <AttrPreview entity={e} />
                  </TableCell>
                  <TableCell align="right">{e.version}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(e.updatedAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(_, p) => update({ page: p }, false)}
          onRowsPerPageChange={(e) => update({ size: e.target.value })}
          labelRowsPerPage={t('entities.rowsPerPage')}
        />
      </Card>

      <CreateEntityDialog
        open={createOpen}
        types={types.map((x) => x.type)}
        onCancel={() => setCreateOpen(false)}
        onCreated={(entity) => {
          setCreateOpen(false)
          navigate(`/entities/${encodeURIComponent(entity.id)}`)
        }}
      />
    </Box>
  )
}
