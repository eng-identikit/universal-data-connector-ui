import { MONO } from '../theme'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Skeleton,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import DownloadIcon from '@mui/icons-material/Download'
import TableChartIcon from '@mui/icons-material/TableChart'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts'
import { getHistory, getHistoryAttributes, type HistoryAttribute, type HistoryBucket } from '../api/broker'

const RANGES = [
  { key: '1h', ms: 3600e3 },
  { key: '6h', ms: 6 * 3600e3 },
  { key: '24h', ms: 24 * 3600e3 },
  { key: '7d', ms: 7 * 24 * 3600e3 },
  { key: '30d', ms: 30 * 24 * 3600e3 },
]
const MAX_CHARTS = 8
const MAX_POINTS = 300

// Categorical slot 1 of the validated palette (one series per chart: no legend needed)
const seriesColor = (mode: 'light' | 'dark') => (mode === 'dark' ? '#3987e5' : '#2a78d6')

interface Point {
  x: number
  avg: number | null
  band: [number, number] | null
  min: number | null
  max: number | null
  samples: number
}

const fmt = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString(undefined, { maximumFractionDigits: 3 })

function tickFormatter(rangeMs: number) {
  return (x: number) =>
    rangeMs > 2 * 24 * 3600e3
      ? new Date(x).toLocaleDateString([], { day: '2-digit', month: '2-digit' })
      : new Date(x).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** One attribute: average line with min–max band (same hue), crosshair tooltip. */
const AttrChart = memo(function AttrChart({ attr, points, from, to, unit }: { attr: string; points: Point[]; from: number; to: number; unit?: string }) {
  const theme = useTheme()
  const color = seriesColor(theme.palette.mode)
  const grid = theme.palette.divider
  const muted = theme.palette.text.secondary
  const last = [...points].reverse().find((p) => p.avg !== null)

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} fontFamily={MONO}>
            {attr}
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {fmt(last?.avg)}
            {unit && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                {unit}
              </Typography>
            )}
          </Typography>
        </Box>
        <Box sx={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                scale="time"
                domain={[from, to]}
                tickFormatter={tickFormatter(to - from)}
                tick={{ fontSize: 11, fill: muted }}
                stroke={grid}
                minTickGap={48}
              />
              <YAxis width={56} tick={{ fontSize: 11, fill: muted }} stroke={grid} domain={['auto', 'auto']} tickFormatter={(v) => fmt(v)} />
              <ChartTooltip
                cursor={{ stroke: muted, strokeWidth: 1 }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as Point
                  return (
                    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1, boxShadow: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {new Date(p.x).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {fmt(p.avg)} {unit ?? ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        min {fmt(p.min)} · max {fmt(p.max)} · n {p.samples}
                      </Typography>
                    </Box>
                  )
                }}
              />
              <Area dataKey="band" stroke="none" fill={color} fillOpacity={0.15} isAnimationActive={false} connectNulls />
              <Line
                dataKey="avg"
                stroke={color}
                strokeWidth={2}
                dot={points.length <= 2 ? { r: 4, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 } : false}
                activeDot={{ r: 4, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
})

function toPoints(buckets: HistoryBucket[]): Point[] {
  return buckets.map((b) => ({
    x: Date.parse(b.t),
    avg: b.avg,
    min: b.min,
    max: b.max,
    band: b.min !== null && b.max !== null ? [b.min, b.max] : null,
    samples: b.samples,
  }))
}

interface Props {
  entityId: string
  /** Units by attribute name, from the entity's current state */
  units?: Record<string, string | undefined>
}

/** Attribute history of one entity: range selector, attribute chips, one chart per numeric attribute. */
export default function EntityHistory({ entityId, units = {} }: Props) {
  const { t } = useTranslation()
  const [rangeKey, setRangeKey] = useState('24h')
  const [attributes, setAttributes] = useState<HistoryAttribute[] | null>(null)
  const [selected, setSelected] = useState<string[] | null>(null)
  const [data, setData] = useState<{ from: number; to: number; series: Record<string, HistoryBucket[]> } | null>(null)
  const [view, setView] = useState<'charts' | 'table'>('charts')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const attrs = await getHistoryAttributes(entityId)
      setAttributes(attrs)
      const chosen = selected ?? attrs.filter((a) => a.numeric).slice(0, MAX_CHARTS).map((a) => a.attr)
      if (!selected) setSelected(chosen)
      if (!chosen.length) {
        setData(null)
        return
      }
      const to = Date.now()
      const from = to - (RANGES.find((r) => r.key === rangeKey)?.ms ?? 24 * 3600e3)
      const h = await getHistory(entityId, {
        attrs: chosen.join(','),
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        maxPoints: MAX_POINTS,
      })
      setData({ from, to, series: h.series })
    } catch (err) {
      setError((err as Error).message)
    }
  }, [entityId, rangeKey, selected])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (attr: string) =>
    setSelected((s) => (s?.includes(attr) ? s.filter((a) => a !== attr) : [...(s ?? []), attr].slice(-MAX_CHARTS)))

  const rows = useMemo(() => {
    if (!data) return []
    const out: { attr: string; b: HistoryBucket }[] = []
    for (const [attr, buckets] of Object.entries(data.series)) for (const b of buckets) out.push({ attr, b })
    return out.sort((a, b) => b.b.t.localeCompare(a.b.t))
  }, [data])

  const exportCsv = () => {
    const lines = ['time,attribute,avg,min,max,last,samples']
    for (const { attr, b } of rows) lines.push([b.t, attr, b.avg ?? '', b.min ?? '', b.max ?? '', JSON.stringify(b.last ?? ''), b.samples].join(','))
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${entityId}-history.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (attributes && attributes.length === 0) return <Alert severity="info">{t('history.noHistory')}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={rangeKey} onChange={(_, v) => v && setRangeKey(v)}>
          {RANGES.map((r) => (
            <ToggleButton key={r.key} value={r.key}>
              {r.key}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
          <ToggleButton value="charts" aria-label={t('history.charts')}>
            <ShowChartIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="table" aria-label={t('history.table')}>
            <TableChartIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={t('history.exportCsv')}>
          <span>
            <IconButton size="small" onClick={exportCsv} disabled={!rows.length}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('common.refresh')}>
          <IconButton size="small" onClick={load}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {attributes && (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
          {attributes.map((a) => (
            <Chip
              key={a.attr}
              label={`${a.attr} (${a.samples})`}
              size="small"
              color={selected?.includes(a.attr) ? 'primary' : 'default'}
              variant={selected?.includes(a.attr) ? 'filled' : 'outlined'}
              onClick={() => toggle(a.attr)}
            />
          ))}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && attributes === null && <Skeleton variant="rounded" height={200} />}

      {data && view === 'charts' && (
        <Grid container spacing={2}>
          {(selected ?? []).map((attr) => {
            const buckets = data.series[attr] ?? []
            const numeric = buckets.some((b) => b.avg !== null)
            return (
              <Grid item xs={12} md={6} key={attr}>
                {numeric ? (
                  <AttrChart attr={attr} points={toPoints(buckets)} from={data.from} to={data.to} unit={units[attr]} />
                ) : (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontFamily={MONO} fontWeight={600}>
                        {attr}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {buckets.length ? t('history.nonNumeric', { count: buckets.length }) : t('history.noSamplesInRange')}
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Grid>
            )
          })}
        </Grid>
      )}

      {data && view === 'table' && (
        <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{t('history.time')}</TableCell>
                <TableCell>{t('attr.name')}</TableCell>
                <TableCell align="right">avg</TableCell>
                <TableCell align="right">min</TableCell>
                <TableCell align="right">max</TableCell>
                <TableCell>{t('history.last')}</TableCell>
                <TableCell align="right">n</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(0, 1000).map(({ attr, b }) => (
                <TableRow key={`${attr}|${b.t}`}>
                  <TableCell>{new Date(b.t).toLocaleString()}</TableCell>
                  <TableCell sx={{ fontFamily: MONO }}>{attr}</TableCell>
                  <TableCell align="right">{fmt(b.avg)}</TableCell>
                  <TableCell align="right">{fmt(b.min)}</TableCell>
                  <TableCell align="right">{fmt(b.max)}</TableCell>
                  <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem' }}>{JSON.stringify(b.last)}</TableCell>
                  <TableCell align="right">{b.samples}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  )
}
