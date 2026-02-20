import { useState, useEffect, useCallback } from 'react'
import { getStatus } from '../api/endpoints'
import type { StatusResponse } from '../api/types'

export function useUDCStatus(intervalMs = 5000) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetch = useCallback(async () => {
    try {
      const data = await getStatus()
      setStatus(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const id = setInterval(fetch, intervalMs)
    return () => clearInterval(id)
  }, [fetch, intervalMs])

  return { status, loading, error, lastUpdated, refetch: fetch }
}
