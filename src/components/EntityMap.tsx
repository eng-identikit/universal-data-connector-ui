import { MONO } from '../theme'
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Popup, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngBoundsExpression, Map as LeafletMap } from 'leaflet'
import { Box, Link, Typography, useTheme } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import type { Entity } from '../api/broker'

// Tile server: OpenStreetMap by default, override for offline/on-prem installations in Settings
export const getTileUrl = () => {
  try {
    return localStorage.getItem('udc-map-tiles') || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  } catch {
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  }
}

export type Bbox = [number, number, number, number]

const DEFAULT_CENTER: [number, number] = [45.46, 9.19]

function BoundsWatcher({ onChange }: { onChange: (bbox: Bbox) => void }) {
  const map = useMapEvents({
    moveend: () => emit(),
    zoomend: () => emit(),
  })
  const emit = () => {
    const b = map.getBounds()
    onChange([
      Math.max(-180, b.getWest()),
      Math.max(-90, b.getSouth()),
      Math.min(180, b.getEast()),
      Math.min(90, b.getNorth()),
    ])
  }
  useEffect(() => {
    emit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function ClickHandler({ onClick }: { onClick: (lon: number, lat: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lng, e.latlng.lat) })
  return null
}

/** Fits the view to the entities once, when they first arrive. */
function FitOnce({ entities, enabled }: { entities: Entity[]; enabled: boolean }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (!enabled || done.current || !entities.length) return
    const points = entities.flatMap((e) => flatten(e.location?.coordinates))
    if (!points.length) return
    const lats = points.map((p) => p[1])
    const lons = points.map((p) => p[0])
    const bounds: LatLngBoundsExpression = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ]
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 })
    done.current = true
  }, [entities, enabled, map])
  return null
}

function flatten(c: unknown): [number, number][] {
  if (!Array.isArray(c)) return []
  if (typeof c[0] === 'number') return [[c[0] as number, c[1] as number]]
  return c.flatMap(flatten)
}

interface Props {
  entities: Entity[]
  height?: number | string
  /** Called with the visible bbox after every pan/zoom */
  onBoundsChange?: (bbox: Bbox) => void
  /** Map click (e.g. to set a location) */
  onMapClick?: (lon: number, lat: number) => void
  fitToEntities?: boolean
  mapRef?: (map: LeafletMap) => void
}

export default function EntityMap({ entities, height = 480, onBoundsChange, onMapClick, fitToEntities = true, mapRef }: Props) {
  const theme = useTheme()
  // Categorical slot 1 for every entity: identity comes from the popup label, not color
  const color = theme.palette.mode === 'dark' ? '#3987e5' : '#2a78d6'
  const points = useMemo(() => entities.filter((e) => e.location?.type === 'Point'), [entities])
  const shapes = useMemo(() => entities.filter((e) => e.location && e.location.type !== 'Point'), [entities])

  return (
    <Box sx={{ height, borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        ref={(m) => {
          if (m && mapRef) mapRef(m)
        }}
      >
        <TileLayer url={getTileUrl()} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        {onBoundsChange && <BoundsWatcher onChange={onBoundsChange} />}
        {onMapClick && <ClickHandler onClick={onMapClick} />}
        <FitOnce entities={entities} enabled={fitToEntities} />
        {shapes.map((e) => (
          <GeoJSON
            key={`${e.id}-${e.version}`}
            data={e.location as GeoJSON.GeoJsonObject}
            style={{ color, weight: 2, fillOpacity: 0.15 }}
          >
            <EntityPopup entity={e} />
          </GeoJSON>
        ))}
        {points.map((e) => {
          const [lon, lat] = e.location!.coordinates as [number, number]
          return (
            <CircleMarker
              key={e.id}
              center={[lat, lon]}
              radius={7}
              pathOptions={{ color: theme.palette.background.paper, weight: 2, fillColor: color, fillOpacity: 1 }}
            >
              <EntityPopup entity={e} />
            </CircleMarker>
          )
        })}
      </MapContainer>
    </Box>
  )
}

function EntityPopup({ entity }: { entity: Entity }) {
  const attrs = Object.entries(entity.attrs).filter(([, a]) => a.type !== 'relationship').slice(0, 4)
  return (
    <Popup>
      <Link component={RouterLink} to={`/entities/${encodeURIComponent(entity.id)}`} fontFamily={MONO} fontWeight={600}>
        {entity.id}
      </Link>
      <Typography variant="caption" display="block" color="text.secondary">
        {entity.type}
        {entity.distanceM !== undefined ? ` · ${entity.distanceM} m` : ''}
      </Typography>
      {attrs.map(([k, a]) => (
        <Typography key={k} variant="caption" display="block">
          {k}: {typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)} {a.unit ?? ''}
        </Typography>
      ))}
    </Popup>
  )
}
