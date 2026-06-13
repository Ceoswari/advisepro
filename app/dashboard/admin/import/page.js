'use client'

import { useRouter } from 'next/navigation'
import DashboardNav, { ADMIN_NAV } from '@/app/components/DashboardNav'

const IMPORT_TYPES = [
  {
    id: 'grades',
    title: 'Course Grades',
    source: 'Progress IQ',
    description: 'Upload a class grade sheet exported from Progress IQ. Matches students by Banner ID and Rowan email.',
    icon: '📊',
    href: '/dashboard/admin/import/grades',
    available: true,
  },
  {
    id: 'step_scores',
    title: 'USMLE Step 1 Results',
    source: 'NBME',
    description: 'Upload the NBME class Step 1 results CSV. Students are matched by first and last name. Records pass/fail status and number of attempts.',
    icon: '🩺',
    href: '/dashboard/admin/import/step1',
    available: true,
  },
  {
    id: 'step2_scores',
    title: 'USMLE Step 2 Scores',
    source: 'NBME',
    description: 'Upload the NBME class Step 2 results CSV. Students are matched by first and last name. Records the score and number of attempts; best score is saved when two attempts are on file.',
    icon: '📋',
    href: '/dashboard/admin/import/step2',
    available: true,
  },
  {
    id: 'shelf_exams',
    title: 'NBME Shelf Exams',
    source: 'NBME',
    description: 'Upload clerkship shelf exam results by subject. Coming once the file format is confirmed.',
    icon: '📋',
    href: null,
    available: false,
  },
]

export default function ImportHub() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav navItems={ADMIN_NAV} />

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">Import Data</h2>
          <p className="text-stone-500 mt-1">
            Upload official data exports from institutional systems. Students are matched by Banner ID
            with Rowan email as a secondary verification — both must align for data to be imported.
          </p>
        </div>

        <div className="space-y-4">
          {IMPORT_TYPES.map(type => (
            <div key={type.id}
              onClick={() => type.available && type.href && router.push(type.href)}
              className={`bg-white rounded-2xl border p-6 flex items-start gap-5 transition-all ${
                type.available
                  ? 'border-stone-100 cursor-pointer hover:border-teal-200 hover:shadow-md'
                  : 'border-stone-100 opacity-60 cursor-not-allowed'
              }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                type.available ? 'bg-teal-50' : 'bg-stone-50'}`}>
                {type.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-stone-900">{type.title}</p>
                  <span className="text-xs text-stone-400">from {type.source}</span>
                  {!type.available && (
                    <span className="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">Coming soon</span>
                  )}
                </div>
                <p className="text-sm text-stone-500">{type.description}</p>
              </div>
              {type.available && (
                <span className="text-stone-300 text-lg flex-shrink-0 self-center">→</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-amber-500 text-lg flex-shrink-0">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Before importing real student data</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Ensure all student accounts have a Banner ID set. Any row where the Banner ID is not found
              in AdvisePro will be skipped — no data will be imported for unmatched students.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
