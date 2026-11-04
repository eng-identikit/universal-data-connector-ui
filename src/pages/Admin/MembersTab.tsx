import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Chip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { listMembers, addMember, setMemberRole, removeMember, ROLES, type Member, type Role } from '../../api/broker'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function MembersTab({ tenant }: { tenant: string }) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [removing, setRemoving] = useState<Member | null>(null)

  const load = useCallback(async () => {
    try {
      setMembers(await listMembers(tenant))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [tenant])

  useEffect(() => {
    load()
  }, [load])

  const run = async (fn: () => Promise<unknown>) => {
    try {
      setError(null)
      await fn()
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('login.username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          select
          size="small"
          label={t('admin.role')}
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          sx={{ width: 140 }}
        >
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {t(`roles.${r}`)}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          disabled={!username.trim()}
          onClick={() => run(() => addMember(tenant, username.trim(), role).then(() => setUsername('')))}
        >
          {t('admin.addMember')}
        </Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('login.username')}</TableCell>
            <TableCell>{t('admin.displayName')}</TableCell>
            <TableCell>{t('admin.role')}</TableCell>
            <TableCell align="right">{t('common.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>
                {t('admin.noMembers')}
              </TableCell>
            </TableRow>
          )}
          {members.map((m) => (
            <TableRow key={m.userId} hover>
              <TableCell>
                {m.username} {m.disabled && <Chip size="small" label={t('admin.disabled')} sx={{ ml: 1 }} />}
              </TableCell>
              <TableCell>{m.displayName ?? '—'}</TableCell>
              <TableCell>
                <TextField
                  select
                  size="small"
                  variant="standard"
                  value={m.role}
                  onChange={(e) => run(() => setMemberRole(tenant, m.userId, e.target.value as Role))}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {t(`roles.${r}`)}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => setRemoving(m)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!removing}
        title={t('admin.removeMember')}
        message={t('admin.removeMemberMessage', { user: removing?.username, tenant })}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const m = removing
          setRemoving(null)
          if (m) run(() => removeMember(tenant, m.userId))
        }}
      />
    </Box>
  )
}
