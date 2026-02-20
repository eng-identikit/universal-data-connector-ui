import { useState, useEffect, useCallback } from 'react'
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
  Collapse,
  Chip,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import DownloadIcon from '@mui/icons-material/Download'
import { getMappedEntities } from '../../api/endpoints'
import type { MappedEntity } from '../../api/types'

function EntityRow({ entity }: { entity: MappedEntity }) {
  const [expanded, setExpanded] = useState(false)

  // Extract known fields
  const { id, type, sourceId, ...rest } = entity

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace" fontWeight={500}>
            {id}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip label={type} size="small" variant="outlined" />
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {sourceId ?? '—'}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} sx={{ py: 0, border: expanded ? undefined : 'none' }}>
          <Collapse in={expanded}>
            <Box
              sx={{
                py: 1.5,
                px: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
                my: 0.5,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                whiteSpace: 'pre-wrap',
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              {JSON.stringify(rest, null, 2)}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function Mapping() {
  const { t } = useTranslation()
  const [entities, setEntities] = useState<MappedEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setError(null)
      const data = await getMappedEntities()
      setEntities(data.entities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entities')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(entities, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `udc-mapping-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          {t('mapping.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('mapping.exportJson')}>
            <IconButton onClick={handleExportJson} disabled={!entities.length} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('mapping.refresh')}>
            <IconButton onClick={fetch} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetch} size="small">
            {t('mapping.refresh')}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} height={52} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : !entities.length ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('mapping.noEntities')}</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('mapping.entities')} · {entities.length}
                </Typography>
              </Box>
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('mapping.entityId')}</TableCell>
                      <TableCell>{t('mapping.entityType')}</TableCell>
                      <TableCell>{t('mapping.sourceId')}</TableCell>
                      <TableCell align="right">{t('mapping.attributes')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entities.map((entity) => (
                      <EntityRow key={entity.id} entity={entity} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
