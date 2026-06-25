'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardNav, { STUDENT_NAV } from '@/app/components/DashboardNav'

const YEARS = [2026, 2025, 2024, 2023, 2022]

// ACGME specialty codes (characters 5-7 of program code) → canonical specialty name
const ACGME = {
  '040': 'Anesthesiology',
  '080': 'Dermatology',
  '110': 'Emergency Medicine',
  '120': 'Family Medicine',
  '140': 'Internal Medicine',
  '160': 'Neurological Surgery',
  '180': 'Neurology',
  '185': 'Child Neurology',
  '186': 'Neurodevelopmental Disabilities',
  '200': 'Nuclear Medicine',
  '220': 'Obstetrics and Gynecology',
  '260': 'Orthopaedic Surgery',
  '275': 'Osteopathic Neuromusculoskeletal Medicine',
  '280': 'Otolaryngology',
  '300': 'Pathology',
  '320': 'Pediatrics',
  '340': 'Physical Medicine and Rehabilitation',
  '362': 'Plastic Surgery (Integrated)',
  '380': 'Public Health & Preventive Medicine',
  '382': 'Occupational & Environmental Medicine',
  '400': 'Psychiatry',
  '416': 'Interventional Radiology (Integrated)',
  '420': 'Diagnostic Radiology',
  '430': 'Radiation Oncology',
  '440': 'General Surgery',
  '451': 'Vascular Surgery',
  '461': 'Thoracic Surgery',
  '700': 'Internal Medicine / Pediatrics',
  '705': 'Emergency Medicine / Internal Medicine',
  '715': 'Internal Medicine / Psychiatry',
  '720': 'Psychiatry / Family Medicine',
  '725': 'Pediatrics / Emergency Medicine',
  '726': 'Pediatrics / Anesthesiology',
  '730': 'Pediatrics / Psychiatry / Child Psychiatry',
  '735': 'Pediatrics / Physical Medicine',
  '742': 'Internal Medicine / Anesthesiology',
  '751': 'Internal Medicine / Preventive Medicine',
  '752': 'Family Medicine / Preventive Medicine',
  '755': 'Psychiatry / Neurology',
  '757': 'Internal Medicine / Aerospace Medicine',
  '765': 'Pediatrics / Medical Genetics',
  '766': 'Internal Medicine / Medical Genetics',
  '770': 'Diagnostic Radiology / Nuclear Medicine',
  '785': 'Dermatology / Internal Medicine',
  '795': 'Emergency Medicine / Family Medicine',
  '796': 'Emergency Medicine / Anesthesiology',
  '797': 'Emergency Medicine / Aerospace Medicine',
  '999': 'Transitional Year',
}

// Reverse map: specialty name → ACGME code
const SPEC_TO_CODE = Object.fromEntries(Object.entries(ACGME).map(([k, v]) => [v, k]))

function specFromCode(programCode) {
  return ACGME[programCode?.substring(4, 7)] || null
}

function fillRate(quota, filled) {
  if (!quota) return null
  return Math.round((filled || 0) / quota * 100)
}

function avgFill(program) {
  const rates = YEARS
    .map(y => fillRate(program[`quota_${y}`], program[`filled_${y}`]))
    .filter(r => r !== null)
  if (!rates.length) return null
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
}

function FillCell({ quota, filled }) {
  if (!quota) return <td className="px-4 py-3 text-center text-stone-200 text-xs">—</td>
  const pct = fillRate(quota, filled)
  const color =
    pct >= 95 ? 'text-emerald-700 font-semibold' :
    pct >= 80 ? 'text-emerald-600' :
    pct >= 60 ? 'text-yellow-600' :
                'text-orange-600'
  return (
    <td className="px-4 py-3 text-center">
      <div className={`text-xs ${color}`}>{filled ?? '?'}/{quota}</div>
      <div className={`text-xs ${color}`}>{pct}%</div>
    </td>
  )
}

