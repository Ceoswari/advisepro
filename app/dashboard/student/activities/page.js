'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ERAS_TYPES = [
  'Community Service / Volunteer — Medical/Clinical',
  'Community Service / Volunteer — Non-Medical',
  'Extracurricular / Hobbies / Avocations',
  'Leadership — Not Listed Elsewhere',
  'Other',
  'Paid Employment — Military',
  'Paid Employment — Non-Military',
  'Physician Shadowing',
  'Research / Lab',
  'Teaching / Tutoring'
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i)

const emptyForm = {
  type: '',
  title: '',
  organization_name: '',
  city: '',
  state: '',
  country: 'United States',
  start_month: '',
  start_year: '',
  end_month: '',
  end_year: '',
  is_present: false,
  hours_per_week: '',
  is_intermittent: false,
  description: '',
  is_most_meaningful: false,
  most_meaningful_description: ''
}

export default function Activities() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState(null)
  const [activities, setActivities] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (studentData) {
        setStudentId(studentData.id)
        const { data: activitiesData } = await supabase
          .from('activities')
          .select('*')
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: false })
        setActivities(activitiesData || [])
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const resetForm = () => {
    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  const handleEdit = (activity) => {
    const details = parseDescription(activity.description)
    const startDate = activity.start_date ? new Date(activity.start_date) : null
    const endDate = activity.end_date ? new Date(activity.end_date) : null

    setForm({
      type: activity.type,
      title: activity.title,
      organization_name: details.organization_name || '',
      city: details.city || '',
      state: details.state || '',
      country: details.country || 'United States',
      start_month: startDate ? MONTHS[startDate.getUTCMonth()] : '',
      start_year: startDate ? startDate.getUTCFullYear().toString() : '',
      end_month: endDate ? MONTHS[endDate.getUTCMonth()] : '',
      end_year: endDate ? endDate.getUTCFullYear().toString() : '',
      is_present: details.is_present || false,
      hours_per_week: details.hours_per_week || '',
      is_intermittent: details.is_intermittent || false,
      description: details.experience_description || '',
      is_most_meaningful: activity.is_most_meaningful || false,
      most_meaningful_description: details.most_meaningful_description || ''
    })
    setEditingId(activity.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const mostMeaningfulCount = activities.filter(a => a.is_most_meaningful && a.id !== editingId).length
    if (form.is_most_meaningful && mostMeaningfulCount >= 3) {
      alert('You can only mark up to 3 experiences as most meaningful.')
      setSaving(false)
      return
    }

    if (form.description.length > 700) {
      alert('Description cannot exceed 700 characters.')
      setSaving(false)
      return
    }

    if (form.most_meaningful_description.length > 1325) {
      alert('Most meaningful description cannot exceed 1325 characters.')
      setSaving(false)
      return
    }

    const startDate = form.start_month && form.start_year
      ? `${form.start_year}-${String(MONTHS.indexOf(form.start_month) + 1).padStart(2, '0')}-01`
      : null

    const endDate = !form.is_present && form.end_month && form.end_year
      ? `${form.end_year}-${String(MONTHS.indexOf(form.end_month) + 1).padStart(2, '0')}-01`
      : null

    const payload = {
      student_id: studentId,
      type: form.type,
      title: form.title,
      description: JSON.stringify({
        organization_name: form.organization_name,
        city: form.city,
        state: form.state,
        country: form.country,
        hours_per_week: form.hours_per_week,
        is_intermittent: form.is_intermittent,
        is_present: form.is_present,
        experience_description: form.description,
        most_meaningful_description: form.most_meaningful_description
      }),
      start_date: startDate,
      end_date: endDate,
      hours: form.hours_per_week ? parseInt(form.hours_per_week) : null,
      is_most_meaningful: form.is_most_meaningful
    }

    if (editingId) {
      const { data, error } = await supabase
        .from('activities')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()

      if (!error) {
        setActivities(activities.map(a => a.id === editingId ? data : a))
        resetForm()
      }
    } else {
      const { data, error } = await supabase
        .from('activities')
        .insert(payload)
        .select()
        .single()

      if (!error) {
        setActivities([data, ...activities])
        resetForm()
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this experience?')) return
    await supabase.from('activities').delete().eq('id', id)
    setActivities(activities.filter(a => a.id !== id))
  }

  const parseDescription = (desc) => {
    try { return JSON.parse(desc) } catch { return {} }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/student')} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
          <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Experiences & Activities</h2>
            <p className="text-gray-500 mt-1">
              {activities.length} / 15 experiences · {activities.filter(a => a.is_most_meaningful).length} / 3 most meaningful
            </p>
          </div>
          {!showForm && activities.length < 15 && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              + Add Experience
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 mb-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">{editingId ? 'Edit Experience' : 'New Experience'}</h3>
              <button type="button" onClick={resetForm} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience Type <span className="text-red-500">*</span></label>
              <select name="type" value={form.type} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a type</option>
                {ERAS_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position / Title <span className="text-red-500">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required
                placeholder="e.g. Research Assistant"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name <span className="text-red-500">*</span></label>
              <input name="organization_name" value={form.organization_name} onChange={handleChange} required
                placeholder="e.g. Cooper University Hospital"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input name="city" value={form.city} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input name="state" value={form.state} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input name="country" value={form.country} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-4">
                <select name="start_month" value={form.start_month} onChange={handleChange} required
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Month</option>
                  {MONTHS.map(m => <option key={m}>{m}</option>)}
                </select>
                <select name="start_year" value={form.start_year} onChange={handleChange} required
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Year</option>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" name="is_present" checked={form.is_present} onChange={handleChange} className="w-4 h-4" />
                  Currently ongoing
                </label>
              </div>
              {!form.is_present && (
                <div className="grid grid-cols-2 gap-4">
                  <select name="end_month" value={form.end_month} onChange={handleChange}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Month</option>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <select name="end_year" value={form.end_year} onChange={handleChange}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Per Week</label>
                <input name="hours_per_week" type="number" value={form.hours_per_week} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" name="is_intermittent" checked={form.is_intermittent} onChange={handleChange} className="w-4 h-4" />
                <label className="text-sm text-gray-700">Repeated / Intermittent</label>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
                <span className={`text-xs ${form.description.length > 700 ? 'text-red-500' : 'text-gray-400'}`}>
                  {form.description.length} / 700
                </span>
              </div>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} required
                placeholder="Describe your role and responsibilities..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" name="is_most_meaningful" checked={form.is_most_meaningful} onChange={handleChange} className="w-4 h-4" />
                <label className="text-sm font-medium text-gray-700">Mark as Most Meaningful Experience (up to 3)</label>
              </div>
              {form.is_most_meaningful && (
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-sm text-gray-600">Why is this meaningful to you?</label>
                    <span className={`text-xs ${form.most_meaningful_description.length > 1325 ? 'text-red-500' : 'text-gray-400'}`}>
                      {form.most_meaningful_description.length} / 1325
                    </span>
                  </div>
                  <textarea name="most_meaningful_description" value={form.most_meaningful_description} onChange={handleChange} rows={4}
                    placeholder="Explain why this experience was most meaningful to you..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Update Experience' : 'Save Experience'}
            </button>
          </form>
        )}

        {activities.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No experiences added yet. Click "+ Add Experience" to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => {
              const details = parseDescription(activity.description)
              const isExpanded = expandedId === activity.id
              return (
                <div key={activity.id} className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {activity.type}
                        </span>
                        {activity.is_most_meaningful && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⭐ Most Meaningful</span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 mt-2">{activity.title}</p>
                      {details.organization_name && (
                        <p className="text-sm text-gray-500">{details.organization_name}{details.city ? ` · ${details.city}${details.state ? `, ${details.state}` : ''}` : ''}</p>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        {activity.start_date && (
                          <span>
                            {new Date(activity.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            {' → '}
                            {details.is_present ? 'Present' : activity.end_date ? new Date(activity.end_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Present'}
                          </span>
                        )}
                        {details.hours_per_week && <span>{details.hours_per_week} hrs/week</span>}
                        {details.is_intermittent && <span>Intermittent</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                        className="text-sm text-blue-600 hover:text-blue-800">
                        {isExpanded ? 'Hide' : 'View'}
                      </button>
                      <button onClick={() => handleEdit(activity)}
                        className="text-sm text-gray-500 hover:text-gray-900">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(activity.id)}
                        className="text-sm text-gray-400 hover:text-red-500">
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      {details.experience_description && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                          <p className="text-sm text-gray-700">{details.experience_description}</p>
                        </div>
                      )}
                      {activity.is_most_meaningful && details.most_meaningful_description && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Why Most Meaningful</p>
                          <p className="text-sm text-gray-700">{details.most_meaningful_description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}