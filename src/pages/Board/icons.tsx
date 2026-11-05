import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import MemoryIcon from '@mui/icons-material/Memory'
import HttpIcon from '@mui/icons-material/Http'
import RssFeedIcon from '@mui/icons-material/RssFeed'
import UsbIcon from '@mui/icons-material/Usb'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import HubIcon from '@mui/icons-material/Hub'
import SensorsIcon from '@mui/icons-material/Sensors'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import BoltIcon from '@mui/icons-material/Bolt'
import CableIcon from '@mui/icons-material/Cable'
import LanIcon from '@mui/icons-material/Lan'

const PLC = new Set(['modbus', 's7', 'bacnet', 'profinet', 'ethercat', 'fins-tcp', 'melsec', 'cip'])

/** Icon of a connector (source) type. */
export function sourceIcon(type: string) {
  if (type === 'opcua') return <PrecisionManufacturingIcon fontSize="small" />
  if (type === 'mqtt') return <RssFeedIcon fontSize="small" />
  if (type === 'http') return <HttpIcon fontSize="small" />
  if (type === 'serial') return <UsbIcon fontSize="small" />
  if (type === 'aas') return <AccountTreeIcon fontSize="small" />
  if (type === 'dds') return <LanIcon fontSize="small" />
  if (PLC.has(type)) return <MemoryIcon fontSize="small" />
  return <SensorsIcon fontSize="small" />
}

/** Icon of a sink: a subscription channel or the MCP endpoint. */
export function sinkIcon(kind: string) {
  if (kind === 'mcp') return <SmartToyIcon fontSize="small" />
  if (kind === 'http') return <HttpIcon fontSize="small" />
  if (kind === 'mqtt') return <RssFeedIcon fontSize="small" />
  if (kind === 'nats') return <BoltIcon fontSize="small" />
  if (kind === 'websocket') return <CableIcon fontSize="small" />
  return <HubIcon fontSize="small" />
}
