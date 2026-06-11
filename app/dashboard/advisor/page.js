'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default function AdvisorDashboard() {
  const [profile, setProfile] = useState(null)
  const [students, setStudents] = useState([])
  const [lastMeetings, setLastMeetings] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [showAttentionOnly, setShowAttentionOnly] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const { data: assignments } = await supabase.from('advisor_student').select('student_id').eq('advisor_profile_id', user.id)

      if (assignments?.length > 0) {
        const studentIds = assignments.map(a => a.student_id)
        const { data: studentsData } = await supabase.from('students').select('*, profiles(full_name, email)').in('id', studentIds)
        const { data: notesData } = await supabase.from('advising_notes').select('student_id, meeting_date').in('student_id', studentIds).order('meeting_date', { ascending: false })

        const meetingMap = {}
        notesData?.forEach(n => { if (!meetingMap[n.student_id]) meetingMap[n.student_id] = n.meeting_date })

        setStudents(studentsData || [])
        setLastMeetings(meetingMap)
      }

      setProfile(profileData)
      setLoading(false)
    }
    fetchData()
  }, [])

  const needsAttention = (student) => {
    if (student.risk_level === 'high') return true
    const last = lastMeetings[student.id]
    if (!last) return true
    if (daysSince(last) > 30) return true
    return false
  }

  const attentionCount = students.filter(needsAttention).length
  const riskCounts = {
    low:    students.filter(s => s.risk_level === 'low').length,
    medium: students.filter(s => s.risk_level === 'medium').length,
    high:   students.filter(s => s.risk_level === 'high').length,
  }
  const classYears = [...new Set(students.map(s => s.class_year).filter(Boolean))].sort()

  const filtered = students.filter(s => {
    const name = s.profiles?.full_name?.toLowerCase() || ''
    const matchSearch    = !search || name.includes(search.toLowerCase()) || (s.specialty_interest || '').toLowerCase().includes(search.toLowerCase())
    const matchRisk      = !filterRisk || s.risk_level === filterRisk
    const matchYear      = !filterYear || s.class_year === filterYear
    const matchAttention = !showAttentionOnly || needsAttention(s)
    return matchSearch && matchRisk && matchYear && matchAttention
  })

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <div className="bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-bold text-stone-900 text-lg">AdvisePro</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <span className="text-teal-700 text-xs font-semibold">{initials}</span>
          </div>
          <span className="text-sm text-stone-500">{profile?.full_name}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            className="text-sm text-stone-400 hover:text-stone-700 border border-stone-200 px-3 py-1.5 rounded-xl transition-colors">
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">My Students</h2>
          <p className="text-stone-500 mt-1">{students.length} student{students.length !== 1 ? 's' : ''} assigned</p>
        </div>

        {/* Attention alert */}
        {attentionCount > 0 && (
          <div
            onClick={() => setShowAttentionOnly(!showAttentionOnly)}
            className={`mb-5 rounded-2xl border px-5 py-4 flex items-center justify-between cursor-pointer transition-all ${showAttentionOnly ? 'bg-amber-50 border-amber-300' : 'bg-amber-50 border-amber-200 hover:border-amber-300 hover:shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">⚠️</div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {attentionCount} student{attentionCount !== 1 ? 's' : ''} need{attentionCount === 1 ? 's' : ''} attention
                </p>
                <p className="text-xs text-amber-600 mt-0.5">High risk, never met, or no meeting in 30+ days</p>
              </div>
            </div>
            <span className="text-xs text-amber-700 font-medium">{showAttentionOnly ? 'Show all →' : 'Show only →'}</span>
          </div>
        )}

        {/* Risk summary */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${filterRisk === 'low' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-stone-100'}`}
            onClick={() => setFilterRisk(filterRisk === 'low' ? '' : 'low')}>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Low Risk</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{riskCounts.low}</p>
          </div>
          <div className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${filterRisk === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-100'}`}
            onClick={() => setFilterRisk(filterRisk === 'medium' ? '' : 'medium')}>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Medium Risk</p>
            <p className="text-3xl font-bold text-amber-500 mt-2">{riskCounts.medium}</p>
          </div>
          <div className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${filterRisk === 'high' ? 'bg-rose-50 border-rose-200' : 'bg-white border-stone-100'}`}
            onClick={() => setFilterRisk(filterRisk === 'high' ? '' : 'high')}>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">High Risk</p>
            <p className="text-3xl font-bold text-rose-600 mt-2">{riskCounts.high}</p>
          </div>
        </div>

        {/* Search & filter */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-stone-300"
          />
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Years</option>
            {classYears.map(y => <option key={y}>{y}</option>)}
          </select>
          {(search || filterRisk || filterYear || showAttentionOnly) && (
            <button onClick={() => { setSearch(''); setFilterRisk(''); setFilterYear(''); setShowAttentionOnly(false) }}
              className="text-sm text-stone-500 hover:text-stone-900 border border-stone-200 px-4 py-2 rounded-xl hover:bg-stone-50 transition-colors">
              Clear
            </button>
          )}
        </div>

        {/* Students list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-10 text-center text-stone-400 text-sm">
            {students.length === 0 ? 'No students assigned yet.' : 'No students match your filters.'}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-50">
            {filtered.map((student) => {
              const lastMeeting = lastMeetings[student.id]
              const days = daysSince(lastMeeting)
              const attention = needsAttention(student)
              return (
                <div
                  key={student.id}
                  onClick={() => router.push(`/dashboard/advisor/student/${student.id}`)}
                  className={`px-6 py-4 flex items-center justify-between hover:bg-stone-50 cursor-pointer transition-colors ${attention ? 'border-l-4 border-amber-400 pl-5' : ''}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-900">{student.profiles?.full_name}</p>
                      {attention && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Needs attention</span>}
                    </div>
                    <p className="text-sm text-stone-400 mt-0.5">{student.class_year} · {student.specialty_interest ?? 'No specialty selected'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-stone-400">Last meeting</p>
                      <p className={`text-sm font-medium ${!lastMeeting ? 'text-rose-500' : days > 30 ? 'text-amber-600' : 'text-stone-700'}`}>
                        {!lastMeeting ? 'Never' : days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400">Step 2</p>
                      <p className="font-medium text-stone-900 text-sm">{student.usmle_step2_score ?? '—'}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      student.risk_level === 'low'    ? 'bg-emerald-100 text-emerald-700' :
                      student.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                      student.risk_level === 'high'   ? 'bg-rose-100 text-rose-700' :
                      'bg-stone-100 text-stone-400'}`}>
                      {student.risk_level ?? 'unset'}
                    </span>
                    <span className="text-stone-300">→</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {filtered.length > 0 && filtered.length < students.length && (
          <p className="text-xs text-stone-400 mt-3">Showing {filtered.length} of {students.length} students</p>
        )}
      </div>
    </div>
  )
}
