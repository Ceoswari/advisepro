'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashboardNav from '@/app/components/DashboardNav'

const YEARS = ['MS1', 'MS2', 'MS3', 'MS4']
const SPECIALTIES = [
  'Anesthesiology','Child Neurology','Dermatology','Diagnostic Radiology',
  'Emergency Medicine','Family Medicine','General Surgery','Internal Medicine',
  'Internal Medicine/Pediatrics','Interventional Radiology','Neurological Surgery',
  'Neurology','Obstetrics and Gynecology','Orthopaedic Surgery','Otolaryngology',
  'Pathology','Pediatrics','Physical Medicine and Rehabilitation','Plastic Surgery',
  'Psychiatry','Radiation Oncology','Vascular Surgery',
]

const emptyForm = { title: '', due_year: 'MS1', category: '', description: '' }

export default function MilestoneManagement() {
  const router = useRouter()
  const [milestones, setMilestones] = useState([])
  const [specialtyMilestones, setSpecialtyMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('universal')
  const [specialtyFilter, setSpecialtyFilter] = useState(SPECIALTIES[0])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [{ data: universal }, { data: specialty }] = await Promise.all([
        supabase.from('milestones').select('*').is('specialty', null).order('due_year', { ascending: true }),
        supabase.from('milestones').select('*').not('specialty', 'is', null).order('specialty').order('due_year'),
      ])

      setMilestones(universal || [])
      setSpecialtyMilestones(specialty || [])
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

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav navItems={[
        { label: 'Students', href: '/dashboard/admin' },
        { label: 'Analytics', href: '/dashboard/admin/analytics' },
        { label: 'Milestones', href: '/dashboard/admin/milestones' },
      ]} />

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Milestone Framework</h2>
            <p className="text-stone-500 mt-1">{milestones.length} universal · {specialtyMilestones.length} specialty-specific</p>
          </div>
          {activeTab === 'universal' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700">
              + Add Milestone
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-stone-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('universal')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'universal' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            Universal ({milestones.length})
          </button>
          <button
            onClick={() => setActiveTab('specialty')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'specialty' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            Specialty Track ({specialtyMilestones.length})
          </button>
        </div>

        {activeTab === 'universal' && showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-stone-200 p-5 mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">New Milestone</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input name="title" value={form.title} onChange={handleChange} required
                  placeholder="e.g. Complete USMLE Step 1 registration"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Year</label>
                <select name="due_year" value={form.due_year} onChange={handleChange}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                <input name="category" value={form.category} onChange={handleChange}
                  placeholder="e.g. Exams, Research, Clinical"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={2}
                  placeholder="Additional details about this milestone..."
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            {error && <p className="text-rose-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Milestone'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm) }}
                className="text-sm text-stone-500 hover:text-stone-900 border border-stone-200 px-4 py-2 rounded-xl">
                Cancel
              </button>
            </div>
          </form>
        )}

        {activeTab === 'universal' && YEARS.map(year => {
          const yearMilestones = milestones.filter(m => m.due_year === year)
          if (yearMilestones.length === 0) return null
          return (
            <div key={year} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{year}</h3>
                <span className="text-xs text-stone-300">({yearMilestones.length})</span>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
                {yearMilestones.map(m => (
                  <div key={m.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-stone-900">{m.title}</p>
                        {m.category && (
                          <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{m.category}</span>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-xs text-stone-400 mt-1">{m.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-xs text-stone-400 hover:text-rose-500 flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {activeTab === 'universal' && milestones.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">
            No universal milestones defined yet. Click "+ Add Milestone" to create your first one.
          </div>
        )}

        {/* Specialty Track tab */}
        {activeTab === 'specialty' && (
          <div>
            {specialtyMilestones.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
                <p className="text-stone-500 text-sm mb-2">No specialty milestones found.</p>
                <p className="text-stone-400 text-xs">Run <code className="bg-stone-100 px-1 rounded">specialty_milestones.sql</code> in the Supabase SQL Editor to load all specialty data.</p>
              </div>
            ) : (
              <div>
                {/* Specialty selector */}
                <div className="flex gap-3 mb-5 flex-wrap">
                  {SPECIALTIES.map(s => {
                    const count = specialtyMilestones.filter(m => m.specialty === s).length
                    if (count === 0) return null
                    return (
                      <button key={s}
                        onClick={() => setSpecialtyFilter(s)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-all ${specialtyFilter === s ? 'bg-teal-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-teal-300'}`}>
                        {s} ({count})
                      </button>
                    )
                  })}
                </div>

                {/* Milestones for selected specialty */}
                {(() => {
                  const filtered = specialtyMilestones.filter(m => m.specialty === specialtyFilter)
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-stone-900">{specialtyFilter}</h3>
                        <span className="text-xs text-stone-400">{filtered.length} milestones · sourced from ACGME, specialty societies, and NRMP 2024 data</span>
                      </div>
                      {YEARS.map(year => {
                        const yearMs = filtered.filter(m => m.due_year === year)
                        if (yearMs.length === 0) return null
                        return (
                          <div key={year} className="mb-4">
                            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{year}</p>
                            <div className="bg-white rounded-2xl border border-stone-100 divide-y divide-stone-50">
                              {yearMs.map(m => (
                                <div key={m.id} className="px-5 py-4">
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-stone-900">{m.title}</p>
                                        {m.priority === 'high' && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">High priority</span>}
                                        {m.category && <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{m.category}</span>}
                                        {m.source && <span className="text-xs text-stone-300">{m.source}</span>}
                                      </div>
                                      {m.description && <p className="text-xs text-stone-400 mt-1">{m.description}</p>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
