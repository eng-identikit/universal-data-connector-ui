import { MONO } from '../../theme'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import RouterLink from '../../components/ScopedLink'
import { useScopedNavigate } from '../../context/UdcScope'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  Skeleton,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Link,
  Grid,
  Divider,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RefreshIcon from '@mui/icons-material/Refresh'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import EditNoteIcon from '@mui/icons-material/EditNote'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import {
  getEntity,
  getEntityGraph,
  deleteEntity,
  putAttribute,
  deleteAttribute,
  replaceEntity,
  patchEntity,
  type Entity,
  type EntityGraph,
  type Attribute,
} from '../../api/broker'
import { ApiError } from '../../api/client'
import { useCan } from '../../context/AuthContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import AttributeDialog from './AttributeDialog'
import { CommandDialog, CommandsList } from './CommandsPanel'
import EntityHistory from '../../components/EntityHistory'
import LocationPanel from './LocationPanel'
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote'
import { formatTime, formatValue, qualityColor } from './format'
import PageHeader from '../../components/PageHeader'
import { CodeBlock } from '../../components/Code'

const entityPath = (id: string) => `/entities/${encodeURIComponent(id)}`

function EntityLink({ id, type }: { id: string; type?: string | null }) {
  const { t } = useTranslation()
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {type === null ? (
        <Tooltip title={t('entity.missingTarget')}>
          <Typography component="span" variant="body2" fontFamily={MONO} color="warning.main">
            {id}
          </Typography>
        </Tooltip>
      ) : (
        <Link component={RouterLink} to={entityPath(id)} fontFamily={MONO} variant="body2">
          {id}
        </Link>
      )}
      {type && <Chip label={type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />}
    </Box>
  )
}

/**
 * Tree of the graph from `root`, following edges in one direction:
 * 'in' shows what points to root (children), 'out' what root points to (parents).
 */
