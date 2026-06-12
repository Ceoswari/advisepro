'use client'

import { useState } from 'react'

const GRADE_COLORS = {
  'high pass': 'bg-emerald-100 text-emerald-700',
  'pass':      'bg-teal-100 text-teal-700',
  'fail':      'bg-rose-100 text-rose-700',
  'honors':    'bg-purple-100 text-purple-700',
}

function gradeColor(g) {
  return GRADE_COLORS[g?.toLowerCase()] || 'bg-stone-100 text-stone-600'
}

function CourseRow({ grade }) {
  const [open, setOpen] = useState(false)
  const components = grade.components || {}
  const classAvgs = grade.class_averages || {}
  const componentKeys = Object.keys(components)

  return (
    <div className="border-b border-stone-50 last:border-0">
      <button
        onClick={() => componentKeys.length > 0 && setOpen(o => !o)}
        className={`w-full px-5 py-4 flex items-center gap-4 text-left ${componentKeys.length > 0 ? 'hover:bg-stone-50' : ''} transition-colors`}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900 truncate">{grade.course_name}</p>
          <p className="text-xs text-stone-400 mt-0.5">{grade.term} · {grade.academic_year}</p>
        </div>
        <div className="text-right flex-shrink-0 mr-2">
          {grade.course_percent != null && (
            <p className="text-sm font-bold text-stone-800">{grade.course_percent}%</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${gradeColor(grade.letter_grade)}`}>
          {grade.letter_grade || '—'}
        </span>
        {componentKeys.length > 0 && (
          <span className={`text-stone-300 text-xs flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        )}
      </button>

      {open && componentKeys.length > 0 && (
        <div className="px-5 pb-4 bg-stone-50/50">
          <div className="space-y-2">
            {componentKeys.map(key => {
              const val = components[key]
              const avg = classAvgs[key]
              const avgNum = avg ? parseFloat(avg.match(/[\d.]+/)?.[0]) : null
              const above = avgNum != null && typeof val === 'number' && val >= avgNum
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-stone-600 flex-1 min-w-0 truncate">{key}</span>
                  <span className={`text-xs font-semibold ${
                    typeof val === 'number'
                      ? above ? 'text-emerald-600' : 'text-amber-600'
                      : 'text-stone-700'
                  }`}>
                    {typeof val === 'number' ? val.toFixed(1) : val}
                  </span>
                  {avgNum != null && (
                    <span className="text-xs text-stone-400 flex-shrink-0">
                      class avg: {avgNum.toFixed(1)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-stone-300 mt-3">Click row to collapse · Class averages from import</p>
        </div>
      )}
    </div>
  )
}

export default function GradesCard({ grades }) {
  if (!grades) return null

  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">Course Grades</h3>
          <p className="text-xs text-stone-400 mt-0.5">{grades.length} course{grades.length !== 1 ? 's' : ''} · click a row for component breakdown</p>
        </div>
      </div>

      {grades.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-stone-400">No grades on record yet.</p>
          <p className="text-xs text-stone-300 mt-1">Grades appear here after an admin uploads a Progress IQ export.</p>
        </div>
      ) : (
        <div>
          {grades
            .sort((a, b) => {
              const yearCmp = (b.academic_year || '').localeCompare(a.academic_year || '')
              if (yearCmp !== 0) return yearCmp
              return (a.course_name || '').localeCompare(b.course_name || '')
            })
            .map(g => <CourseRow key={g.id} grade={g} />)
          }
        </div>
      )}
    </div>
  )
}
