'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TEMPLATE_HEADERS = 'full_name,email,class_year,specialty_interest,usmle_step2_score,usmle_step1_score,usmle_step1_status,research_count,volunteer_hours'
const TEMPLATE_EXAMPLE = [
  'Jane Smith,jane.smith@cooperhealth.edu,MS3,Internal Medicine,245,,,2,120',
  'John Doe,john.doe@cooperhealth.edu,MS2,,,,not_taken,0,0',
  'Alex Lee,alex.lee@cooperhealth.edu,MS4,Dermatology,258,240,pass,5,200',
].join('\n')

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] || '' })
    return obj
  })
  return { headers, rows }
}

export default function BulkUpload() {
  const router = useRouter()
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleParse = () => {
    const { rows } = parseCSV(csvText)
    const errs = []
    rows.forEach((row, i) => {
      if (!row.full_name) errs.push(`Row ${i + 2}: missing full_name`)
      if (!row.email) errs.push(`Row ${i + 2}: missing email`)
      if (row.email && !row.email.includes('@')) errs.push(`Row ${i + 2}: invalid email`)
    })
    setErrors(errs)
    setPreview(rows)
    setResults([])
    setDone(false)
  }

  const handleUpload = async () => {
    if (errors.length > 0 || preview.length === 0) return
    setRunning(true)
    setProgress(0)
    const res = []

    for (let i = 0; i < preview.length; i++) {
      const row = preview[i]
      try {
        const resp = await fetch('/api/create-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: row.full_name,
            email: row.email,
            class_year: row.class_year || null,
            specialty_interest: row.specialty_interest || null,
            usmle_step2_score: row.usmle_step2_score || null,
            usmle_step1_score: row.usmle_step1_score || null,
            usmle_step1_status: row.usmle_step1_status || 'not_taken',
            research_count: row.research_count || 0,
            volunteer_hours: row.volunteer_hours || 0,
          })
        })
        const data = await resp.json()
        if (data.error) {
          res.push({ name: row.full_name, email: row.email, status: 'error', message: data.error })
        } else {
          res.push({ name: row.full_name, email: row.email, status: 'success' })
        }
      } catch (e) {
        res.push({ name: row.full_name, email: row.email, status: 'error', message: e.message })
      }
      setProgress(i + 1)
      setResults([...res])
    }

    setRunning(false)
    setDone(true)
  }

  const downloadTemplate = () => {
    const content = TEMPLATE_HEADERS + '\n' + TEMPLATE_EXAMPLE
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'advisepro_student_template.csv'
    a.click()
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/admin')} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
        <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
        <span className="text-sm text-gray-400">· Bulk Student Import</span>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Bulk Import Students</h2>
          <p className="text-gray-500 mt-1">Upload a CSV file to create multiple student accounts at once. Each student will receive a temporary password of <code className="bg-gray-100 px-1 rounded text-xs">ChangeMe123!</code> and should reset it on first login.</p>
        </div>

        {/* Template download */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Start with the template</p>
            <p className="text-xs text-blue-700 mt-0.5">Download the CSV template, fill it in, then paste or upload it below.</p>
          </div>
          <button onClick={downloadTemplate}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 flex-shrink-0 ml-4">
            Download Template
          </button>
        </div>

        {/* CSV input */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Paste CSV content</label>
          <p className="text-xs text-gray-400 mb-2">Required columns: <code className="bg-gray-100 px-1 rounded">full_name</code>, <code className="bg-gray-100 px-1 rounded">email</code>. All others optional.</p>
          <textarea
            value={csvText}
            onChange={e => { setCsvText(e.target.value); setPreview([]); setResults([]); setDone(false) }}
            rows={8}
            placeholder={TEMPLATE_HEADERS + '\n' + TEMPLATE_EXAMPLE}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3 mt-3">
            <button onClick={handleParse} disabled={!csvText.trim()}
              className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              Preview
            </button>
            {preview.length > 0 && errors.length === 0 && !done && (
              <button onClick={handleUpload} disabled={running}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {running ? `Creating... (${progress}/${preview.length})` : `Create ${preview.length} Student${preview.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-red-800 mb-2">Fix these errors before importing:</p>
            <ul className="space-y-1">
              {errors.map((e, i) => <li key={i} className="text-xs text-red-700">• {e}</li>)}
            </ul>
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && errors.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 mb-4">
            <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
              <p className="text-sm font-semibold text-gray-700">Preview — {preview.length} students</p>
              {!done && <p className="text-xs text-gray-400">Review before importing</p>}
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {preview.map((row, i) => {
                const result = results[i]
                return (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{row.full_name}</p>
                      <p className="text-xs text-gray-500">{row.email} {row.class_year ? `· ${row.class_year}` : ''} {row.specialty_interest ? `· ${row.specialty_interest}` : ''}</p>
                    </div>
                    {result && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${result.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {result.status === 'success' ? '✓ Created' : `✗ ${result.message}`}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {running && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Creating accounts...</span>
              <span>{progress} / {preview.length}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(progress / preview.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Done summary */}
        {done && (
          <div className={`rounded-lg border p-5 ${errorCount === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <p className="font-semibold text-gray-900 mb-1">Import complete</p>
            <p className="text-sm text-gray-700">
              {successCount > 0 && <span className="text-green-700">{successCount} student{successCount !== 1 ? 's' : ''} created successfully. </span>}
              {errorCount > 0 && <span className="text-red-700">{errorCount} failed (see above). </span>}
            </p>
            <div className="flex gap-3 mt-3">
              <button onClick={() => router.push('/dashboard/admin')}
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                Go to Students
              </button>
              <button onClick={() => { setCsvText(''); setPreview([]); setResults([]); setDone(false); setErrors([]) }}
                className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-50">
                Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
