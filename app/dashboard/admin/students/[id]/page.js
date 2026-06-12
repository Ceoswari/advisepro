'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import DashboardNav from '@/app/components/DashboardNav'
import { calculateCompetitiveness, TIER_LABELS } from '@/lib/scoring'
import { useRef } from 'react'
import GradesCard from '@/app/components/GradesCard'

const ACADEMIC_DOC_TYPES = [
  { value: 'transcript', label: 'Transcript' },
  { value: 'step1_score_report', label: 'Step 1 Score Report' },
  { value: 'step2_score_report', label: 'Step 2 Score Report' },
  { value: 'lor', label: 'Letter of Recommendation' },
  { value: 'other_academic', label: 'Other Academic Document' },
]

export default function AdminStudentDetail() {
  const { id } = useParams()
  const router = useRouter()
  const fileInputRef = useRef(null)
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
  const [academicFiles, setAcademicFiles] = useState([])
  const [academicDocType, setAcademicDocType] = useState('transcript')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [studentUserId, setStudentUserId] = useState(null)
  const [grades, setGrades] = useState([])

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

      // Get the student's profile_id (their user ID) for storage
      const profileId = studentData?.profile_id
      setStudentUserId(profileId)

      // Load academic files uploaded by admin for this student
      if (profileId) {
        const allFiles = []
        for (const type of ACADEMIC_DOC_TYPES) {
          const { data } = await supabase.storage
            .from('documents')
            .list(`${profileId}/${type.value}`, { sortBy: { column: 'created_at', order: 'desc' } })
          if (data) {
            data.forEach(f => allFiles.push({ ...f, docType: type.value, path: `${profileId}/${type.value}/${f.name}` }))
          }
        }
        setAcademicFiles(allFiles)
      }

      const { data: gradesData } = await supabase
        .from('course_grades')
        .select('*')
        .eq('student_id', id)
        .order('academic_year', { ascending: false })

      setStudent(studentData)
      setProfile(studentData?.profiles)
      setNotes(notesData || [])
      setMilestones(milestonesData || [])
      setActivitiesCount(count || 0)
      setAssignedAdvisors(assignments || [])
      setAllAdvisors(advisorProfiles || [])
      setGrades(gradesData || [])
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

  const loadAcademicFiles = async (uid) => {
    const allFiles = []
    for (const type of ACADEMIC_DOC_TYPES) {
      const { data } = await supabase.storage
        .from('documents')
        .list(`${uid}/${type.value}`, { sortBy: { column: 'created_at', order: 'desc' } })
      if (data) {
        data.forEach(f => allFiles.push({ ...f, docType: type.value, path: `${uid}/${type.value}/${f.name}` }))
      }
    }
    setAcademicFiles(allFiles)
  }

  const handleAcademicUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !studentUserId) return
    if (file.size > 10 * 1024 * 1024) { setUploadError('File must be under 10MB.'); return }
    setUploading(true)
    setUploadError('')
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const path = `${studentUserId}/${academicDocType}/${filename}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
    if (error) { setUploadError(error.message) } else { await loadAcademicFiles(studentUserId) }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAcademicDownload = async (path, name) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 60)
    if (data?.signedUrl) {
      const a = document.createElement('a'); a.href = data.signedUrl; a.download = name; a.click()
    }
  }

  const handleAcademicDelete = async (path) => {
    if (!confirm('Delete this file?')) return
    await supabase.storage.from('documents').remove([path])
    setAcademicFiles(prev => prev.filter(f => f.path !== path))
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const unassignedAdvisors = allAdvisors.filter(
    a => !assignedAdvisors.find(aa => aa.advisor_profile_id === a.id)
  )

  const competitivenessResult = calculateCompetitiveness(student, activitiesCount)

  const completedMilestones = milestones.filter(m => m.status === 'completed').length

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav backHref="/dashboard/admin">
        <button
          onClick={() => router.push(`/dashboard/admin/students/${id}/edit`)}
          className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700"
        >
          Edit Student
        </button>
      </DashboardNav>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">{profile?.full_name}</h2>
          <p className="text-stone-500 mt-1">{student?.class_year} · {student?.specialty_interest ?? 'No specialty set'} · {profile?.email}</p>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">Step 1</p>
            <p className="text-2xl font-bold text-stone-900">{student?.usmle_step1_score ?? '—'}</p>
            <span className={`text-xs ${student?.usmle_step1_status === 'pass' ? 'text-emerald-600' : student?.usmle_step1_status === 'fail' ? 'text-rose-600' : 'text-stone-400'}`}>
              {student?.usmle_step1_status === 'pass' ? 'Pass' : student?.usmle_step1_status === 'fail' ? 'Fail' : 'Not taken'}
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">Step 2</p>
            <p className="text-2xl font-bold text-stone-900">{student?.usmle_step2_score ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">Research</p>
            <p className="text-2xl font-bold text-stone-900">{student?.research_count ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">Milestones</p>
            <p className="text-2xl font-bold text-stone-900">{completedMilestones}<span className="text-sm font-normal text-stone-400"> / {milestones.length}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">Volunteer Hours</p>
            <p className="text-2xl font-bold text-stone-900">{student?.volunteer_hours ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">ERAS Activities</p>
            <p className="text-2xl font-bold text-stone-900">{activitiesCount}<span className="text-sm font-normal text-stone-400"> / 15</span></p>
          </div>
        </div>

        {/* Competitiveness score */}
        {competitivenessResult && (
          <div className={`rounded-lg border p-5 mb-6 ${
            competitivenessResult.riskLevel === 'low' ? 'bg-emerald-50 border-green-200' :
            competitivenessResult.riskLevel === 'medium' ? 'bg-amber-50 border-yellow-200' :
            'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-stone-700">Competitiveness Score</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${
                    competitivenessResult.riskLevel === 'low' ? 'text-emerald-700' :
                    competitivenessResult.riskLevel === 'medium' ? 'text-amber-700' : 'text-rose-700'
                  }`}>{competitivenessResult.score}</span>
                  <span className="text-stone-400">/ 100</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  competitivenessResult.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700' :
                  competitivenessResult.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {competitivenessResult.riskLevel === 'low' ? 'Low Risk' : competitivenessResult.riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
                </span>
                {student?.specialty_interest && (
                  <p className="text-xs text-stone-400 mt-1">{TIER_LABELS[competitivenessResult.tier] || ''} specialty</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {Object.values(competitivenessResult.breakdown).map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-stone-600 w-40 flex-shrink-0">{item.label}</span>
                  {item.binary ? (
                    <div className="flex-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.score > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>
                        {item.score > 0 ? '✓ Yes' : 'None'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${Math.min((item.score / (item.displayMax || item.max)) * 100, 100)}%` }} />
                    </div>
                  )}
                  <span className="text-xs text-stone-500 w-12 text-right">
                    {item.uncapped ? `+${item.score}` : `${item.score}/${item.max}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Assign Advisors */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Assigned Advisors</h3>
            {assignedAdvisors.length === 0 ? (
              <p className="text-sm text-stone-400 mb-4">No advisors assigned yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {assignedAdvisors.map(a => (
                  <div key={a.advisor_profile_id} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{a.profiles?.full_name}</p>
                      <p className="text-xs text-stone-400">{a.profiles?.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveAdvisor(a.advisor_profile_id)}
                      className="text-xs text-red-400 hover:text-rose-600"
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
                  className="flex-1 border border-stone-300 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select advisor...</option>
                  {unassignedAdvisors.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAssignAdvisor}
                  disabled={!selectedAdvisor || assigning}
                  className="bg-teal-600 text-white px-3 py-1.5 rounded-xl text-sm hover:bg-teal-700 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            )}
            {unassignedAdvisors.length === 0 && allAdvisors.length === 0 && (
              <p className="text-xs text-stone-400">No advisor accounts exist yet.</p>
            )}
          </div>

          {/* Milestones summary */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Milestones</h3>
            {milestones.length === 0 ? (
              <p className="text-sm text-stone-400">No milestones assigned.</p>
            ) : (
              <div className="space-y-1.5">
                {milestones.slice(0, 8).map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      m.status === 'completed' ? 'bg-emerald-500' :
                      m.status === 'in_progress' ? 'bg-yellow-400' : 'bg-stone-200'
                    }`} />
                    <span className={`text-xs flex-1 ${m.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                      {m.milestones?.title}
                    </span>
                  </div>
                ))}
                {milestones.length > 8 && (
                  <p className="text-xs text-stone-400 pt-1">+{milestones.length - 8} more</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Grades */}
        <div className="mb-6">
          <GradesCard grades={grades} />
        </div>

        {/* Academic Documents */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Academic Documents</h3>
          <div className="flex gap-3 items-end flex-wrap mb-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Document Type</label>
              <select value={academicDocType} onChange={e => setAcademicDocType(e.target.value)}
                className="border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {ACADEMIC_DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">File (PDF, DOC, DOCX)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleAcademicUpload}
                disabled={uploading || !studentUserId}
                className="border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700"
              />
            </div>
            {uploading && <span className="text-sm text-teal-600">Uploading...</span>}
          </div>
          {uploadError && <p className="text-rose-500 text-sm mb-3">{uploadError}</p>}
          {academicFiles.length === 0 ? (
            <p className="text-sm text-stone-400">No academic documents uploaded yet.</p>
          ) : (
            <div className="divide-y divide-stone-100 border border-stone-100 rounded-xl">
              {academicFiles.map(file => {
                const typeLabel = ACADEMIC_DOC_TYPES.find(t => t.value === file.docType)?.label || file.docType
                return (
                  <div key={file.path} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{file.name.replace(/^\d+_/, '')}</p>
                      <p className="text-xs text-stone-400">
                        {typeLabel} · {formatSize(file.metadata?.size)}
                        {file.created_at && ` · ${new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleAcademicDownload(file.path, file.name.replace(/^\d+_/, ''))}
                        className="text-sm text-teal-600 hover:text-teal-800">Download</button>
                      <button onClick={() => handleAcademicDelete(file.path)}
                        className="text-sm text-stone-400 hover:text-rose-500">Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Advising notes */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Advising Notes ({notes.length})</h3>
          {notes.length === 0 ? (
            <p className="text-sm text-stone-400">No meetings logged yet.</p>
          ) : (
            <div className="space-y-4">
              {notes.map(note => (
                <div key={note.id} className="border-l-2 border-teal-200 pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-stone-900">{note.profiles?.full_name}</p>
                    <p className="text-xs text-stone-400">{note.meeting_date}</p>
                  </div>
                  <p className="text-sm text-stone-600">{note.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
