import i18n from '../i18n'

/** Short client description from a User-Agent: "Chrome · Windows", "curl", "Python". */
export function describeClient(userAgent: string | null | undefined): string {
  if (!userAgent) return '—'
  const ua = userAgent
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) && /Version\//.test(ua) ? 'Safari'
    : null
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : null
  if (browser) return os ? `${browser} · ${os}` : browser
  // Scripts and tools: first product token, e.g. "curl/8.4.0" → "curl"
  return ua.split(/[\s/]/)[0] || ua.slice(0, 40)
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
]

/** "3 minutes ago" / "tra 2 giorni" in the UI language. */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—'
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second') return rtf.format(Math.round(seconds / size), unit)
  }
  return '—'
}

/** Date and time in the UI language. */
export function dateTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString(i18n.language) : '—'
}
