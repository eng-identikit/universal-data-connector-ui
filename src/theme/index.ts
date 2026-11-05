import { alpha, createTheme, type PaletteMode } from '@mui/material'

/**
 * Design system. Every component takes its look from here; pages should not
 * set radii, shadows or literal colors of their own.
 *
 *   radius   8px controls (buttons, inputs, toggles, nav items, menus items)
 *            12px surfaces (cards, papers, dialogs, menus)
 *            6px tags (chips)
 *   surfaces flat, 1px border in the divider color, no drop shadows except
 *            for floating layers (menus, dialogs, tooltips)
 *   type     Inter, sentence case everywhere (no all-caps buttons or tabs)
 */
export const RADIUS = { control: 8, surface: 12, tag: 6 }

/** Font stack for ids, values and code */
export const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const tokens = (mode: PaletteMode) =>
  mode === 'dark'
    ? {
        primary: '#4c8dff',
        bg: '#0b0e14',
        paper: '#121620',
        subtle: '#181d29',
        border: '#232a38',
        text: '#e6e9ef',
        textSecondary: '#97a0b3',
        success: '#2fbf71',
        warning: '#f0a63a',
        error: '#f0605d',
        info: '#3fb4e8',
        secondary: '#a78bfa',
      }
    : {
        primary: '#2563eb',
        bg: '#f6f7f9',
        paper: '#ffffff',
        subtle: '#f1f3f6',
        border: '#e3e6eb',
        text: '#111827',
        textSecondary: '#5f6b7a',
        success: '#15803d',
        warning: '#b45309',
        error: '#dc2626',
        info: '#0369a1',
        secondary: '#7c3aed',
      }

