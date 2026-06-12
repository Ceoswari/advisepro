'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardNav from '@/app/components/DashboardNav'

// Determine step 1 outcome from the two attempt columns
function getStep1Result(firstAttempt, secondAttempt) {
  const first = (firstAttempt || '').trim().toLowerCase()
  const second = (secondAttempt || '').trim().toLowerCase()

  if (first === 'pass') return { status: 'pass', attempts: 1 }
  if (first === 'unsuccessful') {
    if (second === 'pass') return { status: 'pass', attempts: 2 }
    if (second === 'unsuccessful') return { status: 'fail', attempts: 2 }
    // First attempt unsuccessful, no second attempt recorded yet
    return { status: 'fail', attempts: 1 }
  }
  return null
}

// Parse NBME Step 1 export CSV
// Row 0: Title row — skip
// Row 1: Headers — skip
// Remaining: student rows; skip if first col starts with "Note:" or both name cols are blank
function parseStep1CSV(text) {
  const rows = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const students = []

  for (let i = 0; i < rows.length; i++) {
    if (i === 0 || i === 1) continue // title + header

    const cols = rows[i].split(',').map(c => c.replace(/^"|"$/g, '').trim())

    const lastName = cols[0] || ''
    const firstName = cols[1] || ''

    if (!lastName && !firstName) continue
    if (lastName.toLowerCase().startsWith('note')) continue
    if (lastName.toLowerCase().startsWith('class of')) continue

    const result = getStep1Result(cols[2], cols[3])
    if (!result) continue

    students.push({ lastName, firstName, ...result })
  }

  return students
}

