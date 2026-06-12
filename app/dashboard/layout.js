'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000  // 30 minutes
const WARNING_BEFORE_MS   = 2 * 60 * 1000   // warn 2 minutes before

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(120)
  const timeoutRef   = useRef(null)
  const warningRef   = useRef(null)
  const countdownRef = useRef(null)

  const signOut = async () => {
    clearAllTimers()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const clearAllTimers = () => {
    clearTimeout(timeoutRef.current)
    clearTimeout(warningRef.current)
    clearInterval(countdownRef.current)
  }

  const resetTimers = () => {
    clearAllTimers()
    setShowWarning(false)

    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(WARNING_BEFORE_MS / 1000)
      countdownRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); return 0 }
          return prev - 1
        })
      }, 1000)
    }, INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS)

    timeoutRef.current = setTimeout(signOut, INACTIVITY_LIMIT_MS)
  }

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    const handleActivity = () => {
      if (showWarning) return  // don't reset once warning is showing — user must click Stay signed in
      resetTimers()
    }
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))
    resetTimers()
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity))
      clearAllTimers()
    }
  }, [showWarning])

  const handleStaySignedIn = () => {
    setShowWarning(false)
    resetTimers()
  }

  return (
    <>
      {children}

      {showWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-amber-600 text-2xl">⏱</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 text-center mb-2">Still there?</h2>
            <p className="text-sm text-stone-500 text-center mb-6">
              You'll be signed out in <span className="font-bold text-amber-600">{secondsLeft}s</span> due to inactivity.
              Your data is saved.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleStaySignedIn}
                className="w-full bg-teal-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700">
                Stay signed in
              </button>
              <button onClick={signOut}
                className="w-full text-stone-400 hover:text-stone-600 py-2 text-sm">
                Sign out now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
