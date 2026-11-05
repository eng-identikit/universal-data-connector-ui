import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import KeyIcon from '@mui/icons-material/Key'
import { createApiKey, getMcpInfo, getTypes, type McpInfo } from '../../api/broker'
import { getBaseUrl } from '../../api/client'
import { CodeBlock, CodeTag } from '../../components/Code'

type Client = 'claudeCode' | 'stdio' | 'vscode' | 'http'

const KEY_PLACEHOLDER = '<API_KEY>'

/** Ready-to-paste client configuration for the MCP endpoint. */
function snippet(client: Client, url: string, key: string) {
  switch (client) {
    case 'claudeCode':
      return `claude mcp add --transport http udc ${url} --header "Authorization: Bearer ${key}"`
    case 'stdio':
      return JSON.stringify(
        {
          mcpServers: {
            udc: {
              command: 'npx',
              args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${UDC_AUTH}'],
              env: { UDC_AUTH: `Bearer ${key}` },
            },
          },
        },
        null,
        2,
      )
    case 'vscode':
      return JSON.stringify({ servers: { udc: { type: 'http', url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2)
    case 'http':
      return `URL:     ${url}\nHeader:  Authorization: Bearer ${key}\n         (or X-API-Key: ${key})\nTransport: Streamable HTTP`
  }
}

/** Tenant admin: how to give an LLM read access to this tenant through MCP. */
export default function McpTab({ tenant }: { tenant: string }) {
  const { t } = useTranslation()
  const [info, setInfo] = useState<McpInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [types, setTypes] = useState<string[]>([])
  const [name, setName] = useState('LLM')
  const [allowedTypes, setAllowedTypes] = useState<string[]>([])
  const [key, setKey] = useState<string | null>(null)
  const [client, setClient] = useState<Client>('claudeCode')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getMcpInfo()
      .then(setInfo)
      .catch((err) => setError((err as Error).message))
    getTypes()
      .then((ts) => setTypes(ts.map((x) => x.type)))
      .catch(() => setTypes([]))
  }, [])

  const url = useMemo(() => `${getBaseUrl() || window.location.origin}${info?.path ?? '/api/v1/mcp'}`, [info])
  const text = snippet(client, url, key ?? KEY_PLACEHOLDER)

  const generate = async () => {
    try {
      setError(null)
      const created = await createApiKey({ name: name.trim() || 'LLM', role: 'viewer', allowedTypes: allowedTypes.length ? allowedTypes : undefined })
      setKey(created.key)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (info && !info.enabled) return <Alert severity="info">{t('mcp.disabled')}</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box>
        <Typography variant="body2" color="text.secondary">
          {t('mcp.intro', { tenant })}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight={500}>
            {t('mcp.endpoint')}
          </Typography>
          <CodeTag>{url}</CodeTag>
          <Chip size="small" variant="outlined" label="Streamable HTTP" />
          <Chip size="small" color="success" label={t('mcp.readOnly')} />
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          1. {t('mcp.keyStep')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t('mcp.keyHelp')}
        </Typography>
        {key ? (
          <Alert severity="warning">{t('admin.keyShownOnce')}</Alert>
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <TextField label={t('transformers.name')} value={name} onChange={(e) => setName(e.target.value)} sx={{ width: 200 }} />
            <Autocomplete
              multiple
              size="small"
              options={types}
              value={allowedTypes}
              onChange={(_, v) => setAllowedTypes(v)}
              sx={{ minWidth: 280, flexGrow: 1, maxWidth: 480 }}
              renderInput={(params) => <TextField {...params} label={t('admin.allowedTypes')} helperText={t('admin.allowedTypesHelp')} />}
            />
            <Button variant="contained" startIcon={<KeyIcon />} onClick={generate}>
              {t('mcp.createKey')}
            </Button>
          </Box>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          2. {t('mcp.clientStep')}
        </Typography>
        <Tabs value={client} onChange={(_, v) => setClient(v)} sx={{ mb: 1.5, minHeight: 36 }}>
          <Tab value="claudeCode" label="Claude Code" />
          <Tab value="stdio" label={t('mcp.stdioClients')} />
          <Tab value="vscode" label="VS Code" />
          <Tab value="http" label={t('mcp.otherClients')} />
        </Tabs>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t(`mcp.help.${client}`)}
        </Typography>
        <Box sx={{ position: 'relative' }}>
          <CodeBlock>{text}</CodeBlock>
          <Tooltip title={copied ? t('mcp.copied') : t('admin.copy')}>
            <IconButton size="small" onClick={copy} sx={{ position: 'absolute', top: 6, right: 6 }}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {!key && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            {t('mcp.placeholder', { placeholder: KEY_PLACEHOLDER })}
          </Typography>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t('mcp.tools')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {info?.tools.map((tool) => (
            <Box key={tool.name} sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <CodeTag>{tool.name}</CodeTag>
              <Typography variant="body2" color="text.secondary">
                {tool.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
