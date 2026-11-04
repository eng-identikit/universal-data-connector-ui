import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, useTheme } from '@mui/material'
import HubIcon from '@mui/icons-material/Hub'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { login } = useAuth()
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
      <Card sx={{ width: '100%', maxWidth: 380 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <HubIcon sx={{ color: theme.palette.primary.main, fontSize: 36 }} />
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                Universal Data Connector
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('login.subtitle')}
              </Typography>
            </Box>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label={t('login.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              size="small"
            />
            <TextField
              label={t('login.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              size="small"
            />
            <Button type="submit" variant="contained" disabled={busy || !username || !password}>
              {t('login.submit')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
