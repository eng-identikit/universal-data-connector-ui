import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DeviceHubIcon from '@mui/icons-material/DeviceHub'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import StorageIcon from '@mui/icons-material/Storage'
import StreamIcon from '@mui/icons-material/Stream'
import TimelineIcon from '@mui/icons-material/Timeline'
import SettingsIcon from '@mui/icons-material/Settings'
import HubIcon from '@mui/icons-material/Hub'
import CategoryIcon from '@mui/icons-material/Category'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import TransformIcon from '@mui/icons-material/Transform'
import { useAuth, useCan } from '../../context/AuthContext'

const navItems = [
  { path: '/', labelKey: 'nav.dashboard', icon: <DashboardIcon fontSize="small" /> },
  { path: '/entities', labelKey: 'nav.entities', icon: <CategoryIcon fontSize="small" /> },
  { path: '/subscriptions', labelKey: 'nav.subscriptions', icon: <NotificationsActiveIcon fontSize="small" /> },
  { path: '/transformers', labelKey: 'nav.transformers', icon: <TransformIcon fontSize="small" /> },
  { path: '/connectors', labelKey: 'nav.connectors', icon: <DeviceHubIcon fontSize="small" /> },
  { path: '/mapping', labelKey: 'nav.mapping', icon: <AccountTreeIcon fontSize="small" /> },
  { path: '/storage', labelKey: 'nav.storage', icon: <StorageIcon fontSize="small" /> },
  { path: '/live-data', labelKey: 'nav.liveData', icon: <StreamIcon fontSize="small" /> },
  { path: '/history', labelKey: 'nav.history', icon: <TimelineIcon fontSize="small" /> },
]

function NavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <ListItem disablePadding sx={{ mb: 0.25 }}>
      <ListItemButton onClick={onClick} selected={active} sx={{ py: 0.75 }}>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500 }} />
      </ListItemButton>
    </ListItem>
  )
}

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isTenantAdmin = useCan('admin')
  const items = isTenantAdmin || user?.isSuperadmin
    ? [...navItems, { path: '/admin', labelKey: 'nav.admin', icon: <AdminPanelSettingsIcon fontSize="small" /> }]
    : navItems

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Brand header */}
      <Box sx={{ height: 64, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <HubIcon sx={{ fontSize: 20 }} />
        </Box>
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
      <List sx={{ px: 1.5, pt: 1.5, flexGrow: 1 }}>
        {items.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={t(item.labelKey)}
            active={item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)}
            onClick={() => navigate(item.path)}
          />
        ))}
      </List>

      <Divider />

      {/* Settings at bottom */}
      <List sx={{ px: 1.5, py: 1.5 }}>
        <NavItem
          icon={<SettingsIcon fontSize="small" />}
          label={t('nav.settings')}
          active={location.pathname === '/settings'}
          onClick={() => navigate('/settings')}
        />
      </List>
    </Box>
  )
}
