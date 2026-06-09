'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateCompetitiveness, TIER_LABELS } from '@/lib/scoring'

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

function CompetitivenessCard({ result, student }) {
  if (!result) return null

  const { score, riskLevel, breakdown, tier, thresholds } = result

  const riskColors = {
    low:    { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700',  bar: 'bg-green-500'  },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-400' },
    high:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',       bar: 'bg-red-500'    },
  }
  const c = riskColors[riskLevel]

  const BreakdownRow = ({ item }) => {
    if (item.binary) {
      return (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-44 flex-shrink-0">{item.label}</span>
          <div className="flex-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.score > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {item.score > 0 ? `✓ Yes — +${item.score} pts` : 'None yet'}
            </span>
          </div>
          <span className="text-xs text-gray-500 w-12 text-right flex-shrink-0">{item.score} / {item.max}</span>
        </div>
      )
    }
    const barWidth = item.uncapped
      ? Math.min((item.score / item.displayMax) * 100, 100)
      : (item.score / item.max) * 100
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 w-44 flex-shrink-0">{item.label}</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
        </div>
        <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">
          {item.uncapped ? `+${item.score} pts` : `${item.score} / ${item.max}`}
        </span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Competitiveness Score</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-4xl font-bold ${c.text}`}>{score}</span>
            <span className="text-gray-400 text-lg font-medium">/ 100</span>
          </div>
          {student?.specialty_interest && (
            <p className="text-xs mt-1.5 font-medium" style={{ color: riskLevel === 'low' ? '#15803d' : riskLevel === 'medium' ? '#a16207' : '#b91c1c' }}>
              {riskLevel === 'low'
                ? `✓ Meets Low Risk threshold for ${student.specialty_interest} (${thresholds.low}+)`
                : `${thresholds.low - score} point${thresholds.low - score === 1 ? '' : 's'} away from Low Risk in ${student.specialty_interest} (need ${thresholds.low})`
              }
            </p>
          )}
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${c.badge}`}>
            {riskLevel === 'low' ? 'Low Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
          </span>
          {student?.specialty_interest && tier && (
            <p className="text-xs text-gray-400 mt-1">{TIER_LABELS[tier] || ''} specialty</p>
          )}
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-3 bg-white rounded-full overflow-hidden mb-1 border border-gray-200">
        <div
          className={`h-full ${c.bar} rounded-full transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      {/* Threshold markers */}
      <div className="relative h-3 mb-4">
        <div className="absolute text-xs text-gray-400" style={{ left: `${thresholds.medium}%`, transform: 'translateX(-50%)' }}>
          ↑ {thresholds.medium}
        </div>
        <div className="absolute text-xs text-gray-400" style={{ left: `${thresholds.low}%`, transform: 'translateX(-50%)' }}>
          ↑ {thresholds.low}
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2.5 pt-3 border-t border-white border-opacity-60">
        {Object.values(breakdown).map(item => (
          <BreakdownRow key={item.label} item={item} />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Score updates when you save your profile. Thresholds adjusted for your specialty.
      </p>
    </div>
  )
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [milestones, setMilestones] = useState([])
  const [activitiesCount, setActivitiesCount] = useState(0)
  const [publications, setPublications] = useState([])
  const [rotationsCount, setRotationsCount] = useState(0)
  const [advisingNotes, setAdvisingNotes] = useState([])
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

      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('profile_id', user.id)
        .single()

      if (studentData) {
        const { data: milestonesData } = await supabase
          .from('student_milestones')
          .select('*, milestones(*)')
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: true })

        const { count } = await supabase
          .from('activities')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentData.id)

        const { data: pubData } = await supabase
          .from('publications')
          .select('publication_type')
          .eq('student_id', studentData.id)

        const { count: rotCount } = await supabase
          .from('away_rotations')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentData.id)

        const { data: notesData } = await supabase
          .from('advising_notes')
          .select('*, profiles(full_name)')
          .eq('student_id', studentData.id)
          .order('meeting_date', { ascending: false })

        setMilestones(milestonesData || [])
        setActivitiesCount(count || 0)
        setPublications(pubData || [])
        setRotationsCount(rotCount || 0)
        setAdvisingNotes(notesData || [])
      }

      setProfile(profileData)
      setStudent(studentData)
      setLoading(false)
    }

    fetchData()
  }, [])

  const competitivenessResult = calculateCompetitiveness(student, activitiesCount, publications, rotationsCount)

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
          <div className="flex items-center justify-between">
            <p className="text-gray-500 mt-1">{student?.class_year} · Interested in {student?.specialty_interest}</p>
            <button
              onClick={() => router.push('/dashboard/student/edit')}
              className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1 rounded-md"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
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
            <p className="text-sm text-gray-500">Research Experiences</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{student?.research_count ?? '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Volunteer Hours</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{student?.volunteer_hours ?? '—'}</p>
          </div>
          <div onClick={() => router.push('/dashboard/student/activities')}
            className="bg-white rounded-lg border border-gray-200 p-5 cursor-pointer hover:bg-gray-50">
            <p className="text-sm text-gray-500">ERAS Activities</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{activitiesCount}<span className="text-base font-normal text-gray-400"> / 15</span></p>
            <p className="text-xs text-blue-600 mt-1">Manage →</p>
          </div>
          <div onClick={() => router.push('/dashboard/student/publications')}
            className="bg-white rounded-lg border border-gray-200 p-5 cursor-pointer hover:bg-gray-50">
            <p className="text-sm text-gray-500">Publications</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{publications.length}</p>
            <p className="text-xs text-blue-600 mt-1">Manage →</p>
          </div>
          <div onClick={() => router.push('/dashboard/student/rotations')}
            className="bg-white rounded-lg border border-gray-200 p-5 cursor-pointer hover:bg-gray-50">
            <p className="text-sm text-gray-500">Away Rotations</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{rotationsCount}</p>
            <p className="text-xs text-blue-600 mt-1">Manage →</p>
          </div>
        </div>

        {/* Competitiveness score card */}
        <div className="mb-6">
          <CompetitivenessCard result={competitivenessResult} student={student} />
        </div>

        {/* Benchmark */}
        <BenchmarkCard student={student} />

        {/* Advising Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Advising Notes</h3>
          {advisingNotes.length === 0 ? (
            <p className="text-sm text-gray-400">No advising notes yet. Notes from your meetings with advisors will appear here.</p>
          ) : (
            <div className="space-y-4">
              {advisingNotes.map(note => (
                <div key={note.id} className="border-l-2 border-blue-200 pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-gray-900">{note.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{new Date(note.meeting_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <p className="text-sm text-gray-600">{note.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Milestones */}
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
                      <select
                        value={m.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value
                          await supabase
                            .from('student_milestones')
                            .update({ status: newStatus, completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null })
                            .eq('id', m.id)
                          setMilestones(prev => prev.map(item =>
                            item.id === m.id ? { ...item, status: newStatus } : item
                          ))
                        }}
                        className={`text-xs px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          m.status === 'completed' ? 'bg-green-100 text-green-700' :
                          m.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
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
