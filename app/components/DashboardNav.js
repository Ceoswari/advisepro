'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Shared nav item sets ────────────────────────────────────────────────────

export const ADMIN_NAV = [
  { label: 'Students',    href: '/dashboard/admin',            exact: true   },
  { label: 'Analytics',   href: '/dashboard/admin/analytics',  exact: true   },
  { label: 'Milestones',  href: '/dashboard/admin/milestones', exact: true   },
  { label: 'Import Data', href: '/dashboard/admin/import',     exact: false  },
  { label: 'Audit Log',   href: '/dashboard/admin/audit',      exact: true   },
]

export const ADVISOR_NAV = [
  { label: 'My Students', href: '/dashboard/advisor', tab: 'students', isDefault: true },
  { label: 'Messages',    href: '/dashboard/advisor', tab: 'messages' },
]

export const STUDENT_NAV = [
  { label: 'Overview',   href: '/dashboard/student', tab: 'overview',   isDefault: true },
  { label: 'Milestones', href: '/dashboard/student', tab: 'milestones' },
  { label: 'Grades',     href: '/dashboard/student', tab: 'grades'     },
  { label: 'Messages',   href: '/dashboard/student', tab: 'messages'   },
]

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Props:
 *  navItems  — array of { label, href, tab?, isDefault?, badge?, exact? }
 *  activeTab — current tab string, used to highlight tab-based nav items
 *  backHref  — if set, shows a "← Back" link before the nav items
 *  backLabel — override the back link text
 *  children  — extra content placed in the right slot (before Sign out)
 */
export default function DashboardNav({
  navItems,
  activeTab,
  backHref,
  backLabel = '← Back',
  children,
}) {
  const router   = useRouter()
  const pathname = usePathname()

  const [userInitials, setUserInitials] = useState('')
  const [userName, setUserName]         = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name').eq('id', user.id).single().then(({ data }) => {
        if (data?.full_name) {
          setUserName(data.full_name)
          setUserInitials(data.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase())
        }
      })
    })
  }, [])

  const homeHref = pathname.startsWith('/dashboard/advisor')
    ? '/dashboard/advisor'
    : pathname.startsWith('/dashboard/admin')
    ? '/dashboard/admin'
    : '/dashboard/student'

  const isActive = (item) => {
    if (item.tab) {
      // Tab-based item — active when the passed activeTab matches
      if (!activeTab) return !!item.isDefault
      return item.tab === activeTab
    }
    // Path-based item
    if (item.exact === false) return pathname.startsWith(item.href)
    return pathname === item.href
  }

  const handleNav = (item) => {
    if (item.tab) {
      router.push(`${item.href}?tab=${item.tab}`)
    } else {
      router.push(item.href)
    }
  }

  return (
    <div className="bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex items-center justify-between sticky top-0 z-10">
      {/* Left: logo + back + nav tabs */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => router.push(homeHref)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
          <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-bold text-stone-900 text-lg">AdvisePro</span>
        </button>

        {backHref && (
          <button
            onClick={() => router.push(backHref)}
            className="text-sm text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0">
            {backLabel}
          </button>
        )}

        {navItems && navItems.length > 0 && (
          <nav className="flex gap-1">
            {navItems.map(item => (
              <button
                key={item.label}
                onClick={() => handleNav(item)}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  isActive(item)
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                }`}>
                {item.label}
                {item.badge > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive(item) ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Right: user info + extra children + sign out */}
      <div className="flex items-center gap-3">
        {children}
        {userInitials && (
          <>
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-teal-700 text-xs font-semibold">{userInitials}</span>
            </div>
            <span className="text-sm text-stone-500 hidden sm:block">{userName}</span>
          </>
        )}
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
          className="text-sm text-stone-400 hover:text-stone-700 border border-stone-200 px-3 py-1.5 rounded-xl transition-colors">
          Sign out
        </button>
      </div>
    </div>
  )
}
