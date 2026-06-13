'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardNav, { ADMIN_NAV } from '@/app/components/DashboardNav'

// ─── Helpers ────────────────────────────────────────────────────────────────

// Palette cycles through as many graduation years as needed
const GRAD_COLORS = ['#0d9488', '#7c3aed', '#b45309', '#0369a1', '#be185d', '#065f46', '#92400e', '#1e3a8a']
const colorFor = (i) => GRAD_COLORS[i % GRAD_COLORS.length]

function avg(arr) {
  const nums = arr.filter(v => v != null && !isNaN(v))
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

function pct(n, total) {
  return total ? Math.round((n / total) * 100) : 0
}

function classLabel(year) {
  return `Class of ${year}`
}

// Sort "AY24-25" strings chronologically
function sortAcademicYears(years) {
  return [...new Set(years)].sort((a, b) => {
    const pa = parseInt((a || '').replace(/^AY/i, '').split('-')[0]) || 0
    const pb = parseInt((b || '').replace(/^AY/i, '').split('-')[0]) || 0
    return pa - pb
  })
}

// ─── Horizontal bar ─────────────────────────────────────────────────────────

function HBar({ data, total }) {
  return (
    <div className="space-y-3">
      {data.map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-sm text-stone-600 w-32 flex-shrink-0">{item.label}</span>
          <div className="flex-1 h-5 bg-stone-100 rounded overflow-hidden">
            <div className={`h-full rounded transition-all ${item.color}`}
              style={{ width: total ? `${(item.value / total) * 100}%` : '0%' }} />
          </div>
          <span className="text-sm font-semibold text-stone-700 w-16 text-right tabular-nums">
            {item.value} <span className="text-xs text-stone-400 font-normal">({pct(item.value, total)}%)</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── SVG line chart ──────────────────────────────────────────────────────────

function LineChart({ series, xLabels }) {
  const activeSeries = series.filter(s => s.values.some(v => v != null))
  if (activeSeries.length === 0 || xLabels.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-stone-400">
        No grade data to display yet. Import course grades first.
      </div>
    )
  }

  const PAD = { top: 20, right: 24, bottom: 44, left: 44 }
  const W = 600, H = 260
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const allVals = activeSeries.flatMap(s => s.values).filter(v => v != null)
  const rawMin = Math.min(...allVals)
  const rawMax = Math.max(...allVals)
  const yMin = Math.max(0,   Math.floor(rawMin / 10) * 10 - 5)
  const yMax = Math.min(100, Math.ceil (rawMax / 10) * 10 + 5)
  const yRange = yMax - yMin || 1

  const xPos = (i) => {
    if (xLabels.length <= 1) return PAD.left + plotW / 2
    return PAD.left + (i / (xLabels.length - 1)) * plotW
  }
  const yPos = (v) => PAD.top + (1 - (v - yMin) / yRange) * plotH

  const gridLines = 5
  const yTicks = Array.from({ length: gridLines + 1 }, (_, i) =>
    yMin + (yRange * i) / gridLines
  )

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={yPos(v)} x2={W - PAD.right} y2={yPos(v)}
              stroke="#e7e5e4" strokeWidth="1" />
            <text x={PAD.left - 6} y={yPos(v) + 4} textAnchor="end"
              fontSize="10" fill="#a8a29e">{Math.round(v)}%</text>
          </g>
        ))}

        {xLabels.map((label, i) => (
          <text key={i} x={xPos(i)} y={H - 8} textAnchor="middle"
            fontSize="10" fill="#78716c">{label}</text>
        ))}

        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom}
          stroke="#d6d3d1" strokeWidth="1" />

        {activeSeries.map((s, si) => {
          const pts = s.values
            .map((v, i) => v != null ? { x: xPos(i), y: yPos(v), v } : null)
            .filter(Boolean)
          if (pts.length === 0) return null
          const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
          return (
            <g key={si}>
              {pts.length > 1 && (
                <path d={d} fill="none" stroke={s.color} strokeWidth="2.5"
                  strokeLinejoin="round" strokeLinecap="round" />
              )}
              {pts.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={s.color} strokeWidth="2" />
                  <title>{s.name}: {p.v.toFixed(1)}%</title>
                </g>
              ))}
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap gap-4 mt-2 px-1">
        {activeSeries.map(s => (
          <div key={s.name} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-stone-500">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function Stat({ label, value, sub, color = 'text-stone-900' }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5">
      <p className="text-xs text-stone-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Class filter pill bar ───────────────────────────────────────────────────

function ClassFilter({ label, gradYears, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-stone-500 mr-1">{label}</span>
      {['All', ...gradYears].map(yr => (
        <button key={yr} onClick={() => onChange(yr)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border ${
            value === yr
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
          }`}>
          {yr === 'All' ? 'All' : yr}
        </button>
      ))}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Analytics() {
  const [tab, setTab]             = useState('overview')
  const [loading, setLoading]     = useState(true)
  const [students, setStudents]   = useState([])
  const [notes, setNotes]         = useState([])
  const [milestones, setMilestones] = useState([])
  const [activitiesCount, setActivitiesCount] = useState(0)
  const [grades, setGrades]       = useState([])
  const [step1Year, setStep1Year] = useState('All')
  const [gradeCourse, setGradeCourse] = useState('all')
  const [gradeYear, setGradeYear]     = useState('All')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [
        { data: studentsData },
        { data: notesData },
        { data: milestonesData },
        { count: actCount },
        { data: gradesData },
      ] = await Promise.all([
        supabase.from('students').select('*, profiles(full_name)'),
        supabase.from('advising_notes').select('student_id, meeting_date'),
        supabase.from('student_milestones').select('student_id, status'),
        supabase.from('activities').select('id', { count: 'exact', head: true }),
        supabase.from('course_grades').select('course_name, academic_year, term, course_percent, student_id, students(graduation_year)'),
      ])

      setStudents(studentsData || [])
      setNotes(notesData || [])
      setMilestones(milestonesData || [])
      setActivitiesCount(actCount || 0)
      setGrades(gradesData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">Loading…</div>

  // Sorted unique graduation years across all students
  const gradYears = [...new Set(students.map(s => s.graduation_year).filter(Boolean))].sort()

  // ── Overview calculations ─────────────────────────────────────────────────

  const total = students.length
  const avgStep2 = (() => {
    const scores = students.map(s => s.usmle_step2_score).filter(Boolean)
    return scores.length ? Math.round(avg(scores)) : null
  })()
  const studentsWithMeeting = new Set(notes.map(n => n.student_id)).size
  const meetingCoverage = pct(studentsWithMeeting, total)
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const milestoneRate = milestones.length ? pct(completedMilestones, milestones.length) : 0

  const riskData = [
    { label: 'Low Risk',     value: students.filter(s => s.risk_level === 'low').length,    color: 'bg-emerald-500' },
    { label: 'Medium Risk',  value: students.filter(s => s.risk_level === 'medium').length, color: 'bg-yellow-400' },
    { label: 'High Risk',    value: students.filter(s => s.risk_level === 'high').length,   color: 'bg-rose-500'   },
    { label: 'Not Assessed', value: students.filter(s => !s.risk_level).length,             color: 'bg-stone-300'  },
  ]

  const yearCounts = {}
  students.forEach(s => { if (s.graduation_year) yearCounts[s.graduation_year] = (yearCounts[s.graduation_year] || 0) + 1 })
  const yearData = gradYears.map(y => ({ label: String(y), value: yearCounts[y] || 0 })).filter(d => d.value > 0)

  const specialtyCounts = {}
  students.forEach(s => { if (s.specialty_interest) specialtyCounts[s.specialty_interest] = (specialtyCounts[s.specialty_interest] || 0) + 1 })
  const specialtyData = Object.entries(specialtyCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }))

  const meetingCountMap = {}
  notes.forEach(n => { meetingCountMap[n.student_id] = (meetingCountMap[n.student_id] || 0) + 1 })
  const meetingData = [
    { label: '0 meetings',   value: students.filter(s => !meetingCountMap[s.id]).length },
    { label: '1–2 meetings', value: students.filter(s => meetingCountMap[s.id] >= 1 && meetingCountMap[s.id] <= 2).length },
    { label: '3–5 meetings', value: students.filter(s => meetingCountMap[s.id] >= 3 && meetingCountMap[s.id] <= 5).length },
    { label: '6+ meetings',  value: students.filter(s => meetingCountMap[s.id] >= 6).length },
  ]

  const riskByYear = gradYears.map(year => {
    const yr = students.filter(s => s.graduation_year === year)
    return { label: String(year), total: yr.length, highRisk: yr.filter(s => s.risk_level === 'high').length }
  }).filter(d => d.total > 0)

  // ── Step 1 calculations ───────────────────────────────────────────────────

  const step1Students = step1Year === 'All'
    ? students
    : students.filter(s => s.graduation_year === step1Year)

  const step1Tested  = step1Students.filter(s => s.usmle_step1_attempts != null)
  const step1Pass    = step1Students.filter(s => s.usmle_step1_status === 'pass' && s.usmle_step1_attempts != null)
  const step1Fail    = step1Students.filter(s => s.usmle_step1_status === 'fail' && s.usmle_step1_attempts != null)
  const step1Pass1st = step1Students.filter(s => s.usmle_step1_status === 'pass' && s.usmle_step1_attempts === 1)
  const step1Pass2nd = step1Students.filter(s => s.usmle_step1_status === 'pass' && s.usmle_step1_attempts === 2)

  const step1PassRate     = step1Tested.length ? pct(step1Pass.length, step1Tested.length) : null
  const step1First1stRate = step1Tested.length ? pct(step1Pass1st.length, step1Tested.length) : null

  const step1OutcomeData = [
    { label: 'Pass — 1st attempt', value: step1Pass1st.length,                       color: 'bg-emerald-500' },
    { label: 'Pass — 2nd attempt', value: step1Pass2nd.length,                       color: 'bg-teal-400'    },
    { label: 'Did not pass',       value: step1Fail.length,                           color: 'bg-rose-400'    },
    { label: 'Not yet taken',      value: step1Students.length - step1Tested.length,  color: 'bg-stone-200'   },
  ]

  const step1ByYear = gradYears.map((yr, i) => {
    const yrStudents = students.filter(s => s.graduation_year === yr)
    const tested     = yrStudents.filter(s => s.usmle_step1_attempts != null)
    const passed     = yrStudents.filter(s => s.usmle_step1_status === 'pass' && s.usmle_step1_attempts != null)
    return {
      label: classLabel(yr),
      total: yrStudents.length,
      tested: tested.length,
      passed: passed.length,
      passRate: tested.length ? pct(passed.length, tested.length) : null,
    }
  }).filter(d => d.total > 0)

  // ── Grade trends calculations ─────────────────────────────────────────────

  const courseNames = [...new Set(grades.map(g => g.course_name).filter(Boolean))].sort()

  const gradeFiltered = grades.filter(g => {
    if (gradeCourse !== 'all' && g.course_name !== gradeCourse) return false
    if (gradeYear !== 'All' && g.students?.graduation_year !== gradeYear) return false
    return true
  })

  const academicYears = sortAcademicYears(grades.map(g => g.academic_year).filter(Boolean))

  const gradYearsInData = gradeYear === 'All'
    ? gradYears.filter(yr => grades.some(g => g.students?.graduation_year === yr))
    : [gradeYear]

  const lineSeries = gradYearsInData.map((yr, i) => {
    const values = academicYears.map(ay => {
      const rows = gradeFiltered.filter(g =>
        g.academic_year === ay && g.students?.graduation_year === yr && g.course_percent != null
      )
      return rows.length > 0 ? avg(rows.map(g => g.course_percent)) : null
    })
    return { name: classLabel(yr), color: colorFor(gradYears.indexOf(yr)), values }
  })

  // ── Render ────────────────────────────────────────────────────────────────

  const TABS = [
    { id: 'overview', label: 'Overview'       },
    { id: 'step1',    label: 'Step 1 Results' },
    { id: 'grades',   label: 'Grade Trends'   },
  ]

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav navItems={ADMIN_NAV} />

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Analytics</h2>
          <p className="text-stone-500 mt-1">Institutional overview — {total} student{total !== 1 ? 's' : ''} enrolled</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-8 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════ OVERVIEW TAB ══════ */}
        {tab === 'overview' && (
          <div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <Stat label="Total Students" value={total} />
              <Stat label="Avg Step 2" value={avgStep2} />
              <Stat label="Meeting Coverage" value={`${meetingCoverage}%`} sub={`${studentsWithMeeting} of ${total} met`} />
              <Stat label="Milestone Completion" value={`${milestoneRate}%`} sub={`${completedMilestones} of ${milestones.length}`} />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">Risk Distribution</h3>
                <HBar data={riskData} total={total} />
              </div>
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">Students by Graduation Year</h3>
                {yearData.length === 0
                  ? <p className="text-sm text-stone-400">No graduation year data yet.</p>
                  : <HBar data={yearData.map(d => ({ ...d, color: 'bg-teal-500' }))} total={total} />
                }
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">Top Specialty Interests</h3>
                {specialtyData.length === 0
                  ? <p className="text-sm text-stone-400">No specialty data yet.</p>
                  : <HBar data={specialtyData.map(d => ({ ...d, color: 'bg-violet-400' }))} total={total} />
                }
              </div>
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">Meeting Frequency</h3>
                <HBar data={meetingData.map(d => ({ ...d, color: 'bg-teal-500' }))} total={total} />
                <p className="text-xs text-stone-400 mt-3">Total meetings logged: {notes.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">USMLE Step 1 — Institution</h3>
                <HBar data={[
                  { label: 'Pass',         value: students.filter(s => s.usmle_step1_status === 'pass' && s.usmle_step1_attempts != null).length, color: 'bg-emerald-500' },
                  { label: 'Did not pass', value: students.filter(s => s.usmle_step1_status === 'fail' && s.usmle_step1_attempts != null).length, color: 'bg-rose-400' },
                  { label: 'Not taken',    value: students.filter(s => s.usmle_step1_attempts == null).length, color: 'bg-stone-200' },
                ]} total={total} />
              </div>
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">High Risk by Graduation Year</h3>
                {riskByYear.length === 0
                  ? <p className="text-sm text-stone-400">No data yet.</p>
                  : riskByYear.map(item => (
                    <div key={item.label} className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-stone-600 w-12 flex-shrink-0">{item.label}</span>
                      <div className="flex-1 h-5 bg-stone-100 rounded overflow-hidden">
                        <div className="h-full bg-rose-400 rounded transition-all"
                          style={{ width: item.total ? `${(item.highRisk / item.total) * 100}%` : '0%' }} />
                      </div>
                      <span className="text-xs text-stone-500 w-20 text-right tabular-nums">
                        {item.highRisk}/{item.total} ({pct(item.highRisk, item.total)}%)
                      </span>
                    </div>
                  ))
                }
                <p className="text-xs text-stone-400 mt-2">ERAS activities logged: {activitiesCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* ══════ STEP 1 TAB ══════ */}
        {tab === 'step1' && (
          <div>
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <ClassFilter
                label="Graduation year:"
                gradYears={gradYears}
                value={step1Year}
                onChange={setStep1Year}
              />
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <Stat label="Students in view" value={step1Students.length} />
              <Stat
                label="Tested"
                value={step1Tested.length}
                sub={`${pct(step1Tested.length, step1Students.length)}% of class`}
              />
              <Stat
                label="Overall pass rate"
                value={step1PassRate != null ? `${step1PassRate}%` : '—'}
                sub={step1Tested.length ? `${step1Pass.length} of ${step1Tested.length} tested` : 'No data'}
                color={step1PassRate != null ? (step1PassRate >= 90 ? 'text-emerald-700' : step1PassRate >= 80 ? 'text-amber-600' : 'text-rose-600') : 'text-stone-900'}
              />
              <Stat
                label="1st attempt pass rate"
                value={step1First1stRate != null ? `${step1First1stRate}%` : '—'}
                sub={step1Tested.length ? `${step1Pass1st.length} passed first try` : 'No data'}
                color={step1First1stRate != null ? (step1First1stRate >= 85 ? 'text-emerald-700' : step1First1stRate >= 70 ? 'text-amber-600' : 'text-rose-600') : 'text-stone-900'}
              />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">
                  Outcome Breakdown — {step1Year === 'All' ? 'All Students' : classLabel(step1Year)}
                </h3>
                {step1Students.length === 0
                  ? <p className="text-sm text-stone-400">No students in this view.</p>
                  : <HBar data={step1OutcomeData} total={step1Students.length} />
                }
              </div>

              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">Pass Rate by Graduation Year</h3>
                {step1ByYear.length === 0
                  ? <p className="text-sm text-stone-400">No data yet.</p>
                  : (
                    <div className="space-y-4">
                      {step1ByYear.map(item => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-stone-700">{item.label}</span>
                            <div className="flex items-center gap-3 text-xs text-stone-400">
                              <span>{item.tested} tested of {item.total}</span>
                              <span className={`font-semibold text-sm ${
                                item.passRate == null ? 'text-stone-400' :
                                item.passRate >= 90 ? 'text-emerald-600' :
                                item.passRate >= 80 ? 'text-amber-500' : 'text-rose-600'
                              }`}>
                                {item.passRate != null ? `${item.passRate}%` : 'No data'}
                              </span>
                            </div>
                          </div>
                          <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-teal-500 transition-all"
                              style={{ width: item.passRate != null ? `${item.passRate}%` : '0%' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>

            {step1Tested.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-1">Attempt Distribution</h3>
                <p className="text-xs text-stone-400 mb-4">Among {step1Tested.length} student{step1Tested.length !== 1 ? 's' : ''} who have taken Step 1</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Passed 1st attempt',       value: step1Tested.filter(s => s.usmle_step1_status === 'pass' && s.usmle_step1_attempts === 1).length, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
                    { label: 'Passed 2nd attempt',       value: step1Tested.filter(s => s.usmle_step1_status === 'pass' && s.usmle_step1_attempts === 2).length, color: 'text-teal-700',    bg: 'bg-teal-50 border-teal-100'       },
                    { label: 'Did not pass (2 attempts)',value: step1Tested.filter(s => s.usmle_step1_status === 'fail' && s.usmle_step1_attempts === 2).length, color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-100'       },
                  ].map(item => (
                    <div key={item.label} className={`rounded-xl border p-4 ${item.bg}`}>
                      <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-stone-500 mt-1">{item.label}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{pct(item.value, step1Tested.length)}% of tested</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ GRADE TRENDS TAB ══════ */}
        {tab === 'grades' && (
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <label className="text-sm text-stone-500">Course:</label>
                <select
                  value={gradeCourse}
                  onChange={e => setGradeCourse(e.target.value)}
                  className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="all">All courses (average)</option>
                  {courseNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <ClassFilter
                label="Graduation year:"
                gradYears={gradYears}
                value={gradeYear}
                onChange={setGradeYear}
              />
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-stone-900">
                  Average Grade % by Academic Year
                  {gradeCourse !== 'all' && <span className="text-stone-400 font-normal"> — {gradeCourse}</span>}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Each line represents a graduation class; hover points for exact values</p>
              </div>
              <LineChart series={lineSeries} xLabels={academicYears} />
            </div>

            {courseNames.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100">
                  <h3 className="text-sm font-semibold text-stone-900">Course Summary</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Average grade % per course per graduation class, across all academic years</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Course</th>
                        {gradYears.map(yr => (
                          <th key={yr} className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                            {yr}
                          </th>
                        ))}
                        <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Overall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseNames.map(course => {
                        const courseRows = grades.filter(g => g.course_name === course)
                        const overallAvg = avg(courseRows.map(g => g.course_percent).filter(v => v != null))
                        return (
                          <tr key={course} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-stone-900">{course}</td>
                            {gradYears.map(yr => {
                              const yrRows = courseRows.filter(g => g.students?.graduation_year === yr)
                              const yrAvg = avg(yrRows.map(g => g.course_percent).filter(v => v != null))
                              return (
                                <td key={yr} className="px-5 py-3 text-right tabular-nums text-stone-700">
                                  {yrAvg != null ? `${yrAvg.toFixed(1)}%` : <span className="text-stone-300">—</span>}
                                </td>
                              )
                            })}
                            <td className="px-5 py-3 text-right tabular-nums font-semibold text-stone-800">
                              {overallAvg != null ? `${overallAvg.toFixed(1)}%` : <span className="text-stone-300">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {courseNames.length === 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
                <p className="text-stone-400 text-sm">No grade data imported yet.</p>
                <p className="text-stone-300 text-xs mt-1">Import course grades from the Import Data hub first.</p>
                <a href="/dashboard/admin/import" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
                  Go to Import Data →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
