import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Alert, Box, Button, CircularProgress, IconButton, Paper, Snackbar, Tooltip, Typography, useTheme } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import HubIcon from '@mui/icons-material/Hub'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import {
  deleteSinkBlock,
  deleteSourceBlock,
  deleteUdc,
  getFlow,
  listUdcs,
  saveLayout,
  sourceKey,
  subscriptionKey,
  updateUdc,
  type Flow,
  type FlowSource,
  type Position,
  type SubscriptionSink,
  type Udc,
} from '../../api/bff'
import { apiScope } from '../../api/client'
import { restartSource, startSource, stopSource } from '../../api/endpoints'
import { updateSubscription, type Channel } from '../../api/broker'
import { useCan } from '../../context/AuthContext'
import { useAppContext } from '../../context/AppContext'
import { UdcScopeProvider } from '../../context/UdcScope'
import HeaderControls from '../../components/Layout/HeaderControls'
import ConfirmDialog from '../../components/ConfirmDialog'
import ConnectorDialog from '../Connectors/ConnectorDialog'
import SubscriptionWizard from '../Subscriptions/SubscriptionWizard'
import { blockKey, buildGraph, nextUdcPosition, udcNodeId, UDC_WIDTH, type BoardNode, type BoardNodeData } from './graph'
import { BoardActionsContext, edgeTypes, nodeTypes, type BoardActions } from './nodes'
import Palette, { PALETTE_MIME, type PaletteItem } from './Palette'
import Inspector, { type InspectorActions } from './Inspector'
import UdcDialog from './UdcDialog'

const REFRESH_MS = 15000

type FlowState = Record<string, { flow: Flow | null; error: string | null }>

type SourceDialog = { udcId: string; source: FlowSource | null; initialType?: string; position?: Position }
type SinkDialog = { udcId: string; sink: SubscriptionSink | null; initialChannel?: Channel; position?: Position; tenant?: string }
type Removal =
  | { kind: 'udc'; udc: Udc }
  | { kind: 'source'; udcId: string; source: FlowSource }
  | { kind: 'sink'; udcId: string; sink: SubscriptionSink }

/** Runs instance API calls (apiClient) against one UDC and tenant. */
function inScope<T>(udcId: string, tenant: string | null, fn: () => Promise<T>) {
  apiScope.set({ udcId, tenant })
  return fn()
}

