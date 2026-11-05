import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  /** Buttons on the right: icon buttons first, the primary (contained) action last */
  actions?: ReactNode
  /** Content above the title, e.g. a back link */
  overline?: ReactNode
  titleProps?: Record<string, unknown>
}

/** Same header on every page: title and subtitle on the left, actions on the right. */
export default function PageHeader({ title, subtitle, actions, overline, titleProps }: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      {overline}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" {...titleProps}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>{actions}</Box>}
      </Box>
    </Box>
  )
}
