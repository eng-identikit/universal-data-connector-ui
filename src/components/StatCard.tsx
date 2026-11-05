import type { ReactNode } from 'react'
import { Avatar, Box, Card, CardActionArea, CardContent, Typography, alpha } from '@mui/material'

interface Props {
  label: string
  value: ReactNode
  icon: ReactNode
  /** Accent for the icon tile: a palette color value */
  color: string
  sub?: ReactNode
  onClick?: () => void
}

/** Figure tile used on the dashboard: icon, label, value, optional note. */
export default function StatCard({ label, value, icon, color, sub, onClick }: Props) {
  const content = (
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar variant="rounded" sx={{ bgcolor: alpha(color, 0.12), color, width: 44, height: 44 }}>
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ lineHeight: 1.3 }} noWrap>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" component="div" noWrap>
            {sub}
          </Typography>
        )}
      </Box>
    </CardContent>
  )
  return (
    <Card sx={{ height: '100%' }}>
      {onClick ? <CardActionArea onClick={onClick} sx={{ height: '100%' }}>{content}</CardActionArea> : content}
    </Card>
  )
}
