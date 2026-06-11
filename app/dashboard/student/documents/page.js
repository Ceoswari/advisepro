'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const DOC_TYPES = [
  { value: 'cv', label: 'Curriculum Vitae (CV)' },
  { value: 'personal_statement', label: 'Personal Statement' },
  { value: 'mspe', label: 'MSPE / Dean\'s Letter' },
  { value: 'other', label: 'Other' },
]

export default function Documents() {
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState(null)
  const [files, setFiles] = useState([])
  const [docType, setDocType] = useState('cv')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserId(user.id)
      await loadFiles(user.id)
      setLoading(false)
    }
    fetchData()
  }, [])

  const loadFiles = async (uid) => {
    const allFiles = []
    for (const type of DOC_TYPES) {
      const { data } = await supabase.storage
        .from('documents')
        .list(`${uid}/${type.value}`, { sortBy: { column: 'created_at', order: 'desc' } })
      if (data) {
        data.forEach(f => allFiles.push({ ...f, docType: type.value, path: `${uid}/${type.value}/${f.name}` }))
      }
    }
    setFiles(allFiles)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10MB.'); return }

    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const path = `${userId}/${docType}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setError(uploadError.message)
    } else {
      await loadFiles(userId)
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownload = async (path, name) => {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60)
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = name
      a.click()
    }
  }

  const handleDelete = async (path) => {
    if (!confirm('Delete this document?')) return
    await supabase.storage.from('documents').remove([path])
    await loadFiles(userId)
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const groupedFiles = DOC_TYPES.map(type => ({
    ...type,
    files: files.filter(f => f.docType === type.value)
  }))

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/student')} className="text-sm text-stone-500 hover:text-stone-900">← Back</button>
        <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-stone-900">AdvisePro</span>
          </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">Documents</h2>
          <p className="text-stone-500 mt-1">Upload your CV, personal statement, and other application materials. Max 10MB per file.</p>
        </div>

        {/* Upload section */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Upload Document</h3>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">File (PDF, DOC, DOCX)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleUpload}
                disabled={uploading}
                className="border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700"
              />
            </div>
            {uploading && <span className="text-sm text-teal-600">Uploading...</span>}
          </div>
          {error && <p className="text-rose-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Files by type */}
        <div className="space-y-4">
          {groupedFiles.map(group => (
            <div key={group.value} className="bg-white rounded-2xl border border-stone-200">
              <div className="px-5 py-3 border-b border-stone-100 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-stone-700">{group.label}</h3>
                <span className="text-xs text-stone-400">{group.files.length} file{group.files.length !== 1 ? 's' : ''}</span>
              </div>
              {group.files.length === 0 ? (
                <div className="px-5 py-4 text-sm text-stone-400">No {group.label.toLowerCase()} uploaded yet.</div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {group.files.map(file => (
                    <div key={file.name} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{file.name.replace(/^\d+_/, '')}</p>
                        <p className="text-xs text-stone-400">
                          {formatSize(file.metadata?.size)}
                          {file.created_at && ` · Uploaded ${new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleDownload(file.path, file.name.replace(/^\d+_/, ''))}
                          className="text-sm text-teal-600 hover:text-teal-800">Download</button>
                        <button onClick={() => handleDelete(file.path)}
                          className="text-sm text-stone-400 hover:text-rose-500">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