function RelationTree({ graph, root, direction }: { graph: EntityGraph; root: string; direction: 'in' | 'out' }) {
  const typeOf = new Map(graph.nodes.map((n) => [n.id, n.type]))
  const render = (id: string, seen: Set<string>, level: number): JSX.Element[] => {
    const next = graph.edges.filter((e) => (direction === 'in' ? e.target === id : e.source === id))
    return next.flatMap((e) => {
      const other = direction === 'in' ? e.source : e.target
      if (seen.has(other)) return []
      const branch = new Set(seen).add(other)
      return [
        <Box key={`${e.source}|${e.attr}`} sx={{ pl: level * 3, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SubdirectoryArrowRightIcon fontSize="small" sx={{ color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
            {e.attr}
          </Typography>
          <EntityLink id={other} type={typeOf.get(other)} />
        </Box>,
        ...render(other, branch, level + 1),
      ]
    })
  }
  const rows = render(root, new Set([root]), 0)
  return rows.length ? <>{rows}</> : <Typography variant="body2" color="text.secondary">—</Typography>
}

export default function EntityDetail() {
  const { t } = useTranslation()
  const navigate = useScopedNavigate()
  const { id = '' } = useParams()
  const canWrite = useCan('operator')
  const [entity, setEntity] = useState<Entity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [tab, setTab] = useState<'attrs' | 'history' | 'relations' | 'location' | 'commands' | 'json'>('attrs')
  const [commandAttr, setCommandAttr] = useState<string | null>(null)
  const [commandsKey, setCommandsKey] = useState(0)
  const [depth, setDepth] = useState(2)
  const [children, setChildren] = useState<EntityGraph | null>(null)
  const [parents, setParents] = useState<EntityGraph | null>(null)
  const [attrDialog, setAttrDialog] = useState<{ name?: string; attr?: Attribute } | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'entity' } | { kind: 'attr'; name: string } | null>(null)
  const [jsonDraft, setJsonDraft] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      setConflict(false)
      setEntity(await getEntity(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [id])

  useEffect(() => {
    setEntity(null)
    setJsonDraft(null)
    load()
  }, [load])

  useEffect(() => {
    if (tab !== 'relations' || !entity) return
    Promise.all([getEntityGraph(id, depth, 'in'), getEntityGraph(id, depth, 'out')])
      .then(([c, p]) => {
        setChildren(c)
        setParents(p)
      })
      .catch((err) => setError(err.message))
  }, [tab, depth, id, entity])

  /** Runs a write; on a version conflict asks the user to reload instead of overwriting. */
  const write = async (fn: () => Promise<Entity | void>) => {
    try {
      setError(null)
      const result = await fn()
      if (result) setEntity(result)
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setConflict(true)
      else setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }

  if (!entity) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} color="inherit" onClick={() => navigate('/entities')} sx={{ mb: 2, ml: -1 }}>
          {t('entity.back')}
        </Button>
        {error ? <Alert severity="error">{error}</Alert> : <Skeleton variant="rounded" height={240} />}
      </Box>
    )
  }

  const attrs = Object.entries(entity.attrs).sort(([a], [b]) => a.localeCompare(b))

  return (
    <Box>
      <PageHeader
        overline={
          <Button startIcon={<ArrowBackIcon />} color="inherit" onClick={() => navigate(-1)} sx={{ mb: 1, ml: -1 }}>
            {t('entity.back')}
          </Button>
        }
        title={entity.id}
        titleProps={{ fontFamily: MONO, sx: { wordBreak: 'break-all' } }}
        subtitle={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip label={entity.type} size="small" color="primary" />
            <Typography variant="caption" color="text.secondary">
              v{entity.version} · {t('entity.created')} {formatTime(entity.createdAt)} · {t('entities.updated')}{' '}
              {formatTime(entity.updatedAt)}
            </Typography>
            {entity.location && (
              <Chip
                size="small"
                variant="outlined"
                label={`${entity.location.type} ${JSON.stringify(entity.location.coordinates)}`}
              />
            )}
          </Box>
        }
        actions={
          <>
            <Tooltip title={t('common.refresh')}>
              <IconButton onClick={load}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            {canWrite && (
              <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => setConfirm({ kind: 'entity' })}>
                {t('common.delete')}
              </Button>
            )}
          </>
        }
      />

      {conflict && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={load}>
              {t('entity.reload')}
            </Button>
          }
        >
          {t('entity.conflict')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="attrs" label={`${t('entities.attributes')} (${attrs.length})`} />
          <Tab value="history" label={t('nav.history')} />
          <Tab value="relations" label={t('entity.relations')} />
          <Tab value="location" label={t('location.title')} />
          <Tab value="commands" label={t('commands.title')} />
          <Tab value="json" label="JSON" />
        </Tabs>

        {tab === 'attrs' && (
          <>
            {canWrite && (
              <Box sx={{ p: 2, pb: 0, display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAttrDialog({})}>
                  {t('attr.addTitle')}
                </Button>
              </Box>
            )}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('attr.name')}</TableCell>
                    <TableCell>{t('common.type')}</TableCell>
                    <TableCell>{t('attr.value')}</TableCell>
                    <TableCell>{t('attr.quality')}</TableCell>
                    <TableCell>{t('attr.ts')}</TableCell>
                    <TableCell>{t('attr.source')}</TableCell>
                    {canWrite && <TableCell align="right">{t('common.actions')}</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attrs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        {t('entity.noAttrs')}
                      </TableCell>
                    </TableRow>
                  )}
                  {attrs.map(([name, attr]) => (
                    <TableRow key={name} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {name}
                          </Typography>
                          {attr.writable && (
                            <Tooltip title={t('attr.writable')}>
                              <EditNoteIcon fontSize="small" color="action" />
                            </Tooltip>
                          )}
                        </Box>
                        {attr.meta && Object.keys(attr.meta).length > 0 && (
                          <Typography variant="caption" color="text.secondary" fontFamily={MONO}>
                            {JSON.stringify(attr.meta)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={attr.type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320, wordBreak: 'break-word' }}>
                        {attr.type === 'relationship' && attr.target ? (
                          <EntityLink id={attr.target} />
                        ) : (
                          <Typography variant="body2" fontFamily={MONO}>
                            {formatValue(attr)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {attr.quality ? <Chip label={attr.quality} size="small" color={qualityColor(attr.quality)} /> : '—'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(attr.ts)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{attr.source ?? '—'}</Typography>
                      </TableCell>
                      {canWrite && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {attr.writable && (
                            <Tooltip title={t('commands.send')}>
                              <IconButton size="small" color="primary" onClick={() => setCommandAttr(name)}>
                                <SettingsRemoteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton size="small" onClick={() => setAttrDialog({ name, attr })}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setConfirm({ kind: 'attr', name })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {tab === 'history' && (
          <CardContent>
            <EntityHistory
              entityId={entity.id}
              units={Object.fromEntries(Object.entries(entity.attrs).map(([k, a]) => [k, a.unit]))}
            />
          </CardContent>
        )}

        {tab === 'location' && (
          <CardContent>
            <LocationPanel
              entity={entity}
              canWrite={canWrite}
              onSave={(location) => write(() => patchEntity(entity.id, { location }, entity.version))}
            />
          </CardContent>
        )}

        {tab === 'commands' && (
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('commands.help')}
            </Typography>
            <CommandsList entityId={entity.id} refreshKey={commandsKey} />
          </CardContent>
        )}

        {tab === 'relations' && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <TextField
                select
                size="small"
                label={t('entities.depth')}
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                sx={{ width: 120 }}
              >
                {[1, 2, 3, 4, 5].map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {t('entity.pointsTo')}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                {parents ? <RelationTree graph={parents} root={entity.id} direction="out" /> : <Skeleton />}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {t('entity.pointedBy')}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                {children ? <RelationTree graph={children} root={entity.id} direction="in" /> : <Skeleton />}
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => navigate(`/entities?related=${encodeURIComponent(entity.id)}&depth=${depth}`)}
                >
                  {t('entity.showAsList')}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {tab === 'json' && (
          <CardContent>
            {jsonDraft === null ? (
              <>
                {canWrite && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        const { id: eid, type, attrs: a, location } = entity
                        setJsonDraft(JSON.stringify({ id: eid, type, location, attrs: a }, null, 2))
                      }}
                    >
                      {t('common.edit')}
                    </Button>
                  </Box>
                )}
                <CodeBlock maxHeight={600}>{JSON.stringify(entity, null, 2)}</CodeBlock>
              </>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 1 }}>
                  {t('entity.jsonReplaceHelp')}
                </Alert>
                <TextField
                  value={jsonDraft}
                  onChange={(e) => setJsonDraft(e.target.value)}
                  fullWidth
                  multiline
                  minRows={16}
                  InputProps={{ sx: { fontFamily: MONO, fontSize: '0.75rem' } }}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                  <Button color="inherit" onClick={() => setJsonDraft(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      let body
                      try {
                        body = JSON.parse(jsonDraft)
                      } catch {
                        setError(t('attr.errJson'))
                        return
                      }
                      if (await write(() => replaceEntity(entity.id, body, entity.version))) setJsonDraft(null)
                    }}
                  >
                    {t('common.save')}
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        )}
      </Card>

      <AttributeDialog
        open={!!attrDialog}
        name={attrDialog?.name}
        attr={attrDialog?.attr}
        existingNames={Object.keys(entity.attrs)}
        onCancel={() => setAttrDialog(null)}
        onSave={async (name, attr) => {
          // Errors other than conflicts are shown inside the dialog
          try {
            setEntity(await putAttribute(entity.id, name, attr, entity.version))
            setAttrDialog(null)
          } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
              setAttrDialog(null)
              setConflict(true)
              return
            }
            throw err
          }
        }}
      />

      <CommandDialog
        open={!!commandAttr}
        entityId={entity.id}
        name={commandAttr ?? ''}
        attr={commandAttr ? entity.attrs[commandAttr] : undefined}
        onClose={() => setCommandAttr(null)}
        onSent={() => setCommandsKey((k) => k + 1)}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'attr' ? t('attr.deleteTitle') : t('entity.deleteTitle')}
        message={
          confirm?.kind === 'attr'
            ? t('attr.deleteMessage', { name: confirm.name })
            : t('entity.deleteMessage', { id: entity.id })
        }
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const c = confirm
          setConfirm(null)
          if (c?.kind === 'attr') {
            await write(() => deleteAttribute(entity.id, c.name, entity.version))
          } else if (c?.kind === 'entity') {
            if (await write(() => deleteEntity(entity.id, entity.version).then(() => undefined))) navigate('/entities')
          }
        }}
      />
    </Box>
  )
}
