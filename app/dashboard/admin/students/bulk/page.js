'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardNav from '@/app/components/DashboardNav'
import { supabase } from '@/lib/supabase'

const TEMPLATE_HEADERS = 'full_name,email,banner_id,graduation_year,specialty_interest'
const TEMPLATE_EXAMPLE = [
  'Jane Smith,jane.smith@rowan.edu,916405336,2029,',
  'John Doe,john.doe@rowan.edu,916405337,2028,',
  'Alex Lee,alex.lee@rowan.edu,916405338,2027,Emergency Medicine',
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

function validateRows(rows) {
  const errs = []
  rows.forEach((row, i) => {
    if (!row.full_name) errs.push(`Row ${i + 2}: missing full_name`)
    if (!row.email) errs.push(`Row ${i + 2}: missing email`)
    if (row.email && !row.email.includes('@')) errs.push(`Row ${i + 2}: invalid email`)
    if (!row.banner_id) errs.push(`Row ${i + 2}: missing banner_id`)
    if (row.graduation_year && isNaN(parseInt(row.graduation_year))) errs.push(`Row ${i + 2}: graduation_year must be a 4-digit year`)
  })
  return errs
}

export default function BulkUpload() {
  const router = useRouter()
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [csvText, setCsvText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState(0)

  function processText(text, name = '') {
    const { rows } = parseCSV(text)
    const errs = validateRows(rows)
    setErrors(errs)
    setPreview(rows)
    setResults([])
    setDone(false)
    if (name) setFileName(name)
  }

  function handleFileInput(file) {
    if (!file || !file.name.endsWith('.csv')) {
      setErrors(['Please select a .csv file.'])
      return
    }
    const reader = new FileReader()
    reader.onload = e => processText(e.target.result, file.name)
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    handleFileInput(file)
  }

  function handlePasteChange(text) {
    setCsvText(text)
    setPreview([])
    setResults([])
    setDone(false)
    setFileName('')
  }

  function handleParsePaste() {
    processText(csvText)
  }

  function reset() {
    setCsvText('')
    setPreview([])
    setResults([])
    setDone(false)
    setErrors([])
    setFileName('')
    if (fileRef.current) fileRef.current.value = ''
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
            banner_id: row.banner_id || null,
            graduation_year: row.graduation_year || null,
            class_year: row.class_year || null,
            specialty_interest: row.specialty_interest || null,
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
    <div className="min-h-screen bg-stone-50">
      <DashboardNav backHref="/dashboard/admin" />

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">Bulk Import Students</h2>
          <p className="text-stone-500 mt-1">Upload a CSV file to create multiple student accounts at once. Each student will receive a temporary password of <code className="bg-stone-100 px-1 rounded text-xs">ChangeMe123!</code> and should reset it on first login.</p>
        </div>

        {/* Template download */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-teal-900">Need the template?</p>
            <p className="text-xs text-teal-700 mt-0.5">
              Columns: <code className="bg-teal-100 px-1 rounded">full_name</code>, <code className="bg-teal-100 px-1 rounded">email</code>, <code className="bg-teal-100 px-1 rounded">banner_id</code>, <code className="bg-teal-100 px-1 rounded">graduation_year</code>, <code className="bg-teal-100 px-1 rounded">specialty_interest</code>
            </p>
          </div>
          <button onClick={downloadTemplate}
            className="text-sm bg-teal-600 text-white px-3 py-1.5 rounded-xl hover:bg-teal-700 flex-shrink-0 ml-4">
            Download Template
          </button>
        </div>

        {/* File upload */}
        {!preview.length && !done && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-4">
            {/* Drop zone */}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => handleFileInput(e.target.files?.[0])}
            />
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-stone-200 hover:border-teal-300 hover:bg-stone-50'
              }`}>
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">📄</div>
              <p className="text-sm font-medium text-stone-700">Drop your CSV here, or click to browse</p>
              <p className="text-xs text-stone-400 mt-1">Accepts .csv files</p>
            </div>

            {/* Paste toggle */}
            <div className="mt-4 pt-4 border-t border-stone-100">
              <button
                onClick={() => setShowPaste(p => !p)}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                {showPaste ? '▲ Hide' : '▼ Or paste CSV text instead'}
              </button>
              {showPaste && (
                <div className="mt-3">
                  <textarea
                    value={csvText}
                    onChange={e => handlePasteChange(e.target.value)}
                    rows={6}
                    placeholder={TEMPLATE_HEADERS + '\n' + TEMPLATE_EXAMPLE}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleParsePaste}
                    disabled={!csvText.trim()}
                    className="mt-2 bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-700 disabled:opacity-50">
                    Preview
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loaded file indicator */}
        {fileName && preview.length > 0 && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="text-sm text-stone-500">📄 {fileName}</span>
            <button onClick={reset} className="text-xs text-stone-400 hover:text-rose-500 transition-colors">✕ Remove</button>
          </div>
        )}

        {/* Import button shown above preview when ready */}
        {preview.length > 0 && errors.length === 0 && !done && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-stone-500">{preview.length} student{preview.length !== 1 ? 's' : ''} ready to import</p>
            <button onClick={handleUpload} disabled={running}
              className="bg-teal-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {running ? `Creating… (${progress}/${preview.length})` : `Create ${preview.length} Student${preview.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-red-800 mb-2">Fix these errors before importing:</p>
            <ul className="space-y-1">
              {errors.map((e, i) => <li key={i} className="text-xs text-rose-700">• {e}</li>)}
            </ul>
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && errors.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 mb-4">
            <div className="px-5 py-3 border-b border-stone-100 flex justify-between items-center">
              <p className="text-sm font-semibold text-stone-700">Preview — {preview.length} students</p>
              {!done && <p className="text-xs text-stone-400">Review before importing</p>}
            </div>
            <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
              {preview.map((row, i) => {
                const result = results[i]
                return (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{row.full_name}</p>
                      <p className="text-xs text-stone-500">{row.email} · Banner: {row.banner_id || '—'}{row.graduation_year ? ` · Class of ${row.graduation_year}` : ''}{row.class_year ? ` · ${row.class_year}` : ''}</p>
                    </div>
                    {result && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${result.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
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
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
            <div className="flex justify-between text-sm text-stone-600 mb-2">
              <span>Creating accounts...</span>
              <span>{progress} / {preview.length}</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${(progress / preview.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Done summary */}
        {done && (
          <div className={`rounded-lg border p-5 ${errorCount === 0 ? 'bg-emerald-50 border-green-200' : 'bg-amber-50 border-yellow-200'}`}>
            <p className="font-semibold text-stone-900 mb-1">Import complete</p>
            <p className="text-sm text-stone-700">
              {successCount > 0 && <span className="text-emerald-700">{successCount} student{successCount !== 1 ? 's' : ''} created successfully. </span>}
              {errorCount > 0 && <span className="text-rose-700">{errorCount} failed (see above). </span>}
            </p>
            <div className="flex gap-3 mt-3">
              <button onClick={() => router.push('/dashboard/admin')}
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-700">
                Go to Students
              </button>
              <button onClick={reset}
                className="text-sm border border-stone-200 text-stone-600 px-4 py-2 rounded-xl hover:bg-stone-50">
                Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
