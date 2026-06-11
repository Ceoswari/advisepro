'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100 w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="font-bold text-stone-900 text-lg">AdvisePro</span>
          </div>
          <p className="text-stone-500">Reset your password</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-emerald-600 text-xl">✓</span>
            </div>
            <p className="text-stone-900 font-medium mb-2">Check your email</p>
            <p className="text-sm text-stone-500 mb-6">We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.</p>
            <button onClick={() => router.push('/login')} className="text-sm text-teal-600 hover:text-teal-800">
              ← Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="you@cooperhealth.edu"
                required
              />
            </div>
            {error && <p className="text-rose-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-teal-600 text-white py-2 px-4 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <p className="text-center text-sm text-stone-500">
              <button type="button" onClick={() => router.push('/login')} className="text-teal-600 hover:text-teal-800">
                ← Back to Sign In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
