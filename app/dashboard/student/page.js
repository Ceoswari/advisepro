'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function BenchmarkCard({ student }) {
  const [benchmark, setBenchmark] = useState(null)

  useEffect(() => {
    if (!student?.specialty_interest) return
    const fetchBenchmark = async () => {
      const { data } = await supabase
        .from('benchmarks')
        .select('*')
        .eq('specialty', student.specialty_interest)
        .single()
      setBenchmark(data)
    }
    fetchBenchmark()
  }, [student])

  const ScoreBar = ({ label, score, mean, p25, p75 }) => {
    if (!mean) return null
    const min = p25 - 30
    const max = p75 + 30
    const range = max - min
    const meanPos = ((mean - min) / range) * 100
    const p25Pos = ((p25 - min) / range) * 100
    const p75Pos = ((p75 - min) / range) * 100
    const scorePos = score ? ((score - min) / range) * 100 : null

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <p className="text-sm text-gray-600">{label}</p>
          <div className="flex gap-3 text-xs text-gray-500">
            <span>Your score: <span className="font-semibold text-gray-900">{score ?? '—'}</span></span>
            <span>Mean: <span className="font-semibold text-gray-900">{mean}</span></span>
          </div>
        </div>
        <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-blue-100 rounded-full"
            style={{ left: `${p25Pos}%`, width: `${p75Pos - p25Pos}%` }}
          />
          <div
            className="absolute w-0.5 h-full bg-blue-400"
            style={{ left: `${meanPos}%` }}
          />
          {scorePos !== null && (
            <div
              className="absolute w-3 h-3 rounded-full bg-green-500 border-2 border-white top-1.5"
              style={{ left: `${Math.min(Math.max(scorePos, 2), 95)}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>25th: {p25}</span>
          <span>75th: {p75}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Specialty Benchmark</h3>
          <p className="text-lg font-semibold text-gray-900">{student?.specialty_interest}</p>
        </div>
        {benchmark && (
          <span className="text-xs text-gray-400">{benchmark.source} {benchmark.data_year}</span>
        )}
      </div>

      {!benchmark ? (
        <p className="text-sm text-gray-500">No benchmark data available for this specialty.</p>
      ) : (
        <>
          <ScoreBar
            label="USMLE Step 1"
            score={student?.usmle_step1_score}
            mean={benchmark.step1_mean}
            p25={benchmark.step1_25th}
            p75={benchmark.step1_75th}
          />
          <ScoreBar
            label="USMLE Step 2"
            score={student?.usmle_step2_score}
            mean={benchmark.step2_mean}
            p25={benchmark.step2_25th}
            p75={benchmark.step2_75th}
          />
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Your score</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1 bg-blue-400 inline-block"></span> National mean</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 inline-block rounded"></span> 25th–75th percentile</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [milestones, setMilestones] = useState([])

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

      const { data: studentRecord } = await supabase
  .from('students')
  .select('id')
  .eq('profile_id', user.id)
  .single()

const { data: milestonesData } = await supabase
  .from('student_milestones')
  .select('*, milestones(*)')
  .eq('student_id', studentRecord.id)
  .order('created_at', { ascending: true })

setProfile(profileData)
setStudent(studentData)
setMilestones(milestonesData || [])
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

                        <BenchmarkCard student={student} />

        <div className="bg-white rounded-lg border border-gray-200 p-5 mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Milestones</h3>
          {['MS1', 'MS2', 'MS3', 'MS4'].map(year => {
            const yearMilestones = milestones.filter(m => m.milestones?.due_year === year)
            if (yearMilestones.length === 0) return null
            return (
              <div key={year} className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{year}</p>
                <div className="space-y-2">
                  {yearMilestones.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        m.status === 'completed' ? 'bg-green-500' :
                        m.status === 'in_progress' ? 'bg-yellow-400' :
                        'bg-gray-200'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm ${m.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {m.milestones?.title}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        m.status === 'completed' ? 'bg-green-100 text-green-700' :
                        m.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}