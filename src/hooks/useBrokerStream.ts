import { useEffect, useRef, useState } from 'react'
import { getStreamUrl, refreshSession } from '../api/client'
import type { Entity, Notification } from '../api/broker'

export type StreamSubscription =
  | { id: string; entities: { types?: string[]; idPattern?: string; ids?: string[] } }
  | { id: string; subscription: string }

export type StreamMessage =
  | { type: 'entity'; sub: string; op: 'create' | 'update' | 'delete'; entity: Entity }
  | { type: 'notification'; sub: string; notification: Notification }

const RECONNECT_MS = 3000

/**
 * Authenticated connection to /api/v1/stream. Re-sends the subscriptions on
 * every (re)connect and refreshes the token when the server closes with 4001.
 * `onMessage` is read through a ref, so it does not need to be memoized.
 */
export function useBrokerStream(
  subscriptions: StreamSubscription[],
  onMessage: (msg: StreamMessage) => void,
  enabled = true,
) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const key = JSON.stringify(subscriptions)

  useEffect(() => {
    if (!enabled) return
    const subs: StreamSubscription[] = JSON.parse(key)
    let ws: WebSocket | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let closed = false

    const connect = () => {
      ws = new WebSocket(getStreamUrl())
      ws.onmessage = (evt) => {
        let msg
        try {
          msg = JSON.parse(evt.data)
        } catch {
          return
        }
        if (msg.type === 'welcome') {
          setConnected(true)
          setError(null)
          // Subscriptions are only accepted after authentication completed
          subs.forEach((s) => ws?.send(JSON.stringify({ type: 'subscribe', ...s })))
        } else if (msg.type === 'error') {
          setError(msg.message)
        } else if (msg.type === 'entity' || msg.type === 'notification') {
          onMessageRef.current(msg)
        }
      }
      ws.onclose = async (evt) => {
        setConnected(false)
        if (closed) return
        if (evt.code === 4001 && !(await refreshSession())) return
        timer = setTimeout(connect, evt.code === 4001 ? 0 : RECONNECT_MS)
      }
    }

    connect()
    return () => {
      closed = true
      if (timer) clearTimeout(timer)
      ws?.close()
    }
  }, [key, enabled])

  return { connected, error }
}
