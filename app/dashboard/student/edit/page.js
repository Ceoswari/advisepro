'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashboardNav from '@/app/components/DashboardNav'

const SPECIALTIES = [
  'Anesthesiology',
  'Child Neurology',
  'Dermatology',
  'Diagnostic Radiology',
  'Emergency Medicine',
  'Family Medicine',
  'General Surgery',
  'Internal Medicine',
  'Internal Medicine/Pediatrics',
  'Interventional Radiology',
  'Neurological Surgery',
  'Neurology',
  'Obstetrics and Gynecology',
  'Orthopaedic Surgery',
  'Otolaryngology',
  'Pathology',
  'Pediatrics',
  'Physical Medicine and Rehabilitation',
  'Plastic Surgery',
  'Psychiatry',
  'Radiation Oncology',
  'Vascular Surgery',
]

export default function EditStudentProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [studentId, setStudentId] = useState(null)
  const [specialtyInterest, setSpecialtyInterest] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: studentData } = await supabase
        .from('students')
        .select('id, specialty_interest')
        .eq('profile_id', user.id)
        .single()

      if (studentData) {
        setStudentId(studentData.id)
        setSpecialtyInterest(studentData.specialty_interest ?? '')
      }

      setLoading(false)
    }
    fetchData()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('students')
      .update({ specialty_interest: specialtyInterest || null })
      .eq('id', studentId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    // Auto-assign specialty milestones when specialty changes
    if (specialtyInterest) {
      const { data: specialtyMilestones } = await supabase
        .from('milestones')
        .select('id')
        .eq('specialty', specialtyInterest)

      if (specialtyMilestones?.length > 0) {
        const { data: existing } = await supabase
          .from('student_milestones')
          .select('milestone_id')
          .eq('student_id', studentId)
          .in('milestone_id', specialtyMilestones.map(m => m.id))

        const existingIds = new Set(existing?.map(e => e.milestone_id) || [])
        const toInsert = specialtyMilestones
          .filter(m => !existingIds.has(m.id))
          .map(m => ({ student_id: studentId, milestone_id: m.id, status: 'not_started' }))

        if (toInsert.length > 0) {
          await supabase.from('student_milestones').insert(toInsert)
        }
      }
    }

    router.push('/dashboard/student')
  }

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav backHref="/dashboard/student" />

      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">Edit My Profile</h2>
          <p className="text-stone-500 mt-1">Update your specialty interest to unlock your milestone track</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <label className="block text-sm font-medium text-stone-700 mb-1">Specialty Interest</label>
            <p className="text-xs text-stone-400 mb-3">Choosing a specialty unlocks your specialty-specific milestone roadmap.</p>
            <select value={specialtyInterest} onChange={e => setSpecialtyInterest(e.target.value)}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select a specialty</option>
              {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-stone-400 text-lg flex-shrink-0">🔒</span>
            <div>
              <p className="text-sm font-medium text-stone-700">Scores and official data are managed by your program</p>
              <p className="text-xs text-stone-400 mt-0.5">
                USMLE scores, class year, research experiences, and volunteer hours are entered by your program administrator. Contact your advisor if any data appears incorrect.
              </p>
            </div>
          </div>

          {error && <p className="text-rose-500 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-teal-600 text-white py-2 px-4 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
