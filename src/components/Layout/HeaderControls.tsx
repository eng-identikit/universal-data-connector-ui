import { useTranslation } from 'react-i18next'
import { IconButton, Tooltip, ToggleButton, ToggleButtonGroup } from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { useAppContext } from '../../context/AppContext'
import UserMenu from './UserMenu'

/** Language, theme and user menu, shared by the board and the instance workspace. */
export default function HeaderControls() {
  const { t } = useTranslation()
  const { themeMode, toggleTheme, language, setLanguage } = useAppContext()
  return (
    <>
      <ToggleButtonGroup size="small" exclusive value={language} onChange={(_, v) => v && setLanguage(v)}>
        {(['it', 'en'] as const).map((lang) => (
          <ToggleButton key={lang} value={lang} sx={{ px: 1.25, fontSize: '0.75rem' }}>
            {lang.toUpperCase()}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Tooltip title={themeMode === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}>
        <IconButton onClick={toggleTheme}>
          {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <UserMenu />
    </>
  )
}
