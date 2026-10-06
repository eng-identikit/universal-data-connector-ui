import { useState, useEffect, useRef, useCallback } from 'react'

export type WSMessage = {
  type: string
  data?: unknown
  payload?: unknown
  timestamp?: string
  [key: string]: unknown
}

interface UseWebSocketOptions {
  /** Called for every parsed message, without triggering a re-render */
  onMessage?: (msg: WSMessage) => void
  /** How many messages to keep in `messages` state (0 = don't keep any) */
  bufferSize?: number
}

export function useWebSocket(url: string, enabled = true, options: UseWebSocketOptions = {}) {
  const { bufferSize = 500 } = options
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<WSMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closing = useRef(false)
  const onMessageRef = useRef(options.onMessage)
  onMessageRef.current = options.onMessage

  const connect = useCallback(() => {
    if (!enabled || !url) return
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    closing.current = false
    try {
      ws.current?.close()
      const socket = new WebSocket(url)
      ws.current = socket

      socket.onopen = () => {
        setConnected(true)
        setError(null)
      }

      socket.onmessage = (evt) => {
        try {
          const msg: WSMessage = JSON.parse(evt.data)
          onMessageRef.current?.(msg)
          if (bufferSize > 0) setMessages((prev) => [msg, ...prev].slice(0, bufferSize))
        } catch {
          // ignore malformed messages
        }
      }

      socket.onerror = () => {
        setError('WebSocket connection error')
        setConnected(false)
      }

      socket.onclose = () => {
        if (ws.current !== socket) return
        setConnected(false)
        // Auto-reconnect after 5 seconds, unless closed on purpose
        if (!closing.current) reconnectTimer.current = setTimeout(() => connect(), 5000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }, [url, enabled, bufferSize])

  const disconnect = useCallback(() => {
    closing.current = true
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
      closing.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect, disconnect, enabled])

  return { connected, messages, error, connect, disconnect, clearMessages }
}
