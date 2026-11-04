import { useTranslation } from 'react-i18next'
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  TextField,
  MenuItem,
  useTheme,
} from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import CircleIcon from '@mui/icons-material/Circle'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useUDCStatus } from '../../hooks/useUDCStatus'
import UserMenu from './UserMenu'

export default function TopBar() {
  const { t } = useTranslation()
  const { themeMode, toggleTheme, language, setLanguage } = useAppContext()
  const { status, error } = useUDCStatus()
  const { user, tenant, setTenant } = useAuth()
  const theme = useTheme()

  const isOnline = !!status && !error
  const isRunning = status?.system?.status === 'running'

  return (
    <Box
      sx={{
        height: '100%',
        px: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left: Server status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          icon={
            <CircleIcon
              sx={{
                fontSize: '10px !important',
                color: (isOnline && isRunning ? theme.palette.success : theme.palette.error).main,
              }}
            />
          }
          label={
            !isOnline
              ? t('dashboard.offline')
              : isRunning
                ? t('dashboard.online')
                : t('connectorStatus.stopped')
          }
          size="small"
          variant="outlined"
          sx={{
            borderColor: (isOnline && isRunning ? theme.palette.success : theme.palette.error)
              .main,
            color: (isOnline && isRunning ? theme.palette.success : theme.palette.error).main,
            fontWeight: 600,
          }}
        />
        {status && (
          <Typography variant="caption" color="text.secondary">
            {t('common.updatedAt')}{' '}
            {new Date().toLocaleTimeString()}
          </Typography>
        )}
      </Box>

      {/* Right: Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Tenant selector */}
        {user && user.tenants.length > 0 && (
          <TextField
            select
            size="small"
            label={t('admin.tenant')}
            value={tenant ?? ''}
            onChange={(e) => setTenant(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {user.tenants.map((m) => (
              <MenuItem key={m.tenant} value={m.tenant}>
                {m.name} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>{t(`roles.${m.role}`)}</Typography>
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* Language switcher */}
        <Box sx={{ display: 'flex', border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}>
          {(['it', 'en'] as const).map((lang) => (
            <Box
              key={lang}
              onClick={() => setLanguage(lang)}
              sx={{
                px: 1.5,
                py: 0.5,
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: language === lang ? 700 : 400,
                backgroundColor:
                  language === lang ? theme.palette.primary.main + '30' : 'transparent',
                color: language === lang ? theme.palette.primary.main : theme.palette.text.secondary,
                userSelect: 'none',
              }}
            >
              {lang.toUpperCase()}
            </Box>
          ))}
        </Box>

        {/* Theme toggle */}
        <Tooltip title={themeMode === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}>
          <IconButton onClick={toggleTheme} size="small">
            {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <UserMenu />
      </Box>
    </Box>
  )
}
