import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Card, CardContent, Tabs, Tab, Alert } from '@mui/material'
import { useAuth, useCan } from '../../context/AuthContext'
import MembersTab from './MembersTab'
import ApiKeysTab from './ApiKeysTab'
import TenantsTab from './TenantsTab'
import UsersTab from './UsersTab'
import ClusterTab from './ClusterTab'
import SessionsTab from './SessionsTab'
import AccessLogTab from './AccessLogTab'
import PageHeader from '../../components/PageHeader'

type TabKey = 'members' | 'apikeys' | 'tenants' | 'users' | 'sessions' | 'accessLog' | 'cluster'

export default function Admin() {
  const { t } = useTranslation()
  const { user, tenant } = useAuth()
  const isTenantAdmin = useCan('admin')
  const isSuperadmin = !!user?.isSuperadmin

  const tabs: TabKey[] = [
    ...(isTenantAdmin && tenant ? (['members', 'apikeys'] as TabKey[]) : []),
    ...(isSuperadmin ? (['tenants', 'users', 'sessions', 'accessLog', 'cluster'] as TabKey[]) : []),
  ]
  const [selected, setSelected] = useState<TabKey | null>(null)
  const tab = selected && tabs.includes(selected) ? selected : tabs[0]

  if (!tab) return <Alert severity="warning">{t('admin.noAccess')}</Alert>

  return (
    <Box>
      <PageHeader title={t('admin.title')} />
      <Card>
        <Tabs value={tab} onChange={(_, v) => setSelected(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          {tabs.map((k) => (
            <Tab
              key={k}
              value={k}
              label={k === 'members' || k === 'apikeys' ? `${t(`admin.tab.${k}`)} · ${tenant}` : t(`admin.tab.${k}`)}
            />
          ))}
        </Tabs>
        <CardContent>
          {tab === 'members' && tenant && <MembersTab tenant={tenant} />}
          {tab === 'apikeys' && tenant && <ApiKeysTab tenant={tenant} />}
          {tab === 'tenants' && <TenantsTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'sessions' && <SessionsTab />}
          {tab === 'accessLog' && <AccessLogTab />}
          {tab === 'cluster' && <ClusterTab />}
        </CardContent>
      </Card>
    </Box>
  )
}
