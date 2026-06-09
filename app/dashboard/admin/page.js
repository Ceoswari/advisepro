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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: studentsData } = await supabase
        .from('students')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })

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
    low: students.filter(s => s.risk_level === 'low').length,
    medium: students.filter(s => s.risk_level === 'medium').length,
    high: students.filter(s => s.risk_level === 'high').length,
    unset: students.filter(s => !s.risk_level).length,
  }

  const classYears = [...new Set(students.map(s => s.class_year).filter(Boolean))].sort()
  const specialties = [...new Set(students.map(s => s.specialty_interest).filter(Boolean))].sort()

  const filtered = students.filter(s => {
    const name = s.profiles?.full_name?.toLowerCase() || ''
    const email = s.profiles?.email?.toLowerCase() || ''
    const matchSearch = !search ||
      name.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase()) ||
      (s.specialty_interest || '').toLowerCase().includes(search.toLowerCase())
    const matchRisk = !filterRisk || s.risk_level === filterRisk || (filterRisk === 'unset' && !s.risk_level)
    const matchYear = !filterYear || s.class_year === filterYear
    const matchSpecialty = !filterSpecialty || s.specialty_interest === filterSpecialty
    return matchSearch && matchRisk && matchYear && matchSpecialty
  })

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
          <nav className="flex gap-4 text-sm">
            <span className="font-medium text-blue-600 border-b-2 border-blue-600 pb-0.5">Students</span>
            <button onClick={() => router.push('/dashboard/admin/analytics')} className="text-gray-500 hover:text-gray-900">Analytics</button>
            <button onClick={() => router.push('/dashboard/admin/milestones')} className="text-gray-500 hover:text-gray-900">Milestones</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.full_name} · Admin</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1 rounded-md"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Institutional Overview</h2>
            <p className="text-gray-500 mt-1">{students.length} total students</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard/admin/students/bulk')}
              className="border border-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Bulk Import
            </button>
            <button
              onClick={() => router.push('/dashboard/admin/students/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              + Add Student
            </button>
          </div>
        </div>

        {/* Risk summary — click to filter */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setFilterRisk(filterRisk === 'low' ? '' : 'low')}>
            <p className="text-sm text-gray-500">Low Risk</p>
            <p className="text-3xl font-bold text-green-600">{riskCounts.low}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setFilterRisk(filterRisk === 'medium' ? '' : 'medium')}>
            <p className="text-sm text-gray-500">Medium Risk</p>
            <p className="text-3xl font-bold text-yellow-500">{riskCounts.medium}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setFilterRisk(filterRisk === 'high' ? '' : 'high')}>
            <p className="text-sm text-gray-500">High Risk</p>
            <p className="text-3xl font-bold text-red-600">{riskCounts.high}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setFilterRisk(filterRisk === 'unset' ? '' : 'unset')}>
            <p className="text-sm text-gray-500">Not Assessed</p>
            <p className="text-3xl font-bold text-gray-400">{riskCounts.unset}</p>
          </div>
        </div>

        {/* Search & filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Search by name, email, or specialty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="unset">Not Assessed</option>
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Years</option>
            {classYears.map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Specialties</option>
            {specialties.map(s => <option key={s}>{s}</option>)}
          </select>
          {(search || filterRisk || filterYear || filterSpecialty) && (
            <button onClick={() => { setSearch(''); setFilterRisk(''); setFilterYear(''); setFilterSpecialty('') }}
              className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-md">
              Clear
            </button>
          )}
        </div>

        {/* Students table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">All Students</h3>
            <div className="flex items-center gap-3">
              {filtered.length < students.length && (
                <span className="text-xs text-gray-400">Showing {filtered.length} of {students.length}</span>
              )}
              <button
                onClick={exportCSV}
                className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1 rounded-md hover:bg-gray-50"
              >
                Export CSV
              </button>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {students.length === 0 ? 'No students yet.' : 'No students match your filters.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((student) => (
                <div
                  key={student.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/dashboard/admin/students/${student.id}`)}
                  >
                    <p className="font-medium text-gray-900">{student.profiles?.full_name}</p>
                    <p className="text-sm text-gray-500">{student.class_year} · {student.specialty_interest ?? 'No specialty'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Step 1</p>
                      <p className="font-medium text-gray-900 text-sm">{student.usmle_step1_score ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Step 2</p>
                      <p className="font-medium text-gray-900 text-sm">{student.usmle_step2_score ?? '—'}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                      student.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                      student.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      student.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {student.risk_level ?? 'unset'}
                    </span>
                    <button
                      onClick={() => router.push(`/dashboard/admin/students/${student.id}/edit`)}
                      className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded"
                    >
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
