import { useState, type DragEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Collapse, IconButton, Paper, Tooltip, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import WidgetsIcon from '@mui/icons-material/Widgets'
import { CONNECTOR_TYPES } from '../Connectors/ConnectorDialog'
import type { Channel } from '../../api/broker'
import { RADIUS } from '../../theme'
import { sinkIcon, sourceIcon } from './icons'

export type PaletteItem = { kind: 'source'; type: string } | { kind: 'sink'; channel: Channel }

export const PALETTE_MIME = 'application/udc-block'

const CHANNELS: Channel[] = ['http', 'mqtt', 'nats', 'websocket']

function Item({ icon, label, item, onPick }: { icon: ReactNode; label: string; item: PaletteItem; onPick: (item: PaletteItem) => void }) {
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(PALETTE_MIME, JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'move'
  }
  return (
    <Box
      draggable
      onDragStart={onDragStart}
      onClick={() => onPick(item)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        py: 0.75,
        borderRadius: `${RADIUS.control}px`,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        cursor: 'grab',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: 'text.primary',
        userSelect: 'none',
        '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
        '& svg': { color: 'text.secondary' },
        '&:hover svg': { color: 'primary.main' },
      }}
    >
      {icon}
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </Box>
    </Box>
  )
}

/** Blocks to drag onto a UDC: connectors (sources) and subscription channels (sinks). */
export default function Palette({ onPick }: { onPick: (item: PaletteItem) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  return (
    <Paper
      variant="outlined"
      sx={{ position: 'absolute', top: 16, left: 16, zIndex: 5, width: open ? 232 : 'auto', maxHeight: 'calc(100% - 32px)', display: 'flex', flexDirection: 'column' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1 }}>
        <WidgetsIcon fontSize="small" color="action" />
        {open && (
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            {t('board.palette')}
          </Typography>
        )}
        <Tooltip title={open ? t('board.hidePalette') : t('board.showPalette')}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            <ChevronLeftIcon fontSize="small" sx={{ transform: open ? 'none' : 'rotate(180deg)' }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={open} sx={{ overflowY: 'auto' }}>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
            {t('board.paletteHelp')}
          </Typography>
          <Typography variant="overline" color="text.secondary" component="div">
            {t('board.sinks')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 1.5 }}>
            {CHANNELS.map((channel) => (
              <Item key={channel} icon={sinkIcon(channel)} label={channel === 'websocket' ? 'WebSocket' : channel.toUpperCase()} item={{ kind: 'sink', channel }} onPick={onPick} />
            ))}
          </Box>
          <Typography variant="overline" color="text.secondary" component="div">
            {t('board.sources')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
            {CONNECTOR_TYPES.map((type) => (
              <Item key={type} icon={sourceIcon(type)} label={type} item={{ kind: 'source', type }} onPick={onPick} />
            ))}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  )
}
