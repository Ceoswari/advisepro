'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'student') router.push('/dashboard/student')
    else if (profile?.role === 'advisor') router.push('/dashboard/advisor')
    else if (profile?.role === 'admin') router.push('/dashboard/admin')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-5/12 bg-gradient-to-br from-teal-700 to-teal-900 flex-col justify-between p-12">
        <div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-10">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">AdvisePro</h1>
          <p className="text-teal-100 text-lg leading-relaxed max-w-xs">
            Your residency application journey, organized and on track.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-teal-200 text-sm">✓</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Track your progress</p>
              <p className="text-teal-300 text-xs mt-0.5">ERAS activities, publications, and milestones in one place</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-teal-200 text-sm">✓</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Know where you stand</p>
              <p className="text-teal-300 text-xs mt-0.5">Competitiveness scoring based on 2024 NRMP match data</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-teal-200 text-sm">✓</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Stay connected</p>
              <p className="text-teal-300 text-xs mt-0.5">Direct advising support from your assigned faculty</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-teal-300 text-sm font-medium">Cooper University Health Care</p>
            <p className="text-teal-400 text-xs mt-0.5">Camden, New Jersey</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-stone-50 p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="font-bold text-stone-900 text-lg">AdvisePro</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-stone-900">Welcome back</h2>
            <p className="text-stone-500 mt-1 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-stone-300"
                placeholder="you@cooperhealth.edu"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-stone-700">Password</label>
                <a href="/forgot-password" className="text-xs text-teal-600 hover:text-teal-700">Forgot password?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                <p className="text-rose-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-stone-400 text-center mt-8">
            Cooper University Health Care · AdvisePro
          </p>
        </div>
      </div>
    </div>
  )
}
