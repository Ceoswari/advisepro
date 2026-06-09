'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('profile_id', user.id)
        .single()

      setProfile(profileData)
      setStudent(studentData)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">AdvisePro</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.full_name}</span>
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
          <h2 className="text-2xl font-bold text-gray-900">Welcome, {profile?.full_name}</h2>
          <p className="text-gray-500 mt-1">{student?.class_year} · Interested in {student?.specialty_interest}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">USMLE Step 1</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{student?.usmle_step1_score ?? '—'}</p>
            <span className={`text-xs font-medium mt-1 inline-block ${student?.usmle_step1_status === 'pass' ? 'text-green-600' : student?.usmle_step1_status === 'fail' ? 'text-red-600' : 'text-gray-400'}`}>
              {student?.usmle_step1_status === 'pass' ? 'Pass' : student?.usmle_step1_status === 'fail' ? 'Fail' : 'Not taken'}
            </span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">USMLE Step 2</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{student?.usmle_step2_score ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Risk Level</p>
            <p className={`text-3xl font-bold mt-1 capitalize ${student?.risk_level === 'low' ? 'text-green-600' : student?.risk_level === 'medium' ? 'text-yellow-500' : 'text-red-600'}`}>
              {student?.risk_level ?? '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Research Experiences</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{student?.research_count ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Volunteer Hours</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{student?.volunteer_hours ?? '—'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Target Specialty</h3>
          <p className="text-lg font-semibold text-gray-900">{student?.specialty_interest}</p>
          <p className="text-sm text-gray-500 mt-1">Benchmark comparison coming soon</p>
        </div>
      </div>
    </div>
  )
}