import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  TextField,
  Button,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Snackbar,
  MenuItem,
  Slider,
} from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import TranslateIcon from '@mui/icons-material/Translate'
import LinkIcon from '@mui/icons-material/Link'
import InfoIcon from '@mui/icons-material/Info'
import { useAppContext } from '../../context/AppContext'

export default function Settings() {
  const { t } = useTranslation()
  const { themeMode, toggleTheme, language, setLanguage, apiBaseUrl, setApiBaseUrl } =
    useAppContext()

  const [apiUrl, setApiUrl] = useState(apiBaseUrl)
  const [snackOpen, setSnackOpen] = useState(false)

  const handleSave = () => {
    setApiBaseUrl(apiUrl.trim() || 'http://localhost:3000')
    setSnackOpen(true)
  }

  const handleReset = () => {
    setApiUrl('http://localhost:3000')
    setApiBaseUrl('http://localhost:3000')
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {t('settings.title')}
      </Typography>

      <Grid container spacing={3}>
        {/* Appearance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {themeMode === 'dark' ? <DarkModeIcon color="primary" /> : <LightModeIcon color="primary" />}
                <Typography variant="subtitle1" fontWeight={600}>
                  {t('settings.appearance')}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {/* Theme */}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('settings.theme')}
              </Typography>
              <ToggleButtonGroup
                value={themeMode}
                exclusive
                onChange={(_, val) => { if (val) toggleTheme() }}
                size="small"
                sx={{ mb: 3 }}
              >
                <ToggleButton value="light">
                  <LightModeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  {t('settings.lightMode')}
                </ToggleButton>
                <ToggleButton value="dark">
                  <DarkModeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  {t('settings.darkMode')}
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Language */}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <TranslateIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                {t('settings.language')}
              </Typography>
              <TextField
                select
                size="small"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="it">🇮🇹 {t('settings.languageIt')}</MenuItem>
                <MenuItem value="en">🇬🇧 {t('settings.languageEn')}</MenuItem>
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        {/* Connection */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LinkIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  {t('settings.connection')}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <TextField
                label={t('settings.apiUrl')}
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                fullWidth
                size="small"
                helperText={t('settings.apiUrlHelp')}
                sx={{ mb: 1 }}
                placeholder="http://localhost:3000"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                {t('settings.wsUrlHelp')}:{' '}
                <code>{apiUrl.replace(/^http/, 'ws').replace(':3000', ':3001')}</code>
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={handleSave}>
                  {t('settings.saveSettings')}
                </Button>
                <Button variant="outlined" color="inherit" onClick={handleReset}>
                  {t('settings.resetDefaults')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* About */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <InfoIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  {t('settings.about')}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">{t('settings.version')}</Typography>
                  <Typography variant="body2" fontWeight={500}>1.0.0</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    {t('settings.appDescription')}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info" variant="outlined">
                    UDC API: <strong>{apiBaseUrl}</strong>
                    &nbsp;·&nbsp;
                    WebSocket: <strong>{apiBaseUrl.replace(/^http/, 'ws').replace(':3000', ':3001')}</strong>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackOpen}
        autoHideDuration={2500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnackOpen(false)}>
          {t('settings.settingsSaved')}
        </Alert>
      </Snackbar>
    </Box>
  )
}
