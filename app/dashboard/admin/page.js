'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const [profile, setProfile] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
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

  const riskCounts = {
    low: students.filter(s => s.risk_level === 'low').length,
    medium: students.filter(s => s.risk_level === 'medium').length,
    high: students.filter(s => s.risk_level === 'high').length,
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Institutional Overview</h2>
          <p className="text-gray-500 mt-1">{students.length} total students</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Low Risk</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{riskCounts.low}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Medium Risk</p>
            <p className="text-3xl font-bold text-yellow-500 mt-1">{riskCounts.medium}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">High Risk</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{riskCounts.high}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">All Students</h3>
          </div>
          {students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No students yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => router.push(`/dashboard/advisor/student/${student.id}`)}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-gray-900">{student.profiles?.full_name}</p>
                    <p className="text-sm text-gray-500">{student.class_year} · {student.specialty_interest ?? 'No specialty'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Step 1</p>
                      <p className="font-medium text-gray-900">{student.usmle_step1_score ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Step 2</p>
                      <p className="font-medium text-gray-900">{student.usmle_step2_score ?? '—'}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                      student.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                      student.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {student.risk_level ?? 'unset'}
                    </span>
                    <span className="text-gray-400">→</span>
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