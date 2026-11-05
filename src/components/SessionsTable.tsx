import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material'
import type { Session } from '../api/broker'
import { describeClient, relativeTime, dateTime } from '../utils/format'
import { MONO } from '../theme'

interface Props {
  sessions: Session[]
  /** Show the user column (admin view) */
  showUser?: boolean
  onRevoke?: (session: Session) => void
  /** Filter by user from the user cell (admin view) */
  onSelectUser?: (userId: string) => void
}

/** Active login sessions: who, from where, with what, since when. */
export default function SessionsTable({ sessions, showUser, onRevoke, onSelectUser }: Props) {
  const { t } = useTranslation()

  if (!sessions.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        {t('sessions.none')}
      </Typography>
    )
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {showUser && <TableCell>{t('sessions.user')}</TableCell>}
          <TableCell>{t('sessions.client')}</TableCell>
          <TableCell>{t('sessions.address')}</TableCell>
          <TableCell>{t('sessions.started')}</TableCell>
          <TableCell>{t('sessions.lastActivity')}</TableCell>
          <TableCell>{t('sessions.expires')}</TableCell>
          {onRevoke && <TableCell align="right" />}
        </TableRow>
      </TableHead>
      <TableBody>
        {sessions.map((s) => (
          <TableRow key={s.id} hover>
            {showUser && (
              <TableCell>
                <Box
                  component={onSelectUser ? 'button' : 'span'}
                  onClick={onSelectUser ? () => onSelectUser(s.userId) : undefined}
                  sx={{ all: 'unset', cursor: onSelectUser ? 'pointer' : 'default', '&:hover': onSelectUser ? { textDecoration: 'underline' } : {} }}
                >
                  <Typography variant="body2" fontWeight={500} component="span">
                    {s.displayName || s.username || s.userId}
                  </Typography>
                </Box>
                {s.displayName && s.username && (
                  <Typography variant="caption" color="text.secondary" component="div">
                    {s.username}
                  </Typography>
                )}
              </TableCell>
            )}
            <TableCell>
              <Tooltip title={s.userAgent || ''}>
                <span>{describeClient(s.userAgent)}</span>
              </Tooltip>
              {s.current && <Chip size="small" color="primary" label={t('sessions.thisSession')} sx={{ ml: 1 }} />}
            </TableCell>
            <TableCell sx={{ fontFamily: MONO, fontSize: '0.8125rem' }}>{s.ip || '—'}</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              <Tooltip title={dateTime(s.createdAt)}>
                <span>{relativeTime(s.createdAt)}</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              <Tooltip title={dateTime(s.lastSeenAt)}>
                <span>{relativeTime(s.lastSeenAt)}</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              <Tooltip title={dateTime(s.expiresAt)}>
                <span>{relativeTime(s.expiresAt)}</span>
              </Tooltip>
            </TableCell>
            {onRevoke && (
              <TableCell align="right">
                <Button size="small" color="error" onClick={() => onRevoke(s)}>
                  {s.current ? t('sessions.logoutHere') : t('sessions.revoke')}
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
