import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  Paper,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  MenuItem,
  TextField,
  Badge,
} from '@mui/material'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAppContext } from '../../context/AppContext'

interface LiveItem {
  type: string
  sourceId?: string
  data?: unknown
  timestamp?: string
  [key: string]: unknown
}

export default function LiveData() {
  const { t } = useTranslation()
  const { apiBaseUrl } = useAppContext()

  const wsUrl = apiBaseUrl.replace(/^http/, 'ws').replace(':3000', ':3001')

  const [paused, setPaused] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('')

  const { connected, messages, error, connect, clearMessages } = useWebSocket(wsUrl, true)

  // Collect unique source IDs seen so far
  const knownSources = Array.from(
    new Set(
      messages
        .map((m) => (m as LiveItem).sourceId)
        .filter(Boolean),
    ),
  ) as string[]

  const filtered = sourceFilter
    ? messages.filter((m) => (m as LiveItem).sourceId === sourceFilter)
    : messages

  const displayed = paused ? filtered : filtered.slice(0, 100)

  const formatData = (data: unknown): string => {
    if (!data) return '—'
    try {
      return JSON.stringify(data, null, 0)
    } catch {
      return String(data)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          {t('liveData.title')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Connection status */}
          <Chip
            icon={connected ? <WifiIcon sx={{ fontSize: '14px !important' }} /> : <WifiOffIcon sx={{ fontSize: '14px !important' }} />}
            label={connected ? t('liveData.connected') : t('liveData.disconnected')}
            color={connected ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />

          {/* Source filter */}
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
            <IconButton onClick={() => setPaused(!paused)} size="small">
              {paused ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('liveData.clearData')}>
            <IconButton onClick={clearMessages} size="small">
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

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {t('liveData.latestData')}
            </Typography>
            <Badge badgeContent={messages.length} color="primary" max={999}>
              <Typography variant="caption" color="text.secondary">
                {t('liveData.dataPoints')}
              </Typography>
            </Badge>
          </Box>

          {!displayed.length ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('liveData.noData')}</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 560 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 160 }}>{t('liveData.timestamp')}</TableCell>
                    <TableCell sx={{ width: 160 }}>{t('liveData.sourceId')}</TableCell>
                    <TableCell>{t('liveData.dataPoints')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayed.map((msg, idx) => {
                    const item = msg as LiveItem
                    return (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {item.timestamp
                              ? new Date(item.timestamp as string).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',

                                })
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.sourceId ?? item.type ?? '?'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            fontFamily="monospace"
                            sx={{
                              display: 'block',
                              maxWidth: '60vw',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatData(item.data ?? msg)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
