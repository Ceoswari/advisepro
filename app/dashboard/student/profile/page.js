'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateCompetitiveness, TIER_LABELS } from '@/lib/scoring'

export default function ApplicationProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [activities, setActivities] = useState([])
  const [publications, setPublications] = useState([])
  const [rotations, setRotations] = useState([])
  const [milestones, setMilestones] = useState([])
  const [notes, setNotes] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const { data: studentData } = await supabase.from('students').select('*').eq('profile_id', user.id).single()

      if (studentData) {
        const [
          { data: activitiesData },
          { data: pubData },
          { data: rotData },
          { data: msData },
          { data: notesData },
        ] = await Promise.all([
          supabase.from('activities').select('*').eq('student_id', studentData.id).order('start_date', { ascending: false }),
          supabase.from('publications').select('*').eq('student_id', studentData.id).order('publication_date', { ascending: false }),
          supabase.from('away_rotations').select('*').eq('student_id', studentData.id).order('start_date', { ascending: false }),
          supabase.from('student_milestones').select('*, milestones(*)').eq('student_id', studentData.id).order('created_at', { ascending: true }),
          supabase.from('advising_notes').select('*, profiles(full_name)').eq('student_id', studentData.id).order('meeting_date', { ascending: false }),
        ])
        setActivities(activitiesData || [])
        setPublications(pubData || [])
        setRotations(rotData || [])
        setMilestones(msData || [])
        setNotes(notesData || [])
      }

      setProfile(profileData)
      setStudent(studentData)
      setLoading(false)
    }
    fetchData()
  }, [])

  const parseDescription = (desc) => { try { return JSON.parse(desc) } catch { return {} } }

  const competitivenessResult = calculateCompetitiveness(student, activities.length, publications, rotations.length)

  const PUB_TYPE_LABELS = {
    first_author: 'First Author',
    co_author: 'Co-Author',
    poster: 'Poster',
    abstract: 'Abstract',
  }

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-white">
      {/* Nav — hidden on print */}
      <div className="print:hidden bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/student')} className="text-sm text-stone-500 hover:text-stone-900">← Back</button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-stone-900">AdvisePro</span>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700"
        >
          Print / Export PDF
        </button>
      </div>

      {/* Profile content */}
      <div className="max-w-4xl mx-auto px-8 py-10 print:px-6 print:py-6">

        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-900">{profile?.full_name}</h1>
              <p className="text-stone-600 mt-1">{profile?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-700">{student?.class_year}</p>
              <p className="text-sm text-stone-500">{student?.specialty_interest || 'No specialty selected'}</p>
              <p className="text-xs text-stone-400 mt-1">Cooper University Health Care</p>
            </div>
          </div>
        </div>

        {/* Scores */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">USMLE Scores</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-stone-200 rounded-lg p-4">
              <p className="text-xs text-stone-500 mb-1">Step 1</p>
              <p className="text-2xl font-bold text-stone-900">{student?.usmle_step1_score ?? '—'}</p>
              <p className={`text-xs mt-0.5 font-medium ${student?.usmle_step1_status === 'pass' ? 'text-emerald-600' : student?.usmle_step1_status === 'fail' ? 'text-rose-600' : 'text-stone-400'}`}>
                {student?.usmle_step1_status === 'pass' ? 'Pass' : student?.usmle_step1_status === 'fail' ? 'Fail' : 'Not taken'}
              </p>
            </div>
            <div className="border border-stone-200 rounded-lg p-4">
              <p className="text-xs text-stone-500 mb-1">Step 2 CK</p>
              <p className="text-2xl font-bold text-stone-900">{student?.usmle_step2_score ?? '—'}</p>
            </div>
            {competitivenessResult && (
              <div className={`border rounded-lg p-4 ${competitivenessResult.riskLevel === 'low' ? 'border-green-200 bg-emerald-50' : competitivenessResult.riskLevel === 'medium' ? 'border-yellow-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
                <p className="text-xs text-stone-500 mb-1">Competitiveness</p>
                <p className={`text-2xl font-bold ${competitivenessResult.riskLevel === 'low' ? 'text-emerald-700' : competitivenessResult.riskLevel === 'medium' ? 'text-amber-700' : 'text-rose-700'}`}>
                  {competitivenessResult.score}<span className="text-sm font-normal text-stone-400">/100</span>
                </p>
                <p className={`text-xs mt-0.5 font-medium capitalize ${competitivenessResult.riskLevel === 'low' ? 'text-emerald-600' : competitivenessResult.riskLevel === 'medium' ? 'text-amber-600' : 'text-rose-600'}`}>
                  {competitivenessResult.riskLevel} Risk
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Research & Publications */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Research & Scholarship</h2>
          <div className="flex gap-8 mb-3">
            <div>
              <p className="text-sm text-stone-500">Research Experiences</p>
              <p className="text-xl font-bold text-stone-900">{student?.research_count || 0}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Volunteer Hours</p>
              <p className="text-xl font-bold text-stone-900">{student?.volunteer_hours || 0}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Publications</p>
              <p className="text-xl font-bold text-stone-900">{publications.length}</p>
            </div>
          </div>
          {publications.length > 0 && (
            <div className="space-y-2 mt-3">
              {publications.map(pub => (
                <div key={pub.id} className="flex gap-3 text-sm">
                  <span className="text-stone-400 flex-shrink-0">{PUB_TYPE_LABELS[pub.publication_type] || pub.publication_type}</span>
                  <span className="text-stone-900 flex-1">{pub.title}{pub.journal ? <span className="text-stone-500"> — {pub.journal}</span> : ''}{pub.publication_date ? <span className="text-stone-400"> ({new Date(pub.publication_date).getFullYear()})</span> : ''}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Away Rotations */}
        {rotations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Away Rotations ({rotations.length})</h2>
            <div className="space-y-2">
              {rotations.map(rot => (
                <div key={rot.id} className="flex gap-4 text-sm">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 h-fit mt-0.5 ${rot.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : rot.status === 'planned' ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-500'}`}>
                    {rot.status}
                  </span>
                  <div>
                    <p className="font-medium text-stone-900">{rot.program_name}</p>
                    <p className="text-stone-500">{[rot.specialty, rot.institution, rot.city && rot.state ? `${rot.city}, ${rot.state}` : rot.city].filter(Boolean).join(' · ')}</p>
                  </div>
                  {rot.start_date && (
                    <span className="text-stone-400 ml-auto flex-shrink-0">
                      {new Date(rot.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      {rot.end_date ? ` – ${new Date(rot.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ERAS Activities */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Experiences & Activities ({activities.length}/15)</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-stone-400">No activities added yet.</p>
          ) : (
            <div className="space-y-4">
              {activities.map(activity => {
                const details = parseDescription(activity.description)
                return (
                  <div key={activity.id} className="border-l-2 border-stone-200 pl-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs text-stone-400">{activity.type}</span>
                          {activity.is_most_meaningful && <span className="text-xs text-amber-600 font-medium">⭐ Most Meaningful</span>}
                        </div>
                        <p className="font-medium text-stone-900 text-sm">{activity.title}</p>
                        {details.organization_name && <p className="text-sm text-stone-500">{details.organization_name}{details.city ? ` · ${details.city}${details.state ? `, ${details.state}` : ''}` : ''}</p>}
                        {details.experience_description && <p className="text-xs text-stone-500 mt-1 line-clamp-2">{details.experience_description}</p>}
                        {activity.is_most_meaningful && details.most_meaningful_description && (
                          <p className="text-xs text-stone-400 italic mt-1 line-clamp-2">"{details.most_meaningful_description}"</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-stone-400 flex-shrink-0">
                        {activity.start_date && (
                          <p>{new Date(activity.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – {details.is_present ? 'Present' : activity.end_date ? new Date(activity.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}</p>
                        )}
                        {details.hours_per_week && <p>{details.hours_per_week} hrs/wk</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Milestones */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Milestone Progress</h2>
          <div className="grid grid-cols-2 gap-4">
            {['MS1','MS2','MS3','MS4'].map(year => {
              const yearMs = milestones.filter(m => m.milestones?.due_year === year)
              if (yearMs.length === 0) return null
              const completed = yearMs.filter(m => m.status === 'completed').length
              const pct = Math.round((completed / yearMs.length) * 100)
              return (
                <div key={year} className="border border-stone-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-stone-700">{year}</p>
                    <p className="text-sm text-stone-500">{completed}/{yearMs.length} complete</p>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-teal-500' : 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Advising Notes — print only if there are notes */}
        {notes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Advising History ({notes.length} meetings)</h2>
            <div className="space-y-3">
              {notes.slice(0, 5).map(note => (
                <div key={note.id} className="border-l-2 border-stone-200 pl-4">
                  <div className="flex justify-between text-xs text-stone-400 mb-0.5">
                    <span>{note.profiles?.full_name}</span>
                    <span>{new Date(note.meeting_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <p className="text-sm text-stone-600 line-clamp-2">{note.notes}</p>
                </div>
              ))}
              {notes.length > 5 && <p className="text-xs text-stone-400">+ {notes.length - 5} more meetings</p>}
            </div>
          </section>
        )}

        <div className="print:block hidden border-t border-stone-200 pt-4 mt-8 text-xs text-stone-400 text-center">
          Generated by AdvisePro · Cooper University Health Care · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </div>
  )
}
