import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, useTheme } from '@mui/material'
import HubIcon from '@mui/icons-material/Hub'
import { usePrincipal } from '../../context/AuthContext'

export default function Login() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { login, loginKeycloak, config, startupError } = usePrincipal()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <HubIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" lineHeight={1.2}>
                Universal Data Connector
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('login.subtitle')}
              </Typography>
            </Box>
          </Box>

          {startupError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t('login.unavailable', { error: startupError })}
            </Alert>
          )}
          {config?.auth === 'keycloak' ? (
            <Button variant="contained" size="large" fullWidth onClick={loginKeycloak}>
              {t('login.keycloak')}
            </Button>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label={t('login.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                size="medium"
              />
              <TextField
                label={t('login.password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                size="medium"
              />
              <Button type="submit" variant="contained" size="large" disabled={busy || !username || !password}>
                {t('login.submit')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
