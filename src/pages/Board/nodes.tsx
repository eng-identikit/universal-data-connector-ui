import { createContext, memo, useContext, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Handle, Position, type EdgeProps, type NodeProps } from '@xyflow/react'
import { alpha, Box, Chip, IconButton, Tooltip, Typography, useTheme } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import HubIcon from '@mui/icons-material/Hub'
import TransformIcon from '@mui/icons-material/Transform'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { MONO, RADIUS } from '../../theme'
import type { BoardNode, SinkNodeData, SourceNodeData, UdcNodeData } from './graph'
import { sinkTone, sourceTone } from './graph'
import { sinkIcon, sourceIcon } from './icons'

/** Actions the nodes trigger on the board. */
export interface BoardActions {
  canEdit: boolean
  openWorkspace: (udcId: string) => void
  addBlock: (udcId: string, kind: 'source' | 'sink') => void
}

export const BoardActionsContext = createContext<BoardActions>({
  canEdit: false,
  openWorkspace: () => {},
  addBlock: () => {},
})

type Tone = 'success' | 'error' | 'warning' | 'neutral'

function useToneColor() {
  const theme = useTheme()
  return (tone: Tone) =>
    tone === 'neutral' ? theme.palette.text.disabled : theme.palette[tone].main
}

function StatusDot({ tone, label }: { tone: Tone; label: string }) {
  const color = useToneColor()(tone)
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0, boxShadow: `0 0 0 3px ${alpha(color, 0.18)}` }} />
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
    </Box>
  )
}

