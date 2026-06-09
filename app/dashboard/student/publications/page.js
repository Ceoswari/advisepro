'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PUB_TYPES = [
  { value: 'first_author', label: 'First Author Publication', points: '6 pts', color: 'bg-purple-100 text-purple-700' },
  { value: 'co_author',    label: 'Co-Author Publication',    points: '3 pts', color: 'bg-blue-100 text-blue-700' },
  { value: 'poster',       label: 'Poster Presentation',     points: '1.5 pts', color: 'bg-teal-100 text-teal-700' },
  { value: 'abstract',     label: 'Abstract',                points: '1 pt',  color: 'bg-gray-100 text-gray-700' },
]

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i)

const emptyForm = { title: '', publication_type: '', journal: '', month: '', year: '', doi: '' }

export default function Publications() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState(null)
  const [publications, setPublications] = useState([])
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
          .from('publications').select('*')
          .eq('student_id', studentData.id)
          .order('publication_date', { ascending: false })
        setPublications(data || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const resetForm = () => { setForm(emptyForm); setShowForm(false); setEditingId(null) }

  const handleEdit = (pub) => {
    const date = pub.publication_date ? new Date(pub.publication_date) : null
    setForm({
      title: pub.title,
      publication_type: pub.publication_type,
      journal: pub.journal || '',
      month: date ? MONTHS[date.getUTCMonth()] : '',
      year: date ? date.getUTCFullYear().toString() : '',
      doi: pub.doi || '',
    })
    setEditingId(pub.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const pubDate = form.month && form.year
      ? `${form.year}-${String(MONTHS.indexOf(form.month) + 1).padStart(2, '0')}-01`
      : null

    const payload = {
      student_id: studentId,
      title: form.title,
      publication_type: form.publication_type,
      journal: form.journal || null,
      publication_date: pubDate,
      doi: form.doi || null,
    }

    if (editingId) {
      const { data, error } = await supabase.from('publications').update(payload).eq('id', editingId).select().single()
      if (!error) { setPublications(publications.map(p => p.id === editingId ? data : p)); resetForm() }
    } else {
      const { data, error } = await supabase.from('publications').insert(payload).select().single()
      if (!error) { setPublications([data, ...publications]); resetForm() }
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this publication?')) return
    await supabase.from('publications').delete().eq('id', id)
    setPublications(publications.filter(p => p.id !== id))
  }

  const typeInfo = (val) => PUB_TYPES.find(t => t.value === val)

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
            <h2 className="text-2xl font-bold text-gray-900">Publications</h2>
            <p className="text-gray-500 mt-1">{publications.length} publication{publications.length !== 1 ? 's' : ''}</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
              + Add Publication
            </button>
          )}
        </div>

        {/* Point values info */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Competitiveness Score Impact</p>
          <div className="grid grid-cols-2 gap-2">
            {PUB_TYPES.map(t => (
              <div key={t.value} className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.color}`}>{t.label}</span>
                <span className="text-xs text-gray-400">+{t.points}</span>
              </div>
            ))}
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 mb-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">{editingId ? 'Edit Publication' : 'New Publication'}</h3>
              <button type="button" onClick={resetForm} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publication Type <span className="text-red-500">*</span></label>
              <select name="publication_type" value={form.publication_type} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select type</option>
                {PUB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required
                placeholder="Full title of the paper, poster, or abstract"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Journal / Conference</label>
              <input name="journal" value={form.journal} onChange={handleChange}
                placeholder="e.g. JAMA, AAN Annual Meeting"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Publication Date</label>
                <div className="grid grid-cols-2 gap-2">
                  <select name="month" value={form.month} onChange={handleChange}
                    className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Month</option>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <select name="year" value={form.year} onChange={handleChange}
                    className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DOI / URL</label>
                <input name="doi" value={form.doi} onChange={handleChange}
                  placeholder="doi:10.xxxx/..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save Publication'}
            </button>
          </form>
        )}

        {publications.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No publications yet. Add your first one above.
          </div>
        ) : (
          <div className="space-y-3">
            {publications.map(pub => {
              const t = typeInfo(pub.publication_type)
              return (
                <div key={pub.id} className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {t && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>}
                      </div>
                      <p className="font-medium text-gray-900 text-sm">{pub.title}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        {pub.journal && <span>{pub.journal}</span>}
                        {pub.publication_date && (
                          <span>{new Date(pub.publication_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        )}
                        {pub.doi && <a href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi.replace('doi:','')}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">View →</a>}
                      </div>
                    </div>
                    <div className="flex gap-3 ml-4">
                      <button onClick={() => handleEdit(pub)} className="text-sm text-gray-500 hover:text-gray-900">Edit</button>
                      <button onClick={() => handleDelete(pub.id)} className="text-sm text-gray-400 hover:text-red-500">Delete</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
