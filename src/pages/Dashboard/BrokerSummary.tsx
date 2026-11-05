import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useScopedNavigate } from '../../context/UdcScope'
import { Grid, useTheme } from '@mui/material'
import CategoryIcon from '@mui/icons-material/Category'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import SendIcon from '@mui/icons-material/Send'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import { getTypes, listSubscriptions } from '../../api/broker'
import { statusOf } from '../Subscriptions/format'
import StatCard from '../../components/StatCard'

const REFRESH_MS = 10000

interface Summary {
  entities: number
  types: number
  subscriptions: number
  failing: number
  delivered: number
  dlq: number
}

/** Broker figures of the selected tenant: entities, subscriptions, deliveries. */
export default function BrokerSummary() {
  const { t } = useTranslation()
  const theme = useTheme()
  const navigate = useScopedNavigate()
  const [s, setS] = useState<Summary | null>(null)

  useEffect(() => {
    const load = () =>
      Promise.all([getTypes(), listSubscriptions()])
        .then(([types, subs]) =>
          setS({
            entities: types.reduce((n, x) => n + x.count, 0),
            types: types.length,
            subscriptions: subs.length,
            failing: subs.filter((x) => statusOf(x) === 'failing').length,
            delivered: subs.reduce((n, x) => n + (x.stats?.delivered ?? 0), 0),
            dlq: subs.reduce((n, x) => n + (x.stats?.dlq ?? 0), 0),
          }),
        )
        .catch(() => setS(null))
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  const cards = [
    { label: t('nav.entities'), value: s?.entities, sub: t('dashboard.typesCount', { n: s?.types ?? 0 }), icon: <CategoryIcon />, color: theme.palette.primary.main, to: '/entities' },
    {
      label: t('nav.subscriptions'),
      value: s?.subscriptions,
      sub: s?.failing ? t('dashboard.failingCount', { n: s.failing }) : t('dashboard.allHealthy'),
      icon: <NotificationsActiveIcon />,
      color: s?.failing ? theme.palette.error.main : theme.palette.success.main,
      to: '/subscriptions',
    },
    { label: t('subs.delivered'), value: s?.delivered, icon: <SendIcon />, color: theme.palette.info.main, to: '/subscriptions' },
    { label: 'DLQ', value: s?.dlq, sub: t('dashboard.dlqHelp'), icon: <ReportProblemIcon />, color: s?.dlq ? theme.palette.warning.main : theme.palette.text.secondary, to: '/subscriptions' },
  ]

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((c) => (
        <Grid item xs={12} sm={6} md={3} key={c.label}>
          <StatCard
            label={c.label}
            value={c.value === undefined ? '—' : c.value.toLocaleString()}
            sub={c.sub}
            icon={c.icon}
            color={c.color}
            onClick={() => navigate(c.to)}
          />
        </Grid>
      ))}
    </Grid>
  )
}
