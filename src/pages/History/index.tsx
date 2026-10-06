import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  Button,
  IconButton,
  Tooltip,
  MenuItem,
  TextField,
  Autocomplete,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  LinearProgress,
  Skeleton,
  useTheme,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import UndoIcon from '@mui/icons-material/Undo'
import DataObjectIcon from '@mui/icons-material/DataObject'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ReferenceArea,
} from 'recharts'
import {
  getHistoryStatus,
  getHistorySources,
  getHistoryMeasurements,
  getHistorySeries,
  getHistoryRecords,
} from '../../api/endpoints'
import type {
  HistoryStatus,
  HistorySource,
  HistoryMeasurement,
  HistorySeriesResponse,
  HistoryRecordsResponse,
  HistoryPoint,
} from '../../api/types'

// ─── Time range helpers ──────────────────────────────────────────────────────

const PRESETS: { key: string; ms: number }[] = [
  { key: '15m', ms: 15 * 60e3 },
  { key: '1h', ms: 3600e3 },
  { key: '6h', ms: 6 * 3600e3 },
  { key: '24h', ms: 24 * 3600e3 },
  { key: '7d', ms: 7 * 24 * 3600e3 },
  { key: '30d', ms: 30 * 24 * 3600e3 },
]

interface Range {
  start: number
  end: number
}

const MAX_CHARTS = 8
const RECORDS_PAGE = 50

const toIso = (r: Range) => ({ startTime: new Date(r.start).toISOString(), endTime: new Date(r.end).toISOString() })

// datetime-local wants local time without zone
const toLocalInput = (ms: number) => {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatTick = (ms: number, span: number) => {
  const d = new Date(ms)
  if (span <= 36 * 3600e3) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatValue = (v: unknown) => {
  if (typeof v === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 3 })
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v === null || v === undefined) return '—'
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
}

// Chart series color (validated categorical slot 1, light/dark)
const seriesColor = (mode: 'light' | 'dark') => (mode === 'dark' ? '#3987e5' : '#2a78d6')

// ─── Measurement chart (one panel per measurement: single axis per scale) ───

interface ChartRow {
  x: number
  avg: number
  band: [number, number]
  min: number
  max: number
  samples: number
}

interface MeasurementChartProps {
  id: string
  type: string | null
  points: HistoryPoint[]
  range: Range
  bucket: string
  onZoom: (r: Range) => void
}