function Card({ selected, tone, children, accent }: { selected: boolean; tone: Tone; children: ReactNode; accent?: string }) {
  const theme = useTheme()
  const toneColor = useToneColor()(tone)
  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: `${RADIUS.surface}px`,
        boxShadow: selected
          ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.25)}`
          : theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(0,0,0,0.35)'
            : '0 1px 3px rgba(16,24,40,0.08)',
        overflow: 'hidden',
        transition: 'border-color 120ms, box-shadow 120ms',
        '&:hover': { borderColor: selected ? 'primary.main' : 'text.disabled' },
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: accent ?? toneColor }} />
      {children}
    </Box>
  )
}

const handleSx = (color: string) => ({ width: 10, height: 10, background: color, border: '2px solid', borderColor: 'inherit' })

// ─── UDC ─────────────────────────────────────────────────────────────────

export const UdcNode = memo(function UdcNode({ data, selected }: NodeProps<BoardNode>) {
  const { t } = useTranslation()
  const theme = useTheme()
  const actions = useContext(BoardActionsContext)
  const { udc, flow, flowError } = data as UdcNodeData
  const s = udc.status
  const tone: Tone = !s?.reachable ? 'error' : !s.keyValid ? 'warning' : s.ready ? 'success' : 'warning'
  const statusLabel = !s?.reachable
    ? t('board.status.unreachable')
    : !s.keyValid
      ? t('board.status.keyInvalid')
      : s.ready
        ? t('board.status.online')
        : t('board.status.starting')
  const color = udc.color || theme.palette.primary.main
  const sectionErrors = flow?.errors.filter((e) => e.section !== 'udc') ?? []

  const plus = (kind: 'source' | 'sink', side: 'left' | 'right') =>
    actions.canEdit && flow && (
      <Tooltip title={t(kind === 'source' ? 'board.addSource' : 'board.addSink')} placement={side}>
        <IconButton
          className="nodrag"
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            actions.addBlock(udc.id, kind)
          }}
          sx={{
            position: 'absolute',
            top: '50%',
            [side]: -14,
            transform: 'translateY(-50%)',
            width: 28,
            height: 28,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: 2,
            '&:hover': { bgcolor: 'background.paper', borderColor: 'primary.main', color: 'primary.main' },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )

  return (
    <Box sx={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} isConnectable={false} style={{ ...handleSx(color), opacity: 0 }} />
      <Handle type="source" position={Position.Right} isConnectable={false} style={{ ...handleSx(color), opacity: 0 }} />
      {plus('source', 'left')}
      {plus('sink', 'right')}
      <Card selected={!!selected} tone={tone} accent={color}>
        <Box sx={{ p: 2, pl: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: `${RADIUS.control}px`,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(color, 0.14),
                color,
                flexShrink: 0,
              }}
            >
              <HubIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="subtitle2" noWrap title={udc.name}>
                {udc.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ fontFamily: MONO, fontSize: '0.7rem' }}>
                {udc.url}
              </Typography>
            </Box>
            <Tooltip title={t('board.openInstance')}>
              <IconButton
                className="nodrag"
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  actions.openWorkspace(udc.id)
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, gap: 1 }}>
            <StatusDot tone={tone} label={statusLabel} />
            {s?.cluster && <Chip size="small" variant="outlined" label="cluster" />}
          </Box>

          {flow && (
            <Box sx={{ display: 'flex', gap: 2, mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Metric label={t('board.sources')} value={flow.sources.length} />
              <Metric label={t('board.sinks')} value={flow.sinks.length} />
              <Metric label={t('board.tenants')} value={flow.tenants.length} />
            </Box>
          )}
          {(flowError || sectionErrors.length > 0 || (s && s.error)) && (
            <Box sx={{ display: 'flex', gap: 0.75, mt: 1.25, color: 'warning.main', alignItems: 'flex-start' }}>
              <WarningAmberIcon sx={{ fontSize: 16, mt: '1px' }} />
              <Typography variant="caption" sx={{ lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {flowError || s?.error || sectionErrors.map((e) => e.message).join('; ')}
              </Typography>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  )
})

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Box>
      <Typography variant="subtitle2" lineHeight={1.1}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  )
}

// ─── Blocks ──────────────────────────────────────────────────────────────

function BlockBody({ icon, title, subtitle, footer }: { icon: ReactNode; title: string; subtitle: string; footer: ReactNode }) {
  return (
    <Box sx={{ p: 1.5, pl: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: `${RADIUS.control}px`,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'text.secondary',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap title={title}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div" title={subtitle} sx={{ fontFamily: MONO, fontSize: '0.7rem' }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1 }}>{footer}</Box>
    </Box>
  )
}

export const SourceNode = memo(function SourceNode({ data, selected }: NodeProps<BoardNode>) {
  const { t } = useTranslation()
  const { source } = data as SourceNodeData
  const tone: Tone = source.enabled ? sourceTone(source.status) : 'neutral'
  const handleColor = useToneColor()(tone)
  return (
    <>
      <Card selected={!!selected} tone={tone}>
        <BlockBody
          icon={sourceIcon(source.type)}
          title={source.name}
          subtitle={`${source.type} · ${source.id}`}
          footer={
            <>
              <StatusDot tone={tone} label={source.enabled ? t(`connectorStatus.${source.status}`, source.status) : t('board.disabled')} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {source.tenant}
              </Typography>
            </>
          }
        />
      </Card>
      <Handle type="source" position={Position.Right} isConnectable={false} style={handleSx(handleColor)} />
    </>
  )
})

export const SinkNode = memo(function SinkNode({ data, selected }: NodeProps<BoardNode>) {
  const { t } = useTranslation()
  const { sink } = data as SinkNodeData
  const tone: Tone = sink.enabled ? sinkTone(sink.status) : 'neutral'
  const handleColor = useToneColor()(tone)
  const isMcp = sink.kind === 'mcp'
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={handleSx(handleColor)} />
      <Card selected={!!selected} tone={tone}>
        <BlockBody
          icon={sinkIcon(isMcp ? 'mcp' : sink.channel)}
          title={isMcp ? t('board.mcpTitle') : sink.name}
          subtitle={isMcp ? sink.url : sink.target}
          footer={
            <>
              <StatusDot tone={tone} label={t(`board.sinkStatus.${sink.status}`)} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {isMcp ? t('board.mcpTools', { count: sink.tools.length }) : `${sink.channel.toUpperCase()} · ${sink.tenant}`}
              </Typography>
            </>
          }
        />
      </Card>
    </>
  )
})

// ─── Edge with the transformer on it ─────────────────────────────────────

export function TransformerEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  const label = (data as { label?: string | null } | undefined)?.label
  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <Box
            className="nodrag nopan"
            sx={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: `${RADIUS.tag}px`,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'secondary.main',
              color: 'secondary.main',
              fontSize: '0.7rem',
              fontWeight: 600,
              pointerEvents: 'all',
              whiteSpace: 'nowrap',
            }}
            title={label}
          >
            <TransformIcon sx={{ fontSize: 13 }} />
            {label}
          </Box>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const nodeTypes = { udc: UdcNode, source: SourceNode, sink: SinkNode }
export const edgeTypes = { transformer: TransformerEdge }
