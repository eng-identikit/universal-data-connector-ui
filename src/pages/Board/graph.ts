import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { Flow, FlowSink, FlowSource, Position, Udc } from '../../api/bff'

/**
 * Board graph: every UDC is a node, its sources and sinks are child nodes
 * (positions relative to the UDC, so dragging a UDC moves its blocks too):
 * sources on the left, sinks on the right.
 */

export const UDC_WIDTH = 280
export const BLOCK_WIDTH = 240
const COLUMN_GAP = 140
const ROW_HEIGHT = 96
const UDC_HEIGHT = 170

export type UdcNodeData = { kind: 'udc'; udc: Udc; flow: Flow | null; flowError: string | null }
export type SourceNodeData = { kind: 'source'; udcId: string; source: FlowSource }
export type SinkNodeData = { kind: 'sink'; udcId: string; sink: FlowSink; transformerName: string | null }
export type BoardNodeData = UdcNodeData | SourceNodeData | SinkNodeData

export type BoardNode = Node<BoardNodeData>

export const udcNodeId = (udcId: string) => `udc:${udcId}`
export const blockNodeId = (udcId: string, key: string) => `${udcId}|${key}`

/** Node key of a block (as the UI API's layout stores it) from its node id. */
export const blockKey = (nodeId: string) => nodeId.slice(nodeId.indexOf('|') + 1)

/** Default position of the i-th of n blocks in a column, relative to the UDC. */
function columnPosition(side: 'left' | 'right', i: number, n: number): Position {
  const x = side === 'left' ? -(BLOCK_WIDTH + COLUMN_GAP) : UDC_WIDTH + COLUMN_GAP
  const top = UDC_HEIGHT / 2 - (n * ROW_HEIGHT) / 2
  return { x, y: top + i * ROW_HEIGHT + 8 }
}

function transformerName(sink: FlowSink, flow: Flow) {
  if (sink.kind !== 'subscription' || !sink.transformer) return null
  if (sink.transformer.kind === 'inline') return 'JSONata'
  const id = sink.transformer.id
  return flow.transformers.find((t) => t.id === id)?.name ?? id
}

/** Status colour keys: success, error, warning, or a neutral one. */
export function sourceTone(status: string): 'success' | 'error' | 'warning' | 'neutral' {
  if (status === 'running' || status === 'connected') return 'success'
  if (status === 'error') return 'error'
  if (status === 'connecting' || status === 'initialized') return 'warning'
  return 'neutral'
}

export function sinkTone(status: string): 'success' | 'error' | 'warning' | 'neutral' {
  if (status === 'ok') return 'success'
  if (status === 'failing') return 'error'
  if (status === 'idle') return 'warning'
  return 'neutral'
}

export interface ToneColors {
  success: string
  error: string
  warning: string
  neutral: string
}

export function buildGraph(
  udcs: Udc[],
  flows: Record<string, { flow: Flow | null; error: string | null }>,
  colors: ToneColors & { edge: string },
): { nodes: BoardNode[]; edges: Edge[] } {
  const nodes: BoardNode[] = []
  const edges: Edge[] = []

  for (const udc of udcs) {
    const { flow, error } = flows[udc.id] ?? { flow: null, error: null }
    const parent = udcNodeId(udc.id)
    nodes.push({
      id: parent,
      type: 'udc',
      position: udc.position ?? { x: 0, y: 0 },
      data: { kind: 'udc', udc: flow ? { ...udc, status: flow.udc.status } : udc, flow, flowError: error },
      style: { width: UDC_WIDTH },
    })
    if (!flow) continue

    flow.sources.forEach((source, i) => {
      const id = blockNodeId(udc.id, source.key)
      nodes.push({
        id,
        type: 'source',
        parentId: parent,
        position: flow.layout[source.key] ?? columnPosition('left', i, flow.sources.length),
        data: { kind: 'source', udcId: udc.id, source },
        style: { width: BLOCK_WIDTH },
      })
      const tone = source.enabled ? sourceTone(source.status) : 'neutral'
      edges.push({
        id: `e:${id}`,
        source: id,
        target: parent,
        animated: tone === 'success',
        style: { stroke: tone === 'error' ? colors.error : colors.edge, strokeWidth: 1.5, strokeDasharray: source.enabled ? undefined : '4 4' },
        markerEnd: { type: MarkerType.ArrowClosed, color: tone === 'error' ? colors.error : colors.edge },
      })
    })

    flow.sinks.forEach((sink, i) => {
      const id = blockNodeId(udc.id, sink.key)
      const name = transformerName(sink, flow)
      nodes.push({
        id,
        type: 'sink',
        parentId: parent,
        position: flow.layout[sink.key] ?? columnPosition('right', i, flow.sinks.length),
        data: { kind: 'sink', udcId: udc.id, sink, transformerName: name },
        style: { width: BLOCK_WIDTH },
      })
      const tone = sink.enabled ? sinkTone(sink.status) : 'neutral'
      edges.push({
        id: `e:${id}`,
        source: parent,
        target: id,
        type: 'transformer',
        animated: tone === 'success',
        data: { label: name },
        style: { stroke: tone === 'error' ? colors.error : colors.edge, strokeWidth: 1.5, strokeDasharray: sink.enabled ? undefined : '4 4' },
        markerEnd: { type: MarkerType.ArrowClosed, color: tone === 'error' ? colors.error : colors.edge },
      })
    })
  }
  return { nodes, edges }
}

/** Where a new UDC goes: below the lowest one on the board. */
export function nextUdcPosition(udcs: Udc[]): Position {
  if (!udcs.length) return { x: 0, y: 0 }
  const lowest = Math.max(...udcs.map((u) => u.position?.y ?? 0))
  return { x: udcs[0].position?.x ?? 0, y: lowest + 520 }
}
