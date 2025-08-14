import React, { useEffect, useState } from 'react'
import { Box, Paper, Typography, Divider, Select, MenuItem, InputLabel, FormControl, Button, Alert, TextField, IconButton, Stack, FormHelperText } from '@mui/material'
import { getTeams, getConfigs, previewBand, Team, RevenueBandConfig, BandPreview, createTeam, updateTeam, deleteTeam, createConfig, updateConfig, deleteConfig } from '../../services/revenueBandingService'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import { validateRevenueBandSettings } from '../../utils/revenueBandSettings'

const RevenueBandingAdmin: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([])
  const [configs, setConfigs] = useState<RevenueBandConfig[]>([])
  const [teamId, setTeamId] = useState<string>('')
  const [configId, setConfigId] = useState<string>('')
  const [preview, setPreview] = useState<BandPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newTeam, setNewTeam] = useState({ name: '', division: '', peer_group: '' })
  const [newConfig, setNewConfig] = useState({ name: '', settings: '{"wTrend":0.7,"wConsistency":0.3,"trendClamp":[-0.5,0.5],"sigmaMax":0.6,"thresholds":{"A":80,"B":65,"C":50,"D":35},"multipliers":{"A":1.5,"B":1.2,"C":1.0,"D":0.7,"E":0.4}}' })
  const defaultSettingsJson = '{"wTrend":0.7,"wConsistency":0.3,"trendClamp":[-0.5,0.5],"sigmaMax":0.6,"thresholds":{"A":80,"B":65,"C":50,"D":35},"multipliers":{"A":1.5,"B":1.2,"C":1.0,"D":0.7,"E":0.4}}'

  useEffect(() => {
    Promise.all([getTeams(), getConfigs()])
      .then(([t, c]) => {
        setTeams(t)
        setConfigs(c)
        if (t.length) setTeamId(t[0].id)
        if (c.length) setConfigId(c[0].id)
      })
      .catch((e) => setError(String(e)))
  }, [])

  const handlePreview = async () => {
    try {
      setError(null)
      if (!teamId) throw new Error('Select a team')
      const p = await previewBand(teamId, configId || undefined)
      setPreview(p)
    } catch (e: any) {
      setError(e?.message || String(e))
    }
  }

  // ---------------------
  // Client-side settings validation (mirrors backend schema)
  // ---------------------
  const validateSettings = (settings: any): string[] => validateRevenueBandSettings(settings)

  const refreshAll = async () => {
    const [t, c] = await Promise.all([getTeams(), getConfigs()])
    setTeams(t)
    setConfigs(c)
  }

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return
    await createTeam({ name: newTeam.name.trim(), division: newTeam.division || undefined, peer_group: newTeam.peer_group || undefined })
    setNewTeam({ name: '', division: '', peer_group: '' })
    await refreshAll()
  }

  const handleUpdateTeam = async (t: Team) => {
    await updateTeam(t.id, { name: t.name, division: t.division, peer_group: t.peer_group })
    await refreshAll()
  }

  const handleDeleteTeam = async (id: string) => {
    await deleteTeam(id)
    if (teamId === id) setTeamId('')
    await refreshAll()
  }

  const handleCreateConfig = async () => {
    if (!newConfig.name.trim()) return
    let settings: any
    try {
      settings = JSON.parse(newConfig.settings)
    } catch (e) {
      setError('Settings must be valid JSON')
      return
    }
    const errs = validateSettings(settings)
    if (errs.length) {
      setError(`Invalid settings: ${errs.join('; ')}`)
      return
    }
    await createConfig({ name: newConfig.name.trim(), settings })
    setNewConfig({ name: '', settings: '{"wTrend":0.7,"wConsistency":0.3,"trendClamp":[-0.5,0.5],"sigmaMax":0.6,"thresholds":{"A":80,"B":65,"C":50,"D":35},"multipliers":{"A":1.5,"B":1.2,"C":1.0,"D":0.7,"E":0.4}}' })
    await refreshAll()
  }

  const handleUpdateConfig = async (c: RevenueBandConfig) => {
    const errs = validateSettings(c.settings as any)
    if (errs.length) {
      setError(`Invalid settings: ${errs.join('; ')}`)
      return
    }
    await updateConfig(c.id, { name: c.name, settings: c.settings as any })
    await refreshAll()
  }

  const handleDeleteConfig = async (id: string) => {
    await deleteConfig(id)
    if (configId === id) setConfigId('')
    await refreshAll()
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5">Revenue Banding Admin</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="team-label">Team</InputLabel>
          <Select labelId="team-label" label="Team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={1}>
          <TextField label="New Team Name" size="small" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} />
          <TextField label="Division" size="small" value={newTeam.division} onChange={(e) => setNewTeam({ ...newTeam, division: e.target.value })} />
          <TextField label="Peer Group" size="small" value={newTeam.peer_group} onChange={(e) => setNewTeam({ ...newTeam, peer_group: e.target.value })} />
          <Button variant="outlined" onClick={handleCreateTeam}>Add Team</Button>
        </Stack>
        {teams.map((t) => (
          <Stack key={t.id} direction="row" spacing={1} alignItems="center">
            <TextField size="small" label="Name" value={t.name} onChange={(e) => setTeams(teams.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))} />
            <TextField size="small" label="Division" value={t.division || ''} onChange={(e) => setTeams(teams.map(x => x.id === t.id ? { ...x, division: e.target.value } : x))} />
            <TextField size="small" label="Peer Group" value={t.peer_group || ''} onChange={(e) => setTeams(teams.map(x => x.id === t.id ? { ...x, peer_group: e.target.value } : x))} />
            <IconButton onClick={() => handleUpdateTeam(t)} color="primary"><SaveIcon /></IconButton>
            <IconButton onClick={() => handleDeleteTeam(t.id)} color="error"><DeleteIcon /></IconButton>
          </Stack>
        ))}
        <FormControl fullWidth>
          <InputLabel id="config-label">Config</InputLabel>
          <Select labelId="config-label" label="Config" value={configId} onChange={(e) => setConfigId(e.target.value)}>
            <MenuItem value="">Default Config</MenuItem>
            {configs.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField label="New Config Name" size="small" value={newConfig.name} onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })} />
          <TextField label="Settings (JSON)" size="small" fullWidth value={newConfig.settings} onChange={(e) => setNewConfig({ ...newConfig, settings: e.target.value })} />
          <Button variant="text" size="small" onClick={() => setNewConfig({ ...newConfig, settings: defaultSettingsJson })}>Insert defaults</Button>
          <Button variant="outlined" onClick={handleCreateConfig}>Add Config</Button>
        </Stack>
        <FormHelperText sx={{ mt: -1 }}>
          Keys: wTrend, wConsistency, optional wRelative/usePeerRelative; trendClamp [lo, hi]; sigmaMax &gt; 0; thresholds (A-D);
          multipliers (A-E, &gt; 0).
        </FormHelperText>
        {configs.map((c) => (
          <Stack key={c.id} direction="row" spacing={1} alignItems="center">
            <TextField size="small" label="Name" value={c.name} onChange={(e) => setConfigs(configs.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} />
            <TextField size="small" label="Settings (JSON)" fullWidth value={JSON.stringify(c.settings)} onChange={(e) => {
              let parsed: any
              try { parsed = JSON.parse(e.target.value) } catch { parsed = c.settings }
              setConfigs(configs.map(x => x.id === c.id ? { ...x, settings: parsed } : x))
            }} />
            <Button variant="text" size="small" onClick={() => {
              try {
                const parsed = JSON.parse(defaultSettingsJson)
                setConfigs(configs.map(x => x.id === c.id ? { ...x, settings: parsed } : x))
              } catch {}
            }}>Insert defaults</Button>
            <IconButton onClick={() => handleUpdateConfig(c)} color="primary"><SaveIcon /></IconButton>
            <IconButton onClick={() => handleDeleteConfig(c.id)} color="error"><DeleteIcon /></IconButton>
          </Stack>
        ))}
        <Button variant="contained" onClick={handlePreview}>Preview Band</Button>
      </Paper>

      {preview && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Preview</Typography>
          <Typography>Band: <strong>{preview.band}</strong> (x{preview.multiplier.toFixed(2)})</Typography>
          <Typography>Composite Score: {preview.composite_score.toFixed(2)}</Typography>
          <Divider sx={{ my: 2 }} />
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(preview.components, null, 2)}</pre>
        </Paper>
      )}
    </Box>
  )
}

export default RevenueBandingAdmin


