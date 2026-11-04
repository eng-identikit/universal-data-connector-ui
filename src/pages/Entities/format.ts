import type { Attribute } from '../../api/broker'

/** Short display form of an attribute value for tables. */
export function formatValue(attr: Attribute): string {
  if (attr.type === 'relationship') return `→ ${attr.target}`
  if (attr.value === undefined || attr.value === null) return '—'
  if (attr.type === 'json') return JSON.stringify(attr.value)
  if (attr.type === 'datetime') return new Date(String(attr.value)).toLocaleString()
  const text = String(attr.value)
  return attr.unit ? `${text} ${attr.unit}` : text
}

export const formatTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

export const qualityColor = (q?: string): 'success' | 'error' | 'warning' | 'default' =>
  q === 'good' ? 'success' : q === 'bad' ? 'error' : q === 'uncertain' ? 'warning' : 'default'
