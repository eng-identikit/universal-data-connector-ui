import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  MenuItem,
  TextField,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from '@mui/material'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
} from 'recharts'
import { useWebSocket, type WSMessage } from '../../hooks/useWebSocket'
import { useAppContext } from '../../context/AppContext'
import StatusChip from '../../components/StatusChip'

// ─── Live buffer model ───────────────────────────────────────────────────────

const WINDOWS: { key: string; ms: number }[] = [
  { key: '1m', ms: 60e3 },
  { key: '5m', ms: 5 * 60e3 },
  { key: '15m', ms: 15 * 60e3 },
]
const MAX_WINDOW = WINDOWS[WINDOWS.length - 1].ms
const MAX_POINTS = 10000 // per series, ~15 min at 10 Hz
const RENDER_POINTS = 600 // per chart after decimation
const MAX_CHARTS = 12
const RAW_BUFFER = 500
const STALE_MS = 10e3

interface Sample {
  x: number
  v: number
}

interface Series {
  key: string
  sourceId: string
  deviceId: string
  measId: string
  type?: string
  unit?: string
  last: unknown
  lastTs: number
  points: Sample[]
}

interface RawItem {
  ts: number
  kind: string
  sourceId: string
  body: unknown
}

interface Measurement {
  id?: string
  name?: string
  type?: string
  unit?: string
  value?: unknown
}

interface Device {
  id?: string
  sourceId?: string
  measurements?: Measurement[]
  metadata?: { timestamp?: string; source?: string; sourceId?: string; [k: string]: unknown }
  timestamp?: string
}

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return null
}

const parseTs = (...candidates: unknown[]) => {
  for (const c of candidates) {
    if (typeof c === 'string' || typeof c === 'number') {
      const ms = typeof c === 'number' ? c : Date.parse(c)
      if (Number.isFinite(ms)) return ms
    }
  }
  return Date.now()
}

/**
 * The engine broadcasts `data` messages in two shapes:
 *  - { sourceId, originalData, mappedData: Device, timestamp }
 *  - Device itself ({ id, type, measurements, metadata })
 */
function extractDevice(payload: unknown): { sourceId: string; device: Device; ts: number } | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as { sourceId?: string; mappedData?: Device; timestamp?: string } & Device
  const device: Device = p.mappedData ?? p
  if (!Array.isArray(device.measurements)) return null
  const sourceId =
    p.sourceId ?? device.sourceId ?? device.metadata?.sourceId ?? device.metadata?.source ?? device.id ?? 'unknown'
  return { sourceId: String(sourceId), device, ts: parseTs(device.metadata?.timestamp, p.timestamp, device.timestamp) }
}

// Keep at most `n` points, always including the last one
const decimate = (points: Sample[], n: number) => {
  if (points.length <= n) return points
  const step = points.length / n
  const out: Sample[] = []
  for (let i = 0; i < n - 1; i++) out.push(points[Math.floor(i * step)])
  out.push(points[points.length - 1])
  return out
}

const formatValue = (v: unknown) => {
  if (typeof v === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 3 })
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v === null || v === undefined) return '—'
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
}

const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

// Chart series color (validated categorical slot 1, light/dark) — same as History
const seriesColor = (mode: 'light' | 'dark') => (mode === 'dark' ? '#3987e5' : '#2a78d6')

const isBoolType = (type?: string) => type === 'bool' || type === 'boolean'

// ─── Live chart (one panel per measurement) ──────────────────────────────────

interface LiveChartProps {
  series: Series
  points: Sample[]
  start: number
  end: number
}

const LiveChart = memo(function LiveChart({ series, points, start, end }: LiveChartProps) {
  const theme = useTheme()
  const color = seriesColor(theme.palette.mode)
  const textSecondary = theme.palette.text.secondary
  const gridColor = theme.palette.divider
  const isBool = isBoolType(series.type) || typeof series.last === 'boolean'

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {series.measId}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              {series.sourceId}
              {series.deviceId !== series.sourceId ? ` · ${series.deviceId}` : ''}
            </Typography>
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
            {formatValue(series.last)}
            {series.unit && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                {series.unit}
              </Typography>
            )}
          </Typography>
        </Box>
        <Box sx={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                scale="time"
                domain={[start, end]}
                tickFormatter={formatTime}
                tick={{ fontSize: 11, fill: textSecondary }}
                stroke={gridColor}
                minTickGap={48}
                allowDataOverflow
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
                  const row = payload[0].payload as Sample
                  return (
                    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1, boxShadow: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {new Date(row.x).toLocaleTimeString()}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatValue(row.v)} {series.unit ?? ''}
                      </Typography>
                    </Box>
                  )
                }}
              />
              <Line
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                dot={points.length <= 2 ? { r: 4, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 } : false}
                activeDot={{ r: 4, fill: color, stroke: theme.palette.background.paper, strokeWidth: 2 }}
                isAnimationActive={false}
                type={isBool ? 'stepAfter' : 'linear'}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
})

