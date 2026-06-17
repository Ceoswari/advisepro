'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardNav, { ADMIN_NAV } from '@/app/components/DashboardNav'

// ─── NRMP 2024 Step 2 means by specialty ─────────────────────────────────────
const SPECIALTY_MEANS = {
  'Anesthesiology': 247, 'Dermatology': 254, 'Diagnostic Radiology': 252,
  'Emergency Medicine': 248, 'Family Medicine': 237, 'General Surgery': 253,
  'Internal Medicine': 251, 'Internal Medicine/Pediatrics': 249,
  'Neurological Surgery': 255, 'Neurology': 250,
  'Obstetrics and Gynecology': 244, 'Orthopaedic Surgery': 257,
  'Otolaryngology': 252, 'Pathology': 243, 'Pediatrics': 247,
  'Physical Medicine and Rehabilitation': 248, 'Plastic Surgery': 255,
  'Psychiatry': 246, 'Radiation Oncology': 253, 'Urology': 254,
  'Vascular Surgery': 250,
}

const COMPETITIVE = new Set([
  'Orthopaedic Surgery', 'Dermatology', 'Neurological Surgery',
  'Otolaryngology', 'Plastic Surgery', 'Radiation Oncology', 'Vascular Surgery', 'Urology',
])

const RISK_CFG = {
  low:       { label: 'Low Risk',  bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  moderate:  { label: 'Moderate',  bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-200',  dot: 'bg-yellow-500'  },
  high:      { label: 'High Risk', bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500'  },
  very_high: { label: 'Very High', bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
}

const MSPE_OPTIONS = ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Concerning']
const HP_OPTIONS   = ['Honors', 'High Pass', 'Pass', 'No']

const SIGNAL_OPTIONS = [
  { value: 'none',   label: 'No Signal', icon: '' },
  { value: 'silver', label: 'Silver',    icon: '🥈' },
  { value: 'gold',   label: 'Gold',      icon: '🥇' },
]

const signalLabel = (v) => SIGNAL_OPTIONS.find(s => s.value === v) || SIGNAL_OPTIONS[0]

const MODE_LABELS = {
  overview:   'Student Overview',
  hp:         'HP / Honors',
  mspe:       'MSPE Ranking',
  acad:       'Academic History',
  parallel:   'Parallel Plan',
  interviews: 'Interview Data',
  soap:       'SOAP',
  match:      'Match Outcome',
}

// ─── Auto-score ───────────────────────────────────────────────────────────────
function autoScore(student) {
  let score = 0
  const specialty = student.specialty_interest || ''
  const step2     = student.usmle_step2_score
  const mean      = SPECIALTY_MEANS[specialty] || 250
  const delta     = step2 != null ? step2 - mean : null

  if ((student.usmle_step1_attempts || 0) > 1) score += 4
  if (delta !== null) {
    if      (delta < -20) score += 5
    else if (delta < -10) score += 3
    else if (delta <   0) score += 1
    else if (delta >= 10) score -= 1
  } else { score += 1 }
  if (COMPETITIVE.has(specialty)) { score += 2; if (delta !== null && delta < -5) score += 2 }
  if (student.poor_academic_history) score += 3
  const mspeMap = { Excellent: -1, 'Very Good': 0, Good: 1, Satisfactory: 2, Concerning: 4 }
  score += mspeMap[student.mspe_ranking] ?? 1
  const hpMap = { Honors: -1, 'High Pass': 0, Pass: 1, No: 2 }
  score += hpMap[student.hp_in_specialty] ?? 1
  if (student.gap_in_school) score += 2
  if (student.aoa) score -= 1

  if (score <= 1) return 'low'
  if (score <= 4) return 'moderate'
  if (score <= 7) return 'high'
  return 'very_high'
}

const toLines = arr  => (arr || []).join('\n')
const toArr   = text => text.split('\n').map(s => s.trim()).filter(Boolean)

// ─── RiskPill ─────────────────────────────────────────────────────────────────
function RiskPill({ level, onClick }) {
  const cfg = RISK_CFG[level] || RISK_CFG.low
  return (
    <button onClick={e => { e.stopPropagation(); onClick?.() }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition-opacity
        ${cfg.bg} ${cfg.text} ${cfg.border} ${onClick ? 'hover:opacity-75 cursor-pointer' : 'cursor-default'}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </button>
  )
}

// ─── Shared input primitives ──────────────────────────────────────────────────
const Lbl = ({ c }) => <label className="text-xs text-stone-500 mb-1 block">{c}</label>
const Inp = (p) => <input {...p} className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
const Sel = ({ children, ...p }) => (
  <select {...p} className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">{children}</select>
)
const Chk = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={!!checked} onChange={onChange} className="rounded text-teal-600" />
    <span className="text-sm text-stone-700">{label}</span>
  </label>
)
const TA = (p) => (
  <textarea {...p} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
)

// ─── Drawer ───────────────────────────────────────────────────────────────────
function Drawer({ student, assessment, history, mode, onClose, onRiskChange, onSave }) {
  const [aForm, setAForm] = useState({
    parallel_plan: '', soap_plan: '', interview_count: '', prelim_interview_count: '',
    geographic_preference: '', away_rotation: false, release_of_information: false,
    matched_program: '', matched_specialty: '', rank_of_match: '', soap_outcome: false,
    notes: '', applied_programs_data: [], interview_programs_text: '', rank_order_list_text: '',
  })
  const [sForm, setSForm] = useState({
    mspe_ranking: '', aoa: false, hp_in_specialty: '', poor_academic_history: '', gap_in_school: '',
  })
  const [localRisk, setLocalRisk] = useState(assessment?.risk_level || 'low')
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState(null)

  // Reset localRisk whenever student or saved value changes
  useEffect(() => {
    setLocalRisk(assessment?.risk_level || 'low')
  }, [student?.id, assessment?.risk_level])

  // Reset forms when student changes
  useEffect(() => {
    setAForm({
      parallel_plan:           assessment?.parallel_plan          ?? '',
      soap_plan:               assessment?.soap_plan              ?? '',
      interview_count:         assessment?.interview_count        ?? '',
      prelim_interview_count:  assessment?.prelim_interview_count ?? '',
      geographic_preference:   assessment?.geographic_preference  ?? '',
      away_rotation:           assessment?.away_rotation          ?? false,
      release_of_information:  assessment?.release_of_information ?? false,
      matched_program:         assessment?.matched_program        ?? '',
      matched_specialty:       assessment?.matched_specialty      ?? '',
      rank_of_match:           assessment?.rank_of_match          ?? '',
      soap_outcome:            assessment?.soap_outcome           ?? false,
      notes:                   assessment?.notes                  ?? '',
      applied_programs_data:   assessment?.applied_programs_data || [],
      interview_programs_text: toLines(assessment?.interview_programs),
      rank_order_list_text:    toLines(assessment?.rank_order_list),
    })
    setSForm({
      mspe_ranking:          student?.mspe_ranking          ?? '',
      aoa:                   student?.aoa                   ?? false,
      hp_in_specialty:       student?.hp_in_specialty       ?? '',
      poor_academic_history: student?.poor_academic_history ?? '',
      gap_in_school:         student?.gap_in_school         ?? '',
    })
    setSaveMsg(null)
  }, [student?.id, assessment?.id])

  const specialty  = student?.specialty_interest || ''
  const step2      = student?.usmle_step2_score
  const mean       = SPECIALTY_MEANS[specialty]
  const delta      = step2 != null && mean ? step2 - mean : null
  const suggested  = autoScore({ ...student, ...sForm })
  const rolLines   = toArr(aForm.rank_order_list_text)
  const matchRank  = parseInt(aForm.rank_of_match) || 0
  const fmtDate    = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })

  const handleRiskChange = (val) => {
    setLocalRisk(val)
    onRiskChange(student.id, val)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    const result = await onSave(student.id, aForm, sForm, localRisk)
    setSaving(false)
    if (result?.error) {
      setSaveMsg(`error: ${result.error}`)
    } else {
      setSaveMsg('saved')
      setTimeout(() => setSaveMsg(null), 2500)
    }
  }

  // ── Section renderers ───────────────────────────────────────────────────────
  const SectionRisk = () => (
    <div className="px-5 py-4">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Match Risk Level</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(RISK_CFG).map(([val, cfg]) => (
          <button key={val} onClick={() => handleRiskChange(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
              ${localRisk === val
                ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1 ring-current`
                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
            {cfg.label}
          </button>
        ))}
      </div>
      {suggested !== localRisk && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <span>⚡</span>
          <span>Auto-score suggests <strong>{RISK_CFG[suggested]?.label}</strong></span>
          <button onClick={() => handleRiskChange(suggested)} className="ml-1 underline hover:no-underline">Apply</button>
        </div>
      )}
    </div>
  )

  const SectionExams = () => (
    <div className="px-5 py-4">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Exam Scores</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-stone-50 rounded-xl p-3">
          <p className="text-xs text-stone-400">Step 1</p>
          <p className={`text-sm font-bold mt-0.5 ${(student?.usmle_step1_attempts || 0) > 1 ? 'text-orange-600' : 'text-stone-900'}`}>
            {(student?.usmle_step1_attempts || 0) > 1
              ? `F→P (${student.usmle_step1_attempts}×)`
              : student?.usmle_step1_status === 'pass' ? 'Pass (1×)' : '—'}
          </p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3">
          <p className="text-xs text-stone-400">Step 2{mean ? ` (mean ${mean})` : ''}</p>
          <p className={`text-sm font-bold mt-0.5 ${
            delta === null ? 'text-stone-400' :
            delta < -20 ? 'text-rose-600' : delta < -10 ? 'text-orange-500' :
            delta < 0 ? 'text-yellow-600' : 'text-emerald-600'}`}>
            {step2 ?? '—'}
            {delta !== null && <span className="text-xs font-normal ml-1 opacity-70">({delta >= 0 ? '+' : ''}{delta})</span>}
          </p>
        </div>
      </div>
    </div>
  )

  const SectionAcademic = () => (
    <div className="px-5 py-4 space-y-3">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Academic Profile</p>
      <div><Lbl c="MSPE Ranking" />
        <Sel value={sForm.mspe_ranking} onChange={e => setSForm(f => ({ ...f, mspe_ranking: e.target.value }))}>
          <option value="">Select...</option>
          {MSPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </Sel>
      </div>
      <div><Lbl c="HP / Honors in Desired Specialty" />
        <Sel value={sForm.hp_in_specialty} onChange={e => setSForm(f => ({ ...f, hp_in_specialty: e.target.value }))}>
          <option value="">Select...</option>
          {HP_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </Sel>
      </div>
      <div><Lbl c="Academic Performance Issues" />
        <Inp value={sForm.poor_academic_history}
          onChange={e => setSForm(f => ({ ...f, poor_academic_history: e.target.value }))}
          placeholder="e.g. Remediation M2, M3 surgery failure..." />
      </div>
      <div><Lbl c="Gap in Medical School" />
        <Inp value={sForm.gap_in_school}
          onChange={e => setSForm(f => ({ ...f, gap_in_school: e.target.value }))}
          placeholder="e.g. 1 year educational, research SSR..." />
      </div>
      <Chk label="AOA Member" checked={sForm.aoa} onChange={e => setSForm(f => ({ ...f, aoa: e.target.checked }))} />
    </div>
  )

  const SectionParallel = () => (
    <div className="px-5 py-4 space-y-3">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Parallel Plan</p>
      <div><Lbl c="Parallel Plan Specialty" />
        <Inp value={aForm.parallel_plan}
          onChange={e => setAForm(f => ({ ...f, parallel_plan: e.target.value }))}
          placeholder="e.g. Internal Medicine..." />
      </div>
      <div><Lbl c="SOAP Contingency Plan" />
        <Inp value={aForm.soap_plan}
          onChange={e => setAForm(f => ({ ...f, soap_plan: e.target.value }))}
          placeholder="Plan if unmatched..." />
      </div>
      <div><Lbl c="Geographic Preference" />
        <Inp value={aForm.geographic_preference}
          onChange={e => setAForm(f => ({ ...f, geographic_preference: e.target.value }))}
          placeholder="e.g. Mid-Atlantic, Northeast..." />
      </div>
      <div className="flex gap-6">
        <Chk label="Away Rotation" checked={aForm.away_rotation} onChange={e => setAForm(f => ({ ...f, away_rotation: e.target.checked }))} />
        <Chk label="ROI Released"  checked={aForm.release_of_information} onChange={e => setAForm(f => ({ ...f, release_of_information: e.target.checked }))} />
      </div>
    </div>
  )

  const SectionInterviews = () => {
    const inviteList = toArr(aForm.interview_programs_text)
    const applied    = aForm.applied_programs_data

    const addProgram = () =>
      setAForm(f => ({ ...f, applied_programs_data: [...f.applied_programs_data, { program: '', signal: 'none' }] }))

    const updateProgram = (i, field, val) =>
      setAForm(f => {
        const next = [...f.applied_programs_data]
        next[i] = { ...next[i], [field]: val }
        return { ...f, applied_programs_data: next }
      })

    const removeProgram = (i) =>
      setAForm(f => ({ ...f, applied_programs_data: f.applied_programs_data.filter((_, idx) => idx !== i) }))

    const goldCount   = applied.filter(p => p.signal === 'gold').length
    const silverCount = applied.filter(p => p.signal === 'silver').length

    return (
      <div className="divide-y divide-stone-100">
        {/* Programs Applied To */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Programs Applied To</p>
              {applied.length > 0 && (
                <p className="text-xs text-stone-400 mt-0.5">
                  {applied.length} programs
                  {goldCount > 0 && <span className="ml-1">· {goldCount} 🥇 gold</span>}
                  {silverCount > 0 && <span className="ml-1">· {silverCount} 🥈 silver</span>}
                </p>
              )}
            </div>
            <button onClick={addProgram}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 px-2.5 py-1 rounded-lg hover:bg-teal-50 transition-colors">
              + Add
            </button>
          </div>

          {applied.length === 0 && (
            <button onClick={addProgram}
              className="w-full border-2 border-dashed border-stone-200 rounded-xl py-4 text-xs text-stone-400 hover:border-teal-300 hover:text-teal-500 transition-colors">
              Click to add programs applied
            </button>
          )}

          <div className="space-y-2">
            {applied.map((entry, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={entry.program}
                  onChange={e => updateProgram(i, 'program', e.target.value)}
                  placeholder="Program name..."
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-0"
                />
                <select
                  value={entry.signal}
                  onChange={e => updateProgram(i, 'signal', e.target.value)}
                  className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 flex-shrink-0 w-32
                    ${entry.signal === 'gold'   ? 'border-amber-300 bg-amber-50 text-amber-700' :
                      entry.signal === 'silver' ? 'border-slate-300 bg-slate-50 text-slate-600' :
                      'border-stone-200 text-stone-500'}`}>
                  {SIGNAL_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.icon ? `${s.icon} ${s.label}` : s.label}</option>
                  ))}
                </select>
                <button onClick={() => removeProgram(i)}
                  className="text-stone-300 hover:text-rose-500 transition-colors text-lg leading-none flex-shrink-0">×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Interview Counts */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Interview Counts</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Lbl c="Primary Interviews" />
              <Inp type="number" min="0" value={aForm.interview_count}
                onChange={e => setAForm(f => ({ ...f, interview_count: e.target.value }))} />
            </div>
            <div><Lbl c="Prelim / Parallel" />
              <Inp type="number" min="0" value={aForm.prelim_interview_count}
                onChange={e => setAForm(f => ({ ...f, prelim_interview_count: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Interview Invitations */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Interview Invitations</p>
          <p className="text-xs text-stone-400 -mt-1">One program per line</p>
          <TA rows={5} value={aForm.interview_programs_text}
            onChange={e => setAForm(f => ({ ...f, interview_programs_text: e.target.value }))}
            placeholder={"Johns Hopkins\nPenn Medicine\n..."} />
          {inviteList.length > 0 && (
            <p className="text-xs text-stone-400">
              {inviteList.length} invitations
              {applied.length > 0 && ` (${Math.round(inviteList.length / applied.length * 100)}% of applications)`}
            </p>
          )}
        </div>
      </div>
    )
  }

  const SectionSOAP = () => (
    <div className="px-5 py-4 space-y-3">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">SOAP</p>
      <div><Lbl c="SOAP Contingency Plan" />
        <Inp value={aForm.soap_plan}
          onChange={e => setAForm(f => ({ ...f, soap_plan: e.target.value }))}
          placeholder="Plan if unmatched..." />
      </div>
      <Chk label="Matched via SOAP" checked={aForm.soap_outcome} onChange={e => setAForm(f => ({ ...f, soap_outcome: e.target.checked }))} />
    </div>
  )

  const SectionMatch = () => (
    <div className="divide-y divide-stone-100">
      <div className="px-5 py-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Rank Order List</p>
        <p className="text-xs text-stone-400 -mt-1">One program per line, in rank order</p>
        <TA rows={6} value={aForm.rank_order_list_text}
          onChange={e => setAForm(f => ({ ...f, rank_order_list_text: e.target.value }))}
          placeholder={"#1 Johns Hopkins\n#2 Penn Medicine\n#3 Cooper\n..."} />
        {rolLines.length > 0 && (
          <div className="bg-stone-50 rounded-xl overflow-hidden">
            {rolLines.map((prog, i) => {
              const rank    = i + 1
              const isMatch = matchRank === rank
              return (
                <div key={i}
                  className={`flex items-center gap-3 px-3 py-2 text-xs border-b border-stone-100 last:border-0 ${isMatch ? 'bg-emerald-50' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs
                    ${isMatch ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-500'}`}>{rank}</span>
                  <span className={`flex-1 truncate ${isMatch ? 'text-emerald-700 font-semibold' : 'text-stone-600'}`}>{prog}</span>
                  {isMatch && <span className="text-emerald-500 font-semibold text-xs">MATCHED</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Match Outcome</p>
        <div><Lbl c="Matched Program" />
          <Inp value={aForm.matched_program}
            onChange={e => setAForm(f => ({ ...f, matched_program: e.target.value }))}
            placeholder="Program name..." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Lbl c="Matched Specialty" />
            <Inp value={aForm.matched_specialty}
              onChange={e => setAForm(f => ({ ...f, matched_specialty: e.target.value }))}
              placeholder="Specialty..." />
          </div>
          <div><Lbl c="ROL Rank #" />
            <Inp type="number" min="1" value={aForm.rank_of_match}
              onChange={e => setAForm(f => ({ ...f, rank_of_match: e.target.value }))} />
          </div>
        </div>
        <Chk label="Matched via SOAP" checked={aForm.soap_outcome} onChange={e => setAForm(f => ({ ...f, soap_outcome: e.target.checked }))} />
        {aForm.matched_program && (
          <div className={`rounded-xl p-3 border ${aForm.soap_outcome ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className={`text-xs font-semibold ${aForm.soap_outcome ? 'text-amber-700' : 'text-emerald-700'}`}>
              {aForm.soap_outcome ? 'Matched via SOAP' : 'Matched'}
              {aForm.rank_of_match ? ` · rank #${aForm.rank_of_match}` : ''}
            </p>
            <p className={`text-sm font-bold mt-0.5 ${aForm.soap_outcome ? 'text-amber-900' : 'text-emerald-900'}`}>
              {aForm.matched_program}
            </p>
          </div>
        )}
      </div>
      {history?.length > 0 && (
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Risk History</p>
          <div className="space-y-1.5">
            {history.map((h, i) => {
              const cfg = RISK_CFG[h.risk_level]
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg?.dot || 'bg-stone-300'}`} />
                  <span className={`text-xs font-medium ${cfg?.text || 'text-stone-500'}`}>{cfg?.label || h.risk_level}</span>
                  <span className="text-xs text-stone-400 ml-auto">{fmtDate(h.snapshot_date)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const renderBody = () => {
    switch (mode) {
      case 'overview':
        return (
          <div className="divide-y divide-stone-100">
            {SectionRisk()}
            {SectionExams()}
            {SectionAcademic()}
            {SectionParallel()}
          </div>
        )
      case 'hp':
        return (
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">HP / Honors in Desired Specialty</p>
            <Sel value={sForm.hp_in_specialty} onChange={e => setSForm(f => ({ ...f, hp_in_specialty: e.target.value }))}>
              <option value="">Select...</option>
              {HP_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </Sel>
          </div>
        )
      case 'mspe':
        return (
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">MSPE Ranking</p>
            <Sel value={sForm.mspe_ranking} onChange={e => setSForm(f => ({ ...f, mspe_ranking: e.target.value }))}>
              <option value="">Select...</option>
              {MSPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </Sel>
          </div>
        )
      case 'acad':
        return (
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Academic History</p>
            <div><Lbl c="Academic Performance Issues" />
              <Inp value={sForm.poor_academic_history}
                onChange={e => setSForm(f => ({ ...f, poor_academic_history: e.target.value }))}
                placeholder="e.g. Remediation M2, M3 surgery failure..." />
            </div>
            <div><Lbl c="Gap in Medical School" />
              <Inp value={sForm.gap_in_school}
                onChange={e => setSForm(f => ({ ...f, gap_in_school: e.target.value }))}
                placeholder="e.g. 1 year educational, research SSR..." />
            </div>
            <Chk label="AOA Member" checked={sForm.aoa} onChange={e => setSForm(f => ({ ...f, aoa: e.target.checked }))} />
          </div>
        )
      case 'parallel':
        return SectionParallel()
      case 'interviews':
        return SectionInterviews()
      case 'soap':
        return SectionSOAP()
      case 'match':
        return SectionMatch()
      default:
        return null
    }
  }

  return (
    <div className="w-[440px] flex-shrink-0 border-l border-stone-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="font-bold text-stone-900">{student?.profiles?.full_name}</p>
          <p className="text-sm text-stone-400 mt-0.5">{MODE_LABELS[mode] || specialty}</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 text-xl leading-none">×</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {renderBody()}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-stone-100 flex-shrink-0 space-y-2">
        {saveMsg === 'saved' && (
          <p className="text-xs text-emerald-600 text-center font-medium">✓ Saved</p>
        )}
        {saveMsg?.startsWith('error') && (
          <p className="text-xs text-rose-600 text-center">{saveMsg}</p>
        )}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-teal-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const _now = new Date()
const DEFAULT_SEASON = _now.getMonth() >= 6 ? _now.getFullYear() + 1 : _now.getFullYear()

export default function MatchRiskPage() {
  const [students,    setStudents]    = useState([])
  const [assessments, setAssessments] = useState({})
  const [history,     setHistory]     = useState({})
  const [season,      setSeason]      = useState(DEFAULT_SEASON)
  const [selectedId,  setSelectedId]  = useState(null)
  const [selectedCol, setSelectedCol] = useState('overview')
  const [loading,     setLoading]     = useState(true)
  const [adminId,     setAdminId]     = useState(null)
  const [riskOpen,    setRiskOpen]    = useState(null)
  const [filterRisk,  setFilterRisk]  = useState('')
  const [search,      setSearch]      = useState('')
  const [pageError,   setPageError]   = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setAdminId(user.id)

      const { data: studs } = await supabase
        .from('students')
        .select('*, profiles(full_name, email)')
        .eq('graduation_year', season)
        .order('id')

      if (!studs?.length) { setStudents([]); setLoading(false); return }

      const ids = studs.map(s => s.id)
      const { data: asmts } = await supabase
        .from('match_risk_assessments')
        .select('*, match_risk_history(id, risk_level, snapshot_date)')
        .eq('season', season)
        .in('student_id', ids)

      const aMap = {}, hMap = {}
      for (const a of asmts || []) {
        aMap[a.student_id] = a
        hMap[a.student_id] = (a.match_risk_history || [])
          .sort((x, y) => new Date(y.snapshot_date) - new Date(x.snapshot_date))
      }

      setStudents(studs)
      setAssessments(aMap)
      setHistory(hMap)
      setLoading(false)
    }
    load()
  }, [season])

  const openDrawer = (studentId, col, e) => {
    e.stopPropagation()
    if (selectedId === studentId && selectedCol === col) {
      setSelectedId(null)
    } else {
      setSelectedId(studentId)
      setSelectedCol(col)
    }
  }

  const updateRisk = async (studentId, newRisk) => {
    setPageError(null)
    const { data: upserted, error } = await supabase
      .from('match_risk_assessments')
      .upsert(
        { student_id: studentId, season, risk_level: newRisk, updated_at: new Date().toISOString(), updated_by: adminId },
        { onConflict: 'student_id,season' }
      )
      .select().single()
    if (error || !upserted) {
      setPageError(error?.message || 'Failed to update risk — check migrations ran in Supabase')
      return
    }

    await supabase.from('match_risk_history').insert({
      assessment_id: upserted.id, risk_level: newRisk,
      snapshot_date: new Date().toISOString(), changed_by: adminId,
    })

    setAssessments(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...upserted } }))
    setHistory(prev => ({
      ...prev,
      [studentId]: [{ risk_level: newRisk, snapshot_date: new Date().toISOString() }, ...(prev[studentId] || [])],
    }))
    setRiskOpen(null)
  }

  const saveAssessment = async (studentId, aForm, sForm, riskLevel) => {
    // Student profile fields — non-fatal, continue even if this fails
    const { error: studentErr } = await supabase.from('students').update({
      mspe_ranking:          sForm.mspe_ranking          || null,
      aoa:                   sForm.aoa,
      hp_in_specialty:       sForm.hp_in_specialty       || null,
      poor_academic_history: sForm.poor_academic_history || null,
      gap_in_school:         sForm.gap_in_school         || null,
    }).eq('id', studentId)

    const { data: upserted, error: assessErr } = await supabase
      .from('match_risk_assessments')
      .upsert({
        student_id:             studentId,
        season,
        risk_level:             riskLevel || 'low',
        parallel_plan:          aForm.parallel_plan          || null,
        soap_plan:              aForm.soap_plan              || null,
        interview_count:        aForm.interview_count        !== '' ? parseInt(aForm.interview_count)        : null,
        prelim_interview_count: aForm.prelim_interview_count !== '' ? parseInt(aForm.prelim_interview_count) : null,
        geographic_preference:  aForm.geographic_preference  || null,
        away_rotation:          aForm.away_rotation,
        release_of_information: aForm.release_of_information,
        matched_program:        aForm.matched_program        || null,
        matched_specialty:      aForm.matched_specialty      || null,
        rank_of_match:          aForm.rank_of_match          !== '' ? parseInt(aForm.rank_of_match)          : null,
        soap_outcome:           aForm.soap_outcome,
        notes:                  aForm.notes                  || null,
        updated_at:             new Date().toISOString(),
        updated_by:             adminId,
      }, { onConflict: 'student_id,season' })
      .select().single()

    if (assessErr) return { error: assessErr.message }

    const appliedData = aForm.applied_programs_data || []
    const programs    = toArr(aForm.interview_programs_text)
    const rol         = toArr(aForm.rank_order_list_text)

    // Save array/jsonb columns separately (require migration_4/5) — non-fatal
    await supabase.from('match_risk_assessments').update({
      applied_programs_data: appliedData,
      interview_programs:    programs,
      rank_order_list:       rol,
    }).eq('id', upserted.id)

    // Update state immediately with ALL saved data
    setAssessments(prev => ({
      ...prev,
      [studentId]: { ...upserted, applied_programs_data: appliedData, interview_programs: programs, rank_order_list: rol },
    }))
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...sForm } : s))

    if (studentErr) return { error: `Student fields not saved: ${studentErr.message}` }
    return { success: true }
  }

  const riskCounts = { low: 0, moderate: 0, high: 0, very_high: 0 }
  for (const s of students) {
    const r = assessments[s.id]?.risk_level || 'low'
    riskCounts[r] = (riskCounts[r] || 0) + 1
  }

  const filtered = students.filter(s => {
    const name = s.profiles?.full_name?.toLowerCase() || ''
    const spec = (s.specialty_interest || '').toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) || spec.includes(search.toLowerCase())
    const matchRisk   = !filterRisk || (assessments[s.id]?.risk_level || 'low') === filterRisk
    return matchSearch && matchRisk
  })

  const selectedStudent    = students.find(s => s.id === selectedId)
  const selectedAssessment = assessments[selectedId]
  const selectedHistory    = history[selectedId] || []

  const seasons = [DEFAULT_SEASON + 1, DEFAULT_SEASON, DEFAULT_SEASON - 1]

  // Cell class helpers
  const th  = 'border-b border-stone-100 bg-stone-50 px-4 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap'
  const td  = (extra = '') => `border-b border-stone-100 px-4 py-3 text-sm ${extra}`
  const clickCell = (sid, col, e) => openDrawer(sid, col, e)

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      <DashboardNav navItems={ADMIN_NAV} />

      {/* Error banner */}
      {pageError && (
        <div className="bg-rose-50 border-b border-rose-200 px-8 py-3 flex items-center justify-between flex-shrink-0">
          <p className="text-rose-700 text-sm font-medium">⚠ {pageError}</p>
          <button onClick={() => setPageError(null)} className="text-rose-400 hover:text-rose-700 text-lg leading-none">×</button>
        </div>
      )}

      {/* Sub-header */}
      <div className="bg-white border-b border-stone-100 px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Match Risk</h2>
            <p className="text-stone-400 text-sm mt-0.5">{students.length} students graduating {season}</p>
          </div>
          <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
            {seasons.map(y => (
              <button key={y} onClick={() => setSeason(y)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${season === y ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {Object.entries(RISK_CFG).map(([val, cfg]) => (
            <button key={val} onClick={() => setFilterRisk(filterRisk === val ? '' : val)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all
                ${filterRisk === val ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
              <span className="font-bold ml-0.5">{riskCounts[val]}</span>
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student or specialty..."
            className="ml-auto border border-stone-200 rounded-xl px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white min-w-[220px]" />
        </div>
      </div>

      {/* Table + Drawer */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-16 text-center text-stone-400 text-sm">Loading match data...</div>
          ) : students.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-stone-400 text-sm">No students found for the {season} match season.</p>
              <p className="text-stone-300 text-xs mt-1">Students with graduation year {season} will appear here.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-stone-400 text-sm">No students match your filters.</div>
          ) : (
            <table className="w-full border-collapse" style={{ minWidth: 1800 }}>
              <thead>
                <tr>
                  <th className={`${th} sticky left-0 z-20 bg-stone-50`}                    style={{ minWidth: 200 }}>Student</th>
                  <th className={`${th} sticky z-20 bg-stone-50`}                           style={{ left: 200, minWidth: 160 }}>Specialty</th>
                  <th className={`${th} sticky z-20 bg-stone-50 border-r border-stone-200`} style={{ left: 360, minWidth: 140 }}>Risk Level</th>
                  <th className={th} style={{ minWidth: 80  }}>Step 1</th>
                  <th className={th} style={{ minWidth: 130 }}>Step 2 / Mean</th>
                  <th className={th} style={{ minWidth: 100 }}>HP / Honors</th>
                  <th className={th} style={{ minWidth: 110 }}>MSPE</th>
                  <th className={th} style={{ minWidth: 100 }}>Acad Hx</th>
                  <th className={th} style={{ minWidth: 100 }}>Gap</th>
                  <th className={th} style={{ minWidth: 150 }}>Parallel Plan</th>
                  <th className={th} style={{ minWidth: 110 }}>Applied</th>
                  <th className={th} style={{ minWidth: 100 }}>Interviews</th>
                  <th className={th} style={{ minWidth: 80  }}>SOAP</th>
                  <th className={th} style={{ minWidth: 200 }}>Match Result</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => {
                  const asmt      = assessments[student.id]
                  const risk      = asmt?.risk_level || 'low'
                  const isSel     = selectedId === student.id
                  const step2     = student.usmle_step2_score
                  const mean      = SPECIALTY_MEANS[student.specialty_interest]
                  const delta     = step2 != null && mean ? step2 - mean : null
                  const suggested = autoScore(student)

                  // Per-cell background: highlight only the selected cell
                  const bg = (col) => {
                    const rowSel = isSel
                    const colSel = selectedCol === col
                    if (rowSel && colSel) return 'bg-teal-100'
                    if (rowSel) return 'bg-teal-50'
                    return 'bg-white'
                  }
                  const cellClass = (col, extra = '') =>
                    `border-b border-stone-100 px-4 py-3 text-sm cursor-pointer hover:bg-teal-50 transition-colors ${bg(col)} ${extra}`

                  return (
                    <tr key={student.id} className={isSel ? '' : 'hover:bg-stone-50'}>

                      {/* Name — opens overview */}
                      <td className={`sticky left-0 z-10 ${cellClass('overview')}`}
                        onClick={e => clickCell(student.id, 'overview', e)}>
                        <p className="text-sm font-medium text-stone-900 whitespace-nowrap">{student.profiles?.full_name}</p>
                        {student.aoa && <span className="text-xs text-amber-600 font-semibold">AOA</span>}
                      </td>

                      {/* Specialty — not a separate mode, click opens overview */}
                      <td className={`sticky z-10 ${cellClass('overview')}`} style={{ left: 200 }}
                        onClick={e => clickCell(student.id, 'overview', e)}>
                        <p className="text-sm text-stone-700 whitespace-nowrap">{student.specialty_interest || '—'}</p>
                        {COMPETITIVE.has(student.specialty_interest) && (
                          <p className="text-xs text-purple-600 font-medium">Competitive</p>
                        )}
                      </td>

                      {/* Risk Level — inline dropdown, no drawer */}
                      <td className={`sticky z-10 border-b border-stone-100 border-r border-stone-200 px-4 py-3 ${bg('risk')}`}
                        style={{ left: 360 }}>
                        <div className="relative flex items-center gap-1">
                          <RiskPill level={risk} onClick={() => setRiskOpen(riskOpen === student.id ? null : student.id)} />
                          {suggested !== risk && (
                            <span title={`Auto-score: ${RISK_CFG[suggested]?.label}`} className="text-amber-400 text-xs cursor-help">⚡</span>
                          )}
                          {riskOpen === student.id && (
                            <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-xl border border-stone-200 shadow-xl p-1 min-w-[150px]"
                              onClick={e => e.stopPropagation()}>
                              {Object.entries(RISK_CFG).map(([val, vcfg]) => (
                                <button key={val} onClick={() => updateRisk(student.id, val)}
                                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors ${risk === val ? 'font-semibold' : ''}`}>
                                  <span className={`w-2 h-2 rounded-full ${vcfg.dot}`} />
                                  {vcfg.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Step 1 — read-only */}
                      <td className={cellClass('overview')} onClick={e => clickCell(student.id, 'overview', e)}>
                        <span className={`font-medium ${(student.usmle_step1_attempts || 0) > 1 ? 'text-orange-600' : 'text-stone-700'}`}>
                          {(student.usmle_step1_attempts || 0) > 1 ? 'F/P' : student.usmle_step1_status === 'pass' ? 'Pass' : '—'}
                        </span>
                        {(student.usmle_step1_attempts || 0) > 1 && (
                          <span className="text-xs text-stone-400 ml-1">({student.usmle_step1_attempts}×)</span>
                        )}
                      </td>

                      {/* Step 2 — read-only */}
                      <td className={cellClass('overview')} onClick={e => clickCell(student.id, 'overview', e)}>
                        {step2 ? (
                          <span>
                            <span className={`font-semibold ${
                              delta === null ? 'text-stone-600' :
                              delta < -20 ? 'text-rose-600' : delta < -10 ? 'text-orange-500' :
                              delta < 0 ? 'text-yellow-600' : 'text-emerald-600'}`}>{step2}</span>
                            {mean && (
                              <span className="text-xs text-stone-400 ml-1">
                                / {mean} <span className={delta < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                  ({delta >= 0 ? '+' : ''}{delta})
                                </span>
                              </span>
                            )}
                          </span>
                        ) : <span className="text-stone-300">—</span>}
                      </td>

                      {/* HP / Honors */}
                      <td className={cellClass('hp')} onClick={e => clickCell(student.id, 'hp', e)}>
                        <span className={
                          student.hp_in_specialty === 'Honors'    ? 'text-emerald-600 font-semibold' :
                          student.hp_in_specialty === 'High Pass' ? 'text-emerald-500' :
                          student.hp_in_specialty === 'Pass'      ? 'text-stone-600' :
                          student.hp_in_specialty === 'No'        ? 'text-rose-500' : 'text-stone-300'}>
                          {student.hp_in_specialty || '—'}
                        </span>
                      </td>

                      {/* MSPE */}
                      <td className={cellClass('mspe')} onClick={e => clickCell(student.id, 'mspe', e)}>
                        <span className={
                          student.mspe_ranking === 'Excellent'    ? 'text-emerald-600 font-semibold' :
                          student.mspe_ranking === 'Very Good'    ? 'text-emerald-500' :
                          student.mspe_ranking === 'Good'         ? 'text-stone-600' :
                          student.mspe_ranking === 'Satisfactory' ? 'text-yellow-600' :
                          student.mspe_ranking === 'Concerning'   ? 'text-rose-600 font-semibold' :
                          'text-stone-300'}>
                          {student.mspe_ranking || '—'}
                        </span>
                      </td>

                      {/* Acad Hx */}
                      <td className={cellClass('acad')} onClick={e => clickCell(student.id, 'acad', e)}>
                        {student.poor_academic_history
                          ? <span title={student.poor_academic_history}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs font-bold">!</span>
                          : <span className="text-stone-200">—</span>}
                      </td>

                      {/* Gap */}
                      <td className={cellClass('acad')} onClick={e => clickCell(student.id, 'acad', e)}>
                        <span className={student.gap_in_school ? 'text-orange-600 text-xs' : 'text-stone-300'}>
                          {student.gap_in_school || '—'}
                        </span>
                      </td>

                      {/* Parallel Plan */}
                      <td className={cellClass('parallel')} onClick={e => clickCell(student.id, 'parallel', e)}>
                        <span className="text-stone-600 text-xs">{asmt?.parallel_plan || '—'}</span>
                      </td>

                      {/* Applied Programs */}
                      <td className={cellClass('interviews')} onClick={e => clickCell(student.id, 'interviews', e)}>
                        {asmt?.applied_programs_data?.length > 0 ? (() => {
                          const data   = asmt.applied_programs_data
                          const gold   = data.filter(p => p.signal === 'gold').length
                          const silver = data.filter(p => p.signal === 'silver').length
                          return (
                            <div>
                              <span className="font-semibold text-stone-700">{data.length}</span>
                              <span className="text-xs text-stone-400 ml-1">programs</span>
                              {(gold > 0 || silver > 0) && (
                                <p className="text-xs mt-0.5 text-stone-400">
                                  {gold > 0 && <span>🥇{gold}</span>}
                                  {silver > 0 && <span className="ml-1">🥈{silver}</span>}
                                </p>
                              )}
                            </div>
                          )
                        })() : <span className="text-stone-300">—</span>}
                      </td>

                      {/* Interviews */}
                      <td className={cellClass('interviews')} onClick={e => clickCell(student.id, 'interviews', e)}>
                        {asmt?.interview_count != null ? (
                          <span>
                            <span className={`font-semibold ${
                              asmt.interview_count < 4 ? 'text-rose-600' :
                              asmt.interview_count < 8 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                              {asmt.interview_count}
                            </span>
                            {(asmt.prelim_interview_count > 0) && (
                              <span className="text-xs text-stone-400 ml-1">+{asmt.prelim_interview_count}p</span>
                            )}
                          </span>
                        ) : <span className="text-stone-300">—</span>}
                      </td>

                      {/* SOAP */}
                      <td className={cellClass('soap')} onClick={e => clickCell(student.id, 'soap', e)}>
                        {asmt?.soap_outcome
                          ? <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">SOAP</span>
                          : asmt?.soap_plan
                          ? <span title={asmt.soap_plan} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium cursor-help">Plan</span>
                          : <span className="text-stone-300">—</span>}
                      </td>

                      {/* Match Result */}
                      <td className={cellClass('match')} onClick={e => clickCell(student.id, 'match', e)}>
                        {asmt?.matched_program ? (
                          <div>
                            <p className="text-stone-900 font-medium text-xs truncate max-w-[190px]">{asmt.matched_program}</p>
                            <p className="text-stone-400 text-xs">
                              {asmt.matched_specialty || ''}
                              {asmt.rank_of_match ? ` · rank #${asmt.rank_of_match}` : ''}
                              {asmt.soap_outcome ? ' · SOAP' : ''}
                            </p>
                          </div>
                        ) : <span className="text-stone-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {selectedId && selectedStudent && (
          <Drawer
            student={selectedStudent}
            assessment={selectedAssessment}
            history={selectedHistory}
            mode={selectedCol}
            onClose={() => setSelectedId(null)}
            onRiskChange={updateRisk}
            onSave={saveAssessment}
          />
        )}
      </div>

      {riskOpen && <div className="fixed inset-0 z-40" onClick={() => setRiskOpen(null)} />}
    </div>
  )
}
