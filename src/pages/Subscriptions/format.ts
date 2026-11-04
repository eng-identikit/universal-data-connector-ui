import type { Subscription } from '../../api/broker'

export function selectorSummary(s: Subscription): string {
  const parts: string[] = []
  if (s.select.types?.length) parts.push(s.select.types.join(', '))
  if (s.select.idPattern) parts.push(s.select.idPattern)
  if (s.select.ids?.length) parts.push(`${s.select.ids.length} id`)
  if (s.select.related) parts.push(`${s.select.related.direction === 'in' ? '→' : '←'} ${s.select.related.id} (${s.select.related.depth})`)
  if (s.select.bbox) parts.push('bbox')
  return parts.join(' · ') || '*'
}

export function destination(s: Subscription): string {
  const n = s.notify
  if (n.channel === 'http') return `${n.method ?? 'POST'} ${n.url}`
  if (n.channel === 'mqtt') return `${n.url || 'default'} · ${n.topic}`
  if (n.channel === 'nats') return `${n.url || 'broker'} · ${n.subject}`
  return 'WebSocket'
}

export type SubStatus = 'active' | 'paused' | 'expired' | 'failing'

export function statusOf(s: Subscription): SubStatus {
  if (!s.enabled) return 'paused'
  if (s.expiresAt && new Date(s.expiresAt) < new Date()) return 'expired'
  const st = s.stats
  if (st?.lastFailureAt && (!st.lastSuccessAt || st.lastFailureAt > st.lastSuccessAt)) return 'failing'
  return 'active'
}

export const statusColor: Record<SubStatus, 'success' | 'default' | 'warning' | 'error'> = {
  active: 'success',
  paused: 'default',
  expired: 'warning',
  failing: 'error',
}
