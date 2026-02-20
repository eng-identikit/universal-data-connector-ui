import { Chip, type ChipProps } from '@mui/material'
import CircleIcon from '@mui/icons-material/Circle'
import type { ConnectorStatusType } from '../api/types'
import { useTranslation } from 'react-i18next'

const statusConfig: Record<
  ConnectorStatusType | 'running' | 'stopped',
  { color: ChipProps['color']; labelKey: string }
> = {
  connected: { color: 'success', labelKey: 'connectorStatus.connected' },
  running: { color: 'success', labelKey: 'connectorStatus.running' },
  disconnected: { color: 'default', labelKey: 'connectorStatus.disconnected' },
  stopped: { color: 'default', labelKey: 'connectorStatus.stopped' },
  connecting: { color: 'warning', labelKey: 'connectorStatus.connecting' },
  error: { color: 'error', labelKey: 'connectorStatus.error' },
  initialized: { color: 'info', labelKey: 'connectorStatus.initialized' },
  unknown: { color: 'default', labelKey: 'connectorStatus.unknown' },
}

interface StatusChipProps {
  status: string
  size?: ChipProps['size']
}

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const { t } = useTranslation()
  const cfg = statusConfig[status as ConnectorStatusType] ?? statusConfig.unknown

  return (
    <Chip
      icon={<CircleIcon sx={{ fontSize: '10px !important' }} />}
      label={t(cfg.labelKey)}
      color={cfg.color}
      size={size}
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  )
}
