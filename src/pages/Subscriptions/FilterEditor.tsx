import { MONO } from '../../theme'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  TextField,
  Typography,
  Button,
  MenuItem,
  IconButton,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Collapse,
  Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { validateExpression } from '../../api/broker'

const OPS = ['==', '!=', '>', '>=', '<', '<=', 'contains', 'matches']
const FIELDS = ['value', 'quality', 'unit', 'source']

interface Row {
  attr: string
  field: string
  op: string
  value: string
}

/** Literal for the expression: numbers/booleans/null as is, everything else quoted. */
function literal(v: string) {
  const s = v.trim()
  if (/^-?\d+(\.\d+)?$/.test(s) || ['true', 'false', 'null'].includes(s)) return s
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function rowToExpr(r: Row) {
  const ref = r.field === 'value' ? r.attr : `${r.attr}.${r.field}`
  return `${ref} ${r.op} ${literal(r.value)}`
}

interface Props {
  value: string
  onChange: (value: string) => void
  knownAttrs: string[]
}

export default function FilterEditor({ value, onChange, knownAttrs }: Props) {
  const { t } = useTranslation()
  const [check, setCheck] = useState<{ valid: boolean; error?: string; attrs?: string[] } | null>(null)
  const [rows, setRows] = useState<Row[]>([{ attr: '', field: 'value', op: '>', value: '' }])
  const [join, setJoin] = useState<'&&' | '||'>('&&')
  const [help, setHelp] = useState(false)

  // Server-side validation, debounced
  useEffect(() => {
    if (!value.trim()) {
      setCheck(null)
      return
    }
    const timer = setTimeout(() => {
      validateExpression(value)
        .then(setCheck)
        .catch(() => setCheck(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [value])

  const setRow = (i: number, changes: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...changes } : r)))

  const complete = rows.filter((r) => r.attr && r.value.trim() !== '')
  const generate = () => onChange(complete.map(rowToExpr).join(` ${join} `))

  return (
    <Box>
      {/* Visual builder */}
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        {t('subs.builder')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
        {rows.map((r, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Autocomplete
              freeSolo
              options={knownAttrs}
              inputValue={r.attr}
              onInputChange={(_, v) => setRow(i, { attr: v })}
              sx={{ width: 180 }}
              renderInput={(params) => <TextField {...params} size="small" label={t('attr.name')} />}
            />
            <TextField select size="small" value={r.field} onChange={(e) => setRow(i, { field: e.target.value })} sx={{ width: 110 }}>
              {FIELDS.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </TextField>
            <TextField select size="small" value={r.op} onChange={(e) => setRow(i, { op: e.target.value })} sx={{ width: 110 }}>
              {OPS.map((o) => (
                <MenuItem key={o} value={o}>
                  {o}
                </MenuItem>
              ))}
            </TextField>
            <TextField size="small" label={t('attr.value')} value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} sx={{ width: 150 }} />
            <IconButton size="small" disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setRows((rs) => [...rs, { attr: '', field: 'value', op: '==', value: '' }])}>
          {t('subs.addCondition')}
        </Button>
        <ToggleButtonGroup size="small" exclusive value={join} onChange={(_, v) => v && setJoin(v)}>
          <ToggleButton value="&&">AND</ToggleButton>
          <ToggleButton value="||">OR</ToggleButton>
        </ToggleButtonGroup>
        <Button size="small" variant="outlined" disabled={!complete.length} onClick={generate}>
          {t('subs.generate')}
        </Button>
      </Box>

      {/* Expression */}
      <TextField
        label={t('subs.expression')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        placeholder="temperature > 80 && status == 'RUN'"
        InputProps={{ sx: { fontFamily: MONO, fontSize: '0.85rem' } }}
        error={check?.valid === false}
        helperText={check?.valid === false ? check.error : t('subs.expressionHelp')}
      />
      {check?.valid && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <CheckCircleIcon fontSize="small" color="success" />
          <Typography variant="caption" color="success.main">
            {t('subs.expressionValid')}
          </Typography>
          {check.attrs?.map((a) => <Chip key={a} size="small" label={a} variant="outlined" />)}
        </Box>
      )}

      <Button size="small" startIcon={<HelpOutlineIcon />} onClick={() => setHelp(!help)} sx={{ mt: 1 }}>
        {t('subs.syntax')}
      </Button>
      <Collapse in={help}>
        <Alert severity="info" icon={false} sx={{ fontSize: '0.8rem', '& code': { fontFamily: MONO } }}>
          <div>
            <code>temperature</code> {t('subs.helpValue')} · <code>temperature.quality</code>, <code>.unit</code>, <code>.ts</code>,{' '}
            <code>.source</code>, <code>.meta.key</code>
          </div>
          <div>
            <code>prev.temperature</code> {t('subs.helpPrev')} · <code>@id</code> <code>@type</code> <code>@version</code>
          </div>
          <div>
            <code>== != &gt; &gt;= &lt; &lt;=</code> · <code>&amp;&amp; || !</code> (and or not) · <code>+ - * / %</code> ·{' '}
            <code>in [..]</code> <code>contains</code> <code>matches '^re'</code>
          </div>
          <div>
            <code>abs round floor ceil min max len lower upper has('a') startsWith endsWith now() age(a.ts)</code>
          </div>
          <div>
            {t('subs.helpExample')}: <code>abs(temperature - prev.temperature) &gt; 5 || age(temperature.ts) &gt; 300</code>
          </div>
        </Alert>
      </Collapse>
    </Box>
  )
}
