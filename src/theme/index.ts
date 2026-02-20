import { createTheme, type PaletteMode } from '@mui/material'

export const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#90caf9' : '#1565c0',
      },
      secondary: {
        main: mode === 'dark' ? '#ce93d8' : '#7b1fa2',
      },
      background: {
        default: mode === 'dark' ? '#0a0e1a' : '#f0f2f5',
        paper: mode === 'dark' ? '#111827' : '#ffffff',
      },
      success: { main: '#66bb6a' },
      warning: { main: '#ffa726' },
      error: { main: '#ef5350' },
      info: { main: '#29b6f6' },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow:
              mode === 'dark'
                ? '0 1px 4px rgba(0,0,0,0.5)'
                : '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiButton: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600 },
        },
      },
    },
  })
