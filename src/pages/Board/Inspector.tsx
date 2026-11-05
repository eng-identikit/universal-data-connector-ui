import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, Chip, Divider, IconButton, Paper, Tooltip, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import PauseIcon from '@mui/icons-material/Pause'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AddIcon from '@mui/icons-material/Add'
import TransformIcon from '@mui/icons-material/Transform'
import { CodeBlock, CodeTag } from '../../components/Code'
import { dateTime, relativeTime } from '../../utils/format'
import { MONO } from '../../theme'
import type { BoardNodeData } from './graph'
import { sinkIcon, sourceIcon } from './icons'

export interface InspectorActions {
  canEdit: boolean
  isAdmin: boolean
  close: () => void
  openWorkspace: (udcId: string, path?: string) => void
  editUdc: () => void
  deleteUdc: () => void
  addBlock: (kind: 'source' | 'sink') => void
  editBlock: () => void
  deleteBlock: () => void
  /** Start/stop/restart a source, pause/resume a sink */
  run: (action: 'start' | 'stop' | 'restart' | 'pause' | 'resume') => Promise<void>
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      {children}
    </Box>
  )
}

/** Side panel with the selected block: what it is, its state and what can be done with it. */
export default function Inspector({ data, actions }: { data: BoardNodeData; actions: InspectorActions }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const run = async (action: Parameters<InspectorActions['run']>[0]) => {
    setBusy(true)
    setError(null)
    try {
      await actions.run(action)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  let icon: ReactNode
  let title: string
  let subtitle: string
  let body: ReactNode
  let buttons: ReactNode = null

  if (data.kind === 'udc') {
    const { udc, flow } = data
    const s = udc.status
    icon = <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: udc.color || 'primary.main' }} />
    title = udc.name
    subtitle = t('board.kindUdc')
    body = (
      <>
        {udc.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {udc.description}
          </Typography>
        )}
        <Row label={t('udcDialog.url')}>
          <CodeTag>{udc.url}</CodeTag>
        </Row>
        {udc.publicUrl && (
          <Row label={t('udcDialog.publicUrl')}>
            <CodeTag>{udc.publicUrl}</CodeTag>
          </Row>
        )}
        <Section title={t('board.state')}>
          <Row label={t('board.reachable')}>{s?.reachable ? t('common.yes') : t('common.no')}</Row>
          <Row label={t('board.serviceKey')}>{s?.keyValid ? t('board.keyOk') : t('board.status.keyInvalid')}</Row>
          {s?.latencyMs != null && <Row label={t('board.latency')}>{s.latencyMs} ms</Row>}
          {s?.reachable && (
            <>
              <Row label={t('board.cluster')}>{s.cluster ? t('common.yes') : t('common.no')}</Row>
              {s.messaging && <Row label={t('board.messaging')}>{s.messaging}</Row>}
              {s.sessions && <Row label={t('board.sessions')}>{s.sessions}</Row>}
              {s.defaultBrokers && (
                <Row label={t('board.defaultBrokers')}>
                  {[s.defaultBrokers.mqtt && 'MQTT', s.defaultBrokers.nats && 'NATS'].filter(Boolean).join(', ') || '—'}
                </Row>
              )}
            </>
          )}
          {s?.error && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {s.error}
            </Alert>
          )}
          {flow?.errors
            .filter((e) => e.section !== 'udc')
            .map((e) => (
              <Alert key={e.section} severity="warning" sx={{ mt: 1 }}>
                {e.section}: {e.message}
              </Alert>
            ))}
        </Section>
        {flow && flow.tenants.length > 0 && (
          <Section title={t('board.tenants')}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {flow.tenants.map((tn) => (
                <Chip key={tn.id} size="small" label={tn.name} variant="outlined" />
              ))}
            </Box>
          </Section>
        )}
        {flow && flow.transformers.length > 0 && (
          <Section title={t('nav.transformers')}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {flow.transformers.map((tr) => (
                <Chip key={tr.id} size="small" icon={<TransformIcon />} label={tr.name} variant="outlined" title={tr.description} />
              ))}
            </Box>
          </Section>
        )}
      </>
    )
    buttons = (
      <>
        <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={() => actions.openWorkspace(udc.id)}>
          {t('board.openInstance')}
        </Button>
        {actions.canEdit && flow && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => actions.addBlock('source')} sx={{ flex: 1 }}>
              {t('board.source')}
            </Button>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => actions.addBlock('sink')} sx={{ flex: 1 }}>
              {t('board.sink')}
            </Button>
          </Box>
        )}
        {actions.isAdmin && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" color="inherit" startIcon={<EditIcon />} onClick={actions.editUdc} sx={{ flex: 1 }}>
              {t('common.edit')}
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={actions.deleteUdc} sx={{ flex: 1 }}>
              {t('board.unregister')}
            </Button>
          </Box>
        )}
      </>
    )
  } else if (data.kind === 'source') {
    const { source } = data
    icon = sourceIcon(source.type)
    title = source.name
    subtitle = `${t('board.source')} · ${source.type}`
    const stats = Object.entries(source.stats ?? {}).filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    body = (
      <>
        <Row label="ID">
          <CodeTag>{source.id}</CodeTag>
        </Row>
        <Row label={t('board.state')}>{source.enabled ? t(`connectorStatus.${source.status}`, source.status) : t('board.disabled')}</Row>
        <Row label={t('admin.tenant')}>{source.tenant}</Row>
        {source.entityIdPrefix && (
          <Row label={t('board.entityIdPrefix')}>
            <CodeTag>{source.entityIdPrefix}</CodeTag>
          </Row>
        )}
        {source.lastActivity && <Row label={t('board.lastActivity')}>{relativeTime(source.lastActivity)}</Row>}
        {source.instance && (
          <Row label={t('board.instance')}>
            <CodeTag>{source.instance}</CodeTag>
          </Row>
        )}
        {source.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {source.tags.map((tag) => (
              <Chip key={tag} size="small" label={tag} />
            ))}
          </Box>
        )}
        {stats.length > 0 && (
          <Section title={t('board.statistics')}>
            {stats.map(([k, v]) => (
              <Row key={k} label={k}>
                {typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? dateTime(v) : String(v)}
              </Row>
            ))}
          </Section>
        )}
        <Section title={t('board.configuration')}>
          <CodeBlock maxHeight={280}>{JSON.stringify(source.config, null, 2)}</CodeBlock>
        </Section>
      </>
    )
    buttons = actions.canEdit && (
      <>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {source.enabled && source.status !== 'running' && source.status !== 'connected' ? (
            <Button variant="outlined" startIcon={<PlayArrowIcon />} disabled={busy} onClick={() => run('start')} sx={{ flex: 1 }}>
              {t('board.start')}
            </Button>
          ) : (
            <Button variant="outlined" color="inherit" startIcon={<StopIcon />} disabled={busy || !source.enabled} onClick={() => run('stop')} sx={{ flex: 1 }}>
              {t('board.stop')}
            </Button>
          )}
          <Button variant="outlined" color="inherit" startIcon={<RestartAltIcon />} disabled={busy || !source.enabled} onClick={() => run('restart')} sx={{ flex: 1 }}>
            {t('board.restart')}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<EditIcon />} onClick={actions.editBlock} sx={{ flex: 1 }}>
            {t('common.edit')}
          </Button>
          <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={actions.deleteBlock} sx={{ flex: 1 }}>
            {t('common.delete')}
          </Button>
        </Box>
      </>
    )
  } else if (data.sink.kind === 'mcp') {
    const { sink } = data
    icon = sinkIcon('mcp')
    title = t('board.mcpTitle')
    subtitle = `${t('board.sink')} · MCP`
    body = (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('board.mcpHelp')}
        </Typography>
        <Row label={t('board.state')}>{sink.enabled ? t('board.enabled') : t('board.disabled')}</Row>
        <Row label={t('board.transport')}>{sink.transport}</Row>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CodeBlock sx={{ flexGrow: 1 }}>{sink.url}</CodeBlock>
          <Tooltip title={copied ? t('common.copied') : t('common.copy')}>
            <IconButton
              size="small"
              onClick={() => {
                navigator.clipboard?.writeText(sink.url).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                })
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Section title={t('board.tools')}>
          {sink.tools.map((tool) => (
            <Box key={tool.name} sx={{ py: 0.75 }}>
              <Typography variant="body2" sx={{ fontFamily: MONO, fontSize: '0.8rem' }}>
                {tool.name}
              </Typography>
              {tool.description && (
                <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {tool.description}
                </Typography>
              )}
            </Box>
          ))}
        </Section>
      </>
    )
    buttons = actions.isAdmin && (
      <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => actions.openWorkspace(data.udcId, '/admin')}>
        {t('board.mcpKeys')}
      </Button>
    )
  } else {
    const { sink, transformerName } = data
    const st = sink.stats
    icon = sinkIcon(sink.channel)
    title = sink.name
    subtitle = `${t('board.sink')} · ${sink.channel.toUpperCase()}`
    body = (
      <>
        {sink.subscription.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {sink.subscription.description}
          </Typography>
        )}
        <Row label={t('board.target')}>
          <CodeTag>{sink.target}</CodeTag>
        </Row>
        <Row label={t('admin.tenant')}>{sink.tenant}</Row>
        <Row label={t('board.state')}>{t(`board.sinkStatus.${sink.status}`)}</Row>
        <Row label={t('board.transformer')}>
          {sink.transformer ? (
            <Chip size="small" color="secondary" variant="outlined" icon={<TransformIcon />} label={transformerName} />
          ) : (
            t('board.noTransformer')
          )}
        </Row>
        {sink.transformer?.kind === 'inline' && <CodeBlock maxHeight={160}>{sink.transformer.expression}</CodeBlock>}
        <Row label={t('board.entityTypes')}>{sink.subscription.select?.types?.join(', ') || t('board.anyType')}</Row>
        {st && (
          <Section title={t('board.statistics')}>
            <Row label={t('subs.matched')}>{st.matched}</Row>
            <Row label={t('subs.delivered')}>{st.delivered}</Row>
            <Row label={t('subs.failed')}>{st.failedAttempts}</Row>
            {!!st.retrying && <Row label={t('subs.retrying')}>{st.retrying}</Row>}
            {st.lastSuccessAt && <Row label={t('board.lastSuccess')}>{relativeTime(st.lastSuccessAt)}</Row>}
            {st.lastLatencyMs != null && <Row label={t('board.latency')}>{st.lastLatencyMs} ms</Row>}
            {st.lastError && sink.status === 'failing' && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {st.lastError}
              </Alert>
            )}
          </Section>
        )}
      </>
    )
    buttons = (
      <>
        {actions.canEdit && (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" startIcon={<EditIcon />} onClick={actions.editBlock} sx={{ flex: 1 }}>
                {t('common.edit')}
              </Button>
              {sink.enabled ? (
                <Button variant="outlined" color="inherit" startIcon={<PauseIcon />} disabled={busy} onClick={() => run('pause')} sx={{ flex: 1 }}>
                  {t('board.pause')}
                </Button>
              ) : (
                <Button variant="outlined" startIcon={<PlayArrowIcon />} disabled={busy} onClick={() => run('resume')} sx={{ flex: 1 }}>
                  {t('board.resume')}
                </Button>
              )}
            </Box>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={actions.deleteBlock}>
              {t('common.delete')}
            </Button>
          </>
        )}
        <Button variant="text" startIcon={<OpenInNewIcon />} onClick={() => actions.openWorkspace(data.udcId, `/subscriptions/${encodeURIComponent(sink.id)}`)}>
          {t('board.details')}
        </Button>
      </>
    )
  }

  return (
    <Paper
      variant="outlined"
      sx={{ position: 'absolute', top: 16, right: 16, bottom: 16, width: 380, zIndex: 5, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
        <Box sx={{ width: 32, height: 32, display: 'grid', placeItems: 'center', color: 'text.secondary', flexShrink: 0 }}>{icon}</Box>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="subtitle1" noWrap title={title} lineHeight={1.3}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        <IconButton size="small" onClick={actions.close}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {body}
      </Box>
      {buttons && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>{buttons}</Box>
        </>
      )}
    </Paper>
  )
}