export const createAppTheme = (mode: PaletteMode) => {
  const c = tokens(mode)
  const floatingShadow =
    mode === 'dark'
      ? '0 8px 24px rgba(0,0,0,0.5)'
      : '0 8px 24px rgba(16,24,40,0.10), 0 2px 6px rgba(16,24,40,0.06)'

  return createTheme({
    palette: {
      mode,
      primary: { main: c.primary, contrastText: '#ffffff' },
      secondary: { main: c.secondary, contrastText: '#ffffff' },
      success: { main: c.success, contrastText: '#ffffff' },
      warning: { main: c.warning, contrastText: '#ffffff' },
      error: { main: c.error, contrastText: '#ffffff' },
      info: { main: c.info, contrastText: '#ffffff' },
      background: { default: c.bg, paper: c.paper },
      text: { primary: c.text, secondary: c.textSecondary },
      divider: c.border,
      action: {
        hover: alpha(c.text, mode === 'dark' ? 0.06 : 0.04),
        selected: alpha(c.primary, mode === 'dark' ? 0.18 : 0.1),
      },
    },
    shape: { borderRadius: RADIUS.control },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.015em' },
      h6: { fontWeight: 600, fontSize: '1.0625rem', letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
      overline: { fontWeight: 600, letterSpacing: '0.06em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
          'code, pre, kbd': { fontFamily: MONO },
        },
      },

      // ── Surfaces ──────────────────────────────────────────────────────────
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          rounded: { borderRadius: RADIUS.surface },
          outlined: { borderColor: c.border },
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderRadius: RADIUS.surface } },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: { padding: '16px 20px' },
          title: { fontSize: '1rem', fontWeight: 600 },
          subheader: { fontSize: '0.8125rem' },
        },
      },
      MuiCardContent: {
        styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: RADIUS.surface, border: `1px solid ${c.border}`, boxShadow: floatingShadow },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontSize: '1.0625rem', fontWeight: 600, padding: '18px 24px 10px' } },
      },
      MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '14px 24px 18px', gap: 8, '& > :not(style) ~ :not(style)': { marginLeft: 0 } } } },
      MuiPopover: {
        styleOverrides: { paper: { borderRadius: RADIUS.surface - 2, border: `1px solid ${c.border}`, boxShadow: floatingShadow } },
      },
      MuiMenu: {
        styleOverrides: { list: { padding: 4 } },
      },
      MuiMenuItem: {
        styleOverrides: { root: { borderRadius: RADIUS.control - 2, fontSize: '0.875rem', minHeight: 34 } },
      },
      MuiAutocomplete: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          paper: { borderRadius: RADIUS.surface - 2, border: `1px solid ${c.border}`, boxShadow: floatingShadow },
          listbox: { padding: 4, '& .MuiAutocomplete-option': { borderRadius: RADIUS.control - 2, fontSize: '0.875rem' } },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: false },
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'dark' ? '#e6e9ef' : '#1f2937',
            color: mode === 'dark' ? '#111827' : '#ffffff',
            borderRadius: RADIUS.tag,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '5px 9px',
          },
        },
      },

      // ── Controls ──────────────────────────────────────────────────────────
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: RADIUS.control, whiteSpace: 'nowrap' },
          sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem', minHeight: 32 },
          sizeMedium: { padding: '7px 16px', fontSize: '0.875rem', minHeight: 38 },
          sizeLarge: { padding: '10px 22px', fontSize: '0.9375rem' },
          outlined: { borderColor: c.border, '&:hover': { borderColor: alpha(c.text, 0.3) } },
          outlinedPrimary: { borderColor: alpha(c.primary, 0.45), '&:hover': { borderColor: c.primary } },
          outlinedError: { borderColor: alpha(c.error, 0.45), '&:hover': { borderColor: c.error } },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: RADIUS.control } },
      },
      MuiToggleButtonGroup: {
        styleOverrides: { root: { borderRadius: RADIUS.control } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderColor: c.border,
            color: c.textSecondary,
            '&.Mui-selected': {
              color: c.primary,
              backgroundColor: alpha(c.primary, mode === 'dark' ? 0.18 : 0.1),
              '&:hover': { backgroundColor: alpha(c.primary, mode === 'dark' ? 0.24 : 0.14) },
            },
          },
          sizeSmall: { padding: '5px 12px', fontSize: '0.8125rem' },
        },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.control,
            backgroundColor: c.paper,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: c.border },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(c.text, 0.35) },
          },
        },
      },
      MuiInputBase: { styleOverrides: { root: { fontSize: '0.875rem' } } },
      MuiInputLabel: { styleOverrides: { root: { fontSize: '0.875rem' } } },
      MuiSwitch: {
        styleOverrides: {
          root: { width: 42, height: 24, padding: 0, margin: 8 },
          switchBase: {
            padding: 3,
            '&.Mui-checked': {
              transform: 'translateX(18px)',
              color: '#fff',
              '& + .MuiSwitch-track': { opacity: 1, backgroundColor: c.primary },
            },
          },
          thumb: { width: 18, height: 18, boxShadow: 'none' },
          track: { borderRadius: 12, opacity: 1, backgroundColor: mode === 'dark' ? '#3a4254' : '#cfd5de' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: RADIUS.tag, fontWeight: 500 },
          sizeSmall: { height: 22, fontSize: '0.75rem' },
          labelSmall: { paddingLeft: 7, paddingRight: 7 },
          outlined: { borderColor: c.border },
          // Colored chips are soft tints with colored text, readable in both modes
          filled: ({ ownerState, theme }) => {
            const color = ownerState.color
            if (!color || color === 'default') return { backgroundColor: c.subtle, color: c.text }
            const main = theme.palette[color].main
            return { backgroundColor: alpha(main, mode === 'dark' ? 0.2 : 0.12), color: main }
          },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: RADIUS.control, alignItems: 'center' } },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 4 }, bar: { borderRadius: 4 } },
      },
      MuiSkeleton: {
        styleOverrides: { rounded: { borderRadius: RADIUS.surface } },
      },

      // ── Navigation ────────────────────────────────────────────────────────
      MuiTabs: {
        styleOverrides: { root: { minHeight: 44 }, indicator: { height: 2, borderRadius: 2 } },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: 44,
            minWidth: 0,
            padding: '10px 14px',
            color: c.textSecondary,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.control,
            '&.Mui-selected': {
              backgroundColor: alpha(c.primary, mode === 'dark' ? 0.18 : 0.1),
              color: c.primary,
              '& .MuiListItemIcon-root': { color: c.primary },
              '&:hover': { backgroundColor: alpha(c.primary, mode === 'dark' ? 0.24 : 0.14) },
            },
          },
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 36, color: c.textSecondary } } },
      MuiStepIcon: { styleOverrides: { text: { fontWeight: 600 } } },

      // ── Tables ────────────────────────────────────────────────────────────
      MuiTableContainer: {
        styleOverrides: { root: { borderRadius: RADIUS.surface } },
      },
      MuiTableHead: {
        styleOverrides: { root: { '& .MuiTableCell-head': { backgroundColor: c.subtle } } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: c.border },
          head: {
            fontWeight: 600,
            fontSize: '0.75rem',
            color: c.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          },
          stickyHeader: { backgroundColor: c.subtle },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:last-child > .MuiTableCell-body': { borderBottom: 0 } },
          hover: { '&:hover': { backgroundColor: `${alpha(c.text, mode === 'dark' ? 0.04 : 0.025)} !important` } },
        },
      },
      MuiTablePagination: {
        styleOverrides: { root: { borderTop: `1px solid ${c.border}` } },
      },
    },
  })
}
