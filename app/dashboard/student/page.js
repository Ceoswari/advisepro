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
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-sm text-stone-600">{label}</p>
          <div className="flex gap-3 text-xs text-stone-500">
            <span>Your score: <span className="font-semibold text-stone-900">{score ?? '—'}</span></span>
            <span>Mean: <span className="font-semibold text-stone-900">{mean}</span></span>
          </div>
        </div>
        <div className="relative h-6 bg-stone-100 rounded-full overflow-hidden">
          <div className="absolute h-full bg-teal-100 rounded-full" style={{ left: `${p25Pos}%`, width: `${p75Pos - p25Pos}%` }} />
          <div className="absolute w-0.5 h-full bg-teal-400" style={{ left: `${meanPos}%` }} />
          {scorePos !== null && (
            <div className="absolute w-3 h-3 rounded-full bg-emerald-500 border-2 border-white top-1.5"
              style={{ left: `${Math.min(Math.max(scorePos, 2), 95)}%` }} />
          )}
        </div>
        <div className="flex justify-between text-xs text-stone-400 mt-1">
          <span>25th: {p25}</span>
          <span>75th: {p75}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Specialty Benchmark</h3>
          <p className="text-lg font-semibold text-stone-900">{student?.specialty_interest}</p>
        </div>
        {benchmark && <span className="text-xs text-stone-400">{benchmark.source} {benchmark.data_year}</span>}
      </div>
      {!benchmark ? (
        <p className="text-sm text-stone-400">No benchmark data available for this specialty.</p>
      ) : (
        <>
          <ScoreBar label="USMLE Step 1" score={student?.usmle_step1_score} mean={benchmark.step1_mean} p25={benchmark.step1_25th} p75={benchmark.step1_75th} />
          <ScoreBar label="USMLE Step 2" score={student?.usmle_step2_score} mean={benchmark.step2_mean} p25={benchmark.step2_25th} p75={benchmark.step2_75th} />
          <div className="mt-3 pt-3 border-t border-stone-100">
            <div className="flex gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Your score</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1 bg-teal-400 inline-block"></span> National mean</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-teal-100 inline-block rounded"></span> 25th–75th percentile</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CompetitivenessCard({ result, student }) {
  if (!result) return null

  const { score, riskLevel, breakdown, tier, thresholds, matchRate } = result

  const riskColors = {
    low:    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
    medium: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-400'  },
    high:   { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-700',       bar: 'bg-rose-500'   },
  }
  const c = riskColors[riskLevel]

  const BreakdownRow = ({ item }) => {
    if (item.binary) {
      return (
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-600 w-44 flex-shrink-0">{item.label}</span>
          <div className="flex-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.score > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>
              {item.score > 0 ? `✓ Yes — +${item.score} pts` : 'None yet'}
            </span>
          </div>
          <span className="text-xs text-stone-400 w-12 text-right flex-shrink-0">{item.score} / {item.max}</span>
        </div>
      )
    }
    const barWidth = (item.score / item.max) * 100
    const hasBenchmark = item.benchmarkMatched != null
    const benchmarkPct = hasBenchmark ? Math.min((item.benchmarkMatched / item.max) * 100, 100) : null

    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-600 w-44 flex-shrink-0">{item.label}</span>
        <div className="flex-1 relative h-2 bg-white/60 rounded-full overflow-visible">
          <div className="h-full bg-teal-400 rounded-full transition-all" style={{ width: `${Math.min(barWidth, 100)}%` }} />
          {hasBenchmark && benchmarkPct !== null && (
            <div className="absolute top-[-3px] w-0.5 h-3.5 bg-orange-400 rounded-full"
              style={{ left: `${Math.min(benchmarkPct, 98)}%` }}
              title={`Matched avg: ${item.benchmarkMatched}`} />
          )}
        </div>
        <div className="text-right flex-shrink-0 w-20">
          <span className="text-xs text-stone-500">{item.score} / {item.max}</span>
          {hasBenchmark && <p className="text-xs text-orange-500">avg: {item.benchmarkMatched}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Competitiveness Score</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-5xl font-bold ${c.text}`}>{score}</span>
            <span className="text-stone-400 text-lg font-medium">/ 100</span>
          </div>
          {student?.specialty_interest && (
            <p className="text-xs mt-2 font-medium" style={{ color: riskLevel === 'low' ? '#059669' : riskLevel === 'medium' ? '#d97706' : '#e11d48' }}>
              {riskLevel === 'low'
                ? `✓ On track for ${student.specialty_interest} (need ${thresholds.low}+)`
                : `${thresholds.low - score} pts away from Low Risk in ${student.specialty_interest} (need ${thresholds.low})`}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${c.badge}`}>
            {riskLevel === 'low' ? 'Low Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
          </span>
          {student?.specialty_interest && tier && (
            <p className="text-xs text-stone-400 mt-1.5">{TIER_LABELS[tier] || ''} specialty</p>
          )}
          {matchRate != null && (
            <p className="text-xs text-stone-400 mt-0.5">{matchRate}% national match rate</p>
          )}
        </div>
      </div>

      <div className="h-3 bg-white/50 rounded-full overflow-hidden mb-1 border border-white/60">
        <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <div className="relative h-4 mb-5">
        <div className="absolute text-xs text-stone-400" style={{ left: `${thresholds.medium}%`, transform: 'translateX(-50%)' }}>↑ {thresholds.medium}</div>
        <div className="absolute text-xs text-stone-400" style={{ left: `${thresholds.low}%`, transform: 'translateX(-50%)' }}>↑ {thresholds.low}</div>
      </div>

      <div className="space-y-3 pt-3 border-t border-white/40">
        {Object.values(breakdown).map(item => <BreakdownRow key={item.label} item={item} />)}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/30">
        <p className="text-xs text-stone-400 flex-1">Based on 2024 NRMP Charting Outcomes data. Updates when you save your profile.</p>
        {result.benchmark && (
          <span className="text-xs text-orange-400 flex-shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-3 bg-orange-400 inline-block rounded-full"></span> = matched avg
          </span>
        )}
      </div>
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

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const { data: studentData } = await supabase.from('students').select('*').eq('profile_id', user.id).single()

      if (studentData) {
        const { data: milestonesData } = await supabase
          .from('student_milestones').select('*, milestones(*)').eq('student_id', studentData.id).order('created_at', { ascending: true })
        const { count } = await supabase.from('activities').select('id', { count: 'exact', head: true }).eq('student_id', studentData.id)
        const { data: pubData } = await supabase.from('publications').select('publication_type').eq('student_id', studentData.id)
        const { count: rotCount } = await supabase.from('away_rotations').select('id', { count: 'exact', head: true }).eq('student_id', studentData.id)
        const { data: notesData } = await supabase
          .from('advising_notes').select('*, profiles(full_name)').eq('student_id', studentData.id).order('meeting_date', { ascending: false })

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
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-400 text-sm">Loading your dashboard...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <div className="bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-bold text-stone-900 text-lg">AdvisePro</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/student/edit')}
            className="text-sm text-stone-500 hover:text-stone-900 border border-stone-200 px-3 py-1.5 rounded-xl transition-colors">
            Edit Profile
          </button>
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <span className="text-teal-700 text-xs font-semibold">{initials}</span>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">Welcome back, {profile?.full_name?.split(' ')[0]} 👋</h2>
          <p className="text-stone-500 mt-1">{student?.class_year} · {student?.specialty_interest ?? 'No specialty selected'}</p>
        </div>

        {/* USMLE + Research stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">USMLE Step 1</p>
            <p className="text-3xl font-bold text-stone-900 mt-2">{student?.usmle_step1_score ?? '—'}</p>
            <span className={`text-xs font-medium mt-1.5 inline-block px-2 py-0.5 rounded-full ${
              student?.usmle_step1_status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
              student?.usmle_step1_status === 'fail' ? 'bg-rose-100 text-rose-700' :
              'bg-stone-100 text-stone-400'}`}>
              {student?.usmle_step1_status === 'pass' ? 'Pass' : student?.usmle_step1_status === 'fail' ? 'Fail' : 'Not taken'}
            </span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">USMLE Step 2 CK</p>
            <p className="text-3xl font-bold text-stone-900 mt-2">{student?.usmle_step2_score ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Research Experiences</p>
            <p className="text-3xl font-bold text-stone-900 mt-2">{student?.research_count ?? '—'}</p>
          </div>
        </div>

        {/* Activity cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Volunteer Hours</p>
            <p className="text-3xl font-bold text-stone-900 mt-2">{student?.volunteer_hours ?? '—'}</p>
          </div>
          <div onClick={() => router.push('/dashboard/student/activities')}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 cursor-pointer hover:border-teal-200 hover:shadow-md transition-all group">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">ERAS Activities</p>
            <p className="text-3xl font-bold text-stone-900 mt-2">{activitiesCount}<span className="text-base font-normal text-stone-300"> / 15</span></p>
            <p className="text-xs text-teal-600 mt-1.5 group-hover:text-teal-700">Manage →</p>
          </div>
          <div onClick={() => router.push('/dashboard/student/publications')}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 cursor-pointer hover:border-teal-200 hover:shadow-md transition-all group">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Publications</p>
            <p className="text-3xl font-bold text-stone-900 mt-2">{publications.length}</p>
            <p className="text-xs text-teal-600 mt-1.5 group-hover:text-teal-700">Manage →</p>
          </div>
          <div onClick={() => router.push('/dashboard/student/rotations')}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 cursor-pointer hover:border-teal-200 hover:shadow-md transition-all group">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Away Rotations</p>
            <p className="text-3xl font-bold text-stone-900 mt-2">{rotationsCount}</p>
            <p className="text-xs text-teal-600 mt-1.5 group-hover:text-teal-700">Manage →</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div onClick={() => router.push('/dashboard/student/documents')}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 cursor-pointer hover:border-teal-200 hover:shadow-md transition-all flex items-center gap-4 group">
            <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📄</div>
            <div>
              <p className="font-semibold text-stone-900 text-sm">Documents</p>
              <p className="text-xs text-stone-400 mt-0.5">CV, personal statement, MSPE</p>
              <p className="text-xs text-teal-600 mt-1.5 group-hover:text-teal-700">Manage →</p>
            </div>
          </div>
          <div onClick={() => router.push('/dashboard/student/profile')}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 cursor-pointer hover:border-teal-200 hover:shadow-md transition-all flex items-center gap-4 group">
            <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🎓</div>
            <div>
              <p className="font-semibold text-stone-900 text-sm">Application Profile</p>
              <p className="text-xs text-stone-400 mt-0.5">Print-ready view of all your data</p>
              <p className="text-xs text-purple-600 mt-1.5 group-hover:text-purple-700">View & Export →</p>
            </div>
          </div>
        </div>

        {/* Competitiveness */}
        <div className="mb-6">
          <CompetitivenessCard result={competitivenessResult} student={student} />
        </div>

        {/* Benchmark */}
        <BenchmarkCard student={student} />

        {/* Advising Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 mt-4">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Advising Notes</h3>
          {advisingNotes.length === 0 ? (
            <p className="text-sm text-stone-400">No advising notes yet. Notes from your meetings with advisors will appear here.</p>
          ) : (
            <div className="space-y-4">
              {advisingNotes.map(note => (
                <div key={note.id} className="border-l-2 border-teal-200 pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-stone-900">{note.profiles?.full_name}</p>
                    <p className="text-xs text-stone-400">{new Date(note.meeting_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <p className="text-sm text-stone-600">{note.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 mt-4 mb-8">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-5">Milestones</h3>
          {['MS1', 'MS2', 'MS3', 'MS4'].map(year => {
            const yearMilestones = milestones.filter(m => m.milestones?.due_year === year)
            if (yearMilestones.length === 0) return null
            const completed = yearMilestones.filter(m => m.status === 'completed').length
            return (
              <div key={year} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{year}</p>
                  <p className="text-xs text-stone-400">{completed}/{yearMilestones.length} complete</p>
                </div>
                <div className="space-y-2">
                  {yearMilestones.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        m.status === 'completed' ? 'bg-emerald-500' :
                        m.status === 'in_progress' ? 'bg-amber-400' : 'bg-stone-200'}`} />
                      <div className="flex-1">
                        <p className={`text-sm ${m.status === 'completed' ? 'text-stone-300 line-through' : 'text-stone-800'}`}>
                          {m.milestones?.title}
                        </p>
                      </div>
                      <select
                        value={m.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value
                          await supabase.from('student_milestones')
                            .update({ status: newStatus, completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null })
                            .eq('id', m.id)
                          setMilestones(prev => prev.map(item => item.id === m.id ? { ...item, status: newStatus } : item))
                        }}
                        className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                          m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          m.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
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