function BoardCanvas() {
  const { t } = useTranslation()
  const theme = useTheme()
  const navigate = useNavigate()
  const { themeMode } = useAppContext()
  const { fitView, screenToFlowPosition } = useReactFlow()
  const canEdit = useCan('operator')
  const isAdmin = useCan('admin')

  const [udcs, setUdcs] = useState<Udc[] | null>(null)
  const [flows, setFlows] = useState<FlowState>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<BoardNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [udcDialog, setUdcDialog] = useState<{ udc: Udc | null } | null>(null)
  const [sourceDialog, setSourceDialog] = useState<SourceDialog | null>(null)
  const [sinkDialog, setSinkDialog] = useState<SinkDialog | null>(null)
  const [removal, setRemoval] = useState<Removal | null>(null)

  const dragging = useRef(false)
  const fitted = useRef(false)
  const busy = !!(udcDialog || sourceDialog || sinkDialog || removal)

  // ─── Data ──────────────────────────────────────────────────────────────

  /**
   * Reloads one UDC's flow. `until`: keep reloading (a few seconds at most) until it
   * holds; in a cluster the other replicas apply a change a moment after it is made.
   */
  const loadFlow = useCallback(async (udcId: string, until?: (flow: Flow) => boolean) => {
    const deadline = Date.now() + 4000
    for (;;) {
      try {
        const flow = await getFlow(udcId)
        if (until && !until(flow) && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 400))
          continue
        }
        setFlows((f) => ({ ...f, [udcId]: { flow, error: null } }))
      } catch (err) {
        setFlows((f) => ({ ...f, [udcId]: { flow: f[udcId]?.flow ?? null, error: (err as Error).message } }))
      }
      return
    }
  }, [])

  const hasBlock = (key: string) => (flow: Flow) => [...flow.sources, ...flow.sinks].some((b) => b.key === key)

  const load = useCallback(async () => {
    try {
      const list = await listUdcs()
      setUdcs(list)
      setLoadError(null)
      await Promise.all(list.map((u) => loadFlow(u.id)))
    } catch (err) {
      setLoadError((err as Error).message)
      setUdcs((u) => u ?? [])
    }
  }, [loadFlow])

  useEffect(() => {
    load()
  }, [load])

  // Live state: refresh while nobody is dragging or editing
  useEffect(() => {
    if (busy) return
    const timer = setInterval(() => {
      if (!dragging.current) load()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [busy, load])

  const colors = useMemo(
    () => ({
      success: theme.palette.success.main,
      error: theme.palette.error.main,
      warning: theme.palette.warning.main,
      neutral: theme.palette.text.disabled,
      edge: theme.palette.mode === 'dark' ? '#5b6578' : '#a3acb9',
    }),
    [theme],
  )

  useEffect(() => {
    if (!udcs) return
    const graph = buildGraph(udcs, flows, colors)
    setNodes(graph.nodes.map((n) => ({ ...n, selected: n.id === selectedId, draggable: canEdit })))
    setEdges(graph.edges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [udcs, flows, colors, canEdit])

  // Fit the board once, when the first flows are drawn
  useEffect(() => {
    if (fitted.current || !udcs || !nodes.length) return
    if (udcs.some((u) => !flows[u.id])) return
    fitted.current = true
    setTimeout(() => fitView({ padding: 0.15, maxZoom: 1 }), 50)
  }, [udcs, flows, nodes.length, fitView])

  const selected = nodes.find((n) => n.id === selectedId)?.data as BoardNodeData | undefined

  // ─── Positions ─────────────────────────────────────────────────────────

  const onNodeDragStop = useCallback(
    (_: unknown, __: Node, moved: Node[]) => {
      dragging.current = false
      const layouts: Record<string, Record<string, Position>> = {}
      for (const node of moved as BoardNode[]) {
        const position = { x: Math.round(node.position.x), y: Math.round(node.position.y) }
        if (node.data.kind === 'udc') {
          const id = node.data.udc.id
          setUdcs((list) => list?.map((u) => (u.id === id ? { ...u, position } : u)) ?? list)
          updateUdc(id, { position }).catch((err) => setToast(err.message))
        } else {
          const udcId = node.data.udcId
          const key = blockKey(node.id)
          ;(layouts[udcId] ??= {})[key] = position
          setFlows((f) => {
            const cur = f[udcId]
            if (!cur?.flow) return f
            return { ...f, [udcId]: { ...cur, flow: { ...cur.flow, layout: { ...cur.flow.layout, [key]: position } } } }
          })
        }
      }
      for (const [udcId, layout] of Object.entries(layouts)) {
        saveLayout(udcId, layout).catch((err) => setToast(err.message))
      }
    },
    [],
  )

  // ─── Adding blocks ─────────────────────────────────────────────────────

  const openAdd = useCallback((udcId: string, item: PaletteItem | { kind: 'source' | 'sink' }, position?: Position) => {
    if (item.kind === 'source') setSourceDialog({ udcId, source: null, initialType: 'type' in item ? item.type : undefined, position })
    else setSinkDialog({ udcId, sink: null, initialChannel: 'channel' in item ? item.channel : undefined, position })
  }, [])

  /** UDC a dropped block belongs to: the nearest one on the board. */
  const nearestUdc = (point: Position) => {
    let best: { id: string; d: number; pos: Position } | null = null
    for (const u of udcs ?? []) {
      if (!flows[u.id]?.flow) continue
      const c = { x: u.position.x + UDC_WIDTH / 2, y: u.position.y + 85 }
      const d = Math.hypot(c.x - point.x, c.y - point.y)
      if (!best || d < best.d) best = { id: u.id, d, pos: u.position }
    }
    return best
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData(PALETTE_MIME)
    if (!raw || !canEdit) return
    const item = JSON.parse(raw) as PaletteItem
    const point = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const target = nearestUdc(point)
    if (!target) return setToast(t('board.noUdcForBlock'))
    openAdd(target.id, item, { x: Math.round(point.x - target.pos.x - 120), y: Math.round(point.y - target.pos.y - 40) })
  }

  const onPick = (item: PaletteItem) => {
    const udcId =
      selected?.kind === 'udc' ? selected.udc.id : selected ? selected.udcId : udcs?.filter((u) => flows[u.id]?.flow).length === 1 ? udcs.find((u) => flows[u.id]?.flow)!.id : null
    if (!udcId) return setToast(t('board.selectUdcFirst'))
    openAdd(udcId, item)
  }

  const afterBlockSaved = async (udcId: string, key: string, position?: Position) => {
    if (position) await saveLayout(udcId, { [key]: position }).catch((err) => setToast(err.message))
    await loadFlow(udcId, hasBlock(key))
  }

  // ─── Actions ───────────────────────────────────────────────────────────

  const openWorkspace = useCallback(
    (udcId: string, path = '') => navigate(`/udc/${encodeURIComponent(udcId)}${path}`),
    [navigate],
  )

  const boardActions = useMemo<BoardActions>(
    () => ({ canEdit, openWorkspace: (id) => openWorkspace(id), addBlock: (udcId, kind) => openAdd(udcId, { kind }) }),
    [canEdit, openWorkspace, openAdd],
  )

  const inspectorActions: InspectorActions | null = selected
    ? {
        canEdit,
        isAdmin,
        close: () => setSelectedId(null),
        openWorkspace,
        editUdc: () => selected.kind === 'udc' && setUdcDialog({ udc: selected.udc }),
        deleteUdc: () => selected.kind === 'udc' && setRemoval({ kind: 'udc', udc: selected.udc }),
        addBlock: (kind) => selected.kind === 'udc' && openAdd(selected.udc.id, { kind }),
        editBlock: () => {
          if (selected.kind === 'source') setSourceDialog({ udcId: selected.udcId, source: selected.source })
          else if (selected.kind === 'sink' && selected.sink.kind === 'subscription')
            setSinkDialog({ udcId: selected.udcId, sink: selected.sink, tenant: selected.sink.tenant })
        },
        deleteBlock: () => {
          if (selected.kind === 'source') setRemoval({ kind: 'source', udcId: selected.udcId, source: selected.source })
          else if (selected.kind === 'sink' && selected.sink.kind === 'subscription')
            setRemoval({ kind: 'sink', udcId: selected.udcId, sink: selected.sink })
        },
        run: async (action) => {
          if (selected.kind === 'source') {
            const fn = action === 'start' ? startSource : action === 'stop' ? stopSource : restartSource
            await inScope(selected.udcId, null, () => fn(selected.source.id))
            await loadFlow(selected.udcId)
            // In a cluster the request may have been forwarded to the replica running it
            setTimeout(() => loadFlow(selected.udcId), 1500)
          } else if (selected.kind === 'sink' && selected.sink.kind === 'subscription') {
            const sink = selected.sink
            await inScope(selected.udcId, sink.tenant, () => updateSubscription(sink.id, { enabled: action === 'resume' }))
            await loadFlow(selected.udcId)
          }
        },
      }
    : null

  const confirmRemoval = async () => {
    const r = removal
    setRemoval(null)
    if (!r) return
    try {
      if (r.kind === 'udc') {
        await deleteUdc(r.udc.id)
        setSelectedId(null)
        await load()
      } else if (r.kind === 'source') {
        await deleteSourceBlock(r.udcId, r.source.id)
        setSelectedId(null)
        await loadFlow(r.udcId, (f) => !hasBlock(r.source.key)(f))
      } else {
        await deleteSinkBlock(r.udcId, r.sink.tenant, r.sink.id)
        setSelectedId(null)
        await loadFlow(r.udcId, (f) => !hasBlock(r.sink.key)(f))
      }
    } catch (err) {
      setToast((err as Error).message)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const empty = udcs !== null && udcs.length === 0

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box
        component="header"
        sx={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
      >
        <Box sx={{ width: 32, height: 32, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <HubIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ mr: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
            Universal Data Connector
          </Typography>
          <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
            {t('board.subtitle')}
          </Typography>
        </Box>
        {udcs && udcs.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('board.summary', { count: udcs.length })}
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={t('board.fit')}>
          <IconButton onClick={() => fitView({ padding: 0.15, maxZoom: 1, duration: 300 })}>
            <CenterFocusStrongIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.refresh')}>
          <IconButton onClick={load}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setUdcDialog({ udc: null })}>
            {t('board.addUdc')}
          </Button>
        )}
        <HeaderControls />
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1 }} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        {loadError && (
          <Alert severity="error" sx={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 6 }}>
            {loadError}
          </Alert>
        )}
        {udcs === null ? (
          <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <BoardActionsContext.Provider value={boardActions}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              onNodeDragStart={() => (dragging.current = true)}
              onNodeDragStop={onNodeDragStop}
              nodesConnectable={false}
              nodesDraggable={canEdit}
              elementsSelectable
              deleteKeyCode={null}
              minZoom={0.2}
              maxZoom={1.75}
              colorMode={themeMode}
              proOptions={{ hideAttribution: true }}
              style={{ background: theme.palette.background.default }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color={theme.palette.mode === 'dark' ? '#2a3140' : '#d3d8df'} />
              <Controls showInteractive={false} position="bottom-left" style={{ marginLeft: canEdit ? 264 : 16 }} />
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                style={{ marginRight: selected ? 412 : 16 }}
                nodeColor={(n) => ((n.data as BoardNodeData).kind === 'udc' ? ((n.data as { udc: Udc }).udc.color ?? theme.palette.primary.main) : theme.palette.text.disabled)}
                maskColor={theme.palette.mode === 'dark' ? 'rgba(11,14,20,0.7)' : 'rgba(246,247,249,0.7)'}
              />
            </ReactFlow>
          </BoardActionsContext.Provider>
        )}

        {canEdit && !empty && udcs && <Palette onPick={onPick} />}
        {selected && inspectorActions && <Inspector key={selectedId} data={selected} actions={inspectorActions} />}

        {empty && (
          <Paper variant="outlined" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', p: 4, maxWidth: 440, textAlign: 'center' }}>
            <HubIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {t('board.emptyTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isAdmin ? t('board.emptyAdmin') : t('board.emptyViewer')}
            </Typography>
            {isAdmin && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setUdcDialog({ udc: null })}>
                {t('board.addUdc')}
              </Button>
            )}
          </Paper>
        )}
      </Box>

      <UdcDialog
        open={!!udcDialog}
        udc={udcDialog?.udc ?? null}
        position={nextUdcPosition(udcs ?? [])}
        onClose={() => setUdcDialog(null)}
        onSaved={(saved) => {
          setUdcDialog(null)
          load().then(() => setSelectedId(udcNodeId(saved.id)))
        }}
      />

      {sourceDialog && (
        <UdcScopeProvider udcId={sourceDialog.udcId} quiet>
          <ConnectorDialog
            open
            source={sourceDialog.source ? { ...sourceDialog.source, entityIdPrefix: sourceDialog.source.entityIdPrefix ?? undefined } : null}
            initialType={sourceDialog.initialType}
            onClose={() => setSourceDialog(null)}
            onSaved={({ id }) => {
              const d = sourceDialog
              setSourceDialog(null)
              afterBlockSaved(d.udcId, sourceKey(id), d.position)
            }}
          />
        </UdcScopeProvider>
      )}

      {sinkDialog && (
        <UdcScopeProvider udcId={sinkDialog.udcId} initialTenant={sinkDialog.tenant} quiet>
          <SubscriptionWizard
            open
            subscription={sinkDialog.sink?.subscription}
            initialChannel={sinkDialog.initialChannel}
            chooseTenant
            onClose={() => setSinkDialog(null)}
            onSaved={(sub) => {
              const d = sinkDialog
              setSinkDialog(null)
              afterBlockSaved(d.udcId, subscriptionKey(sub.tenant, sub.id), d.position)
            }}
          />
        </UdcScopeProvider>
      )}

      <ConfirmDialog
        open={!!removal}
        title={removal?.kind === 'udc' ? t('board.unregisterTitle') : t('board.deleteBlockTitle')}
        message={
          removal?.kind === 'udc'
            ? t('board.unregisterMessage', { name: removal.udc.name })
            : removal?.kind === 'source'
              ? t('board.deleteSourceMessage', { name: removal.source.name })
              : t('board.deleteSinkMessage', { name: removal?.kind === 'sink' ? removal.sink.name : '' })
        }
        confirmLabel={removal?.kind === 'udc' ? t('board.unregister') : t('common.delete')}
        onConfirm={confirmRemoval}
        onCancel={() => setRemoval(null)}
      />

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="warning" onClose={() => setToast(null)} variant="filled">
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}

/** Home of the UI: every UDC instance with its sources and sinks, edited in place. */
export default function Board() {
  return (
    <ReactFlowProvider>
      <BoardCanvas />
    </ReactFlowProvider>
  )
}
