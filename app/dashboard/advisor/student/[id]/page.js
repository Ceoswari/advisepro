'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import DashboardNav, { ADVISOR_NAV } from '@/app/components/DashboardNav'
import GradesCard from '@/app/components/GradesCard'

const DOC_TYPES = [
  { value: 'cv', label: 'CV' },
  { value: 'personal_statement', label: 'Personal Statement' },
  { value: 'mspe', label: 'MSPE' },
  { value: 'other', label: 'Other' },
]

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
  const [activeTab, setActiveTab] = useState('overview')
  const [docs, setDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [studentProfileId, setStudentProfileId] = useState(null)
  const [myProfileId, setMyProfileId] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [lors, setLors] = useState([])
  const [grades, setGrades] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setMyProfileId(user.id)

      const { data: studentData } = await supabase
        .from('students')
        .select('*, profiles(full_name, email, id)')
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

      const sProfileId = studentData?.profiles?.id ?? studentData?.profile_id
      setStudentProfileId(sProfileId)

      // Fetch messages between advisor and student
      if (sProfileId) {
        const [{ data: sent }, { data: received }] = await Promise.all([
          supabase.from('messages').select('*').eq('sender_id', user.id).eq('recipient_id', sProfileId).order('created_at'),
          supabase.from('messages').select('*').eq('sender_id', sProfileId).eq('recipient_id', user.id).order('created_at'),
        ])
        const thread = [...(sent || []), ...(received || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        setMessages(thread)
      }

      const { data: lorData } = await supabase.from('lor_requests').select('*').eq('student_id', id).order('created_at')

      const { data: gradesData } = await supabase
        .from('course_grades').select('*').eq('student_id', id).order('academic_year', { ascending: false })

      setStudent(studentData)
      setProfile(studentData?.profiles)
      setNotes(notesData || [])
      setMilestones(milestonesData || [])
      setLors(lorData || [])
      setGrades(gradesData || [])
      setLoading(false)

      // FERPA §99.32: log when a school official accesses a student's education record
      supabase.from('audit_logs').insert({
        action: 'view_student_record',
        performed_by: user.id,
        student_id: id,
      })
    }
    fetchData()
  }, [id])

  const loadDocs = async (sProfileId) => {
    if (!sProfileId) return
    setLoadingDocs(true)
    const allFiles = []
    for (const type of DOC_TYPES) {
      const res = await fetch('/api/documents/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `${sProfileId}/${type.value}` }),
      })
      const { files } = await res.json()
      if (files) {
        files.forEach(f => allFiles.push({ ...f, docType: type.value, docLabel: type.label, path: `${sProfileId}/${type.value}/${f.name}` }))
      }
    }
    setDocs(allFiles)
    setLoadingDocs(false)
  }

  // Real-time: receive new messages from student
  useEffect(() => {
    if (!myProfileId || !studentProfileId) return
    const channel = supabase
      .channel(`advisor-msgs-${myProfileId}-${studentProfileId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${myProfileId}` },
        (payload) => {
          if (payload.new.sender_id === studentProfileId) {
            setMessages(prev => [...prev, payload.new])
          }
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [myProfileId, studentProfileId])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'documents' && docs.length === 0 && studentProfileId) loadDocs(studentProfileId)
  }

  const handleViewDoc = async (path, name) => {
    const res = await fetch('/api/documents/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    const { signedUrl } = await res.json()
    if (signedUrl) window.open(signedUrl, '_blank')
  }

  const handleSaveNote = async () => {
    if (!newNote || !meetingDate) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('advising_notes')
      .insert({ student_id: id, advisor_profile_id: user.id, meeting_date: meetingDate, notes: newNote })
      .select('*, profiles(full_name)')
      .single()
    if (!error) {
      setNotes([data, ...notes])
      setNewNote('')
      setMeetingDate('')
    }
    setSaving(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !studentProfileId || sendingMsg) return
    setSendingMsg(true)
    const { data, error } = await supabase.from('messages').insert({
      sender_id: myProfileId,
      recipient_id: studentProfileId,
      content: newMessage.trim(),
    }).select().single()
    if (!error && data) {
      setMessages(prev => [...prev, data])
      setNewMessage('')
    }
    setSendingMsg(false)
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 text-sm">Loading...</div>

  const tabs = [
    { id: 'overview',  label: 'Overview' },
    { id: 'grades',    label: 'Grades',    badge: grades.length },
    { id: 'documents', label: 'Documents' },
    { id: 'messages',  label: 'Messages',  badge: messages.filter(m => m.sender_id !== myProfileId && !m.read_at).length },
  ]

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <DashboardNav navItems={ADVISOR_NAV} />

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Student header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">{profile?.full_name}</h2>
          <p className="text-stone-500 mt-1">{student?.class_year} · {student?.specialty_interest ?? 'No specialty'} · {profile?.email}</p>
        </div>

        {/* Score summary bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {/* Step 1 — special card with pass/fail badge and attempts */}
          <div className="bg-white rounded-2xl border border-stone-100 p-4">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Step 1</p>
            <span className={`inline-block text-xs font-semibold mt-1.5 px-2.5 py-1 rounded-full ${
              student?.usmle_step1_status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
              student?.usmle_step1_status === 'fail' ? 'bg-rose-100 text-rose-700' :
              'bg-stone-100 text-stone-400'
            }`}>
              {student?.usmle_step1_status === 'pass' ? 'Pass' : student?.usmle_step1_status === 'fail' ? 'Did not pass' : 'Not taken'}
            </span>
            {student?.usmle_step1_attempts != null && (
              <p className="text-xs text-stone-400 mt-1">
                {student.usmle_step1_attempts === 1 ? '1st attempt' : `${student.usmle_step1_attempts} attempts`}
              </p>
            )}
          </div>
          {[
            { label: 'Step 2', value: student?.usmle_step2_score ?? '—' },
            { label: 'Research', value: student?.research_count ?? '—' },
            { label: 'Risk', value: student?.risk_level ?? '—', color: student?.risk_level === 'low' ? 'text-emerald-600' : student?.risk_level === 'medium' ? 'text-amber-500' : 'text-rose-600' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl border border-stone-100 p-4">
              <p className="text-xs text-stone-400 uppercase tracking-wide">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 capitalize ${item.color || 'text-stone-900'}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white rounded-2xl border border-stone-100 p-1 w-fit shadow-sm">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-teal-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
              {tab.label}
              {tab.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/dashboard/advisor/student/${id}/activities`)}
                className="bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-50">
                Manage Activities
              </button>
            </div>

            {/* Log Meeting */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Log Advising Meeting</h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm text-stone-600 mb-1">Meeting Date</label>
                  <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3}
                placeholder="Meeting notes..."
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3" />
              <button onClick={handleSaveNote} disabled={saving || !newNote || !meetingDate}
                className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>

            {/* Meeting History */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Meeting History</h3>
              {notes.length === 0 ? (
                <p className="text-sm text-stone-400">No meetings logged yet.</p>
              ) : (
                <div className="space-y-4">
                  {notes.map(note => (
                    <div key={note.id} className="border-l-2 border-teal-200 pl-4">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-medium text-stone-900">{note.profiles?.full_name}</p>
                        <p className="text-xs text-stone-400">{new Date(note.meeting_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <p className="text-sm text-stone-600">{note.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LOR summary */}
            {(() => {
              const confirmed = lors.filter(l => l.status === 'confirmed' || l.status === 'submitted').length
              const LOR_STATUS_COLORS = {
                planning:  'bg-stone-100 text-stone-500',
                asked:     'bg-blue-100 text-blue-700',
                confirmed: 'bg-amber-100 text-amber-700',
                submitted: 'bg-emerald-100 text-emerald-700',
              }
              return (
                <div className="bg-white rounded-2xl border border-stone-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Letters of Recommendation</h3>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${confirmed >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {confirmed}/3 confirmed
                    </span>
                  </div>
                  {lors.length === 0 ? (
                    <p className="text-sm text-stone-400">No letter writers tracked yet. Remind this student to log their LOR contacts in the Letters tab.</p>
                  ) : (
                    <div className="space-y-2">
                      {lors.map(lor => (
                        <div key={lor.id} className="flex items-center gap-3 py-1.5">
                          <div className="w-7 h-7 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 text-xs font-semibold flex-shrink-0">
                            {lor.faculty_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate">{lor.faculty_name}</p>
                            {lor.faculty_specialty && <p className="text-xs text-stone-400 truncate">{lor.faculty_specialty}</p>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${LOR_STATUS_COLORS[lor.status] || 'bg-stone-100 text-stone-500'}`}>
                            {lor.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {lors.length > 0 && confirmed < 3 && (
                    <p className="text-xs text-amber-600 mt-3 pt-3 border-t border-stone-100">
                      ⚠ Needs {3 - confirmed} more confirmed letter{3 - confirmed !== 1 ? 's' : ''} before ERAS opens
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Milestones summary */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
                Milestones — {milestones.filter(m => m.status === 'completed').length}/{milestones.length} complete
              </h3>
              {milestones.length === 0 ? (
                <p className="text-sm text-stone-400">No milestones assigned.</p>
              ) : (
                ['MS1', 'MS2', 'MS3', 'MS4'].map(year => {
                  const yrMs = milestones.filter(m => m.milestones?.due_year === year)
                  if (!yrMs.length) return null
                  return (
                    <div key={year} className="mb-4 last:mb-0">
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{year}</p>
                      <div className="space-y-1.5">
                        {yrMs.map(m => (
                          <div key={m.id} className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status === 'completed' ? 'bg-emerald-400' : m.status === 'in_progress' ? 'bg-amber-400' : 'bg-stone-200'}`} />
                            <p className={`text-sm flex-1 ${m.status === 'completed' ? 'text-stone-300 line-through' : 'text-stone-800'}`}>{m.milestones?.title}</p>
                            {m.milestones?.specialty && (
                              <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">{m.milestones.specialty.split(' ').map(w => w[0]).join('').slice(0, 3)}</span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : m.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'}`}>
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
        )}

        {/* GRADES TAB */}
        {activeTab === 'grades' && (
          <GradesCard grades={grades} />
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {loadingDocs ? (
              <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center text-stone-400 text-sm">Loading documents...</div>
            ) : docs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center">
                <p className="text-stone-400 text-sm">No documents uploaded by this student yet.</p>
              </div>
            ) : (
              DOC_TYPES.map(type => {
                const typeDocs = docs.filter(d => d.docType === type.value)
                if (typeDocs.length === 0) return null
                return (
                  <div key={type.value} className="bg-white rounded-2xl border border-stone-100">
                    <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-stone-700">{type.label}</h3>
                      <span className="text-xs text-stone-400">{typeDocs.length} file{typeDocs.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {typeDocs.map(file => (
                        <div key={file.name} className="px-5 py-3.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-stone-900">{file.name.replace(/^\d+_/, '')}</p>
                            <p className="text-xs text-stone-400">
                              {formatSize(file.metadata?.size)}
                              {file.created_at && ` · ${new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                            </p>
                          </div>
                          <button onClick={() => handleViewDoc(file.path, file.name)}
                            className="text-sm text-teal-600 hover:text-teal-800 font-medium">
                            View ↗
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden flex flex-col" style={{ height: '520px' }}>
            <div className="px-6 py-4 border-b border-stone-100">
              <p className="text-sm font-semibold text-stone-900">{profile?.full_name}</p>
              <p className="text-xs text-stone-400">{student?.class_year} · {student?.specialty_interest}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-stone-400 text-center mt-8">No messages with this student yet.</p>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === myProfileId
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-stone-100 text-stone-900 rounded-tl-sm'}`}>
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-teal-200' : 'text-stone-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={el => { if (el) el.scrollIntoView({ behavior: 'smooth' }) }} />
            </div>
            <div className="px-4 py-3 border-t border-stone-100 flex gap-2">
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={`Message ${profile?.full_name?.split(' ')[0]}...`}
                className="flex-1 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button onClick={sendMessage} disabled={sendingMsg || !newMessage.trim()}
                className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors">
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
