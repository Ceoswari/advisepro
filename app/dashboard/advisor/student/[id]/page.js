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

      setStudent(studentData)
      setProfile(studentData?.profiles)
      setNotes(notesData || [])
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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
          <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Student Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h2>
          <p className="text-gray-500 mt-1">{student?.class_year} · {student?.specialty_interest}</p>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Step 1</p>
            <p className="text-2xl font-bold text-gray-900">{student?.usmle_step1_score ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Step 2</p>
            <p className="text-2xl font-bold text-gray-900">{student?.usmle_step2_score ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Research</p>
            <p className="text-2xl font-bold text-gray-900">{student?.research_count ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Risk Level</p>
            <p className={`text-2xl font-bold capitalize ${
              student?.risk_level === 'low' ? 'text-green-600' :
              student?.risk_level === 'medium' ? 'text-yellow-500' :
              'text-red-600'
            }`}>{student?.risk_level ?? '—'}</p>
          </div>
        </div>

        {/* Log Meeting */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Log Advising Meeting</h3>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Meeting Date</label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Notes</label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
              placeholder="Enter meeting notes..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSaveNote}
            disabled={saving || !newNote || !meetingDate}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>

        {/* Notes History */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Meeting History</h3>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500">No meetings logged yet.</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
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