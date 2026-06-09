'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function daysSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function AdvisorDashboard() {
  const [profile, setProfile] = useState(null)
  const [students, setStudents] = useState([])
  const [lastMeetings, setLastMeetings] = useState({}) // studentId → meeting_date
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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: assignments } = await supabase
        .from('advisor_student')
        .select('student_id')
        .eq('advisor_profile_id', user.id)

      if (assignments && assignments.length > 0) {
        const studentIds = assignments.map(a => a.student_id)

        const { data: studentsData } = await supabase
          .from('students')
          .select('*, profiles(full_name, email)')
          .in('id', studentIds)

        // Fetch last meeting per student
        const { data: notesData } = await supabase
          .from('advising_notes')
          .select('student_id, meeting_date')
          .in('student_id', studentIds)
          .order('meeting_date', { ascending: false })

        // Build map of studentId → most recent meeting date
        const meetingMap = {}
        notesData?.forEach(n => {
          if (!meetingMap[n.student_id]) meetingMap[n.student_id] = n.meeting_date
        })

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
    if (!last) return true // never met
    if (daysSince(last) > 30) return true
    return false
  }

  const attentionCount = students.filter(needsAttention).length

  const filtered = students.filter(s => {
    const name = s.profiles?.full_name?.toLowerCase() || ''
    const matchSearch = !search || name.includes(search.toLowerCase()) || (s.specialty_interest || '').toLowerCase().includes(search.toLowerCase())
    const matchRisk = !filterRisk || s.risk_level === filterRisk
    const matchYear = !filterYear || s.class_year === filterYear
    const matchAttention = !showAttentionOnly || needsAttention(s)
    return matchSearch && matchRisk && matchYear && matchAttention
  })

  const riskCounts = {
    low: students.filter(s => s.risk_level === 'low').length,
    medium: students.filter(s => s.risk_level === 'medium').length,
    high: students.filter(s => s.risk_level === 'high').length,
  }

  const classYears = [...new Set(students.map(s => s.class_year).filter(Boolean))].sort()

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.full_name}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1 rounded-md"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Students</h2>
          <p className="text-gray-500 mt-1">{students.length} student{students.length !== 1 ? 's' : ''} assigned</p>
        </div>

        {/* Needs attention alert */}
        {attentionCount > 0 && (
          <div
            onClick={() => setShowAttentionOnly(!showAttentionOnly)}
            className={`mb-5 rounded-lg border px-5 py-4 flex items-center justify-between cursor-pointer transition-colors ${showAttentionOnly ? 'bg-orange-50 border-orange-300' : 'bg-orange-50 border-orange-200 hover:border-orange-300'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-orange-500 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">
                  {attentionCount} student{attentionCount !== 1 ? 's' : ''} need{attentionCount === 1 ? 's' : ''} attention
                </p>
                <p className="text-xs text-orange-600">High risk, no meeting ever, or no meeting in 30+ days</p>
              </div>
            </div>
            <span className="text-xs text-orange-600 font-medium">{showAttentionOnly ? 'Show all →' : 'Show only →'}</span>
          </div>
        )}

        {/* Risk summary */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setFilterRisk(filterRisk === 'low' ? '' : 'low')}>
            <p className="text-sm text-gray-500">Low Risk</p>
            <p className="text-2xl font-bold text-green-600">{riskCounts.low}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setFilterRisk(filterRisk === 'medium' ? '' : 'medium')}>
            <p className="text-sm text-gray-500">Medium Risk</p>
            <p className="text-2xl font-bold text-yellow-500">{riskCounts.medium}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setFilterRisk(filterRisk === 'high' ? '' : 'high')}>
            <p className="text-sm text-gray-500">High Risk</p>
            <p className="text-2xl font-bold text-red-600">{riskCounts.high}</p>
          </div>
        </div>

        {/* Search & filter */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Years</option>
            {classYears.map(y => <option key={y}>{y}</option>)}
          </select>
          {(search || filterRisk || filterYear || showAttentionOnly) && (
            <button onClick={() => { setSearch(''); setFilterRisk(''); setFilterYear(''); setShowAttentionOnly(false) }}
              className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-md">
              Clear
            </button>
          )}
        </div>

        {/* Students list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            {students.length === 0 ? 'No students assigned yet.' : 'No students match your filters.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {filtered.map((student) => {
              const lastMeeting = lastMeetings[student.id]
              const days = daysSince(lastMeeting)
              const attention = needsAttention(student)
              return (
                <div
                  key={student.id}
                  onClick={() => router.push(`/dashboard/advisor/student/${student.id}`)}
                  className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${attention ? 'border-l-2 border-orange-400' : ''}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{student.profiles?.full_name}</p>
                      {attention && <span className="text-xs text-orange-500">⚠</span>}
                    </div>
                    <p className="text-sm text-gray-500">{student.class_year} · {student.specialty_interest ?? 'No specialty selected'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Last meeting</p>
                      <p className={`text-sm font-medium ${!lastMeeting ? 'text-red-500' : days > 30 ? 'text-orange-500' : 'text-gray-700'}`}>
                        {!lastMeeting ? 'Never' : days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Step 2</p>
                      <p className="font-medium text-gray-900 text-sm">{student.usmle_step2_score ?? '—'}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                      student.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                      student.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      student.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {student.risk_level ?? 'unset'}
                    </span>
                    <span className="text-gray-400">→</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {filtered.length > 0 && filtered.length < students.length && (
          <p className="text-xs text-gray-400 mt-2">Showing {filtered.length} of {students.length} students</p>
        )}
      </div>
    </div>
  )
}
