'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const [profile, setProfile] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const { data: studentsData } = await supabase.from('students').select('*, profiles(full_name, email)').order('created_at', { ascending: false })

      setProfile(profileData)
      setStudents(studentsData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Class Year', 'Specialty', 'Step 1 Status', 'Step 1 Score', 'Step 2 Score', 'Research', 'Volunteer Hours', 'Risk Level']
    const rows = filtered.map(s => [
      s.profiles?.full_name || '',
      s.profiles?.email || '',
      s.class_year || '',
      s.specialty_interest || '',
      s.usmle_step1_status || '',
      s.usmle_step1_score || '',
      s.usmle_step2_score || '',
      s.research_count || '',
      s.volunteer_hours || '',
      s.risk_level || 'unset',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `advisepro_students_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const riskCounts = {
    low:    students.filter(s => s.risk_level === 'low').length,
    medium: students.filter(s => s.risk_level === 'medium').length,
    high:   students.filter(s => s.risk_level === 'high').length,
    unset:  students.filter(s => !s.risk_level).length,
  }

  const classYears  = [...new Set(students.map(s => s.class_year).filter(Boolean))].sort()
  const specialties = [...new Set(students.map(s => s.specialty_interest).filter(Boolean))].sort()

  const filtered = students.filter(s => {
    const name  = s.profiles?.full_name?.toLowerCase() || ''
    const email = s.profiles?.email?.toLowerCase() || ''
    const matchSearch    = !search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase()) || (s.specialty_interest || '').toLowerCase().includes(search.toLowerCase())
    const matchRisk      = !filterRisk || s.risk_level === filterRisk || (filterRisk === 'unset' && !s.risk_level)
    const matchYear      = !filterYear || s.class_year === filterYear
    const matchSpecialty = !filterSpecialty || s.specialty_interest === filterSpecialty
    return matchSearch && matchRisk && matchYear && matchSpecialty
  })

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <div className="bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/dashboard/admin')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="font-bold text-stone-900 text-lg">AdvisePro</span>
          </button>
          <nav className="flex gap-1">
            <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg">Students</span>
            <button onClick={() => router.push('/dashboard/admin/analytics')}
              className="text-sm text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors">
              Analytics
            </button>
            <button onClick={() => router.push('/dashboard/admin/milestones')}
              className="text-sm text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors">
              Milestones
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <span className="text-teal-700 text-xs font-semibold">{initials}</span>
          </div>
          <span className="text-sm text-stone-500">{profile?.full_name} · Admin</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            className="text-sm text-stone-400 hover:text-stone-700 border border-stone-200 px-3 py-1.5 rounded-xl transition-colors">
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Institutional Overview</h2>
            <p className="text-stone-500 mt-1">{students.length} total students</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard/admin/students/bulk')}
              className="border border-stone-200 text-stone-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors">
              Bulk Import
            </button>
            <button
              onClick={() => router.push('/dashboard/admin/students/new')}
              className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors">
              + Add Student
            </button>
          </div>
        </div>

        {/* Risk summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${filterRisk === 'low' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-stone-100'}`}
            onClick={() => setFilterRisk(filterRisk === 'low' ? '' : 'low')}>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Low Risk</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{riskCounts.low}</p>
          </div>
          <div className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${filterRisk === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-100'}`}
            onClick={() => setFilterRisk(filterRisk === 'medium' ? '' : 'medium')}>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Medium Risk</p>
            <p className="text-3xl font-bold text-amber-500 mt-2">{riskCounts.medium}</p>
          </div>
          <div className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${filterRisk === 'high' ? 'bg-rose-50 border-rose-200' : 'bg-white border-stone-100'}`}
            onClick={() => setFilterRisk(filterRisk === 'high' ? '' : 'high')}>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">High Risk</p>
            <p className="text-3xl font-bold text-rose-600 mt-2">{riskCounts.high}</p>
          </div>
          <div className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${filterRisk === 'unset' ? 'bg-stone-100 border-stone-300' : 'bg-white border-stone-100'}`}
            onClick={() => setFilterRisk(filterRisk === 'unset' ? '' : 'unset')}>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Not Assessed</p>
            <p className="text-3xl font-bold text-stone-300 mt-2">{riskCounts.unset}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Search by name, email, or specialty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 border border-stone-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-stone-300"
          />
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="unset">Not Assessed</option>
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Years</option>
            {classYears.map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Specialties</option>
            {specialties.map(s => <option key={s}>{s}</option>)}
          </select>
          {(search || filterRisk || filterYear || filterSpecialty) && (
            <button onClick={() => { setSearch(''); setFilterRisk(''); setFilterYear(''); setFilterSpecialty('') }}
              className="text-sm text-stone-500 hover:text-stone-900 border border-stone-200 px-4 py-2 rounded-xl hover:bg-stone-50 transition-colors">
              Clear
            </button>
          )}
        </div>

        {/* Students table */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100">
          <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-stone-700">All Students</h3>
            <div className="flex items-center gap-3">
              {filtered.length < students.length && (
                <span className="text-xs text-stone-400">Showing {filtered.length} of {students.length}</span>
              )}
              <button onClick={exportCSV}
                className="text-xs text-stone-600 hover:text-stone-900 border border-stone-200 px-3 py-1.5 rounded-xl hover:bg-stone-50 transition-colors">
                Export CSV
              </button>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-stone-400 text-sm">
              {students.length === 0 ? 'No students yet.' : 'No students match your filters.'}
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {filtered.map((student) => (
                <div key={student.id} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex-1 cursor-pointer" onClick={() => router.push(`/dashboard/admin/students/${student.id}`)}>
                    <p className="font-medium text-stone-900">{student.profiles?.full_name}</p>
                    <p className="text-sm text-stone-400 mt-0.5">{student.class_year} · {student.specialty_interest ?? 'No specialty'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-stone-400">Step 1</p>
                      <p className="font-medium text-stone-900 text-sm">{student.usmle_step1_score ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400">Step 2</p>
                      <p className="font-medium text-stone-900 text-sm">{student.usmle_step2_score ?? '—'}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      student.risk_level === 'low'    ? 'bg-emerald-100 text-emerald-700' :
                      student.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                      student.risk_level === 'high'   ? 'bg-rose-100 text-rose-700' :
                      'bg-stone-100 text-stone-400'}`}>
                      {student.risk_level ?? 'unset'}
                    </span>
                    <button
                      onClick={() => router.push(`/dashboard/admin/students/${student.id}/edit`)}
                      className="text-xs text-teal-600 hover:text-teal-800 border border-teal-200 px-2.5 py-1 rounded-lg transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
