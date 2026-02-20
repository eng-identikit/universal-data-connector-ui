import type { ReactNode } from 'react'
import { Box, useTheme } from '@mui/material'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

const SIDEBAR_WIDTH = 240
const TOPBAR_HEIGHT = 64

export default function AppLayout({ children }: { children: ReactNode }) {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          position: 'fixed',
          height: '100vh',
          zIndex: theme.zIndex.drawer,
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          overflowY: 'auto',
        }}
      >
        <Sidebar />
      </Box>

      {/* Main content area */}
      <Box
        sx={{
          flexGrow: 1,
          ml: `${SIDEBAR_WIDTH}px`,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        {/* Top bar */}
        <Box
          component="header"
          sx={{
            height: TOPBAR_HEIGHT,
            position: 'sticky',
            top: 0,
            zIndex: theme.zIndex.appBar,
            backgroundColor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <TopBar />
        </Box>

        {/* Page content */}
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
