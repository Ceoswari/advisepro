'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardNav from '@/app/components/DashboardNav'

// Fixed columns in every Progress IQ export — everything after these is a grade component
const FIXED_COLS = new Set([
  'studentid', 'email', 'lastname', 'firstname', 'classyear',
  'displayblock', 'academicyear', 'academicterm', 'courseid',
  'coursesection', 'course grade', 'course points', 'course percent',
])

// The "Official Final Grade" column has a special char prefix — match by suffix
const OFFICIAL_GRADE_SUFFIX = 'official final grade'

// Rows with these values in StudentID are metadata, not students
const METADATA_IDS = new Set(['class avg', 'points possible', 'threshold', ''])

function parseProgressIQ(csvText) {
  const lines = csvText.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (lines.length < 2) return { error: 'File appears empty' }

  const rawHeaders = lines[0].split(',').map(h => h.trim())

  // Find component columns — everything after the fixed set and official grade col
  const componentCols = []
  const officialGradeIdx = rawHeaders.findIndex(h =>
    h.toLowerCase().endsWith(OFFICIAL_GRADE_SUFFIX)
  )

  rawHeaders.forEach((h, i) => {
    const lh = h.toLowerCase()
    if (!FIXED_COLS.has(lh) && !lh.endsWith(OFFICIAL_GRADE_SUFFIX)) {
      componentCols.push({ name: h, index: i })
    }
  })

  // Extract column indexes for key fields
  const idx = (name) => rawHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase())
  const colStudentID  = idx('StudentID')
  const colEmail      = idx('Email')
  const colLastName   = idx('LastName')
  const colFirstName  = idx('FirstName')
  const colAcadYear   = idx('AcademicYear')
  const colTerm       = idx('AcademicTerm')
  const colCourseID   = idx('CourseID')
  const colGrade      = idx('Course Grade')
  const colPercent    = idx('Course Percent')

  // Parse metadata rows for class averages
  const classAverages = {}
  const studentRows = []
  let courseID = null
  let academicYear = null
  let term = null

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const sid = values[colStudentID] ?? ''

    if (METADATA_IDS.has(sid.toLowerCase())) {
      // Extract class averages from the "Class Avg" row
      if (sid.toLowerCase() === 'class avg') {
        componentCols.forEach(col => {
          classAverages[col.name] = values[col.index] ?? ''
        })
      }
      continue
    }

    // Real student row
    if (!courseID && colCourseID >= 0) courseID = values[colCourseID]
    if (!academicYear && colAcadYear >= 0) academicYear = values[colAcadYear]
    if (!term && colTerm >= 0) term = values[colTerm]

    const components = {}
    componentCols.forEach(col => {
      const val = values[col.index]
      if (val !== '' && val !== undefined) components[col.name] = isNaN(val) ? val : parseFloat(val)
    })

    studentRows.push({
      banner_id: sid,
      email: values[colEmail] ?? '',
      last_name: values[colLastName] ?? '',
      first_name: values[colFirstName] ?? '',
      letter_grade: values[colGrade] ?? '',
      course_percent: values[colPercent] ? parseFloat(values[colPercent]) : null,
      components,
    })
  }

  if (studentRows.length === 0) return { error: 'No student rows found. Check that the file is a valid Progress IQ export.' }

  return { studentRows, courseID, academicYear, term, componentCols, classAverages }
}

