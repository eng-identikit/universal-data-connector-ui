import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Typography, Alert, ToggleButton } from '@mui/material'
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt'
import LocationOffIcon from '@mui/icons-material/LocationOff'
import EntityMap from '../../components/EntityMap'
import type { Entity, GeoJsonGeometry } from '../../api/broker'

interface Props {
  entity: Entity
  canWrite: boolean
  onSave: (location: GeoJsonGeometry | null) => Promise<boolean>
}

/** Entity location on the map; operators set a Point by clicking. */
export default function LocationPanel({ entity, canWrite, onSave }: Props) {
  const { t } = useTranslation()
  const [picking, setPicking] = useState(false)

  const pick = async (lon: number, lat: number) => {
    if (!picking) return
    const ok = await onSave({ type: 'Point', coordinates: [Number(lon.toFixed(6)), Number(lat.toFixed(6))] })
    if (ok) setPicking(false)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" fontFamily="monospace" sx={{ flexGrow: 1 }}>
          {entity.location ? `${entity.location.type} ${JSON.stringify(entity.location.coordinates)}` : t('location.none')}
        </Typography>
        {canWrite && (
          <>
            <ToggleButton size="small" value="pick" selected={picking} onChange={() => setPicking(!picking)}>
              <AddLocationAltIcon fontSize="small" sx={{ mr: 0.5 }} />
              {t('location.pick')}
            </ToggleButton>
            <Button size="small" color="inherit" startIcon={<LocationOffIcon />} disabled={!entity.location} onClick={() => onSave(null)}>
              {t('location.remove')}
            </Button>
          </>
        )}
      </Box>
      {picking && <Alert severity="info" sx={{ mb: 1 }}>{t('location.pickHelp')}</Alert>}
      <Box sx={{ cursor: picking ? 'crosshair' : undefined }}>
        <EntityMap key={`${entity.id}-${entity.version}`} entities={entity.location ? [entity] : []} height={380} onMapClick={canWrite ? pick : undefined} />
      </Box>
    </Box>
  )
}
