'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import DashboardNav from '@/app/components/DashboardNav'
import { calculateCompetitiveness } from '@/lib/scoring'

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

export default function AdminEditStudent() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [studentName, setStudentName] = useState('')
  const [form, setForm] = useState({
    class_year: '',
    specialty_interest: '',
    usmle_step1_score: '',
    usmle_step1_status: 'not_taken',
    usmle_step2_score: '',
    research_count: '',
    volunteer_hours: '',
    risk_level: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: studentData } = await supabase
        .from('students')
        .select('*, profiles(full_name)')
        .eq('id', id)
        .single()

      if (studentData) {
        setStudentName(studentData.profiles?.full_name || '')
        setForm({
          class_year: studentData.class_year ?? '',
          specialty_interest: studentData.specialty_interest ?? '',
          usmle_step1_score: studentData.usmle_step1_score ?? '',
          usmle_step1_status: studentData.usmle_step1_status ?? 'not_taken',
          usmle_step2_score: studentData.usmle_step2_score ?? '',
          research_count: studentData.research_count ?? '',
          volunteer_hours: studentData.volunteer_hours ?? '',
          risk_level: studentData.risk_level ?? '',
        })
      }

      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const updatedStudent = {
      class_year: form.class_year || null,
      specialty_interest: form.specialty_interest || null,
      usmle_step1_score: form.usmle_step1_score ? parseInt(form.usmle_step1_score) : null,
      usmle_step1_status: form.usmle_step1_status,
      usmle_step2_score: form.usmle_step2_score ? parseInt(form.usmle_step2_score) : null,
      research_count: form.research_count ? parseInt(form.research_count) : 0,
      volunteer_hours: form.volunteer_hours ? parseInt(form.volunteer_hours) : 0,
    }

    // Fetch all scoring inputs for accurate recalculation
    const [
      { count: activitiesCount },
      { data: pubData },
      { count: rotCount },
    ] = await Promise.all([
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('student_id', id),
      supabase.from('publications').select('publication_type').eq('student_id', id),
      supabase.from('away_rotations').select('id', { count: 'exact', head: true }).eq('student_id', id),
    ])

    const result = calculateCompetitiveness(updatedStudent, activitiesCount || 0, pubData || [], rotCount || 0)
    const riskLevel = form.risk_level || result?.riskLevel || null

    const { error: updateError } = await supabase
      .from('students')
      .update({ ...updatedStudent, risk_level: riskLevel })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    // Auto-assign specialty milestones if specialty changed
    if (updatedStudent.specialty_interest) {
      const { data: specialtyMilestones } = await supabase
        .from('milestones').select('id').eq('specialty', updatedStudent.specialty_interest)

      if (specialtyMilestones?.length > 0) {
        const { data: existing } = await supabase
          .from('student_milestones').select('milestone_id').eq('student_id', id)
          .in('milestone_id', specialtyMilestones.map(m => m.id))

        const existingIds = new Set(existing?.map(e => e.milestone_id) || [])
        const toInsert = specialtyMilestones
          .filter(m => !existingIds.has(m.id))
          .map(m => ({ student_id: id, milestone_id: m.id, status: 'not_started' }))

        if (toInsert.length > 0) await supabase.from('student_milestones').insert(toInsert)
      }
    }

    router.push(`/dashboard/admin/students/${id}`)
  }

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav backHref={`/dashboard/admin/students/${id}`} />

      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">Edit Student</h2>
          <p className="text-stone-500 mt-1">{studentName}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">

          {/* Year + Specialty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Class Year</label>
              <select name="class_year" value={form.class_year} onChange={handleChange}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select year</option>
                <option>MS1</option>
                <option>MS2</option>
                <option>MS3</option>
                <option>MS4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Specialty Interest</label>
              <select name="specialty_interest" value={form.specialty_interest} onChange={handleChange}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select specialty</option>
                {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Board scores */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Board Scores</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Step 1 Status</label>
                <select name="usmle_step1_status" value={form.usmle_step1_status} onChange={handleChange}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="not_taken">Not Taken</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Step 1 Score</label>
                <input name="usmle_step1_score" type="number" value={form.usmle_step1_score} onChange={handleChange}
                  placeholder="e.g. 235"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Step 2 CK Score</label>
                <input name="usmle_step2_score" type="number" value={form.usmle_step2_score} onChange={handleChange}
                  placeholder="e.g. 250"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          </div>

          {/* Institutional data */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Institutional Data</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Research Experiences</label>
                <input name="research_count" type="number" value={form.research_count} onChange={handleChange}
                  placeholder="0"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Volunteer Hours</label>
                <input name="volunteer_hours" type="number" value={form.volunteer_hours} onChange={handleChange}
                  placeholder="0"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          </div>

          {/* Risk override */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Risk Level Override</label>
            <p className="text-xs text-stone-400 mb-2">Leave blank to use the auto-calculated score.</p>
            <select name="risk_level" value={form.risk_level} onChange={handleChange}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Auto-calculate from scores</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          {error && <p className="text-rose-500 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-teal-600 text-white py-2 px-4 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
            {saving ? 'Saving & recalculating score...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
