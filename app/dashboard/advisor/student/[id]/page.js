'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function StudentDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [profile, setProfile] = useState(null)
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
  const [milestones, setMilestones] = useState([])

  useEffect(() => {
    const fetchData = async () => {
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

      setStudent(studentData)
      setProfile(studentData?.profiles)
      setNotes(notesData || [])
      setMilestones(milestonesData || [])
      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleSaveNote = async () => {
    if (!newNote || !meetingDate) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('advising_notes')
      .insert({
        student_id: id,
        advisor_profile_id: user.id,
        meeting_date: meetingDate,
        notes: newNote
      })
      .select('*, profiles(full_name)')
      .single()

    if (!error) {
      setNotes([data, ...notes])
      setNewNote('')
      setMeetingDate('')
    }

    setSaving(false)
  }

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-stone-500 hover:text-stone-900">← Back</button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-stone-900">AdvisePro</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Student Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">{profile?.full_name}</h2>
          <p className="text-stone-500 mt-1">{student?.class_year} · {student?.specialty_interest}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => router.push(`/dashboard/advisor/student/${id}/activities`)}
            className="bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-50"
          >
            Manage Activities
          </button>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">Step 1</p>
            <p className="text-2xl font-bold text-stone-900">{student?.usmle_step1_score ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">Step 2</p>
            <p className="text-2xl font-bold text-stone-900">{student?.usmle_step2_score ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">Research</p>
            <p className="text-2xl font-bold text-stone-900">{student?.research_count ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">Risk Level</p>
            <p className={`text-2xl font-bold capitalize ${
              student?.risk_level === 'low' ? 'text-emerald-600' :
              student?.risk_level === 'medium' ? 'text-amber-500' :
              'text-rose-600'
            }`}>{student?.risk_level ?? '—'}</p>
          </div>
        </div>

        {/* Log Meeting */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Log Advising Meeting</h3>
          <div className="mb-3">
            <label className="block text-sm text-stone-600 mb-1">Meeting Date</label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="border border-stone-300 rounded-xl px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm text-stone-600 mb-1">Notes</label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
              placeholder="Enter meeting notes..."
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            onClick={handleSaveNote}
            disabled={saving || !newNote || !meetingDate}
            className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>

        {/* Notes History */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Meeting History</h3>
          {notes.length === 0 ? (
            <p className="text-sm text-stone-500">No meetings logged yet.</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
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
            {/* Milestones */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mt-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Milestones</h3>
          {milestones.length === 0 ? (
            <p className="text-sm text-stone-500">No milestones assigned yet.</p>
          ) : (
            ['MS1', 'MS2', 'MS3', 'MS4'].map(year => {
              const yearMilestones = milestones.filter(m => m.milestones?.due_year === year)
              if (yearMilestones.length === 0) return null
              return (
                <div key={year} className="mb-6">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{year}</p>
                  <div className="space-y-2">
                    {yearMilestones.map(m => (
                      <div key={m.id} className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          m.status === 'completed' ? 'bg-emerald-500' :
                          m.status === 'in_progress' ? 'bg-yellow-400' :
                          'bg-stone-200'
                        }`} />
                        <p className={`text-sm flex-1 ${m.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                          {m.milestones?.title}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          m.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                          'bg-stone-100 text-stone-500'
                        }`}>
                          {m.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
        </div>
  )
}