'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function BarChart({ data, colorClass = 'bg-teal-500' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-sm text-stone-600 w-44 flex-shrink-0 truncate">{item.label}</span>
          <div className="flex-1 h-5 bg-stone-100 rounded overflow-hidden">
            <div
              className={`h-full ${colorClass} rounded transition-all`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-stone-700 w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [notes, setNotes] = useState([])
  const [milestones, setMilestones] = useState([])
  const [activitiesCount, setActivitiesCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [
        { data: studentsData },
        { data: notesData },
        { data: milestonesData },
        { count: actCount },
      ] = await Promise.all([
        supabase.from('students').select('*, profiles(full_name)'),
        supabase.from('advising_notes').select('student_id, meeting_date'),
        supabase.from('student_milestones').select('student_id, status'),
        supabase.from('activities').select('id', { count: 'exact', head: true }),
      ])

      setStudents(studentsData || [])
      setNotes(notesData || [])
      setMilestones(milestonesData || [])
      setActivitiesCount(actCount || 0)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center">Loading...</div>

  // --- Computed stats ---
  const total = students.length
  const avgStep2 = (() => {
    const scores = students.map(s => s.usmle_step2_score).filter(Boolean)
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  })()
  const avgStep1 = (() => {
    const scores = students.map(s => s.usmle_step1_score).filter(Boolean)
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  })()

  const studentsWithMeeting = new Set(notes.map(n => n.student_id)).size
  const meetingCoverage = total ? Math.round((studentsWithMeeting / total) * 100) : 0

  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const milestoneRate = milestones.length ? Math.round((completedMilestones / milestones.length) * 100) : 0

  // Risk distribution
  const riskData = [
    { label: 'Low Risk', value: students.filter(s => s.risk_level === 'low').length, color: 'bg-emerald-500' },
    { label: 'Medium Risk', value: students.filter(s => s.risk_level === 'medium').length, color: 'bg-yellow-400' },
    { label: 'High Risk', value: students.filter(s => s.risk_level === 'high').length, color: 'bg-rose-500' },
    { label: 'Not Assessed', value: students.filter(s => !s.risk_level).length, color: 'bg-gray-300' },
  ]

  // Class year distribution
  const yearCounts = {}
  students.forEach(s => { if (s.class_year) yearCounts[s.class_year] = (yearCounts[s.class_year] || 0) + 1 })
  const yearData = ['MS1', 'MS2', 'MS3', 'MS4']
    .map(y => ({ label: y, value: yearCounts[y] || 0 }))
    .filter(d => d.value > 0)

  // Specialty distribution
  const specialtyCounts = {}
  students.forEach(s => { if (s.specialty_interest) specialtyCounts[s.specialty_interest] = (specialtyCounts[s.specialty_interest] || 0) + 1 })
  const specialtyData = Object.entries(specialtyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }))

  // Step 1 status
  const step1Data = [
    { label: 'Pass', value: students.filter(s => s.usmle_step1_status === 'pass').length },
    { label: 'Fail', value: students.filter(s => s.usmle_step1_status === 'fail').length },
    { label: 'Not Taken', value: students.filter(s => s.usmle_step1_status === 'not_taken' || !s.usmle_step1_status).length },
  ]

  // Risk by class year
  const riskByYear = ['MS1', 'MS2', 'MS3', 'MS4'].map(year => {
    const yearStudents = students.filter(s => s.class_year === year)
    const highRisk = yearStudents.filter(s => s.risk_level === 'high').length
    return { label: year, total: yearStudents.length, highRisk }
  }).filter(d => d.total > 0)

  // Meeting frequency breakdown
  const meetingCountMap = {}
  notes.forEach(n => { meetingCountMap[n.student_id] = (meetingCountMap[n.student_id] || 0) + 1 })
  const meetingBuckets = {
    '0 meetings': students.filter(s => !meetingCountMap[s.id]).length,
    '1–2 meetings': students.filter(s => meetingCountMap[s.id] >= 1 && meetingCountMap[s.id] <= 2).length,
    '3–5 meetings': students.filter(s => meetingCountMap[s.id] >= 3 && meetingCountMap[s.id] <= 5).length,
    '6+ meetings': students.filter(s => meetingCountMap[s.id] >= 6).length,
  }
  const meetingData = Object.entries(meetingBuckets).map(([label, value]) => ({ label, value }))

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-stone-900">AdvisePro</span>
          </div>
          <nav className="flex gap-4 text-sm">
            <button onClick={() => router.push('/dashboard/admin')} className="text-stone-500 hover:text-stone-900">Students</button>
            <span className="font-medium text-teal-600 border-b-2 border-teal-600 pb-0.5">Analytics</span>
            <button onClick={() => router.push('/dashboard/admin/milestones')} className="text-stone-500 hover:text-stone-900">Milestones</button>
          </nav>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
          className="text-sm text-stone-500 hover:text-stone-900 border border-stone-200 px-3 py-1 rounded-xl"
        >
          Sign Out
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">Analytics</h2>
          <p className="text-stone-500 mt-1">Institutional overview — all students</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <p className="text-sm text-stone-500">Total Students</p>
            <p className="text-3xl font-bold text-stone-900 mt-1">{total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <p className="text-sm text-stone-500">Avg Step 2 Score</p>
            <p className="text-3xl font-bold text-stone-900 mt-1">{avgStep2 ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <p className="text-sm text-stone-500">Meeting Coverage</p>
            <p className="text-3xl font-bold text-stone-900 mt-1">{meetingCoverage}%</p>
            <p className="text-xs text-stone-400 mt-1">{studentsWithMeeting} of {total} met</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <p className="text-sm text-stone-500">Milestone Completion</p>
            <p className="text-3xl font-bold text-stone-900 mt-1">{milestoneRate}%</p>
            <p className="text-xs text-stone-400 mt-1">{completedMilestones} of {milestones.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Risk distribution */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Risk Distribution</h3>
            <div className="space-y-3">
              {riskData.map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm text-stone-600 w-28 flex-shrink-0">{item.label}</span>
                  <div className="flex-1 h-5 bg-stone-100 rounded overflow-hidden">
                    <div className={`h-full ${item.color} rounded transition-all`}
                      style={{ width: total ? `${(item.value / total) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-sm font-medium text-stone-700 w-12 text-right">
                    {item.value} <span className="text-stone-400 font-normal">({total ? Math.round((item.value / total) * 100) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Class year distribution */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Students by Class Year</h3>
            {yearData.length === 0 ? (
              <p className="text-sm text-stone-400">No class year data yet.</p>
            ) : (
              <BarChart data={yearData} colorClass="bg-teal-500" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Specialty distribution */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Top Specialty Interests</h3>
            {specialtyData.length === 0 ? (
              <p className="text-sm text-stone-400">No specialty data yet.</p>
            ) : (
              <BarChart data={specialtyData} colorClass="bg-purple-400" />
            )}
          </div>

          {/* Meeting distribution */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Meeting Frequency</h3>
            <BarChart data={meetingData} colorClass="bg-teal-500" />
            <p className="text-xs text-stone-400 mt-3">Total meetings logged: {notes.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Step 1 status */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">USMLE Step 1 Status</h3>
            <div className="space-y-3">
              {step1Data.map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm text-stone-600 w-24 flex-shrink-0">{item.label}</span>
                  <div className="flex-1 h-5 bg-stone-100 rounded overflow-hidden">
                    <div className={`h-full rounded transition-all ${item.label === 'Pass' ? 'bg-emerald-500' : item.label === 'Fail' ? 'bg-red-400' : 'bg-gray-300'}`}
                      style={{ width: total ? `${(item.value / total) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-sm font-medium text-stone-700 w-8 text-right">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-stone-400">Avg Step 1 (numerical)</p>
                <p className="text-lg font-bold text-stone-900">{avgStep1 ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-stone-400">Avg Step 2</p>
                <p className="text-lg font-bold text-stone-900">{avgStep2 ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* High risk by year */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">High Risk Students by Year</h3>
            {riskByYear.length === 0 ? (
              <p className="text-sm text-stone-400">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {riskByYear.map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-sm text-stone-600 w-12 flex-shrink-0">{item.label}</span>
                    <div className="flex-1 h-5 bg-stone-100 rounded overflow-hidden">
                      <div className="h-full bg-red-400 rounded transition-all"
                        style={{ width: item.total ? `${(item.highRisk / item.total) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-sm font-medium text-stone-700 w-20 text-right text-xs">
                      {item.highRisk}/{item.total} ({item.total ? Math.round((item.highRisk / item.total) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-stone-400 mt-3">Total ERAS activities logged: {activitiesCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
