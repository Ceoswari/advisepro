'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i)

const emptyForm = {
  type: '', title: '', organization_name: '', city: '', state: '', country: 'United States',
  start_month: '', start_year: '', end_month: '', end_year: '', is_present: false,
  hours_per_week: '', is_intermittent: false, description: '', is_most_meaningful: false,
  most_meaningful_description: ''
}

export default function AdvisorActivities() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentName, setStudentName] = useState('')
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
        .select('*, profiles(full_name)')
        .eq('id', id)
        .single()

      if (studentData) {
        setStudentName(studentData.profiles?.full_name || '')
        const { data: activitiesData } = await supabase
          .from('activities')
          .select('*')
          .eq('student_id', id)
          .order('created_at', { ascending: false })
        setActivities(activitiesData || [])
      }

      setLoading(false)
    }
    fetchData()
  }, [id])

  const parseDescription = (desc) => { try { return JSON.parse(desc) } catch { return {} } }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const resetForm = () => { setForm(emptyForm); setShowForm(false); setEditingId(null) }

  const handleEdit = (activity) => {
    const details = parseDescription(activity.description)
    const startDate = activity.start_date ? new Date(activity.start_date) : null
    const endDate = activity.end_date ? new Date(activity.end_date) : null
    setForm({
      type: activity.type, title: activity.title,
      organization_name: details.organization_name || '', city: details.city || '',
      state: details.state || '', country: details.country || 'United States',
      start_month: startDate ? MONTHS[startDate.getUTCMonth()] : '',
      start_year: startDate ? startDate.getUTCFullYear().toString() : '',
      end_month: endDate ? MONTHS[endDate.getUTCMonth()] : '',
      end_year: endDate ? endDate.getUTCFullYear().toString() : '',
      is_present: details.is_present || false, hours_per_week: details.hours_per_week || '',
      is_intermittent: details.is_intermittent || false, description: details.experience_description || '',
      is_most_meaningful: activity.is_most_meaningful || false,
      most_meaningful_description: details.most_meaningful_description || ''
    })
    setEditingId(activity.id); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const mostMeaningfulCount = activities.filter(a => a.is_most_meaningful && a.id !== editingId).length
    if (form.is_most_meaningful && mostMeaningfulCount >= 3) {
      alert('Only 3 experiences can be marked most meaningful.')
      setSaving(false); return
    }
    if (form.description.length > 700) { alert('Description max 700 chars.'); setSaving(false); return }
    if (form.most_meaningful_description.length > 1325) { alert('Most meaningful description max 1325 chars.'); setSaving(false); return }

    const startDate = form.start_month && form.start_year
      ? `${form.start_year}-${String(MONTHS.indexOf(form.start_month) + 1).padStart(2, '0')}-01` : null
    const endDate = !form.is_present && form.end_month && form.end_year
      ? `${form.end_year}-${String(MONTHS.indexOf(form.end_month) + 1).padStart(2, '0')}-01` : null

    const payload = {
      student_id: id, type: form.type, title: form.title,
      description: JSON.stringify({
        organization_name: form.organization_name, city: form.city, state: form.state,
        country: form.country, hours_per_week: form.hours_per_week, is_intermittent: form.is_intermittent,
        is_present: form.is_present, experience_description: form.description,
        most_meaningful_description: form.most_meaningful_description
      }),
      start_date: startDate, end_date: endDate,
      hours: form.hours_per_week ? parseInt(form.hours_per_week) : null,
      is_most_meaningful: form.is_most_meaningful
    }

    if (editingId) {
      const { data, error } = await supabase.from('activities').update(payload).eq('id', editingId).select().single()
      if (!error) { setActivities(activities.map(a => a.id === editingId ? data : a)); resetForm() }
    } else {
      const { data, error } = await supabase.from('activities').insert(payload).select().single()
      if (!error) { setActivities([data, ...activities]); resetForm() }
    }
    setSaving(false)
  }

  const handleDelete = async (actId) => {
    if (!confirm('Delete this experience?')) return
    await supabase.from('activities').delete().eq('id', actId)
    setActivities(activities.filter(a => a.id !== actId))
  }

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-stone-500 hover:text-stone-900">← Back</button>
        <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-stone-900">AdvisePro</span>
          </div>
        <span className="text-sm text-stone-400">· Editing activities for {studentName}</span>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Experiences & Activities</h2>
            <p className="text-stone-500 mt-1">{studentName} · {activities.length}/15 · {activities.filter(a => a.is_most_meaningful).length}/3 most meaningful</p>
          </div>
          {!showForm && activities.length < 15 && (
            <button onClick={() => setShowForm(true)}
              className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700">
              + Add Experience
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-stone-700">{editingId ? 'Edit Experience' : 'New Experience'}</h3>
              <button type="button" onClick={resetForm} className="text-sm text-stone-400 hover:text-stone-600">Cancel</button>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Type <span className="text-rose-500">*</span></label>
              <select name="type" value={form.type} onChange={handleChange} required
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select a type</option>
                {ERAS_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Position / Title <span className="text-rose-500">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Organization Name</label>
              <input name="organization_name" value={form.organization_name} onChange={handleChange}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-stone-700 mb-1">City</label>
                <input name="city" value={form.city} onChange={handleChange} className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
              <div><label className="block text-xs font-medium text-stone-700 mb-1">State</label>
                <input name="state" value={form.state} onChange={handleChange} className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
              <div><label className="block text-xs font-medium text-stone-700 mb-1">Country</label>
                <input name="country" value={form.country} onChange={handleChange} className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Start Date</label>
                <div className="grid grid-cols-2 gap-2">
                  <select name="start_month" value={form.start_month} onChange={handleChange}
                    className="border border-stone-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Month</option>{MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <select name="start_year" value={form.start_year} onChange={handleChange}
                    className="border border-stone-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Year</option>{YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-stone-700">End Date</label>
                  <label className="flex items-center gap-1 text-xs text-stone-500 cursor-pointer">
                    <input type="checkbox" name="is_present" checked={form.is_present} onChange={handleChange} className="w-3 h-3" /> Ongoing
                  </label>
                </div>
                {!form.is_present && (
                  <div className="grid grid-cols-2 gap-2">
                    <select name="end_month" value={form.end_month} onChange={handleChange}
                      className="border border-stone-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="">Month</option>{MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                    <select name="end_year" value={form.end_year} onChange={handleChange}
                      className="border border-stone-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="">Year</option>{YEARS.map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-stone-700 mb-1">Hours/Week</label>
                <input name="hours_per_week" type="number" value={form.hours_per_week} onChange={handleChange}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" name="is_intermittent" checked={form.is_intermittent} onChange={handleChange} className="w-4 h-4" />
                <label className="text-sm text-stone-700">Intermittent</label>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-stone-700">Description <span className="text-rose-500">*</span></label>
                <span className={`text-xs ${form.description.length > 700 ? 'text-rose-500' : 'text-stone-400'}`}>{form.description.length}/700</span>
              </div>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} required
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="border border-stone-200 rounded-xl p-3 bg-stone-50">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer">
                <input type="checkbox" name="is_most_meaningful" checked={form.is_most_meaningful} onChange={handleChange} className="w-4 h-4" />
                Most Meaningful Experience
              </label>
              {form.is_most_meaningful && (
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-stone-600">Why is this meaningful?</label>
                    <span className={`text-xs ${form.most_meaningful_description.length > 1325 ? 'text-rose-500' : 'text-stone-400'}`}>{form.most_meaningful_description.length}/1325</span>
                  </div>
                  <textarea name="most_meaningful_description" value={form.most_meaningful_description} onChange={handleChange} rows={3}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              )}
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-teal-600 text-white py-2 px-4 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Update Experience' : 'Save Experience'}
            </button>
          </form>
        )}

        {activities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">No activities yet.</div>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => {
              const details = parseDescription(activity.description)
              const isExpanded = expandedId === activity.id
              return (
                <div key={activity.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-teal-100 text-teal-700">{activity.type}</span>
                        {activity.is_most_meaningful && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ Most Meaningful</span>}
                      </div>
                      <p className="font-medium text-stone-900 mt-2">{activity.title}</p>
                      {details.organization_name && <p className="text-sm text-stone-500">{details.organization_name}{details.city ? ` · ${details.city}` : ''}</p>}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button onClick={() => setExpandedId(isExpanded ? null : activity.id)} className="text-sm text-teal-600 hover:text-teal-800">{isExpanded ? 'Hide' : 'View'}</button>
                      <button onClick={() => handleEdit(activity)} className="text-sm text-stone-500 hover:text-stone-900">Edit</button>
                      <button onClick={() => handleDelete(activity.id)} className="text-sm text-stone-400 hover:text-rose-500">Delete</button>
                    </div>
                  </div>
                  {isExpanded && details.experience_description && (
                    <div className="mt-3 pt-3 border-t border-stone-100">
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-stone-700">{details.experience_description}</p>
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