const STATUS_LABELS = {
  matched:   { label: 'Matched',        color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  ambiguous: { label: 'Multiple found', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  not_found: { label: 'Not found',      color: 'bg-rose-50 text-rose-700 border-rose-100' },
}

export default function Step1Import() {
  const fileRef = useRef(null)
  const [step, setStep] = useState(1) // 1 = upload, 2 = preview, 3 = done
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')

  async function processFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) { setError('Please select a .csv file.'); return }
    setError('')
    setFileName(file.name)
    const text = await file.text()
    await parseAndMatch(text)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files?.[0])
  }

  async function handleFile(e) {
    processFile(e.target.files?.[0])
  }

  async function parseAndMatch(text) {
    const parsed = parseStep1CSV(text)

    if (parsed.length === 0) {
      setError('No student rows found in this file. Check that you uploaded the correct NBME Step 1 export.')
      return
    }

    // Fetch all students with profile names for matching
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'student')

    if (profileErr) { setError('Could not load student profiles: ' + profileErr.message); return }

    const { data: students } = await supabase
      .from('students')
      .select('id, profile_id')

    // Build map: normalized full_name → [{ profile_id, student_id }]
    const nameMap = new Map()
    for (const p of (profiles || [])) {
      const key = (p.full_name || '').toLowerCase().trim()
      const student = (students || []).find(s => s.profile_id === p.id)
      if (!student) continue
      if (!nameMap.has(key)) nameMap.set(key, [])
      nameMap.get(key).push({ profileId: p.id, studentId: student.id, fullName: p.full_name })
    }

    // Match each CSV row
    const matched = parsed.map(row => {
      const key = `${row.firstName} ${row.lastName}`.toLowerCase().trim()
      const hits = nameMap.get(key) || []

      let matchStatus, studentId, displayName
      if (hits.length === 1) {
        matchStatus = 'matched'
        studentId = hits[0].studentId
        displayName = hits[0].fullName
      } else if (hits.length > 1) {
        matchStatus = 'ambiguous'
        displayName = hits.map(h => h.fullName).join(', ')
      } else {
        matchStatus = 'not_found'
      }

      return { ...row, matchStatus, studentId: studentId || null, displayName: displayName || null }
    })

    setRows(matched)
    setStep(2)
  }

  async function handleImport() {
    setImporting(true)
    setError('')
    const toImport = rows.filter(r => r.matchStatus === 'matched')
    let count = 0

    for (const row of toImport) {
      const { error: err } = await supabase
        .from('students')
        .update({
          usmle_step1_status: row.status,
          usmle_step1_attempts: row.attempts,
        })
        .eq('id', row.studentId)

      if (!err) count++
    }

    setImportedCount(count)
    setImporting(false)
    setStep(3)
  }

  const matchedCount   = rows.filter(r => r.matchStatus === 'matched').length
  const ambiguousCount = rows.filter(r => r.matchStatus === 'ambiguous').length
  const notFoundCount  = rows.filter(r => r.matchStatus === 'not_found').length

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav backHref="/dashboard/admin/import" />

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">Import USMLE Step 1 Results</h2>
          <p className="text-stone-500 mt-1">
            Upload the NBME class Step 1 results export. Students are matched by first and last name.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {['Upload file', 'Review matches', 'Done'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step > i + 1 ? 'bg-teal-500 text-white' :
                step === i + 1 ? 'bg-teal-600 text-white' :
                'bg-stone-200 text-stone-400'
              }`}>{step > i + 1 ? '✓' : i + 1}</div>
              <span className={`text-sm ${step === i + 1 ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>{label}</span>
              {i < 2 && <span className="text-stone-200 mx-1">›</span>}
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-stone-100 p-6">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl px-6 py-12 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-stone-200 hover:border-teal-300 hover:bg-stone-50'
              }`}>
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🩺</div>
              <p className="text-sm font-medium text-stone-700">Drop your CSV here, or click to browse</p>
              <p className="text-xs text-stone-400 mt-1">NBME Step 1 class export · .csv files only</p>
            </div>

            {error && (
              <p className="mt-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>
            )}

            <div className="mt-5 bg-stone-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-stone-600 mb-2">Expected file format</p>
              <div className="font-mono text-xs text-stone-500 space-y-1">
                <p>Row 1: Class of [Year] Step 1 Analysis…  <span className="text-stone-300">(title — skipped)</span></p>
                <p>Row 2: Last Name, First Name, Step 1 (First Attempt, Step 1 (Second Attempt  <span className="text-stone-300">(headers)</span></p>
                <p>Row 3+: Smith, Jane, Pass,  <span className="text-stone-300">(passed first try)</span></p>
                <p>Row 3+: Doe, John, Unsuccessful, Pass  <span className="text-stone-300">(passed second try)</span></p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 2 && fileName && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="text-sm text-stone-500">📄 {fileName}</span>
            <button
              onClick={() => { setStep(1); setRows([]); setFileName(''); if (fileRef.current) fileRef.current.value = '' }}
              className="text-xs text-stone-400 hover:text-rose-500 transition-colors">✕ Remove</button>
          </div>
        )}
        {step === 2 && (
          <div>
            {/* Summary bar */}
            <div className="flex gap-4 mb-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex-1 text-center">
                <p className="text-2xl font-bold text-emerald-700">{matchedCount}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Matched — will import</p>
              </div>
              <div className={`border rounded-xl px-4 py-3 flex-1 text-center ${ambiguousCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-stone-50 border-stone-100 opacity-50'}`}>
                <p className={`text-2xl font-bold ${ambiguousCount > 0 ? 'text-amber-700' : 'text-stone-400'}`}>{ambiguousCount}</p>
                <p className={`text-xs mt-0.5 ${ambiguousCount > 0 ? 'text-amber-600' : 'text-stone-400'}`}>Multiple matches — skipped</p>
              </div>
              <div className={`border rounded-xl px-4 py-3 flex-1 text-center ${notFoundCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-stone-50 border-stone-100 opacity-50'}`}>
                <p className={`text-2xl font-bold ${notFoundCount > 0 ? 'text-rose-700' : 'text-stone-400'}`}>{notFoundCount}</p>
                <p className={`text-xs mt-0.5 ${notFoundCount > 0 ? 'text-rose-600' : 'text-stone-400'}`}>Not found — skipped</p>
              </div>
            </div>

            {(ambiguousCount > 0 || notFoundCount > 0) && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 flex gap-3">
                <span className="text-amber-500 flex-shrink-0">⚠</span>
                <p className="text-sm text-amber-700">
                  {ambiguousCount > 0 && `${ambiguousCount} student${ambiguousCount !== 1 ? 's have' : ' has'} duplicate names in AdvisePro and will be skipped. `}
                  {notFoundCount > 0 && `${notFoundCount} name${notFoundCount !== 1 ? 's were' : ' was'} not found — check spelling or add them to AdvisePro first.`}
                </p>
              </div>
            )}

            {/* Preview table */}
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Student</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Step 1 Result</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Attempts</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const s = STATUS_LABELS[row.matchStatus]
                      return (
                        <tr key={i} className="border-b border-stone-50 last:border-0">
                          <td className="px-5 py-3">
                            <p className="font-medium text-stone-900">{row.firstName} {row.lastName}</p>
                            {row.displayName && row.matchStatus === 'matched' && (
                              <p className="text-xs text-stone-400">→ {row.displayName}</p>
                            )}
                            {row.matchStatus === 'ambiguous' && (
                              <p className="text-xs text-amber-600">Matches: {row.displayName}</p>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              row.status === 'pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {row.status === 'pass' ? 'Pass' : 'Did not pass'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-stone-700">
                            {row.attempts === 1 ? '1st attempt' : '2nd attempt'}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${s.color}`}>
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(1); setRows([]); setFileName(''); if (fileRef.current) fileRef.current.value = '' }}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm hover:bg-stone-50">
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={matchedCount === 0 || importing}
                className="bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {importing ? 'Importing…' : `Import ${matchedCount} student${matchedCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
            <h3 className="text-lg font-semibold text-stone-900 mb-1">Import complete</h3>
            <p className="text-stone-500 text-sm mb-6">
              Step 1 results updated for <span className="font-semibold text-stone-800">{importedCount}</span> student{importedCount !== 1 ? 's' : ''}.
              {ambiguousCount + notFoundCount > 0 && ` ${ambiguousCount + notFoundCount} row${ambiguousCount + notFoundCount !== 1 ? 's were' : ' was'} skipped.`}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setStep(1); setRows([]); setFileName(''); if (fileRef.current) fileRef.current.value = '' }}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm hover:bg-stone-50">
                Import another file
              </button>
              <a
                href="/dashboard/admin"
                className="bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-700 font-medium text-sm transition-colors">
                Back to dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
