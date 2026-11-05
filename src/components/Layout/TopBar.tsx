import { useTranslation } from 'react-i18next'
import { Box, Typography, Chip, TextField, MenuItem } from '@mui/material'
import CircleIcon from '@mui/icons-material/Circle'
import { useAuth } from '../../context/AuthContext'
import { useUDCStatus } from '../../hooks/useUDCStatus'
import HeaderControls from './HeaderControls'

export default function TopBar() {
  const { t } = useTranslation()
  const { status, error } = useUDCStatus()
  const { user, tenant, setTenant } = useAuth()

  const isOnline = !!status && !error
  const isRunning = status?.system?.status === 'running'

  return (
    <Box
      sx={{
        height: '100%',
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left: Server status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          icon={<CircleIcon sx={{ fontSize: '8px !important', color: 'inherit !important' }} />}
          label={
            !isOnline
              ? t('dashboard.offline')
              : isRunning
                ? t('dashboard.online')
                : t('connectorStatus.stopped')
          }
          size="small"
          color={isOnline && isRunning ? 'success' : 'error'}
          sx={{ fontWeight: 600, '& .MuiChip-icon': { ml: 0.75 } }}
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
            label={t('admin.tenant')}
            value={tenant ?? ''}
            onChange={(e) => setTenant(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {user.tenants.map((m) => (
              <MenuItem key={m.tenant} value={m.tenant}>
                {m.name} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>{t(`roles.${m.role}`)}</Typography>
              </MenuItem>
            ))}
          </TextField>
        )}

        <HeaderControls />
      </Box>
    </Box>
  )
}
