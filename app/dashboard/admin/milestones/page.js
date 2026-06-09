'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const YEARS = ['MS1', 'MS2', 'MS3', 'MS4']

const emptyForm = { title: '', due_year: 'MS1', category: '', description: '', is_required: true }

export default function MilestoneManagement() {
  const router = useRouter()
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data } = await supabase
        .from('milestones')
        .select('*')
        .order('due_year', { ascending: true })

      setMilestones(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.title) return
    setSaving(true)
    setError('')

    const { data, error } = await supabase
      .from('milestones')
      .insert({
        title: form.title,
        due_year: form.due_year,
        category: form.category || null,
        description: form.description || null,
        is_required: form.is_required,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    // Assign this milestone to all existing students
    const { data: students } = await supabase.from('students').select('id')
    if (students && students.length > 0) {
      await supabase.from('student_milestones').insert(
        students.map(s => ({ student_id: s.id, milestone_id: data.id, status: 'not_started' }))
      )
    }

    setMilestones([...milestones, data])
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this milestone? This will remove it from all students.')) return
    await supabase.from('student_milestones').delete().eq('milestone_id', id)
    await supabase.from('milestones').delete().eq('id', id)
    setMilestones(milestones.filter(m => m.id !== id))
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
          <nav className="flex gap-4 text-sm">
            <button onClick={() => router.push('/dashboard/admin')} className="text-gray-500 hover:text-gray-900">Students</button>
            <button onClick={() => router.push('/dashboard/admin/analytics')} className="text-gray-500 hover:text-gray-900">Analytics</button>
            <span className="font-medium text-blue-600 border-b-2 border-blue-600 pb-0.5">Milestones</span>
          </nav>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
          className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1 rounded-md"
        >
          Sign Out
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Milestone Framework</h2>
            <p className="text-gray-500 mt-1">{milestones.length} milestones · assigned to all students</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            + Add Milestone
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-lg border border-gray-200 p-5 mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">New Milestone</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input name="title" value={form.title} onChange={handleChange} required
                  placeholder="e.g. Complete USMLE Step 1 registration"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select name="due_year" value={form.due_year} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input name="category" value={form.category} onChange={handleChange}
                  placeholder="e.g. Exams, Research, Clinical"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={2}
                  placeholder="Additional details about this milestone..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" name="is_required" checked={form.is_required} onChange={handleChange} className="w-4 h-4" />
                <label className="text-sm text-gray-700">Required milestone</label>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Milestone'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm) }}
                className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-md">
                Cancel
              </button>
            </div>
          </form>
        )}

        {YEARS.map(year => {
          const yearMilestones = milestones.filter(m => m.due_year === year)
          if (yearMilestones.length === 0) return null
          return (
            <div key={year} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{year}</h3>
                <span className="text-xs text-gray-300">({yearMilestones.length})</span>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                {yearMilestones.map(m => (
                  <div key={m.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{m.title}</p>
                        {m.is_required && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Required</span>
                        )}
                        {m.category && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{m.category}</span>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-xs text-gray-400 mt-1">{m.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {milestones.length === 0 && !showForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No milestones defined yet. Click "+ Add Milestone" to create your first one.
          </div>
        )}
      </div>
    </div>
  )
}