const MATCH_STATUS = {
  matched:        { label: 'Matched',               color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  email_unverified: { label: 'Banner ID only',       color: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400'  },
  email_mismatch: { label: 'Email mismatch — blocked', color: 'bg-rose-100 text-rose-700',    dot: 'bg-rose-500'   },
  not_found:      { label: 'Not found in AdvisePro', color: 'bg-stone-100 text-stone-500',    dot: 'bg-stone-300'  },
}

export default function GradesImport() {
  const router = useRouter()
  const fileRef = useRef(null)
  const [step, setStep] = useState('upload')   // upload → preview → confirm → done
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState('')
  const [courseName, setCourseName] = useState('')
  const [matchedRows, setMatchedRows] = useState([])
  const [matching, setMatching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState([])

  function loadFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) { setParseError('Please select a .csv file.'); return }
    setParseError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText(ev.target.result)
    reader.readAsText(file)
  }

  const handleFileUpload = (e) => loadFile(e.target.files?.[0])

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    loadFile(e.dataTransfer.files?.[0])
  }

  const handleParse = async () => {
    setParseError('')
    const result = parseProgressIQ(csvText)
    if (result.error) { setParseError(result.error); return }
    setParsed(result)

    // Look up course name if already known
    const { data: existing } = await supabase
      .from('courses').select('course_name').eq('course_id', result.courseID).single()
    if (existing) setCourseName(existing.course_name)

    setStep('match')
    setMatching(true)

    // Fetch all students with banner_id set
    const { data: students } = await supabase
      .from('students')
      .select('id, banner_id, profiles(email, full_name)')
      .not('banner_id', 'is', null)

    const studentMap = {}
    students?.forEach(s => { studentMap[s.banner_id] = s })

    const rows = result.studentRows.map(row => {
      const match = studentMap[row.banner_id]
      if (!match) return { ...row, status: 'not_found', student: null }

      const dbEmail = match.profiles?.email?.toLowerCase() ?? ''
      const csvEmail = row.email?.toLowerCase() ?? ''

      if (!csvEmail) {
        // Email blank in CSV — can't verify, allow with warning
        return { ...row, status: 'email_unverified', student: match }
      } else if (csvEmail === dbEmail) {
        return { ...row, status: 'matched', student: match }
      } else {
        return { ...row, status: 'email_mismatch', student: match }
      }
    })

    setMatchedRows(rows)
    setMatching(false)
  }

  const importableRows = matchedRows.filter(r => r.status === 'matched' || r.status === 'email_unverified')

  const handleImport = async () => {
    if (!courseName.trim()) return
    setImporting(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Upsert course name
    await supabase.from('courses').upsert({
      course_id: parsed.courseID,
      course_name: courseName.trim(),
      academic_year: parsed.academicYear,
      term: parsed.term,
    }, { onConflict: 'course_id' })

    const results = []
    for (const row of importableRows) {
      const { error } = await supabase.from('course_grades').upsert({
        student_id: row.student.id,
        course_id: parsed.courseID,
        course_name: courseName.trim(),
        academic_year: parsed.academicYear,
        term: parsed.term,
        letter_grade: row.letter_grade || null,
        course_percent: row.course_percent,
        components: row.components,
        class_averages: parsed.classAverages,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: 'student_id,course_id,academic_year,term' })

      results.push({
        name: row.student.profiles?.full_name || `${row.first_name} ${row.last_name}`,
        banner_id: row.banner_id,
        status: error ? 'error' : 'success',
        message: error?.message,
      })
    }

    setImportResults(results)
    setStep('done')
    setImporting(false)
  }

  const successCount = importResults.filter(r => r.status === 'success').length
  const errorCount   = importResults.filter(r => r.status === 'error').length
  const skippedCount = matchedRows.filter(r => r.status === 'not_found' || r.status === 'email_mismatch').length

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav backHref="/dashboard/admin/import" />

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Import Course Grades</h2>
          <p className="text-stone-500 mt-1">Progress IQ grade export · Matches on Banner ID + Rowan email</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['Upload', 'Preview & Match', 'Import'].map((label, i) => {
            const stepId = ['upload', 'match', 'done'][i]
            const isActive = step === stepId || (step === 'done' && stepId === 'done')
            const isPast = ['upload', 'match', 'done'].indexOf(step) > i
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isPast || isActive ? 'bg-teal-600 text-white' : 'bg-stone-200 text-stone-400'}`}>
                  {isPast ? '✓' : i + 1}
                </div>
                <span className={`text-sm ${isActive ? 'font-semibold text-stone-900' : isPast ? 'text-stone-400' : 'text-stone-400'}`}>{label}</span>
                {i < 2 && <span className="text-stone-200 mx-1">—</span>}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />

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
                <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">📂</div>
                <p className="text-sm font-medium text-stone-700">Drop your CSV here, or click to browse</p>
                <p className="text-xs text-stone-400 mt-1">Progress IQ grade export · .csv files only</p>
              </div>

              {/* Loaded file indicator */}
              {fileName && (
                <div className="flex items-center gap-2 mt-3 px-1">
                  <span className="text-sm text-stone-500">📄 {fileName}</span>
                  <button
                    onClick={() => { setCsvText(''); setFileName(''); if (fileRef.current) fileRef.current.value = '' }}
                    className="text-xs text-stone-400 hover:text-rose-500 transition-colors">✕ Remove</button>
                </div>
              )}

              {/* Paste toggle */}
              <div className="mt-4 pt-4 border-t border-stone-100">
                <button
                  onClick={() => setShowPaste(p => !p)}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                  {showPaste ? '▲ Hide' : '▼ Or paste CSV text instead'}
                </button>
                {showPaste && (
                  <div className="mt-3">
                    <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setFileName('') }} rows={5}
                      placeholder="Paste the CSV content from Progress IQ here..."
                      className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-500 space-y-1">
              <p className="font-semibold text-stone-700">Expected format</p>
              <p>• Downloaded directly from Progress IQ as CSV</p>
              <p>• Header row followed by Class Avg / Points Possible / Threshold rows, then student rows</p>
              <p>• Students matched by Banner ID — all student accounts must have Banner ID set first</p>
            </div>

            {parseError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">{parseError}</div>
            )}

            <button onClick={handleParse} disabled={!csvText.trim()}
              className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              Parse & Preview →
            </button>
          </div>
        )}

        {/* ── STEP 2: Preview & Match ── */}
        {step === 'match' && parsed && (
          <div className="space-y-5">
            {/* Course info */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h3 className="text-sm font-semibold text-stone-800 mb-4">Course Information</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-stone-400 mb-1">Course ID</p>
                  <p className="text-sm font-mono font-bold text-stone-900">{parsed.courseID}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1">Academic Year</p>
                  <p className="text-sm text-stone-900">{parsed.academicYear}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1">Term</p>
                  <p className="text-sm text-stone-900">{parsed.term}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Course Name <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-stone-400 mb-2">
                  This is what students will see. Enter the full course name for Course ID {parsed.courseID}.
                </p>
                <input value={courseName} onChange={e => setCourseName(e.target.value)}
                  placeholder="e.g. Foundations of Medicine I"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            {/* Match summary */}
            {!matching && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Matched', count: matchedRows.filter(r => r.status === 'matched').length, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
                  { label: 'Banner only', count: matchedRows.filter(r => r.status === 'email_unverified').length, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
                  { label: 'Email mismatch', count: matchedRows.filter(r => r.status === 'email_mismatch').length, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100' },
                  { label: 'Not found', count: matchedRows.filter(r => r.status === 'not_found').length, color: 'text-stone-500', bg: 'bg-stone-50 border-stone-100' },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl border p-4 ${item.bg}`}>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Student rows */}
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-800">
                  {matching ? 'Matching students...' : `${parsed.studentRows.length} students in file`}
                </p>
                <p className="text-xs text-stone-400">
                  {importableRows.length} will be imported · {skippedCount} will be skipped
                </p>
              </div>
              <div className="divide-y divide-stone-50 max-h-96 overflow-y-auto">
                {matchedRows.map((row, i) => {
                  const meta = MATCH_STATUS[row.status]
                  return (
                    <div key={i} className="px-5 py-3 flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900">
                          {row.student?.profiles?.full_name || `${row.first_name} ${row.last_name}`}
                        </p>
                        <p className="text-xs text-stone-400">
                          Banner: {row.banner_id}
                          {row.email ? ` · ${row.email}` : ' · no email in file'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {row.letter_grade && (
                          <p className="text-sm font-semibold text-stone-900">{row.letter_grade}</p>
                        )}
                        {row.course_percent != null && (
                          <p className="text-xs text-stone-400">{row.course_percent}%</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {matchedRows.filter(r => r.status === 'email_mismatch').length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-700">
                <span className="font-semibold">Email mismatch rows will not be imported.</span> The Banner ID
                was found in AdvisePro but the email in the CSV doesn't match the account email.
                Verify the student's email in their profile before retrying.
              </div>
            )}

            {matchedRows.filter(r => r.status === 'not_found').length > 0 && (
              <div className="bg-stone-100 border border-stone-200 rounded-xl p-4 text-sm text-stone-600">
                <span className="font-semibold">Not-found rows will be skipped.</span> These Banner IDs
                don't exist in AdvisePro yet. Create the student accounts with the correct Banner ID first,
                then re-run this import.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={importing || importableRows.length === 0 || !courseName.trim()}
                className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                {importing ? 'Importing...' : `Import ${importableRows.length} student${importableRows.length !== 1 ? 's' : ''} →`}
              </button>
              <button onClick={() => { setStep('upload'); setParsed(null); setMatchedRows([]) }}
                className="text-sm text-stone-500 hover:text-stone-800 border border-stone-200 px-4 py-2.5 rounded-xl">
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 'done' && (
          <div className="space-y-4">
            <div className={`rounded-2xl border p-6 ${errorCount === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <h3 className="font-bold text-stone-900 text-lg mb-1">Import complete</h3>
              <p className="text-sm text-stone-700">
                {successCount > 0 && <span className="text-emerald-700">{successCount} grade{successCount !== 1 ? 's' : ''} imported. </span>}
                {errorCount > 0 && <span className="text-rose-700">{errorCount} failed. </span>}
                {skippedCount > 0 && <span className="text-stone-500">{skippedCount} skipped (not found or email mismatch). </span>}
              </p>
            </div>

            {errorCount > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-stone-100">
                  <p className="text-sm font-semibold text-rose-700">Failed rows</p>
                </div>
                <div className="divide-y divide-stone-50">
                  {importResults.filter(r => r.status === 'error').map((r, i) => (
                    <div key={i} className="px-5 py-3">
                      <p className="text-sm text-stone-800">{r.name} <span className="text-stone-400">(Banner: {r.banner_id})</span></p>
                      <p className="text-xs text-rose-600 mt-0.5">{r.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => router.push('/dashboard/admin')}
                className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700">
                Back to Students
              </button>
              <button onClick={() => { setStep('upload'); setCsvText(''); setParsed(null); setMatchedRows([]); setImportResults([]); setCourseName('') }}
                className="text-sm text-stone-500 hover:text-stone-800 border border-stone-200 px-4 py-2.5 rounded-xl">
                Import Another Course
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
