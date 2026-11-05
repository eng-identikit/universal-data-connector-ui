import type { ReactNode } from 'react'
import { Box, type SxProps, type Theme } from '@mui/material'
import { MONO, RADIUS } from '../theme'

/** Inline monospace tag, e.g. a connector or entity type. */
export function CodeTag({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 0.875,
        py: 0.125,
        borderRadius: `${RADIUS.tag}px`,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        fontFamily: MONO,
        fontSize: '0.75rem',
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  )
}

/** Preformatted block for JSON and other raw content. */
export function CodeBlock({ children, maxHeight, sx }: { children: ReactNode; maxHeight?: number; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="pre"
      sx={[
        {
          m: 0,
          p: 1.5,
          borderRadius: `${RADIUS.control}px`,
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
          fontFamily: MONO,
          fontSize: '0.75rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'auto',
          maxHeight,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  )
}
