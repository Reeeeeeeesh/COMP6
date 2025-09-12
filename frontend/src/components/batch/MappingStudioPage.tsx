import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PersonaLayout } from '../common/PersonaLayout'
import MappingStudio from './MappingStudio'
import type { ColumnInfo } from './BatchUploadContainer'
import { API_BASE_URL } from '../../config'

// Using ColumnInfo from BatchUploadContainer to keep type parity

interface MappingStudioPageProps {
  sessionId: string
}

const MappingStudioPage: React.FC<MappingStudioPageProps> = ({ sessionId }) => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const urlUploadId = params.get('uploadId') || undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columns, setColumns] = useState<ColumnInfo[] | null>(null)

  const [activeUploadId, setActiveUploadId] = useState<string | undefined>(urlUploadId)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        setLoading(true)
        setError(null)

        // Resolve uploadId: prefer URL param; otherwise fetch recent uploads for this session
        let resolvedUploadId = urlUploadId
        if (!resolvedUploadId) {
          const listRes = await fetch(`${API_BASE_URL}/api/v1/batch/uploads?session_id=${encodeURIComponent(sessionId)}`)
          if (!listRes.ok) throw new Error(`Failed to list uploads (${listRes.status})`)
          const listJson = await listRes.json()
          if (listJson?.success && Array.isArray(listJson.data?.uploads) && listJson.data.uploads.length > 0) {
            // Pick most recently updated
            const uploads = listJson.data.uploads as Array<{ id: string; updated_at: string; status: string }>
            uploads.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            resolvedUploadId = uploads[0].id
          }
        }

        if (!resolvedUploadId) {
          setColumns(null)
          setError(null)
          if (!cancelled) setLoading(false)
          return
        }

        setActiveUploadId(resolvedUploadId)

        // Fetch columns for chosen upload
        const colRes = await fetch(`${API_BASE_URL}/api/v1/batch/uploads/${resolvedUploadId}/columns`)
        if (!colRes.ok) throw new Error(`Failed to load columns (${colRes.status})`)
        const colJson = await colRes.json()
        if (!colJson?.success) throw new Error(colJson?.error || 'Failed to load columns')
        const cols = (colJson.data?.columns || []) as ColumnInfo[]
        setColumns(cols)
      } catch (e: any) {
        setError(e?.message || 'Failed to load mapping data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    boot()
    return () => { cancelled = true }
  }, [sessionId, urlUploadId])

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="p-6 text-gray-600">Loading mapping studio…</div>
      )
    }
    if (error) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )
    }
    if (!columns || columns.length === 0) {
      return (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          <div className="mb-3 font-medium">No upload selected or no columns available.</div>
          <div className="text-sm mb-4">
            Please upload a CSV first, then return here. You can:
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => navigate('/batch?browse=1')}
            >
              Upload New Data
            </button>
            <button
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => navigate('/batch')}
            >
              Go to Upload Wizard
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-600">
            Debug: sessionId={sessionId}, activeUploadId={activeUploadId}
          </div>
        </div>
      )
    }

    return (
      <MappingStudio
        columns={columns}
        onMappingComplete={() => navigate('/batch')}
        onCancel={() => navigate('/batch')}
        title={activeUploadId ? `Visual Mapping Studio (Upload ${activeUploadId.slice(0,8)}…)` : 'Visual Mapping Studio'}
      />
    )
  }, [loading, error, columns, navigate, activeUploadId])

  return (
    <PersonaLayout
      title="Column Mapping"
      breadcrumbs={[
        { label: 'Data Hub', path: '/batch' },
        { label: 'Column Mapping', path: '/mapping-studio' }
      ]}
    >
      {content}
    </PersonaLayout>
  )
}

export default MappingStudioPage
