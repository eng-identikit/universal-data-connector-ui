import { useState, useCallback, useEffect } from 'react'
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
  IconButton,
  Tooltip,
  Alert,
  Skeleton,
  Switch,
  useTheme,
  Snackbar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import RefreshIcon from '@mui/icons-material/Refresh'
import StatusChip from '../../components/StatusChip'
import ConfirmDialog from '../../components/ConfirmDialog'
import ConnectorDialog from './ConnectorDialog'
import { getSources, startSource, stopSource, restartSource, deleteSource, updateSource } from '../../api/endpoints'
import type { Source } from '../../api/types'

export default function Connectors() {
  const { t } = useTranslation()
  const theme = useTheme()

  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  })

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState<Source | null>(null)

  const showSnack = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity })

  const fetchSources = useCallback(async () => {
    try {
      setError(null)
      const data = await getSources()
      setSources(data.sources)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSources()
    const id = setInterval(fetchSources, 8000)
    return () => clearInterval(id)
  }, [fetchSources])

  const handleAction = async (
    action: (id: string) => Promise<unknown>,
    id: string,
    successKey: string,
  ) => {
    try {
      await action(id)
      showSnack(t(successKey))
      fetchSources()
    } catch (err) {
      showSnack(err instanceof Error ? err.message : 'Error', 'error')
    }
  }

  const handleToggleEnabled = async (source: Source) => {
    try {
      await updateSource(source.id, { enabled: !source.enabled })
      fetchSources()
    } catch (err) {
      showSnack(err instanceof Error ? err.message : 'Error', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteSource(confirmDelete.id)
      showSnack(t('connectors.deleteSuccess'))
      setConfirmDelete(null)
      fetchSources()
    } catch (err) {
      showSnack(err instanceof Error ? err.message : 'Error', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          {t('connectors.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('common.refresh')}>
            <IconButton onClick={fetchSources} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditingSource(null); setDialogOpen(true) }}
          >
            {t('connectors.addConnector')}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && !sources.length ? (
            <Box sx={{ p: 2 }}>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} height={52} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : !sources.length ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('connectors.noConnectors')}</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('connectors.id')}</TableCell>
                    <TableCell>{t('connectors.type')}</TableCell>
                    <TableCell>{t('common.status')}</TableCell>
                    <TableCell>{t('connectors.enabled')}</TableCell>
                    <TableCell align="right">{t('connectors.dataPoints')}</TableCell>
                    <TableCell align="right">{t('connectors.errors')}</TableCell>
                    <TableCell>{t('connectors.lastActivity')}</TableCell>
                    <TableCell align="center">{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sources.map((src) => (
                    <TableRow key={src.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {src.id}
                        </Typography>
                        {src.name && (
                          <Typography variant="caption" color="text.secondary">
                            {src.name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: theme.palette.action.selected,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                          }}
                        >
                          {src.type}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={src.runtime?.status ?? 'unknown'} />
                      </TableCell>
                      <TableCell>
                        <Switch
                          size="small"
                          checked={src.enabled}
                          onChange={() => handleToggleEnabled(src)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {src.runtime?.stats?.dataPoints?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={(src.runtime?.stats?.errors ?? 0) > 0 ? 'error' : 'text.primary'}
                        >
                          {src.runtime?.stats?.errors ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {src.runtime?.lastActivity
                            ? new Date(src.runtime.lastActivity).toLocaleTimeString()
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title={t('common.start')}>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleAction(startSource, src.id, 'connectors.startSuccess')}
                            >
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.stop')}>
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleAction(stopSource, src.id, 'connectors.stopSuccess')}
                            >
                              <StopIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.restart')}>
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleAction(restartSource, src.id, 'connectors.restartSuccess')}
                            >
                              <RestartAltIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.edit')}>
                            <IconButton
                              size="small"
                              onClick={() => { setEditingSource(src); setDialogOpen(true) }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.delete')}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setConfirmDelete(src)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <ConnectorDialog
        open={dialogOpen}
        source={editingSource}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false)
          showSnack(t('connectors.saveSuccess'))
          fetchSources()
        }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title={t('connectors.deleteConnector')}
        message={t('connectors.deleteConfirm', { id: confirmDelete?.id ?? '' })}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
