'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardNav, { ADMIN_NAV } from '@/app/components/DashboardNav'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard/admin', label: 'Students' },
  { href: '/dashboard/admin/analytics', label: 'Analytics' },
  { href: '/dashboard/admin/milestones', label: 'Milestones' },
  { href: '/dashboard/admin/audit', label: 'Audit Log' },
]

export default function AuditLogPage() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    const fetchLogs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data } = await supabase
        .from('audit_logs')
        .select(`
          id, created_at, action, changes,
          performed_by,
          profiles!audit_logs_performed_by_fkey(full_name),
          students(id, profiles(full_name))
        `)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      setLogs(data || [])
      setLoading(false)
    }
    fetchLogs()
  }, [page])

  const filtered = logs.filter(log => {
    if (!search) return true
    const adminName = log.profiles?.full_name?.toLowerCase() || ''
    const studentName = log.students?.profiles?.full_name?.toLowerCase() || ''
    const changes = JSON.stringify(log.changes).toLowerCase()
    return adminName.includes(search.toLowerCase()) ||
           studentName.includes(search.toLowerCase()) ||
           changes.includes(search.toLowerCase())
  })

  const formatDate = (ts) => new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav navItems={ADMIN_NAV} />

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Audit Log</h2>
          <p className="text-stone-500 mt-1">Every data change made by administrators — immutable record</p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by admin name, student name, or field..."
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center text-stone-400 text-sm">
            Loading audit log...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center">
            <p className="text-stone-400 text-sm">No audit log entries yet.</p>
            <p className="text-stone-300 text-xs mt-1">Entries are created whenever an admin edits a student's data.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
              <p className="text-xs text-stone-400">{filtered.length} entries</p>
              <p className="text-xs text-stone-300">Records cannot be edited or deleted</p>
            </div>

            <div className="divide-y divide-stone-50">
              {filtered.map(log => {
                const changes = Array.isArray(log.changes) ? log.changes : []
                return (
                  <div key={log.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-teal-700 text-xs font-semibold">
                            {log.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'A'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-stone-900">{log.profiles?.full_name || 'Unknown admin'}</span>
                          <span className="text-stone-400 text-sm"> edited </span>
                          <button
                            onClick={() => router.push(`/dashboard/admin/students/${log.student_id}`)}
                            className="text-sm font-semibold text-teal-600 hover:text-teal-800">
                            {log.students?.profiles?.full_name || 'Unknown student'}
                          </button>
                        </div>
                      </div>
                      <span className="text-xs text-stone-400 flex-shrink-0">{formatDate(log.created_at)}</span>
                    </div>

                    {changes.length > 0 && (
                      <div className="ml-9 space-y-1.5">
                        {changes.map((change, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-stone-500 font-medium w-32 flex-shrink-0">{change.field}</span>
                            <span className="text-stone-300">→</span>
                            {change.old_value && change.old_value !== '' ? (
                              <>
                                <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-mono line-through">
                                  {change.old_value}
                                </span>
                                <span className="text-stone-300">→</span>
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono">
                                  {change.new_value}
                                </span>
                              </>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono">
                                {change.new_value} <span className="text-emerald-400 font-sans not-italic">(new)</span>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="text-sm text-stone-500 hover:text-stone-800 disabled:opacity-30">
                ← Previous
              </button>
              <span className="text-xs text-stone-400">Page {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={logs.length < PAGE_SIZE}
                className="text-sm text-stone-500 hover:text-stone-800 disabled:opacity-30">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
