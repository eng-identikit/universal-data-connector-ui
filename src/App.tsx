import { useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material'
import { createAppTheme } from './theme'
import { AppProvider, useAppContext } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Entities from './pages/Entities'
import EntityDetail from './pages/Entities/EntityDetail'
import Admin from './pages/Admin'
import Subscriptions from './pages/Subscriptions'
import SubscriptionDetail from './pages/Subscriptions/SubscriptionDetail'
import Connectors from './pages/Connectors'
import Mapping from './pages/Mapping'
import Storage from './pages/Storage'
import LiveData from './pages/LiveData'
import History from './pages/History'
import Settings from './pages/Settings'

function AuthenticatedApp() {
  const { user, tenant } = useAuth()

  if (user === undefined) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }
  if (!user) return <Login />

  return (
    <AppLayout>
      {/* Remount pages on tenant switch so they refetch tenant-scoped data */}
      <Routes key={tenant ?? 'none'}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/entities" element={<Entities />} />
        <Route path="/entities/:id" element={<EntityDetail />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/connectors" element={<Connectors />} />
        <Route path="/mapping" element={<Mapping />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/live-data" element={<LiveData />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

function AppContent() {
  const { themeMode } = useAppContext()
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
