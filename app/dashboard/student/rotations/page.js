'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + 2 - i)

const SPECIALTIES = [
  'Anesthesiology','Dermatology','Emergency Medicine','Family Medicine',
  'Internal Medicine','Neurology','Obstetrics and Gynecology','Ophthalmology',
  'Orthopedic Surgery','Otolaryngology','Pathology','Pediatrics',
  'Physical Medicine and Rehabilitation','Plastic Surgery','Psychiatry',
  'Radiology','Surgery','Urology'
]

const STATUS_COLORS = {
  planned:   'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const emptyForm = {
  program_name: '', specialty: '', institution: '', city: '', state: '',
  start_month: '', start_year: '', end_month: '', end_year: '',
  status: 'planned', notes: ''
}

export default function AwayRotations() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState(null)
  const [rotations, setRotations] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: studentData } = await supabase
        .from('students').select('id').eq('profile_id', user.id).single()

      if (studentData) {
        setStudentId(studentData.id)
        const { data } = await supabase
          .from('away_rotations').select('*')
          .eq('student_id', studentData.id)
          .order('start_date', { ascending: false })
        setRotations(data || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })
  const resetForm = () => { setForm(emptyForm); setShowForm(false); setEditingId(null) }

  const handleEdit = (rot) => {
    const start = rot.start_date ? new Date(rot.start_date) : null
    const end = rot.end_date ? new Date(rot.end_date) : null
    setForm({
      program_name: rot.program_name,
      specialty: rot.specialty || '',
      institution: rot.institution || '',
      city: rot.city || '',
      state: rot.state || '',
      start_month: start ? MONTHS[start.getUTCMonth()] : '',
      start_year: start ? start.getUTCFullYear().toString() : '',
      end_month: end ? MONTHS[end.getUTCMonth()] : '',
      end_year: end ? end.getUTCFullYear().toString() : '',
      status: rot.status || 'planned',
      notes: rot.notes || '',
    })
    setEditingId(rot.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const startDate = form.start_month && form.start_year
      ? `${form.start_year}-${String(MONTHS.indexOf(form.start_month) + 1).padStart(2, '0')}-01` : null
    const endDate = form.end_month && form.end_year
      ? `${form.end_year}-${String(MONTHS.indexOf(form.end_month) + 1).padStart(2, '0')}-01` : null

    const payload = {
      student_id: studentId,
      program_name: form.program_name,
      specialty: form.specialty || null,
      institution: form.institution || null,
      city: form.city || null,
      state: form.state || null,
      start_date: startDate,
      end_date: endDate,
      status: form.status,
      notes: form.notes || null,
    }

    if (editingId) {
      const { data, error } = await supabase.from('away_rotations').update(payload).eq('id', editingId).select().single()
      if (!error) { setRotations(rotations.map(r => r.id === editingId ? data : r)); resetForm() }
    } else {
      const { data, error } = await supabase.from('away_rotations').insert(payload).select().single()
      if (!error) { setRotations([data, ...rotations]); resetForm() }
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this away rotation?')) return
    await supabase.from('away_rotations').delete().eq('id', id)
    setRotations(rotations.filter(r => r.id !== id))
  }

  const handleStatusChange = async (id, newStatus) => {
    await supabase.from('away_rotations').update({ status: newStatus }).eq('id', id)
    setRotations(rotations.map(r => r.id === id ? { ...r, status: newStatus } : r))
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/student')} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
        <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Away Rotations</h2>
            <p className="text-gray-500 mt-1">
              {rotations.filter(r => r.status === 'completed').length} completed ·{' '}
              {rotations.filter(r => r.status === 'planned').length} planned
            </p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
              + Add Rotation
            </button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm text-blue-800">
          <strong>Why track away rotations?</strong> Audition rotations significantly improve your chances of matching at a program. They're counted in your competitiveness score and are essential data for your advisor.
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 mb-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">{editingId ? 'Edit Rotation' : 'New Away Rotation'}</h3>
              <button type="button" onClick={resetForm} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program / Hospital <span className="text-red-500">*</span></label>
              <input name="program_name" value={form.program_name} onChange={handleChange} required
                placeholder="e.g. Johns Hopkins Hospital"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <select name="specialty" value={form.specialty} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select specialty</option>
                  {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={form.status} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="planned">Planned</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Institution</label>
                <input name="institution" value={form.institution} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                <input name="city" value={form.city} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                <input name="state" value={form.state} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <div className="grid grid-cols-2 gap-2">
                  <select name="start_month" value={form.start_month} onChange={handleChange}
                    className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Month</option>{MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <select name="start_year" value={form.start_year} onChange={handleChange}
                    className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Year</option>{YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <div className="grid grid-cols-2 gap-2">
                  <select name="end_month" value={form.end_month} onChange={handleChange}
                    className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Month</option>{MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <select name="end_year" value={form.end_year} onChange={handleChange}
                    className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Year</option>{YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                placeholder="Any notes about this rotation..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Update Rotation' : 'Save Rotation'}
            </button>
          </form>
        )}

        {rotations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No away rotations yet. Add your first one above.
          </div>
        ) : (
          <div className="space-y-3">
            {rotations.map(rot => (
              <div key={rot.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <select
                        value={rot.status}
                        onChange={e => handleStatusChange(rot.id, e.target.value)}
                        className={`text-xs px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[rot.status] || 'bg-gray-100 text-gray-600'}`}
                      >
                        <option value="planned">Planned</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      {rot.specialty && <span className="text-xs text-gray-400">{rot.specialty}</span>}
                    </div>
                    <p className="font-medium text-gray-900">{rot.program_name}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      {rot.institution && <span>{rot.institution}</span>}
                      {rot.city && <span>{rot.city}{rot.state ? `, ${rot.state}` : ''}</span>}
                      {rot.start_date && (
                        <span>
                          {new Date(rot.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          {rot.end_date ? ` – ${new Date(rot.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                        </span>
                      )}
                    </div>
                    {rot.notes && <p className="text-xs text-gray-500 mt-1 italic">{rot.notes}</p>}
                  </div>
                  <div className="flex gap-3 ml-4">
                    <button onClick={() => handleEdit(rot)} className="text-sm text-gray-500 hover:text-gray-900">Edit</button>
                    <button onClick={() => handleDelete(rot.id)} className="text-sm text-gray-400 hover:text-red-500">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
