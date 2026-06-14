'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardNav, { STUDENT_NAV } from '@/app/components/DashboardNav'
import { calculateCompetitiveness, generateInsights, TIER_LABELS, NRMP_BENCHMARKS } from '@/lib/scoring'
import GradesCard from '@/app/components/GradesCard'

// ─── Benchmark bar chart ──────────────────────────────────────────────────────
function BenchmarkCard({ student }) {
  const b = NRMP_BENCHMARKS[student?.specialty_interest]

  const ScoreBar = ({ label, score, matchedMean, unmatchedMean }) => {
    if (!matchedMean) return null
    const lo = Math.min(unmatchedMean ?? matchedMean - 20, matchedMean) - 15
    const hi = matchedMean + 20
    const range = hi - lo
    const pct = v => Math.min(Math.max(((v - lo) / range) * 100, 1), 99)
    const above   = score != null && score >= matchedMean
    const between = score != null && unmatchedMean != null && score >= unmatchedMean && score < matchedMean
    const below   = score != null && unmatchedMean != null && score < unmatchedMean

    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-stone-700">{label}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-stone-500">Your score: <span className="font-bold text-stone-900">{score ?? '—'}</span></span>
            {above   && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Above matched avg ✓</span>}
            {between && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Below matched avg</span>}
            {below   && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">Below unmatched avg</span>}
          </div>
        </div>
        <div className="relative h-5 bg-stone-100 rounded-full">
          {unmatchedMean && (
            <div className="absolute h-full bg-amber-100 rounded-full"
              style={{ left: `${pct(unmatchedMean)}%`, width: `${pct(matchedMean) - pct(unmatchedMean)}%` }} />
          )}
          {unmatchedMean && (
            <div className="absolute w-0.5 h-full bg-rose-300 rounded-full" style={{ left: `${pct(unmatchedMean)}%` }} />
          )}
          <div className="absolute w-0.5 h-full bg-emerald-500 rounded-full" style={{ left: `${pct(matchedMean)}%` }} />
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

// ─── Score insights panel ─────────────────────────────────────────────────────
function ScoreInsightsCard({ result, student }) {
  const insights = generateInsights(result, student)
  if (!insights) return null
  const { strengths, gaps, actions } = insights
  if (strengths.length === 0 && gaps.length === 0 && actions.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">What This Means For You</h3>
      <div className="space-y-5">
        {strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs">✓</span>
              Strengths
            </p>
            <ul className="space-y-1.5">
              {strengths.map((s, i) => (
                <li key={i} className="text-sm text-stone-700 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {gaps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-xs">!</span>
              Gaps to Close
            </p>
            <ul className="space-y-1.5">
              {gaps.map((g, i) => (
                <li key={i} className="text-sm text-stone-700 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                  <span><span className="font-medium text-stone-800">{g.label}:</span> {g.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {actions.length > 0 && (
          <div className="bg-teal-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-teal-700 mb-2">Recommended Next Steps</p>
            <ol className="space-y-2">
              {actions.map((a, i) => (
                <li key={i} className="text-sm text-teal-900 flex items-start gap-2">
                  <span className="bg-teal-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                  {a}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Foundation view for MS1 / MS2 ───────────────────────────────────────────
const FOUNDATION_CONTENT = {
  MS1: {
    headline: 'Building Your Foundation',
    subline: 'Competitiveness scoring becomes meaningful once you have Step exam results. Your focus right now is exploration and early relationship-building.',
    focusAreas: [
      { icon: '🔬', title: 'Find a research lab', body: 'Even a few hours a week in a lab starts building your CV. Specialty alignment matters more in MS3–MS4; for now, anything is better than nothing.' },
      { icon: '👁️', title: 'Shadow in 2–3 specialties', body: 'Exposure now prevents costly late pivots. Programs ask about specialty interest — genuine curiosity is obvious.' },
      { icon: '🤝', title: 'Join interest groups', body: 'Specialty interest groups connect you with upperclassmen, residents, and faculty early. These become your first letter-writer relationships.' },
      { icon: '🏥', title: 'Start volunteering', body: 'Community service is part of every matched applicant profile. Starting early removes time pressure later.' },
    ],
    alert: null,
  },
  MS2: {
    headline: 'Deepening Your Foundation',
    subline: 'MS2 is when focused preparation begins. Step 1 is on the horizon, and your research and letter-writer relationships should be taking shape.',
    focusAreas: [
      { icon: '📚', title: 'Begin Step 1 preparation', body: 'Most students start dedicated Step 1 prep 4–6 months out. Build a study schedule now even if the exam is months away.' },
      { icon: '📝', title: 'Aim for a research output', body: 'A poster, abstract, or co-authored paper by end of MS2 puts you ahead of most applicants in competitive specialties.' },
      { icon: '✉️', title: 'Identify letter writers early', body: 'You need 3–4 strong letters. Strong letters come from people who know you well. Start building those relationships now — MS4 is too late.' },
      { icon: '🎯', title: 'Narrow your specialty interest', body: 'You don\'t need to commit, but narrowing to 2–3 specialties helps focus your research, shadowing, and extracurriculars.' },
    ],
    alert: null,
  },
}

function FoundationCard({ student, milestones, activitiesCount }) {
  const content = FOUNDATION_CONTENT[student?.class_year]
  if (!content) return null

  const yearMilestones = milestones.filter(m => m.milestones?.due_year === student.class_year)
  const completed = yearMilestones.filter(m => m.status === 'completed').length
  const pct = yearMilestones.length > 0 ? Math.round((completed / yearMilestones.length) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-teal-200 text-xs font-semibold uppercase tracking-wide mb-1">{student.class_year} · Foundation Phase</p>
            <h3 className="text-xl font-bold">{content.headline}</h3>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold">{activitiesCount}</p>
            <p className="text-teal-200 text-xs">activities logged</p>
          </div>
        </div>
        <p className="text-teal-100 text-sm leading-relaxed mb-4">{content.subline}</p>
        {yearMilestones.length > 0 && (
          <div>
            <div className="flex justify-between text-xs text-teal-200 mb-1.5">
              <span>{student.class_year} milestones</span>
              <span>{completed}/{yearMilestones.length} complete</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {content.focusAreas.map((area, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{area.icon}</span>
              <p className="text-sm font-semibold text-stone-900">{area.title}</p>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">{area.body}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-amber-500 text-lg flex-shrink-0">💡</span>
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Your competitiveness score unlocks in MS3.</span> Once you have Step exam results and a specialty focus, AdvisePro will show you exactly how you compare to matched applicants and what to prioritize.
        </p>
      </div>
    </div>
  )
}

// ─── Competitiveness card ─────────────────────────────────────────────────────
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

// ─── ERAS countdown for MS4 ───────────────────────────────────────────────────
const ERAS_DATES_2026 = [
  { label: 'MyERAS Opens',             date: '2026-07-01', description: 'Start filling your application' },
  { label: 'ERAS Opens to Programs',   date: '2026-09-05', description: 'Programs can begin reviewing' },
  { label: 'Program Download',         date: '2026-10-01', description: 'Hard deadline — be ready' },
  { label: 'Interview Season Begins',  date: '2026-10-15', description: 'Invitations start arriving' },
  { label: 'Rank List Opens',          date: '2027-01-15', description: 'Build and finalize your list' },
  { label: 'Rank List Deadline',       date: '2027-02-19', description: 'Final submission — no extensions' },
  { label: 'Match Day',                date: '2027-03-20', description: '🎉 Results released' },
]

function ERASCountdownCard() {
  const today = new Date()
  const upcoming = ERAS_DATES_2026
    .map(d => ({ ...d, daysLeft: Math.ceil((new Date(d.date) - today) / (1000 * 60 * 60 * 24)) }))
    .filter(d => d.daysLeft >= 0)

  const next = upcoming[0]
  if (!next) return null

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">ERAS 2026–2027 Timeline</h3>
        <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">Application Cycle</span>
      </div>

      {/* Next deadline banner */}
      <div className={`rounded-xl p-4 mb-4 ${next.daysLeft <= 30 ? 'bg-rose-50 border border-rose-100' : next.daysLeft <= 60 ? 'bg-amber-50 border border-amber-100' : 'bg-teal-50 border border-teal-100'}`}>
        <p className={`text-xs font-semibold mb-0.5 ${next.daysLeft <= 30 ? 'text-rose-600' : next.daysLeft <= 60 ? 'text-amber-600' : 'text-teal-600'}`}>
          Next Milestone
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-stone-900">{next.label}</p>
            <p className="text-xs text-stone-500 mt-0.5">{next.description}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${next.daysLeft <= 30 ? 'text-rose-600' : next.daysLeft <= 60 ? 'text-amber-500' : 'text-teal-600'}`}>{next.daysLeft}</p>
            <p className="text-xs text-stone-400">days away</p>
          </div>
        </div>
      </div>

      {/* Full timeline */}
      <div className="space-y-2.5">
        {ERAS_DATES_2026.map((d, i) => {
          const days = Math.ceil((new Date(d.date) - today) / (1000 * 60 * 60 * 24))
          const isPast = days < 0
          const isNext = !isPast && upcoming[0]?.label === d.label
          return (
            <div key={i} className={`flex items-center gap-3 ${isPast ? 'opacity-40' : ''}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isPast ? 'bg-stone-300' : isNext ? 'bg-teal-500' : 'bg-stone-200'}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${isNext ? 'font-semibold text-stone-900' : 'text-stone-700'}`}>{d.label}</span>
              </div>
              <span className="text-xs text-stone-400 flex-shrink-0">
                {isPast ? 'Passed' : `${days}d`}
              </span>
              <span className="text-xs text-stone-300 flex-shrink-0 w-24 text-right">
                {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── LOR summary widget ───────────────────────────────────────────────────────
function LORSummaryWidget({ lors, onManage }) {
  const confirmed = lors.filter(l => l.status === 'confirmed' || l.status === 'submitted').length
  const total = lors.length
  const needed = Math.max(0, 3 - confirmed)

  return (
    <div onClick={onManage}
      className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 cursor-pointer hover:border-teal-200 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Letters of Rec</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <p className="text-3xl font-bold text-stone-900">{confirmed}</p>
            <p className="text-sm text-stone-400">/ 3 confirmed</p>
          </div>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${confirmed >= 3 ? 'bg-emerald-50' : needed > 0 ? 'bg-amber-50' : 'bg-stone-50'}`}>
          ✉️
        </div>
      </div>
      {total === 0 ? (
        <p className="text-xs text-stone-400">No letter writers tracked yet</p>
      ) : needed > 0 ? (
        <p className="text-xs text-amber-600 font-medium">Need {needed} more confirmed letter{needed !== 1 ? 's' : ''}</p>
      ) : (
        <p className="text-xs text-emerald-600 font-medium">✓ Minimum confirmed</p>
      )}
      <p className="text-xs text-teal-600 mt-1.5 group-hover:text-teal-700">Manage →</p>
    </div>
  )
}

// ─── Milestone accordion constants ───────────────────────────────────────────
const YEAR_ORDER = ['MS1', 'MS2', 'MS3', 'MS4']

function specialtyAbbrev(name) {
  if (!name) return ''
  const words = name.split(/[\s/]+/).filter(Boolean)
  if (words.length === 1) return name.slice(0, 3)
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 3)
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
function StudentDashboardContent() {
  const [profile, setProfile]               = useState(null)
  const [student, setStudent]               = useState(null)
  const [loading, setLoading]               = useState(true)
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab]           = useState(() => searchParams.get('tab') || 'overview')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
    else setActiveTab('overview')
  }, [searchParams])
  const [milestones, setMilestones]         = useState([])
  const [openYears, setOpenYears]           = useState({})
  const [activitiesCount, setActivitiesCount] = useState(0)
  const [publications, setPublications]     = useState([])
  const [rotationsCount, setRotationsCount] = useState(0)
  const [advisingNotes, setAdvisingNotes]   = useState([])
  const [advisorProfile, setAdvisorProfile] = useState(null)
  const [messages, setMessages]             = useState([])
  const [newMessage, setNewMessage]         = useState('')
  const [sendingMsg, setSendingMsg]         = useState(false)
  const [myProfileId, setMyProfileId]       = useState(null)
  const [lors, setLors]                     = useState([])
  const [grades, setGrades]                 = useState([])
  const msgEndRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const { data: studentData } = await supabase.from('students').select('*').eq('profile_id', user.id).single()

      if (studentData) {
        // Auto-assign missing milestones
        const { data: allMilestonesRaw } = await supabase.from('milestones').select('id, specialty')
        const allMilestones = (allMilestonesRaw || []).filter(m =>
          m.specialty === null || m.specialty === studentData.specialty_interest
        )
        if (allMilestones?.length > 0) {
          const { data: assigned } = await supabase.from('student_milestones').select('milestone_id').eq('student_id', studentData.id)
          const assignedIds = new Set(assigned?.map(a => a.milestone_id) || [])
          const toInsert = allMilestones.filter(m => !assignedIds.has(m.id))
            .map(m => ({ student_id: studentData.id, milestone_id: m.id, status: 'not_started' }))
          if (toInsert.length > 0) await supabase.from('student_milestones').insert(toInsert)
        }

        const { data: milestonesData } = await supabase
          .from('student_milestones')
          .select('*, milestones(id, title, description, due_year, category, specialty, priority, source)')
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: true })

        const { count } = await supabase.from('activities').select('id', { count: 'exact', head: true }).eq('student_id', studentData.id)
        const { data: pubData } = await supabase.from('publications').select('publication_type').eq('student_id', studentData.id)
        const { count: rotCount } = await supabase.from('away_rotations').select('id', { count: 'exact', head: true }).eq('student_id', studentData.id)
        const { data: notesData } = await supabase.from('advising_notes').select('*, profiles(full_name)').eq('student_id', studentData.id).order('meeting_date', { ascending: false })
        const { data: lorData } = await supabase.from('lor_requests').select('*').eq('student_id', studentData.id).order('created_at')
        const { data: gradesData } = await supabase.from('course_grades').select('*').eq('student_id', studentData.id).order('academic_year', { ascending: false })

        setMilestones(milestonesData || [])
        const currentYear = studentData?.class_year ?? 'MS3'
        setOpenYears({ MS1: currentYear === 'MS1', MS2: currentYear === 'MS2', MS3: currentYear === 'MS3', MS4: currentYear === 'MS4' })
        setActivitiesCount(count || 0)
        setPublications(pubData || [])
        setRotationsCount(rotCount || 0)
        setAdvisingNotes(notesData || [])
        setLors(lorData || [])
        setGrades(gradesData || [])
      }

      // Fetch advisor + messages
      if (studentData?.id) {
        const { data: assignments } = await supabase.from('advisor_student').select('advisor_profile_id').eq('student_id', studentData.id).limit(1)
        const assignment = assignments?.[0]
        if (assignment?.advisor_profile_id) {
          const { data: advProfile } = await supabase.from('profiles').select('id, full_name').eq('id', assignment.advisor_profile_id).single()
          setAdvisorProfile(advProfile)
          const [{ data: sent }, { data: received }] = await Promise.all([
            supabase.from('messages').select('*').eq('sender_id', user.id).eq('recipient_id', assignment.advisor_profile_id).order('created_at'),
            supabase.from('messages').select('*').eq('sender_id', assignment.advisor_profile_id).eq('recipient_id', user.id).order('created_at'),
          ])
          const thread = [...(sent || []), ...(received || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          setMessages(thread)
        }
      }

      setMyProfileId(user.id)
      setProfile(profileData)
      setStudent(studentData)
      setLoading(false)
    }
    fetchData()
  }, [])

  const competitivenessResult = calculateCompetitiveness(student, activitiesCount, publications, rotationsCount)
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const isEarlyStudent = ['MS1', 'MS2'].includes(student?.class_year)
  const isMS4 = student?.class_year === 'MS4'

  useEffect(() => {
    if (!myProfileId || !advisorProfile) return
    const channel = supabase
      .channel(`student-msgs-${myProfileId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${myProfileId}` },
        (payload) => {
          if (payload.new.sender_id === advisorProfile.id) setMessages(prev => [...prev, payload.new])
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [myProfileId, advisorProfile])

  const sendMessage = async () => {
    if (!newMessage.trim() || !advisorProfile || sendingMsg) return
    setSendingMsg(true)
    const { data, error } = await supabase.from('messages').insert({
      sender_id: myProfileId, recipient_id: advisorProfile.id, content: newMessage.trim(),
    }).select().single()
    if (!error && data) { setMessages(prev => [...prev, data]); setNewMessage('') }
    setSendingMsg(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-400 text-sm">Loading your dashboard...</div>
    </div>
  )

  const unreadMessages = messages.filter(m => m.sender_id !== myProfileId && !m.read_at).length
  const pendingMilestones = milestones.filter(m => m.status !== 'completed').length

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav
        activeTab={activeTab}
        navItems={[
          { label: 'Overview',   href: '/dashboard/student', tab: 'overview',   isDefault: true },
          { label: 'Milestones', href: '/dashboard/student', tab: 'milestones', badge: pendingMilestones },
          { label: 'Grades',     href: '/dashboard/student', tab: 'grades',     badge: grades.length },
          { label: 'Messages',   href: '/dashboard/student', tab: 'messages',   badge: unreadMessages },
        ]}
      >
        <button onClick={() => router.push('/dashboard/student/edit')}
          className="text-sm text-stone-500 hover:text-stone-900 border border-stone-200 px-3 py-1.5 rounded-xl transition-colors">
          Edit Profile
        </button>
      </DashboardNav>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Welcome back, {profile?.full_name?.split(' ')[0]} 👋</h2>
          <p className="text-stone-500 mt-1">{student?.class_year} · {student?.specialty_interest ?? 'No specialty selected'}</p>
        </div>


        {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
        {activeTab === 'overview' && <>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">USMLE Step 1</p>
              <span className={`text-xs font-medium mt-2 inline-block px-2 py-0.5 rounded-full ${
                student?.usmle_step1_status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                student?.usmle_step1_status === 'fail' ? 'bg-rose-100 text-rose-700' :
                'bg-stone-100 text-stone-400'}`}>
                {student?.usmle_step1_status === 'pass' ? 'Pass' : student?.usmle_step1_status === 'fail' ? 'Did not pass' : 'Not taken'}
              </span>
              {student?.usmle_step1_attempts != null && (
                <p className="text-xs text-stone-400 mt-1.5">
                  {student.usmle_step1_attempts === 1 ? '1st attempt' : `${student.usmle_step1_attempts} attempts`}
                </p>
              )}
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

          {/* Year-adaptive scoring section */}
          {isEarlyStudent ? (
            <div className="mb-6">
              <FoundationCard student={student} milestones={milestones} activitiesCount={activitiesCount} />
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <CompetitivenessCard result={competitivenessResult} student={student} />
              <ScoreInsightsCard result={competitivenessResult} student={student} />
              <BenchmarkCard student={student} />
              {isMS4 && <ERASCountdownCard />}
            </div>
          )}

          {/* LOR Tracker */}
          <div className="mb-4">
            <LORTrackerInline lors={lors} setLors={setLors} studentId={student?.id} />
          </div>

          {/* Advising Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
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
        </>}

        {/* ══════════════════ MILESTONES TAB ══════════════════ */}
        {activeTab === 'milestones' && <>
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
                          <button
                            onClick={() => setOpenYears(prev => ({ ...prev, [year]: !prev[year] }))}
                            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors text-left">
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

                          {isOpen && (
                            <div className="px-6 pb-4 space-y-2 bg-stone-50/50">
                              {yearMs.map(m => {
                                const isSpecialty = !!m.milestones?.specialty
                                return (
                                  <div key={m.id} className={`flex items-start gap-3 py-2.5 px-3 rounded-xl ${
                                    m.status === 'completed' ? 'opacity-60' : 'bg-white border border-stone-100 shadow-sm'}`}>
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                                      m.status === 'completed' ? 'bg-emerald-400' :
                                      m.status === 'in_progress' ? 'bg-amber-400' : 'bg-stone-200'}`} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className={`text-sm font-medium ${m.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                                          {m.milestones?.title}
                                        </p>
                                        {isSpecialty && (
                                          <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">{specialtyAbbr}</span>
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
                                    <select value={m.status} onChange={e => updateStatus(m.id, e.target.value)}
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

                  {milestones.length > 0 && student?.specialty_interest && (
                    <div className="px-6 py-3 border-t border-stone-100 flex items-center gap-4 text-xs text-stone-400">
                      <span className="flex items-center gap-1.5">
                        <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">{specialtyAbbrev(student.specialty_interest)}</span>
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
        </>}

        {/* ══════════════════ GRADES TAB ══════════════════ */}
        {activeTab === 'grades' && (
          <GradesCard grades={grades} />
        )}

        {/* ══════════════════ MESSAGES TAB ══════════════════ */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden flex flex-col" style={{ height: '520px' }}>
            <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-3">
              {advisorProfile ? (
                <>
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-700 text-xs font-semibold">{advisorProfile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{advisorProfile.full_name}</p>
                    <p className="text-xs text-stone-400">Your advisor</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-stone-400">No advisor assigned yet. An advisor will be assigned to you by the program.</p>
              )}
            </div>
            {advisorProfile && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-sm text-stone-400 text-center mt-8">No messages yet. Say hello to your advisor!</p>
                  )}
                  {messages.map(msg => {
                    const isMe = msg.sender_id === myProfileId
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-stone-100 text-stone-900 rounded-tl-sm'}`}>
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-teal-200' : 'text-stone-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={el => { if (el) el.scrollIntoView({ behavior: 'smooth' }) }} />
                </div>
                <div className="px-4 py-3 border-t border-stone-100 flex gap-2">
                  <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Message your advisor..."
                    className="flex-1 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <button onClick={sendMessage} disabled={sendingMsg || !newMessage.trim()}
                    className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors">
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline LOR tracker (used in Letters tab) ─────────────────────────────────
const LOR_STATUSES = [
  { value: 'planning',  label: 'Planning',  color: 'bg-stone-100 text-stone-500' },
  { value: 'asked',     label: 'Asked',     color: 'bg-blue-100 text-blue-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-amber-100 text-amber-700' },
  { value: 'submitted', label: 'Submitted', color: 'bg-emerald-100 text-emerald-700' },
]

const LOR_RELATIONSHIPS = [
  { value: 'clerkship_director', label: 'Clerkship Director' },
  { value: 'research_pi',        label: 'Research PI' },
  { value: 'attending',          label: 'Attending Physician' },
  { value: 'other',              label: 'Other' },
]

const emptyLOR = { faculty_name: '', faculty_specialty: '', relationship: 'attending', status: 'planning', target_date: '', notes: '' }

function LORTrackerInline({ lors, setLors, studentId }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyLOR)
  const [saving, setSaving] = useState(false)

  const confirmed = lors.filter(l => l.status === 'confirmed' || l.status === 'submitted').length
  const needed = Math.max(0, 3 - confirmed)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.faculty_name || !studentId) return
    setSaving(true)
    const { data, error } = await supabase.from('lor_requests').insert({
      student_id: studentId,
      faculty_name: form.faculty_name,
      faculty_specialty: form.faculty_specialty || null,
      relationship: form.relationship,
      status: form.status,
      target_date: form.target_date || null,
      notes: form.notes || null,
    }).select().single()
    if (!error && data) {
      setLors(prev => [...prev, data])
      setForm(emptyLOR)
      setShowForm(false)
    }
    setSaving(false)
  }

  const updateStatus = async (id, newStatus) => {
    await supabase.from('lor_requests').update({ status: newStatus }).eq('id', id)
    setLors(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
  }

  const deleteLOR = async (id) => {
    if (!confirm('Remove this letter request?')) return
    await supabase.from('lor_requests').delete().eq('id', id)
    setLors(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className={`rounded-2xl p-5 flex items-center justify-between ${confirmed >= 3 ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
        <div>
          <p className={`text-sm font-bold ${confirmed >= 3 ? 'text-emerald-800' : 'text-amber-800'}`}>
            {confirmed >= 3 ? '✓ Minimum letters confirmed' : `${needed} more letter${needed !== 1 ? 's' : ''} needed`}
          </p>
          <p className={`text-xs mt-0.5 ${confirmed >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {confirmed}/3 confirmed · most specialties require 3–4 letters
          </p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
              i <= confirmed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 text-stone-300'}`}>
              {i <= confirmed ? '✓' : i}
            </div>
          ))}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-stone-800">Add Letter Writer</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Faculty Name <span className="text-rose-500">*</span></label>
              <input value={form.faculty_name} onChange={e => setForm({ ...form, faculty_name: e.target.value })} required
                placeholder="Dr. Jane Smith"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Their Specialty</label>
              <input value={form.faculty_specialty} onChange={e => setForm({ ...form, faculty_specialty: e.target.value })}
                placeholder="e.g. Emergency Medicine"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Relationship</label>
              <select value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {LOR_RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {LOR_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Target Date</label>
              <input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Met during EM clerkship, worked closely on 3 shifts"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Letter Writer'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(emptyLOR) }}
              className="text-sm text-stone-500 hover:text-stone-800 border border-stone-200 px-4 py-2 rounded-xl">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Letter list */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Letter Writers</h3>
            <p className="text-xs text-stone-400 mt-0.5">Track status from first ask to submission</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="bg-teal-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-teal-700">
              + Add
            </button>
          )}
        </div>

        {lors.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-stone-400 text-sm">No letter writers tracked yet.</p>
            <p className="text-stone-300 text-xs mt-1 max-w-xs mx-auto">Strong letters come from people who know you well. Start tracking your relationships early — don't wait until MS4.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {lors.map(lor => {
              const statusMeta = LOR_STATUSES.find(s => s.value === lor.status) || LOR_STATUSES[0]
              const relMeta = LOR_RELATIONSHIPS.find(r => r.value === lor.relationship)
              return (
                <div key={lor.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0 text-stone-500 font-semibold text-sm">
                    {lor.faculty_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-stone-900">{lor.faculty_name}</p>
                      {lor.faculty_specialty && (
                        <span className="text-xs text-stone-400">{lor.faculty_specialty}</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{relMeta?.label}</p>
                    {lor.notes && <p className="text-xs text-stone-500 mt-1 italic">"{lor.notes}"</p>}
                    {lor.target_date && (
                      <p className="text-xs text-stone-400 mt-1">
                        Target: {new Date(lor.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select value={lor.status} onChange={e => updateStatus(lor.id, e.target.value)}
                      className={`text-xs px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 font-medium ${statusMeta.color}`}>
                      {LOR_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <button onClick={() => deleteLOR(lor.id)} className="text-stone-300 hover:text-rose-400 text-xs transition-colors">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {lors.length > 0 && (
          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50">
            <p className="text-xs text-stone-400">
              💡 <span className="font-medium text-stone-500">Tip:</span> Aim for at least one letter from a faculty member in your target specialty. Clerkship directors carry significant weight.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="text-stone-400 text-sm">Loading...</div></div>}>
      <StudentDashboardContent />
    </Suspense>
  )
}
