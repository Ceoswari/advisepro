'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardNav, { STUDENT_NAV } from '@/app/components/DashboardNav'

const YEARS = [2026, 2025, 2024, 2023, 2022]

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
  const [specialties,      setSpecialties]      = useState([])
  const [states,           setStates]           = useState([])
  const [selectedSpec,     setSelectedSpec]     = useState('')
  const [selectedState,    setSelectedState]    = useState('')
  const [search,           setSearch]           = useState('')
  const [programs,         setPrograms]         = useState([])
  const [loading,          setLoading]          = useState(false)
  const [loadingFilters,   setLoadingFilters]   = useState(true)
  const [sortBy,           setSortBy]           = useState('avg_fill')
  const [sortDir,          setSortDir]          = useState('desc')

  // Load distinct specialties + states for filter dropdowns
  useEffect(() => {
    supabase
      .from('residency_programs')
      .select('specialty, state')
      .then(({ data }) => {
        if (!data) return
        setSpecialties([...new Set(data.map(r => r.specialty))].sort())
        setStates([...new Set(data.map(r => r.state).filter(Boolean))].sort())
        setLoadingFilters(false)
      })
  }, [])

  // Load programs when specialty / state changes
  useEffect(() => {
    if (!selectedSpec) { setPrograms([]); return }
    setLoading(true)
    let q = supabase
      .from('residency_programs')
      .select('*')
      .eq('specialty', selectedSpec)
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
        p.program_code?.toLowerCase().includes(q)
      )
    })
    .map(p => ({ ...p, _avg: avgFill(p) }))
    .sort((a, b) => {
      let av, bv
      if (sortBy === 'avg_fill') { av = a._avg ?? -1; bv = b._avg ?? -1 }
      else if (sortBy === 'quota') { av = a.quota_2026 ?? -1; bv = b.quota_2026 ?? -1 }
      else if (sortBy === 'institution') { av = a.institution ?? ''; bv = b.institution ?? '' }
      else if (sortBy === 'state') { av = a.state ?? ''; bv = b.state ?? '' }
      else { av = 0; bv = 0 }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="text-stone-300 ml-1">↕</span>
    return <span className="text-teal-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const thBase = 'px-4 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap bg-stone-50 border-b border-stone-100'
  const thSort = `${thBase} cursor-pointer hover:text-stone-700 select-none`

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav navItems={STUDENT_NAV} />

      <div className="max-w-full px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Residency Programs</h2>
          <p className="text-stone-400 mt-1 text-sm">
            National match data from NRMP 2022–2026. Search by specialty and state to explore programs and fill rates.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-stone-400 font-medium mb-1 block">Specialty</label>
              <select
                value={selectedSpec}
                onChange={e => setSelectedSpec(e.target.value)}
                disabled={loadingFilters}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">— Select a specialty —</option>
                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="w-48">
              <label className="text-xs text-stone-400 font-medium mb-1 block">State</label>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
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
                placeholder="Institution, city..."
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
              {displayed.length} program{displayed.length !== 1 ? 's' : ''}
              {selectedState ? ` in ${selectedState}` : ' nationally'}
              {search ? ` matching "${search}"` : ''}
              {' '}for <strong className="text-stone-600">{selectedSpec}</strong>
            </p>
          )}
        </div>

        {/* Empty state */}
        {!selectedSpec && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-16 text-center">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🏥</div>
            <p className="text-stone-600 font-medium">Select a specialty to get started</p>
            <p className="text-stone-400 text-sm mt-1">
              Browse {loadingFilters ? '...' : specialties.length} specialties · 6,366 programs · NRMP 2022–2026 match data
            </p>
          </div>
        )}

        {/* Loading */}
        {selectedSpec && loading && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-16 text-center text-stone-400 text-sm">
            Loading programs...
          </div>
        )}

        {/* No results */}
        {selectedSpec && !loading && displayed.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-16 text-center text-stone-400 text-sm">
            No programs found for this combination.
          </div>
        )}

        {/* Table */}
        {!loading && displayed.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 860 }}>
                <thead>
                  <tr>
                    <th className={thSort} onClick={() => handleSort('institution')}>
                      Program / Institution <SortIcon col="institution" />
                    </th>
                    <th className={thSort} onClick={() => handleSort('state')}>
                      Location <SortIcon col="state" />
                    </th>
                    <th className={thSort} style={{ minWidth: 80 }} onClick={() => handleSort('quota')}>
                      Size <SortIcon col="quota" />
                    </th>
                    {YEARS.map(y => (
                      <th key={y} className={thBase} style={{ minWidth: 80 }}>{y}</th>
                    ))}
                    <th className={thSort} style={{ minWidth: 90 }} onClick={() => handleSort('avg_fill')}>
                      Avg Fill <SortIcon col="avg_fill" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((p, idx) => (
                    <tr key={p.id} className={`border-b border-stone-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'} hover:bg-teal-50/30 transition-colors`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-stone-900">{p.institution}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{p.program_code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-stone-700">{p.city || '—'}</p>
                        <p className="text-xs text-stone-400">{p.state}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-stone-700">{p.quota_2026 ?? '—'}</span>
                        <p className="text-xs text-stone-400">spots</p>
                      </td>
                      {YEARS.map(y => (
                        <FillCell key={y} quota={p[`quota_${y}`]} filled={p[`filled_${y}`]} />
                      ))}
                      <td className="px-4 py-3 text-center">
                        <AvgBadge pct={p._avg} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-6 py-4 border-t border-stone-100 flex flex-wrap items-center gap-4">
              <p className="text-xs text-stone-400 font-medium">Fill rate key:</p>
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
                <span className="text-xs text-stone-500">&lt;60% — unfilled spots</span>
              </div>
              <p className="text-xs text-stone-300 ml-auto">Source: NRMP Main Residency Match 2022–2026</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
