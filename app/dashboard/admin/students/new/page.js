'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashboardNav from '@/app/components/DashboardNav'

export default function NewStudent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    banner_id: '',
    class_year: 'MS1',
    specialty_interest: '',
    usmle_step1_score: '',
    usmle_step1_status: 'not_taken',
    usmle_step2_score: '',
    research_count: '',
    volunteer_hours: '',
    risk_level: 'low'
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

    const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })

    const result = await response.json()

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard/admin')
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav backHref="/dashboard/admin" />

      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">Add New Student</h2>
          <p className="text-stone-500 mt-1">Create a new student account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} required
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Banner ID</label>
              <input name="banner_id" value={form.banner_id} onChange={handleChange}
                placeholder="e.g. 916405336"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Rowan Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              placeholder="student@rowan.edu"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Class Year</label>
              <select name="class_year" value={form.class_year} onChange={handleChange}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
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
          </div>

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
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Step 2 Score</label>
              <input name="usmle_step2_score" type="number" value={form.usmle_step2_score} onChange={handleChange}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Research Experiences</label>
              <input name="research_count" type="number" value={form.research_count} onChange={handleChange}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Volunteer Hours</label>
              <input name="volunteer_hours" type="number" value={form.volunteer_hours} onChange={handleChange}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Risk Level</label>
              <select name="risk_level" value={form.risk_level} onChange={handleChange}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {error && <p className="text-rose-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-teal-600 text-white py-2 px-4 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Student'}
          </button>
        </form>
      </div>
    </div>
  )
}