function MeasurementChart({ id, type, points, range, bucket, onZoom }: MeasurementChartProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const color = seriesColor(theme.palette.mode)
  const [selStart, setSelStart] = useState<number | null>(null)
  const [selEnd, setSelEnd] = useState<number | null>(null)

  const data: ChartRow[] = useMemo(
    () =>
      points.map((p) => ({
        x: Date.parse(p.t),
        avg: p.avg,
        band: [p.min, p.max],
        min: p.min,
        max: p.max,
        samples: p.samples,
      })),
    [points],
  )

  const isBool = type === 'bool' || type === 'boolean'
  const last = points.length ? points[points.length - 1].last : null
  const span = range.end - range.start
  const textSecondary = theme.palette.text.secondary
  const gridColor = theme.palette.divider

  const finishSelection = () => {
    if (selStart !== null && selEnd !== null && Math.abs(selEnd - selStart) > 1000) {
      onZoom({ start: Math.min(selStart, selEnd), end: Math.max(selStart, selEnd) })
    }
    setSelStart(null)
    setSelEnd(null)
  }

  return (
    <Card>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('history.lastValue')}: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{formatValue(last)}</Box>
            {' · '}
            {t('history.bucket')}: {bucket}
          </Typography>
        </Box>

        {data.length === 0 ? (
          <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">{t('history.noPoints')}</Typography>
          </Box>
        ) : (
          <Box sx={{ height: 180, userSelect: 'none', cursor: 'crosshair' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                syncId="history"
                margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
                onMouseDown={(e) => e && e.activeLabel !== undefined && setSelStart(Number(e.activeLabel))}
                onMouseMove={(e) => selStart !== null && e && e.activeLabel !== undefined && setSelEnd(Number(e.activeLabel))}
                onMouseUp={finishSelection}
                onMouseLeave={() => { setSelStart(null); setSelEnd(null) }}
              >
                <CartesianGrid stroke={gridColor} strokeDasharray="0" vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  scale="time"
                  domain={[range.start, range.end]}
                  tickFormatter={(v) => formatTick(v, span)}
                  tick={{ fontSize: 11, fill: textSecondary }}
                  stroke={gridColor}
                  minTickGap={48}
                />
                <YAxis
                  width={56}
                  tick={{ fontSize: 11, fill: textSecondary }}
                  stroke={gridColor}
                  domain={isBool ? [0, 1] : ['auto', 'auto']}
                  ticks={isBool ? [0, 1] : undefined}
                  tickFormatter={(v) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v)}
                />
                <ChartTooltip
                  cursor={{ stroke: textSecondary, strokeWidth: 1 }}
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const row = payload[0].payload as ChartRow
                    return (
                      <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1, boxShadow: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(row.x).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {t('history.avg')}: {formatValue(row.avg)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('history.min')} {formatValue(row.min)} · {t('history.max')} {formatValue(row.max)} · {row.samples} {t('history.samples')}
                        </Typography>
                      </Box>
                    )
                  }}
                />
                <Area
                  dataKey="band"
                  stroke="none"
                  fill={color}
                  fillOpacity={0.16}
                  isAnimationActive={false}
                  type={isBool ? 'stepAfter' : 'linear'}
                  activeDot={false}
                />
                <Line
                  dataKey="avg"
                  stroke={color}
                  strokeWidth={2}
                  dot={data.length <= 2 ? { r: 4, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 } : false}
                  activeDot={{ r: 4, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 }}
                  isAnimationActive={false}
                  type={isBool ? 'stepAfter' : 'linear'}
                />
                {selStart !== null && selEnd !== null && (
                  <ReferenceArea x1={selStart} x2={selEnd} fill={textSecondary} fillOpacity={0.15} strokeOpacity={0} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function History() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [status, setStatus] = useState<HistoryStatus | null>(null)
  const [sources, setSources] = useState<HistorySource[]>([])
  const [source, setSource] = useState('')
  const [preset, setPreset] = useState('1h')
  const [range, setRange] = useState<Range>(() => ({ start: Date.now() - 3600e3, end: Date.now() }))
  const [rangeStack, setRangeStack] = useState<Range[]>([])
  const [measurements, setMeasurements] = useState<HistoryMeasurement[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [series, setSeries] = useState<HistorySeriesResponse | null>(null)
  const [records, setRecords] = useState<HistoryRecordsResponse | null>(null)
  const [recordsOffset, setRecordsOffset] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [tab, setTab] = useState<'chart' | 'records'>('chart')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const available = status?.available === true

  // Status + sources
  const loadStatus = useCallback(async () => {
    try {
      const s = await getHistoryStatus()
      setStatus(s)
      if (s.available) {
        const list = await getHistorySources()
        setSources(list)
        // Deep link (?source=) first, then the source with the most data
        const fromUrl = new URLSearchParams(window.location.search).get('source')
        const busiest = [...list].sort((a, b) => b.records - a.records)[0]?.sourceId
        setSource((cur) => cur || (fromUrl && list.some((x) => x.sourceId === fromUrl) ? fromUrl : busiest) || '')
      }
    } catch (e) {
      setStatus({ timestamp: '', available: false, configured: false, reason: (e as Error).message })
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Measurements of the selected source within the range
  useEffect(() => {
    if (!available || !source) return
    let cancelled = false
    getHistoryMeasurements(source, toIso(range))
      .then((list) => {
        if (cancelled) return
        setMeasurements(list)
        setSelected((cur) => {
          const ids = new Set(list.map((m) => m.id))
          const kept = cur.filter((id) => ids.has(id))
          if (kept.length) return kept
          return list.filter((m) => m.numeric).slice(0, 4).map((m) => m.id)
        })
      })
      .catch((e) => !cancelled && setError((e as Error).message))
    return () => {
      cancelled = true
    }
  }, [available, source, range])

  // Series
  useEffect(() => {
    if (!available || !source || tab !== 'chart') return
    if (!selected.length) {
      setSeries(null)
      return
    }
    let cancelled = false
    setLoading(true)
    getHistorySeries(source, selected, toIso(range))
      .then((s) => {
        if (!cancelled) {
          setSeries(s)
          setError(null)
        }
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [available, source, selected, range, tab])

  // Records
  useEffect(() => {
    if (!available || tab !== 'records') return
    let cancelled = false
    setLoading(true)
    getHistoryRecords(source || undefined, toIso(range), RECORDS_PAGE, recordsOffset)
      .then((r) => {
        if (!cancelled) {
          setRecords(r)
          setError(null)
        }
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [available, source, range, tab, recordsOffset])

  // ─── Navigation ───

  const applyRange = (next: Range, keepPreset = false) => {
    setRangeStack((stack) => [...stack.slice(-19), range])
    setRange(next)
    setRecordsOffset(0)
    if (!keepPreset) setPreset('custom')
  }

  const applyPreset = (key: string) => {
    setPreset(key)
    const p = PRESETS.find((x) => x.key === key)
    if (p) {
      const now = Date.now()
      applyRange({ start: now - p.ms, end: now }, true)
    }
  }

  const refresh = () => {
    const p = PRESETS.find((x) => x.key === preset)
    if (p) {
      const now = Date.now()
      setRange({ start: now - p.ms, end: now })
    } else {
      setRange({ ...range })
    }
    loadStatus()
  }

  const span = range.end - range.start
  const pan = (dir: -1 | 1) => applyRange({ start: range.start + dir * span / 2, end: range.end + dir * span / 2 })
  const zoomOut = () => {
    const mid = (range.start + range.end) / 2
    applyRange({ start: mid - span, end: Math.min(mid + span, Math.max(Date.now(), range.end)) })
  }
  const back = () => {
    const prev = rangeStack[rangeStack.length - 1]
    if (!prev) return
    setRangeStack((stack) => stack.slice(0, -1))
    setRange(prev)
    setPreset('custom')
    setRecordsOffset(0)
  }

  const measurementType = (id: string) => measurements.find((m) => m.id === id)?.type ?? null

  // ─── Render ───

  if (!status) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} mb={2}>{t('history.title')}</Typography>
        <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={220} />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700}>{t('history.title')}</Typography>
        {available && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              variant="outlined"
              color={status.recording ? 'success' : 'warning'}
              icon={<FiberManualRecordIcon sx={{ fontSize: '12px !important' }} />}
              label={status.recording ? t('history.recording') : t('history.notRecording', { storage: status.activeStorage })}
            />
            {status.oldest && status.newest && (
              <Typography variant="caption" color="text.secondary">
                {t('history.dataRange')}: {new Date(status.oldest).toLocaleString()} → {new Date(status.newest).toLocaleString()}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {!available && (
        <Alert
          severity={status.configured ? 'error' : 'info'}
          action={<Button color="inherit" size="small" onClick={() => navigate('/storage')}>{t('history.goToStorage')}</Button>}
        >
          <Typography variant="body2" fontWeight={600}>
            {status.configured ? t('history.unavailable') : t('history.notConfigured')}
          </Typography>
          {status.reason && <Typography variant="body2">{status.reason}</Typography>}
        </Alert>
      )}

      {available && (
        <>
          {/* Filters: one row above the charts */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', pb: '16px !important' }}>
              <TextField
                select
                size="small"
                label={t('history.source')}
                value={source}
                onChange={(e) => { setSource(e.target.value); setSelected([]); setRecordsOffset(0) }}
                sx={{ minWidth: 180 }}
              >
                {tab === 'records' && <MenuItem value="">{t('liveData.allSources')}</MenuItem>}
                {sources.map((s) => (
                  <MenuItem key={s.sourceId} value={s.sourceId}>
                    {s.sourceId} <Typography component="span" variant="caption" color="text.secondary" ml={1}>({s.records.toLocaleString()})</Typography>
                  </MenuItem>
                ))}
              </TextField>

              <TextField select size="small" label={t('history.range')} value={preset} onChange={(e) => applyPreset(e.target.value)} sx={{ minWidth: 140 }}>
                {PRESETS.map((p) => (
                  <MenuItem key={p.key} value={p.key}>{t(`history.presets.${p.key}`)}</MenuItem>
                ))}
                <MenuItem value="custom">{t('history.presets.custom')}</MenuItem>
              </TextField>

              <TextField
                type="datetime-local"
                size="small"
                label={t('history.from')}
                value={toLocalInput(range.start)}
                onChange={(e) => { const v = Date.parse(e.target.value); if (!Number.isNaN(v) && v < range.end) applyRange({ start: v, end: range.end }) }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="datetime-local"
                size="small"
                label={t('history.to')}
                value={toLocalInput(range.end)}
                onChange={(e) => { const v = Date.parse(e.target.value); if (!Number.isNaN(v) && v > range.start) applyRange({ start: range.start, end: v }) }}
                InputLabelProps={{ shrink: true }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title={t('history.panBack')}><IconButton size="small" onClick={() => pan(-1)}><ChevronLeftIcon /></IconButton></Tooltip>
                <Tooltip title={t('history.panForward')}><IconButton size="small" onClick={() => pan(1)}><ChevronRightIcon /></IconButton></Tooltip>
                <Tooltip title={t('history.zoomOut')}><IconButton size="small" onClick={zoomOut}><ZoomOutIcon /></IconButton></Tooltip>
                <Tooltip title={t('history.back')}>
                  <span><IconButton size="small" onClick={back} disabled={!rangeStack.length}><UndoIcon /></IconButton></span>
                </Tooltip>
                <Tooltip title={t('common.refresh', 'Refresh')}><IconButton size="small" onClick={refresh}><RefreshIcon /></IconButton></Tooltip>
              </Box>

              {tab === 'chart' && (
                <Autocomplete
                  multiple
                  size="small"
                  options={measurements.filter((m) => m.numeric).map((m) => m.id)}
                  value={selected}
                  onChange={(_, v) => setSelected(v.slice(0, MAX_CHARTS))}
                  disableCloseOnSelect
                  limitTags={3}
                  sx={{ flex: '1 1 320px', minWidth: 260 }}
                  renderInput={(params) => <TextField {...params} label={t('history.measurements')} placeholder={selected.length ? '' : t('history.selectMeasurements')} />}
                />
              )}
            </CardContent>
          </Card>

          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v)
              if (v === 'chart' && !source && sources.length) setSource(sources[0].sourceId)
            }}
            sx={{ mb: 1 }}
          >
            <Tab value="chart" label={t('history.chartTab')} />
            <Tab value="records" label={t('history.recordsTab')} />
          </Tabs>

          <Box sx={{ height: 4, mb: 1 }}>{loading && <LinearProgress />}</Box>
          {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

          {tab === 'chart' && (
            <>
              {!sources.length && <Alert severity="info">{t('history.noSources')}</Alert>}
              {!!sources.length && !selected.length && (
                <Alert severity="info">{measurements.length ? t('history.selectMeasurements') : t('history.noMeasurements')}</Alert>
              )}
              {series && selected.length > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {t('history.zoomHint')}
                  </Typography>
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    {selected.map((id) => (
                      <MeasurementChart
                        key={id}
                        id={id}
                        type={measurementType(id)}
                        points={series.series[id] || []}
                        range={range}
                        bucket={series.bucket}
                        onZoom={(r) => applyRange(r)}
                      />
                    ))}
                  </Box>
                </>
              )}
            </>
          )}

          {tab === 'records' && records && (
            <Card>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 190 }}>{t('liveData.timestamp')}</TableCell>
                      <TableCell sx={{ width: 160 }}>{t('liveData.sourceId')}</TableCell>
                      <TableCell>{t('history.measurements')}</TableCell>
                      <TableCell sx={{ width: 48 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.records.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('history.noRecords')}</TableCell>
                      </TableRow>
                    )}
                    {records.records.map((r, i) => {
                      const ms = r.data?.measurements || []
                      return (
                        <Fragment key={`${r.timestamp}-${i}`}>
                          <TableRow hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(r.timestamp).toLocaleString()}</TableCell>
                            <TableCell>{r.sourceId}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {ms.slice(0, 8).map((m) => (
                                  <Chip key={m.id} size="small" variant="outlined" label={`${m.id}: ${formatValue(m.value)}`} sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                                ))}
                                {ms.length > 8 && <Chip size="small" label={`+${ms.length - 8}`} />}
                                {!ms.length && <Typography variant="caption" color="text.secondary">—</Typography>}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={t('history.rawJson')}>
                                <IconButton size="small" onClick={() => setExpanded(expanded === i ? null : i)}><DataObjectIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={4} sx={{ p: 0, borderBottom: expanded === i ? undefined : 'none' }}>
                              <Collapse in={expanded === i} unmountOnExit>
                                <Box component="pre" sx={{ m: 0, p: 2, fontSize: 12, overflowX: 'auto', bgcolor: 'action.hover' }}>
                                  {JSON.stringify(r.data, null, 2)}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, p: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {records.records.length ? `${recordsOffset + 1}–${recordsOffset + records.records.length}` : '0'}
                </Typography>
                <IconButton size="small" disabled={recordsOffset === 0} onClick={() => setRecordsOffset(Math.max(0, recordsOffset - RECORDS_PAGE))}><ChevronLeftIcon /></IconButton>
                <IconButton size="small" disabled={!records.hasMore} onClick={() => setRecordsOffset(recordsOffset + RECORDS_PAGE)}><ChevronRightIcon /></IconButton>
              </Box>
            </Card>
          )}
        </>
      )}
    </Box>
  )
}
