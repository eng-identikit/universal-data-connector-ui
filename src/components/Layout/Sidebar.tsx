import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DeviceHubIcon from '@mui/icons-material/DeviceHub'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import StorageIcon from '@mui/icons-material/Storage'
import StreamIcon from '@mui/icons-material/Stream'
import TimelineIcon from '@mui/icons-material/Timeline'
import SettingsIcon from '@mui/icons-material/Settings'
import HubIcon from '@mui/icons-material/Hub'

const navItems = [
  { path: '/', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
  { path: '/connectors', labelKey: 'nav.connectors', icon: <DeviceHubIcon /> },
  { path: '/mapping', labelKey: 'nav.mapping', icon: <AccountTreeIcon /> },
  { path: '/storage', labelKey: 'nav.storage', icon: <StorageIcon /> },
  { path: '/live-data', labelKey: 'nav.liveData', icon: <StreamIcon /> },
  { path: '/history', labelKey: 'nav.history', icon: <TimelineIcon /> },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Brand header */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <HubIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
            Universal Data
          </Typography>
          <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
            Connector UI
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 1, pt: 1, flexGrow: 1 }}>
        {navItems.map((item) => {
          const active =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={active}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main + '22',
                    color: theme.palette.primary.main,
                    '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={t(item.labelKey)}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Divider />

      {/* Settings at bottom */}
      <List sx={{ px: 1, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate('/settings')}
            selected={location.pathname === '/settings'}
            sx={{
              borderRadius: 2,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main + '22',
                color: theme.palette.primary.main,
                '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('nav.settings')}
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )
}
