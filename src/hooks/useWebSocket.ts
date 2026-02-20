import { useState, useEffect, useRef, useCallback } from 'react'

type WSMessage = {
  type: string
  data?: unknown
  timestamp?: string
  [key: string]: unknown
}

export function useWebSocket(url: string, enabled = true) {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<WSMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!enabled || !url) return
    try {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        setConnected(true)
        setError(null)
      }

      ws.current.onmessage = (evt) => {
        try {
          const msg: WSMessage = JSON.parse(evt.data)
          setMessages((prev) => [msg, ...prev].slice(0, 500)) // keep last 500
        } catch {
          // ignore malformed messages
        }
      }

      ws.current.onerror = () => {
        setError('WebSocket connection error')
        setConnected(false)
      }

      ws.current.onclose = () => {
        setConnected(false)
        // Auto-reconnect after 5 seconds
        reconnectTimer.current = setTimeout(() => connect(), 5000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }, [url, enabled])

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    ws.current?.close()
    setConnected(false)
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect, disconnect, enabled])

  return { connected, messages, error, connect, disconnect, clearMessages }
}
