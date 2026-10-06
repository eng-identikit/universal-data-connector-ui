import { useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { createAppTheme } from './theme'
import { AppProvider, useAppContext } from './context/AppContext'
import AppLayout from './components/Layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Connectors from './pages/Connectors'
import Mapping from './pages/Mapping'
import Storage from './pages/Storage'
import LiveData from './pages/LiveData'
import History from './pages/History'
import Settings from './pages/Settings'

function AppContent() {
  const { themeMode } = useAppContext()
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/connectors" element={<Connectors />} />
            <Route path="/mapping" element={<Mapping />} />
            <Route path="/storage" element={<Storage />} />
            <Route path="/live-data" element={<LiveData />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
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
