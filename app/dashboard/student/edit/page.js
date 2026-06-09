'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateCompetitiveness } from '@/lib/scoring'

export default function EditStudentProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [studentId, setStudentId] = useState(null)
  const [form, setForm] = useState({
    specialty_interest: '',
    usmle_step1_score: '',
    usmle_step1_status: 'not_taken',
    usmle_step2_score: '',
    research_count: '',
    volunteer_hours: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('profile_id', user.id)
        .single()

      if (studentData) {
        setStudentId(studentData.id)
        setForm({
          specialty_interest: studentData.specialty_interest ?? '',
          usmle_step1_score: studentData.usmle_step1_score ?? '',
          usmle_step1_status: studentData.usmle_step1_status ?? 'not_taken',
          usmle_step2_score: studentData.usmle_step2_score ?? '',
          research_count: studentData.research_count ?? '',
          volunteer_hours: studentData.volunteer_hours ?? '',
        })
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    // Build the updated student object to calculate score
    const updatedStudent = {
      specialty_interest: form.specialty_interest || null,
      usmle_step1_score: form.usmle_step1_score ? parseInt(form.usmle_step1_score) : null,
      usmle_step1_status: form.usmle_step1_status,
      usmle_step2_score: form.usmle_step2_score ? parseInt(form.usmle_step2_score) : null,
      research_count: form.research_count ? parseInt(form.research_count) : 0,
      volunteer_hours: form.volunteer_hours ? parseInt(form.volunteer_hours) : 0,
    }

    // Fetch current activities, publications, and rotations for accurate scoring
    const [
      { count: activitiesCount },
      { data: pubData },
      { count: rotCount },
    ] = await Promise.all([
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
      supabase.from('publications').select('publication_type').eq('student_id', studentId),
      supabase.from('away_rotations').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
    ])

    // Calculate competitiveness score
    const result = calculateCompetitiveness(updatedStudent, activitiesCount || 0, pubData || [], rotCount || 0)

    const { error } = await supabase
      .from('students')
      .update({
        ...updatedStudent,
        risk_level: result?.riskLevel ?? null,
      })
      .eq('id', studentId)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    router.push('/dashboard/student')
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
          <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Edit My Profile</h2>
          <p className="text-gray-500 mt-1">Your competitiveness score updates automatically when you save</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialty Interest</label>
            <select name="specialty_interest" value={form.specialty_interest} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select a specialty</option>
              <option>Anesthesiology</option>
              <option>Dermatology</option>
              <option>Emergency Medicine</option>
              <option>Family Medicine</option>
              <option>Internal Medicine</option>
              <option>Neurology</option>
              <option>Obstetrics and Gynecology</option>
              <option>Ophthalmology</option>
              <option>Orthopedic Surgery</option>
              <option>Otolaryngology</option>
              <option>Pathology</option>
              <option>Pediatrics</option>
              <option>Physical Medicine and Rehabilitation</option>
              <option>Plastic Surgery</option>
              <option>Psychiatry</option>
              <option>Radiology</option>
              <option>Surgery</option>
              <option>Urology</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step 1 Status</label>
              <select name="usmle_step1_status" value={form.usmle_step1_status} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="not_taken">Not Taken</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step 1 Score</label>
              <input name="usmle_step1_score" type="number" value={form.usmle_step1_score} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step 2 Score</label>
              <input name="usmle_step2_score" type="number" value={form.usmle_step2_score} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Research Experiences</label>
              <input name="research_count" type="number" value={form.research_count} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volunteer Hours</label>
              <input name="volunteer_hours" type="number" value={form.volunteer_hours} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Calculating score & saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
