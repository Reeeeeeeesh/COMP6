import { API_BASE_URL as BASE } from '../config'
import apiClient from './apiClient'

// Types matching backend schemas
export interface Team {
  id: string
  name: string
  division?: string | null
  peer_group?: string | null
  created_at: string
  updated_at: string
}

export interface TeamRevenueHistoryRow {
  id: string
  team_id: string
  fiscal_year: number
  revenue: number
  currency?: string | null
  is_adjusted: boolean
  notes?: string | null
  created_at: string
}

export interface RevenueBandSettings {
  wTrend: number
  wConsistency: number
  wRelative?: number | null
  usePeerRelative: boolean
  trendClamp: [number, number]
  sigmaMax: number
  thresholds: Record<string, number>
  multipliers: Record<string, number>
}

export interface RevenueBandConfig {
  id: string
  name: string
  settings: RevenueBandSettings
  created_at: string
  updated_at: string
}

export interface BandPreviewComponents {
  g1?: number
  g2?: number
  g3?: number
  cagr?: number
  momentum?: number
  volatility?: number
  trend_score?: number
  consistency_score?: number
  relative_score?: number
  used_peer_relative: boolean
  used_robust_trend: boolean
  confidence_penalty?: number
}

export interface BandPreview {
  team_id: string
  config_id?: string | null
  composite_score: number
  band: string
  multiplier: number
  components: BandPreviewComponents
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data: T
  error?: string
}

const BASE_URL = `${BASE}/api/v1/revenue-banding`

export async function listTeams(): Promise<Team[]> {
  const res = await apiClient.get(`${BASE_URL}/teams`)
  const json: ApiResponse<Team[]> = res.data
  if (!json.success) throw new Error(json.message || 'Failed to list teams')
  return json.data
}

export async function getTeamHistory(teamId: string): Promise<TeamRevenueHistoryRow[]> {
  const res = await apiClient.get(`${BASE_URL}/teams/${encodeURIComponent(teamId)}/history`)
  const json: ApiResponse<TeamRevenueHistoryRow[]> = res.data
  if (!json.success) throw new Error(json.message || 'Failed to get team history')
  return json.data
}

export async function listConfigs(): Promise<RevenueBandConfig[]> {
  const res = await apiClient.get(`${BASE_URL}/configs`)
  const json: ApiResponse<RevenueBandConfig[]> = res.data
  if (!json.success) throw new Error(json.message || 'Failed to list configs')
  return json.data
}

export async function previewBand(teamId: string, configId?: string): Promise<BandPreview> {
  const url = new URL(`${BASE_URL}/preview`)
  url.searchParams.set('team_id', teamId)
  if (configId) url.searchParams.set('config_id', configId)
  const res = await apiClient.get(url.toString())
  const json: ApiResponse<BandPreview> = res.data
  if (!json.success) throw new Error(json.message || 'Failed to preview band')
  return json.data
}

// Backward-compatible aliases to match existing component imports
export const getTeams = listTeams
export const getConfigs = listConfigs

// Admin helpers used by RevenueBandingAdmin
export async function createTeam(body: Partial<Team> & { name: string }): Promise<Team> {
  const res = await apiClient.post(`${BASE_URL}/teams`, body)
  const json: ApiResponse<Team> = res.data
  if (!json.success || !json.data) throw new Error(json.message || 'Failed to create team')
  return json.data
}

export async function updateTeam(id: string, body: Partial<Team>): Promise<Team> {
  const res = await apiClient.put(`${BASE_URL}/teams/${encodeURIComponent(id)}`, body)
  const json: ApiResponse<Team> = res.data
  if (!json.success || !json.data) throw new Error(json.message || 'Failed to update team')
  return json.data
}

export async function deleteTeam(id: string): Promise<void> {
  const res = await apiClient.delete(`${BASE_URL}/teams/${encodeURIComponent(id)}`)
  const json: ApiResponse = res.data
  if (!json.success) throw new Error(json.message || 'Failed to delete team')
}

export async function createConfig(body: { name: string; settings: RevenueBandSettings }): Promise<RevenueBandConfig> {
  const res = await apiClient.post(`${BASE_URL}/configs`, body)
  const json: ApiResponse<RevenueBandConfig> = res.data
  if (!json.success || !json.data) throw new Error(json.message || 'Failed to create config')
  return json.data
}

export async function updateConfig(id: string, body: Partial<RevenueBandConfig>): Promise<RevenueBandConfig> {
  const res = await apiClient.put(`${BASE_URL}/configs/${encodeURIComponent(id)}`, body)
  const json: ApiResponse<RevenueBandConfig> = res.data
  if (!json.success || !json.data) throw new Error(json.message || 'Failed to update config')
  return json.data
}

export async function deleteConfig(id: string): Promise<void> {
  const res = await apiClient.delete(`${BASE_URL}/configs/${encodeURIComponent(id)}`)
  const json: ApiResponse = res.data
  if (!json.success) throw new Error(json.message || 'Failed to delete config')
}

