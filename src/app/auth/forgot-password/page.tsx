'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
        }
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSuccess('Password reset link sent! Check your email.')
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authLeft}>
        <div className={styles.authCard}>
          <Link href="/" className={styles.authLogo}>
            <span className={styles.authLogoIcon}>G</span>
            <span>GrayDocket</span>
          </Link>

          <h1 className={styles.authTitle}>Reset your password</h1>
          <p className={styles.authSubtitle}>
            Enter your email and we&apos;ll send you a reset link
          </p>

          {error && <div className={styles.authError}>{error}</div>}
          {success && <div className={styles.authSuccess}>{success}</div>}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-email">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              id="reset-submit"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className={styles.authFooter}>
            Remember your password?{' '}
            <Link href="/auth/login">Sign in</Link>
          </div>
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authRightOverlay} />
        <div className={styles.authRightContent}>
          <h2>Don&apos;t Worry</h2>
          <p>
            We&apos;ll help you regain access to your account. Your business
            registration data is safe and secure.
          </p>
        </div>
      </div>
    </div>
  )
}