// ─── Page ────────────────────────────────────────────────────────────────────

interface Snapshot {
  now: number
  series: Series[]
  raw: RawItem[]
  statuses: [string, string][]
  rate: number
  total: number
}

const emptySnapshot = (): Snapshot => ({ now: Date.now(), series: [], raw: [], statuses: [], rate: 0, total: 0 })

export default function LiveData() {
  const { t } = useTranslation()
  const { apiBaseUrl } = useAppContext()

  const wsUrl = apiBaseUrl.replace(/^http/, 'ws').replace(':3000', ':3001')

  const [tab, setTab] = useState<'charts' | 'values' | 'raw'>('charts')
  const [windowKey, setWindowKey] = useState('5m')
  const [paused, setPaused] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')
  const [snap, setSnap] = useState<Snapshot>(emptySnapshot)

  // Live buffers live in refs: messages can arrive at 10+ Hz, the UI refreshes once per second
  const seriesRef = useRef(new Map<string, Series>())
  const rawRef = useRef<RawItem[]>([])
  const statusRef = useRef(new Map<string, string>())
  const arrivalsRef = useRef<number[]>([])
  const totalRef = useRef(0)

  const ingest = useCallback((msg: WSMessage) => {
    const now = Date.now()
    totalRef.current++
    arrivalsRef.current.push(now)

    if (msg.type === 'sourceStatus' && typeof msg.sourceId === 'string') {
      statusRef.current.set(msg.sourceId, String(msg.status ?? 'unknown'))
    }

    let sourceId = typeof msg.sourceId === 'string' ? msg.sourceId : ''
    if (msg.type === 'data') {
      const extracted = extractDevice(msg.payload ?? msg.data)
      if (extracted) {
        const { device, ts } = extracted
        sourceId = extracted.sourceId
        const deviceId = String(device.id ?? sourceId)
        for (const m of device.measurements ?? []) {
          const measId = String(m.id ?? m.name ?? '?')
          const key = `${sourceId}/${deviceId}/${measId}`
          let s = seriesRef.current.get(key)
          if (!s) {
            s = { key, sourceId, deviceId, measId, last: undefined, lastTs: 0, points: [] }
            seriesRef.current.set(key, s)
          }
          s.type = m.type ?? s.type
          s.unit = m.unit ?? s.unit
          s.last = m.value
          s.lastTs = ts
          const v = toNumber(m.value)
          if (v !== null) {
            s.points.push({ x: ts, v })
            if (s.points.length > MAX_POINTS) s.points.splice(0, s.points.length - MAX_POINTS)
          }
        }
      }
    }

    rawRef.current.unshift({ ts: parseTs(msg.timestamp), kind: msg.type ?? '?', sourceId, body: msg.payload ?? msg.data ?? msg })
    if (rawRef.current.length > RAW_BUFFER) rawRef.current.length = RAW_BUFFER
  }, [])

  const { connected, error, connect } = useWebSocket(wsUrl, true, { onMessage: ingest, bufferSize: 0 })

  // Periodic snapshot: trims old samples and publishes a copy to render (frozen while paused)
  useEffect(() => {
    if (paused) return
    const takeSnapshot = () => {
      const now = Date.now()
      const cutoff = now - MAX_WINDOW
      for (const s of seriesRef.current.values()) {
        const firstKept = s.points.findIndex((p) => p.x >= cutoff)
        if (firstKept > 0) s.points.splice(0, firstKept)
        else if (firstKept === -1) s.points.length = 0
      }
      arrivalsRef.current = arrivalsRef.current.filter((x) => x >= now - 5000)
      setSnap({
        now,
        series: Array.from(seriesRef.current.values(), (s) => ({ ...s, points: s.points.slice() })),
        raw: rawRef.current.slice(),
        statuses: Array.from(statusRef.current.entries()),
        rate: arrivalsRef.current.length / 5,
        total: totalRef.current,
      })
    }
    takeSnapshot()
    const id = setInterval(takeSnapshot, 1000)
    return () => clearInterval(id)
  }, [paused])

  const clearAll = () => {
    seriesRef.current.clear()
    rawRef.current = []
    statusRef.current.clear()
    arrivalsRef.current = []
    totalRef.current = 0
    setSnap(emptySnapshot())
  }

  const knownSources = useMemo(
    () => Array.from(new Set([...snap.series.map((s) => s.sourceId), ...snap.statuses.map(([id]) => id)])).sort(),
    [snap],
  )

  const visibleSeries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return snap.series
      .filter((s) => !sourceFilter || s.sourceId === sourceFilter)
      .filter((s) => !q || s.key.toLowerCase().includes(q))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [snap, sourceFilter, search])

  const windowMs = WINDOWS.find((w) => w.key === windowKey)?.ms ?? 5 * 60e3
  const start = snap.now - windowMs
  const chartSeries = visibleSeries.filter((s) => s.points.length > 0)
  const shownCharts = chartSeries.slice(0, MAX_CHARTS)
  const rawShown = snap.raw.filter((r) => !sourceFilter || r.sourceId === sourceFilter).slice(0, 200)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700}>
          {t('liveData.title')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={connected ? <WifiIcon sx={{ fontSize: '14px !important' }} /> : <WifiOffIcon sx={{ fontSize: '14px !important' }} />}
            label={connected ? t('liveData.connected') : t('liveData.disconnected')}
            color={connected ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />
          <Chip
            size="small"
            variant="outlined"
            label={`${snap.rate.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${t('liveData.msgPerSec')} · ${snap.total.toLocaleString()} ${t('liveData.messages')}`}
          />

          <TextField
            select
            size="small"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            sx={{ minWidth: 160 }}
            label={t('liveData.filterBySource')}
          >
            <MenuItem value="">{t('liveData.allSources')}</MenuItem>
            {knownSources.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>

          <Tooltip title={paused ? t('liveData.resumeStream') : t('liveData.pauseStream')}>
            <IconButton onClick={() => setPaused(!paused)} size="small" color={paused ? 'warning' : 'default'}>
              {paused ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('liveData.clearData')}>
            <IconButton onClick={clearAll} size="small">
              <DeleteSweepIcon />
            </IconButton>
          </Tooltip>
          {!connected && (
            <Button size="small" variant="outlined" onClick={connect}>
              {t('liveData.reconnect')}
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      {paused && <Alert severity="info" sx={{ mb: 2 }}>{t('liveData.pausedInfo')}</Alert>}

      {snap.statuses.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
          {snap.statuses.map(([id, status]) => (
            <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">{id}</Typography>
              <StatusChip status={status} />
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="charts" label={t('liveData.tabCharts')} />
          <Tab value="values" label={t('liveData.tabValues')} />
          <Tab value="raw" label={t('liveData.tabRaw')} />
        </Tabs>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          {tab !== 'raw' && (
            <TextField
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('liveData.searchMeasurement')}
              sx={{ minWidth: 200 }}
            />
          )}
          {tab === 'charts' && (
            <ToggleButtonGroup size="small" exclusive value={windowKey} onChange={(_, v) => v && setWindowKey(v)}>
              {WINDOWS.map((w) => (
                <ToggleButton key={w.key} value={w.key}>{w.key}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </Box>
      </Box>

      {tab === 'charts' && (
        <>
          {!shownCharts.length ? (
            <Card>
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">{t('liveData.noNumeric')}</Typography>
              </Box>
            </Card>
          ) : (
            <>
              {chartSeries.length > MAX_CHARTS && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('liveData.tooManyCharts', { shown: MAX_CHARTS, total: chartSeries.length })}
                </Alert>
              )}
              <Grid container spacing={2}>
                {shownCharts.map((s) => (
                  <Grid item xs={12} lg={6} key={s.key}>
                    <LiveChart
                      series={s}
                      points={decimate(s.points.filter((p) => p.x >= start), RENDER_POINTS)}
                      start={start}
                      end={snap.now}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </>
      )}

      {tab === 'values' && (
        <>
          {!visibleSeries.length ? (
            <Card>
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">{t('liveData.noData')}</Typography>
              </Box>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {visibleSeries.map((s) => {
                const stale = snap.now - s.lastTs > STALE_MS
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={s.key}>
                    <Card sx={{ height: '100%', opacity: stale ? 0.6 : 1 }}>
                      <CardContent sx={{ pb: '12px !important' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                          <FiberManualRecordIcon sx={{ fontSize: 10 }} color={stale ? 'disabled' : 'success'} />
                          <Typography variant="caption" color="text.secondary" noWrap title={`${s.sourceId} · ${s.deviceId}`}>
                            {s.sourceId}
                            {s.deviceId !== s.sourceId ? ` · ${s.deviceId}` : ''}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {s.measId}
                        </Typography>
                        <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, wordBreak: 'break-all' }}>
                          {formatValue(s.last)}
                          {s.unit && (
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                              {s.unit}
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {s.lastTs ? formatTime(s.lastTs) : '—'}
                          {stale ? ` · ${t('liveData.stale')}` : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </>
      )}

      {tab === 'raw' && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {!rawShown.length ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">{t('liveData.noData')}</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 560 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 110 }}>{t('liveData.timestamp')}</TableCell>
                      <TableCell sx={{ width: 110 }}>{t('liveData.messageType')}</TableCell>
                      <TableCell sx={{ width: 160 }}>{t('liveData.sourceId')}</TableCell>
                      <TableCell>{t('liveData.dataPoints')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rawShown.map((item, idx) => (
                      <TableRow key={`${item.ts}-${idx}`} hover>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {formatTime(item.ts)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">{item.kind}</Typography>
                        </TableCell>
                        <TableCell>
                          {item.sourceId ? <Chip label={item.sourceId} size="small" variant="outlined" /> : '—'}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            fontFamily="monospace"
                            sx={{ display: 'block', maxWidth: '55vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={formatValue(item.body)}
                          >
                            {formatValue(item.body)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
