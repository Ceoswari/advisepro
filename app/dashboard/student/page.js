'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateCompetitiveness, TIER_LABELS, NRMP_BENCHMARKS } from '@/lib/scoring'

function BenchmarkCard({ student }) {
  const b = NRMP_BENCHMARKS[student?.specialty_interest]

  const ScoreBar = ({ label, score, matchedMean, unmatchedMean }) => {
    if (!matchedMean) return null
    const lo = Math.min(unmatchedMean ?? matchedMean - 20, matchedMean) - 15
    const hi = matchedMean + 20
    const range = hi - lo
    const pct = v => Math.min(Math.max(((v - lo) / range) * 100, 1), 99)

    const above = score != null && score >= matchedMean
    const between = score != null && unmatchedMean != null && score >= unmatchedMean && score < matchedMean
    const below = score != null && unmatchedMean != null && score < unmatchedMean

    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-stone-700">{label}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-stone-500">Your score: <span className="font-bold text-stone-900">{score ?? '—'}</span></span>
            {above  && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Above matched avg ✓</span>}
            {between && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Below matched avg</span>}
            {below  && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">Below unmatched avg</span>}
          </div>
        </div>
        <div className="relative h-5 bg-stone-100 rounded-full">
          {/* Shaded zone between unmatched and matched means */}
          {unmatchedMean && (
            <div className="absolute h-full bg-amber-100 rounded-full"
              style={{ left: `${pct(unmatchedMean)}%`, width: `${pct(matchedMean) - pct(unmatchedMean)}%` }} />
          )}
          {/* Unmatched mean marker */}
          {unmatchedMean && (
            <div className="absolute w-0.5 h-full bg-rose-300 rounded-full" style={{ left: `${pct(unmatchedMean)}%` }}
              title={`Unmatched avg: ${unmatchedMean}`} />
          )}
          {/* Matched mean marker */}
          <div className="absolute w-0.5 h-full bg-emerald-500 rounded-full" style={{ left: `${pct(matchedMean)}%` }}
            title={`Matched avg: ${matchedMean}`} />
          {/* Student score dot */}
          {score != null && (
            <div className={`absolute w-3.5 h-3.5 rounded-full border-2 border-white top-[3px] shadow-sm ${
              above ? 'bg-emerald-500' : between ? 'bg-amber-400' : 'bg-rose-500'}`}
              style={{ left: `${pct(score)}%`, transform: 'translateX(-50%)' }} />
          )}
        </div>
        <div className="flex justify-between text-xs text-stone-400 mt-1.5">
          {unmatchedMean ? <span className="text-rose-400">Unmatched avg: {unmatchedMean}</span> : <span />}
          <span className="text-emerald-600">Matched avg: {matchedMean}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Specialty Benchmark</h3>
          <p className="text-lg font-semibold text-stone-900">{student?.specialty_interest}</p>
        </div>
        <span className="text-xs text-stone-400">NRMP 2024 · MD Seniors</span>
      </div>
      {!b ? (
        <p className="text-sm text-stone-400">No benchmark data available for this specialty.</p>
      ) : (
        <>
          <ScoreBar label="USMLE Step 1" score={student?.usmle_step1_score} matchedMean={b.step1M} unmatchedMean={b.step1U} />
          <ScoreBar label="USMLE Step 2 CK" score={student?.usmle_step2_score} matchedMean={b.step2M} unmatchedMean={b.step2U} />
          <div className="mt-2 pt-3 border-t border-stone-100 flex gap-5 text-xs text-stone-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Your score (above avg)</span>
            <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-emerald-500 inline-block rounded-full" /> Matched avg</span>
            <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-rose-300 inline-block rounded-full" /> Unmatched avg</span>
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

const YEAR_ORDER = ['MS1', 'MS2', 'MS3', 'MS4']

function specialtyAbbrev(name) {
  if (!name) return ''
  const words = name.split(/[\s/]+/).filter(Boolean)
  if (words.length === 1) return name.slice(0, 3)
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 3)
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [milestones, setMilestones] = useState([])
  const [openYears, setOpenYears] = useState({})
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
        // Auto-assign any missing specialty + universal milestones on every dashboard load
        // Fetch all milestones and filter in JS to avoid PostgREST .or() issues with spaces in specialty names
        const { data: allMilestonesRaw } = await supabase.from('milestones').select('id, specialty')
        const allMilestones = (allMilestonesRaw || []).filter(m =>
          m.specialty === null || m.specialty === studentData.specialty_interest
        )

        if (allMilestones?.length > 0) {
          const { data: assigned } = await supabase
            .from('student_milestones')
            .select('milestone_id')
            .eq('student_id', studentData.id)

          const assignedIds = new Set(assigned?.map(a => a.milestone_id) || [])
          const toInsert = allMilestones
            .filter(m => !assignedIds.has(m.id))
            .map(m => ({ student_id: studentData.id, milestone_id: m.id, status: 'not_started' }))

          if (toInsert.length > 0) {
            await supabase.from('student_milestones').insert(toInsert)
          }
        }

        const { data: milestonesData } = await supabase
          .from('student_milestones')
          .select('*, milestones(id, title, description, due_year, category, specialty, priority, source)')
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: true })

        const { count } = await supabase.from('activities').select('id', { count: 'exact', head: true }).eq('student_id', studentData.id)
        const { data: pubData } = await supabase.from('publications').select('publication_type').eq('student_id', studentData.id)
        const { count: rotCount } = await supabase.from('away_rotations').select('id', { count: 'exact', head: true }).eq('student_id', studentData.id)
        const { data: notesData } = await supabase
          .from('advising_notes').select('*, profiles(full_name)').eq('student_id', studentData.id).order('meeting_date', { ascending: false })

        setMilestones(milestonesData || [])
        // Auto-expand the student's current year, collapse others
        const currentYear = studentData?.class_year ?? 'MS3'
        setOpenYears({ MS1: currentYear === 'MS1', MS2: currentYear === 'MS2', MS3: currentYear === 'MS3', MS4: currentYear === 'MS4' })
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

        {/* Milestones — year-based accordion */}
        {(() => {
          const totalCompleted = milestones.filter(m => m.status === 'completed').length
          const specialtyAbbr = specialtyAbbrev(student?.specialty_interest)

          const updateStatus = async (milestoneRowId, newStatus) => {
            await supabase.from('student_milestones')
              .update({ status: newStatus, completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null })
              .eq('id', milestoneRowId)
            setMilestones(prev => prev.map(item => item.id === milestoneRowId ? { ...item, status: newStatus } : item))
          }

          return (
            <div className="mt-4 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">Milestone Roadmap</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {totalCompleted}/{milestones.length} complete
                      {student?.specialty_interest ? ` · Universal + ${student.specialty_interest} track` : ' · Universal milestones'}
                    </p>
                  </div>
                  {milestones.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-24 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${Math.round((totalCompleted / milestones.length) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-stone-400">{Math.round((totalCompleted / milestones.length) * 100)}%</span>
                    </div>
                  )}
                </div>

                {milestones.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <p className="text-stone-400 text-sm">No milestones assigned yet.</p>
                    <p className="text-stone-300 text-xs mt-1">Set your specialty interest in your profile to unlock your specialty track.</p>
                  </div>
                ) : (
                  YEAR_ORDER.map((year, yi) => {
                    const yearMs = milestones.filter(m => m.milestones?.due_year === year)
                    if (yearMs.length === 0) return null
                    const yearCompleted = yearMs.filter(m => m.status === 'completed').length
                    const allDone = yearCompleted === yearMs.length
                    const isOpen = openYears[year] ?? false

                    return (
                      <div key={year} className={yi > 0 ? 'border-t border-stone-100' : ''}>
                        {/* Year header — clickable */}
                        <button
                          onClick={() => setOpenYears(prev => ({ ...prev, [year]: !prev[year] }))}
                          className="w-full px-6 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors text-left"
                        >
                          {/* Completion ring */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 ${
                            allDone ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                            yearCompleted > 0 ? 'border-teal-300 bg-teal-50 text-teal-700' :
                            'border-stone-200 bg-stone-50 text-stone-400'}`}>
                            {allDone ? '✓' : year.replace('MS', '')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-stone-900">{year}</span>
                              {allDone && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Complete</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-1 w-20 bg-stone-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${allDone ? 'bg-emerald-400' : 'bg-teal-400'}`}
                                  style={{ width: `${Math.round((yearCompleted / yearMs.length) * 100)}%` }} />
                              </div>
                              <span className="text-xs text-stone-400">{yearCompleted}/{yearMs.length} done</span>
                            </div>
                          </div>
                          <span className={`text-stone-300 text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                        </button>

                        {/* Expanded milestone list */}
                        {isOpen && (
                          <div className="px-6 pb-4 space-y-2 bg-stone-50/50">
                            {yearMs.map(m => {
                              const isSpecialty = !!m.milestones?.specialty
                              return (
                                <div key={m.id} className={`flex items-start gap-3 py-2.5 px-3 rounded-xl ${
                                  m.status === 'completed' ? 'opacity-60' : 'bg-white border border-stone-100 shadow-sm'}`}>
                                  {/* Status dot */}
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                                    m.status === 'completed' ? 'bg-emerald-400' :
                                    m.status === 'in_progress' ? 'bg-amber-400' : 'bg-stone-200'}`} />

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className={`text-sm font-medium ${m.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                                        {m.milestones?.title}
                                      </p>
                                      {isSpecialty && (
                                        <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                                          {specialtyAbbr}
                                        </span>
                                      )}
                                      {m.milestones?.priority === 'high' && m.status !== 'completed' && (
                                        <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded flex-shrink-0">High</span>
                                      )}
                                    </div>
                                    {m.milestones?.description && m.status !== 'completed' && (
                                      <p className="text-xs text-stone-400 mt-0.5">{m.milestones.description}</p>
                                    )}
                                    {m.milestones?.category && (
                                      <span className="text-xs text-stone-300 mt-0.5 inline-block">{m.milestones.category}</span>
                                    )}
                                  </div>

                                  <select
                                    value={m.status}
                                    onChange={e => updateStatus(m.id, e.target.value)}
                                    className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 flex-shrink-0 ${
                                      m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                      m.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
                                    <option value="not_started">Not Started</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}

                {/* Legend */}
                {milestones.length > 0 && student?.specialty_interest && (
                  <div className="px-6 py-3 border-t border-stone-100 flex items-center gap-4 text-xs text-stone-400">
                    <span className="flex items-center gap-1.5">
                      <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">{specialtyAbbr}</span>
                      {student.specialty_interest}-specific milestone
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-stone-200 inline-block" />
                      Universal (all students)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