function AvgBadge({ pct }) {
  if (pct === null) return <span className="text-stone-300 text-xs">—</span>
  const color =
    pct >= 95 ? 'bg-emerald-100 text-emerald-700' :
    pct >= 80 ? 'bg-emerald-50 text-emerald-600' :
    pct >= 60 ? 'bg-yellow-100 text-yellow-700' :
                'bg-orange-100 text-orange-700'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>
  )
}

export default function ProgramsPage() {
  const [states,         setStates]         = useState([])
  const [selectedSpec,   setSelectedSpec]   = useState('')
  const [selectedState,  setSelectedState]  = useState('')
  const [search,         setSearch]         = useState('')
  const [programs,       setPrograms]       = useState([])
  const [loading,        setLoading]        = useState(false)
  const [loadingStates,  setLoadingStates]  = useState(true)
  const [sortBy,         setSortBy]         = useState('avg_fill')
  const [sortDir,        setSortDir]        = useState('desc')

  // Specialties come directly from the ACGME map — no DB query needed
  const specialties = Object.values(ACGME).sort()

  // Load distinct states (need all rows — use limit 10000)
  useEffect(() => {
    supabase
      .from('residency_programs')
      .select('state')
      .limit(10000)
      .then(({ data }) => {
        if (!data) return
        setStates([...new Set(data.map(r => r.state).filter(Boolean))].sort())
        setLoadingStates(false)
      })
  }, [])

  // Load programs when specialty / state changes
  // Filter by the 3-digit ACGME code embedded in program_code (chars 5-7)
  useEffect(() => {
    if (!selectedSpec) { setPrograms([]); return }
    const code = SPEC_TO_CODE[selectedSpec]
    if (!code) return
    setLoading(true)
    // program_code format: IIII + SSS + T + ### (4 institution + 3 specialty + type + track)
    let q = supabase
      .from('residency_programs')
      .select('*')
      .like('program_code', `____${code}%`)
      .limit(2000)
    if (selectedState) q = q.eq('state', selectedState)
    q.order('state').order('institution').then(({ data }) => {
      setPrograms(data || [])
      setLoading(false)
    })
  }, [selectedSpec, selectedState])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const displayed = programs
    .filter(p => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        p.institution?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.state?.toLowerCase().includes(q) ||
        p.specialty?.toLowerCase().includes(q)
      )
    })
    .map(p => ({ ...p, _avg: avgFill(p) }))
    .sort((a, b) => {
      let av, bv
      if      (sortBy === 'avg_fill')   { av = a._avg ?? -1;        bv = b._avg ?? -1 }
      else if (sortBy === 'quota')      { av = a.quota_2026 ?? -1;  bv = b.quota_2026 ?? -1 }
      else if (sortBy === 'institution'){ av = a.institution ?? '';  bv = b.institution ?? '' }
      else if (sortBy === 'state')      { av = a.state ?? '';        bv = b.state ?? '' }
      else { av = 0; bv = 0 }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortIcon = ({ col }) =>
    sortBy !== col
      ? <span className="text-stone-300 ml-1">↕</span>
      : <span className="text-teal-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>

  const thBase = 'px-4 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap bg-stone-50 border-b border-stone-100'
  const thSort = `${thBase} cursor-pointer hover:text-stone-700 select-none`

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav navItems={STUDENT_NAV} />

      <div className="max-w-full px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Residency Programs</h2>
          <p className="text-stone-400 mt-1 text-sm">
            National match data from NRMP 2022–2026. Filter by specialty and state to explore programs and fill rates.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-stone-400 font-medium mb-1 block">Specialty</label>
              <select
                value={selectedSpec}
                onChange={e => { setSelectedSpec(e.target.value); setSearch('') }}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">— Select a specialty —</option>
                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="w-52">
              <label className="text-xs text-stone-400 font-medium mb-1 block">State</label>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                disabled={loadingStates}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-stone-400 font-medium mb-1 block">Search within results</label>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Institution, city, track name..."
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            {(selectedState || search) && (
              <button
                onClick={() => { setSelectedState(''); setSearch('') }}
                className="text-sm text-stone-400 hover:text-stone-700 border border-stone-200 px-4 py-2 rounded-xl hover:bg-stone-50 transition-colors">
                Clear
              </button>
            )}
          </div>

          {programs.length > 0 && (
            <p className="text-xs text-stone-400 mt-3">
              Showing <strong className="text-stone-600">{displayed.length}</strong> program{displayed.length !== 1 ? 's' : ''}
              {selectedState ? ` in ${selectedState}` : ' nationally'}
              {search ? ` matching "${search}"` : ''}
              {' '}· <strong className="text-stone-600">{selectedSpec}</strong>
            </p>
          )}
        </div>

        {/* Empty state */}
        {!selectedSpec && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-16 text-center">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🏥</div>
            <p className="text-stone-600 font-medium">Select a specialty to get started</p>
            <p className="text-stone-400 text-sm mt-1">
              {specialties.length} specialties · 6,366 programs · NRMP 2022–2026 match data
            </p>
          </div>
        )}

        {selectedSpec && loading && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-16 text-center text-stone-400 text-sm">
            Loading programs...
          </div>
        )}

        {selectedSpec && !loading && displayed.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-16 text-center text-stone-400 text-sm">
            No programs found for this combination.
          </div>
        )}

        {/* Table */}
        {!loading && displayed.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th className={thSort} style={{ minWidth: 220 }} onClick={() => handleSort('institution')}>
                      Institution <SortIcon col="institution" />
                    </th>
                    <th className={thBase} style={{ minWidth: 160 }}>Track / Program Type</th>
                    <th className={thSort} style={{ minWidth: 160 }} onClick={() => handleSort('state')}>
                      Location <SortIcon col="state" />
                    </th>
                    <th className={thSort} style={{ minWidth: 70 }} onClick={() => handleSort('quota')}>
                      Size <SortIcon col="quota" />
                    </th>
                    {YEARS.map(y => (
                      <th key={y} className={thBase} style={{ minWidth: 80 }}>{y}</th>
                    ))}
                    <th className={thSort} style={{ minWidth: 90 }} onClick={() => handleSort('avg_fill')}>
                      5-yr Avg <SortIcon col="avg_fill" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((p, idx) => {
                    // Track name = everything after the base specialty name in the stored specialty field
                    const base = selectedSpec
                    const track = p.specialty?.startsWith(base)
                      ? p.specialty.slice(base.length).replace(/^[\s\/\-]+/, '')
                      : p.specialty
                    return (
                      <tr key={p.id} className={`border-b border-stone-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/30'} hover:bg-teal-50/20 transition-colors`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-stone-900">{p.institution || '—'}</p>
                          <p className="text-xs text-stone-300 mt-0.5 font-mono">{p.program_code}</p>
                        </td>
                        <td className="px-4 py-3">
                          {track
                            ? <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{track}</span>
                            : <span className="text-stone-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-stone-700">{p.city || '—'}</p>
                          <p className="text-xs text-stone-400">{p.state}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-stone-700">{p.quota_2026 ?? '—'}</span>
                        </td>
                        {YEARS.map(y => (
                          <FillCell key={y} quota={p[`quota_${y}`]} filled={p[`filled_${y}`]} />
                        ))}
                        <td className="px-4 py-3 text-center">
                          <AvgBadge pct={p._avg} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-stone-100 flex flex-wrap items-center gap-4">
              <p className="text-xs text-stone-400 font-medium">Fill rate:</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-stone-500">≥95% filled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-xs text-stone-500">60–94%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-xs text-stone-500">&lt;60% (unfilled spots)</span>
              </div>
              <p className="text-xs text-stone-300 ml-auto">Source: NRMP Main Residency Match 2022–2026</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
