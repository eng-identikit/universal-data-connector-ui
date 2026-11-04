import HttpIcon from '@mui/icons-material/Http'
import RssFeedIcon from '@mui/icons-material/RssFeed'
import BoltIcon from '@mui/icons-material/Bolt'
import CableIcon from '@mui/icons-material/Cable'
import type { Channel } from '../../api/broker'

export const channelIcon: Record<Channel, JSX.Element> = {
  http: <HttpIcon fontSize="small" />,
  mqtt: <RssFeedIcon fontSize="small" />,
  nats: <BoltIcon fontSize="small" />,
  websocket: <CableIcon fontSize="small" />,
}
