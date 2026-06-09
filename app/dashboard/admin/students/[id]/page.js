'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { calculateCompetitiveness, TIER_LABELS } from '@/lib/scoring'

export default function AdminStudentDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [profile, setProfile] = useState(null)
  const [notes, setNotes] = useState([])
  const [milestones, setMilestones] = useState([])
  const [activitiesCount, setActivitiesCount] = useState(0)
  const [assignedAdvisors, setAssignedAdvisors] = useState([])
  const [allAdvisors, setAllAdvisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedAdvisor, setSelectedAdvisor] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: studentData } = await supabase
        .from('students')
        .select('*, profiles(full_name, email)')
        .eq('id', id)
        .single()

      const { data: notesData } = await supabase
        .from('advising_notes')
        .select('*, profiles(full_name)')
        .eq('student_id', id)
        .order('meeting_date', { ascending: false })

      const { data: milestonesData } = await supabase
        .from('student_milestones')
        .select('*, milestones(*)')
        .eq('student_id', id)
        .order('created_at', { ascending: true })

      const { count } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', id)

      // Get current advisor assignments
      const { data: assignments } = await supabase
        .from('advisor_student')
        .select('advisor_profile_id, profiles(full_name, email)')
        .eq('student_id', id)

      // Get all advisors
      const { data: advisorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'advisor')

      setStudent(studentData)
      setProfile(studentData?.profiles)
      setNotes(notesData || [])
      setMilestones(milestonesData || [])
      setActivitiesCount(count || 0)
      setAssignedAdvisors(assignments || [])
      setAllAdvisors(advisorProfiles || [])
      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleAssignAdvisor = async () => {
    if (!selectedAdvisor) return
    setAssigning(true)

    const { error } = await supabase
      .from('advisor_student')
      .insert({ advisor_profile_id: selectedAdvisor, student_id: id })

    if (!error) {
      const advisor = allAdvisors.find(a => a.id === selectedAdvisor)
      setAssignedAdvisors([...assignedAdvisors, {
        advisor_profile_id: selectedAdvisor,
        profiles: { full_name: advisor.full_name, email: advisor.email }
      }])
      setSelectedAdvisor('')
    }
    setAssigning(false)
  }

  const handleRemoveAdvisor = async (advisorProfileId) => {
    if (!confirm('Remove this advisor from the student?')) return
    await supabase
      .from('advisor_student')
      .delete()
      .eq('advisor_profile_id', advisorProfileId)
      .eq('student_id', id)

    setAssignedAdvisors(assignedAdvisors.filter(a => a.advisor_profile_id !== advisorProfileId))
  }

  const unassignedAdvisors = allAdvisors.filter(
    a => !assignedAdvisors.find(aa => aa.advisor_profile_id === a.id)
  )

  const competitivenessResult = calculateCompetitiveness(student, activitiesCount)

  const completedMilestones = milestones.filter(m => m.status === 'completed').length

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/admin')} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
          <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
        </div>
        <button
          onClick={() => router.push(`/dashboard/admin/students/${id}/edit`)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Edit Student
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h2>
          <p className="text-gray-500 mt-1">{student?.class_year} · {student?.specialty_interest ?? 'No specialty set'} · {profile?.email}</p>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Step 1</p>
            <p className="text-2xl font-bold text-gray-900">{student?.usmle_step1_score ?? '—'}</p>
            <span className={`text-xs ${student?.usmle_step1_status === 'pass' ? 'text-green-600' : student?.usmle_step1_status === 'fail' ? 'text-red-600' : 'text-gray-400'}`}>
              {student?.usmle_step1_status === 'pass' ? 'Pass' : student?.usmle_step1_status === 'fail' ? 'Fail' : 'Not taken'}
            </span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Step 2</p>
            <p className="text-2xl font-bold text-gray-900">{student?.usmle_step2_score ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Research</p>
            <p className="text-2xl font-bold text-gray-900">{student?.research_count ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Milestones</p>
            <p className="text-2xl font-bold text-gray-900">{completedMilestones}<span className="text-sm font-normal text-gray-400"> / {milestones.length}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Volunteer Hours</p>
            <p className="text-2xl font-bold text-gray-900">{student?.volunteer_hours ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">ERAS Activities</p>
            <p className="text-2xl font-bold text-gray-900">{activitiesCount}<span className="text-sm font-normal text-gray-400"> / 15</span></p>
          </div>
        </div>

        {/* Competitiveness score */}
        {competitivenessResult && (
          <div className={`rounded-lg border p-5 mb-6 ${
            competitivenessResult.riskLevel === 'low' ? 'bg-green-50 border-green-200' :
            competitivenessResult.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Competitiveness Score</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${
                    competitivenessResult.riskLevel === 'low' ? 'text-green-700' :
                    competitivenessResult.riskLevel === 'medium' ? 'text-yellow-700' : 'text-red-700'
                  }`}>{competitivenessResult.score}</span>
                  <span className="text-gray-400">/ 100</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  competitivenessResult.riskLevel === 'low' ? 'bg-green-100 text-green-700' :
                  competitivenessResult.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {competitivenessResult.riskLevel === 'low' ? 'Low Risk' : competitivenessResult.riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
                </span>
                {student?.specialty_interest && (
                  <p className="text-xs text-gray-400 mt-1">{TIER_LABELS[competitivenessResult.tier] || ''} specialty</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {Object.values(competitivenessResult.breakdown).map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-40 flex-shrink-0">{item.label}</span>
                  <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(item.score / item.max) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{item.score}/{item.max}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Assign Advisors */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Assigned Advisors</h3>
            {assignedAdvisors.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">No advisors assigned yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {assignedAdvisors.map(a => (
                  <div key={a.advisor_profile_id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.profiles?.full_name}</p>
                      <p className="text-xs text-gray-400">{a.profiles?.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveAdvisor(a.advisor_profile_id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {unassignedAdvisors.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={selectedAdvisor}
                  onChange={e => setSelectedAdvisor(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select advisor...</option>
                  {unassignedAdvisors.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAssignAdvisor}
                  disabled={!selectedAdvisor || assigning}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            )}
            {unassignedAdvisors.length === 0 && allAdvisors.length === 0 && (
              <p className="text-xs text-gray-400">No advisor accounts exist yet.</p>
            )}
          </div>

          {/* Milestones summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Milestones</h3>
            {milestones.length === 0 ? (
              <p className="text-sm text-gray-400">No milestones assigned.</p>
            ) : (
              <div className="space-y-1.5">
                {milestones.slice(0, 8).map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      m.status === 'completed' ? 'bg-green-500' :
                      m.status === 'in_progress' ? 'bg-yellow-400' : 'bg-gray-200'
                    }`} />
                    <span className={`text-xs flex-1 ${m.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {m.milestones?.title}
                    </span>
                  </div>
                ))}
                {milestones.length > 8 && (
                  <p className="text-xs text-gray-400 pt-1">+{milestones.length - 8} more</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Advising notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Advising Notes ({notes.length})</h3>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-400">No meetings logged yet.</p>
          ) : (
            <div className="space-y-4">
              {notes.map(note => (
                <div key={note.id} className="border-l-2 border-blue-200 pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-gray-900">{note.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{note.meeting_date}</p>
                  </div>
                  <p className="text-sm text-gray-600">{note.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
