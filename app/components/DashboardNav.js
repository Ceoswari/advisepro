'use client'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardNav({ backHref, backLabel = '← Back', navItems, children }) {
  const router = useRouter()
  const pathname = usePathname()

  const homeHref = pathname.includes('/student')
    ? '/dashboard/student'
    : pathname.includes('/advisor')
    ? '/dashboard/advisor'
    : '/dashboard/admin'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="bg-white border-b border-stone-100 shadow-sm px-8 h-16 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {backHref && (
          <button
            onClick={() => router.push(backHref)}
            className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
          >
            {backLabel}
          </button>
        )}
        <button onClick={() => router.push(homeHref)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-bold text-stone-900">AdvisePro</span>
        </button>
      </div>

      {navItems && (
        <div className="flex items-center gap-4">
          {navItems.map(item => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'text-teal-600'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        {children}
        <button
          onClick={handleSignOut}
          className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
