'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // Check role and redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      const isAdminRole = ['admin', 'registrar', 'bank_manager', 'service_manager'].includes(profile?.role || 'user')
      
      const redirectTo = searchParams.get('redirect')
      if (redirectTo && (redirectTo.startsWith('/admin') ? isAdminRole : true)) {
        router.push(redirectTo)
      } else {
        router.push(isAdminRole ? '/admin' : '/dashboard')
      }
      
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
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

          <h1 className={styles.authTitle}>Welcome back</h1>
          <p className={styles.authSubtitle}>
            Sign in to manage your business applications
          </p>

          {error && <div className={styles.authError}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className={styles.authForgotLink}>
                <Link href="/auth/forgot-password">Forgot password?</Link>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              id="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className={styles.authFooter}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/register">Create one</Link>
          </div>
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authRightOverlay} />
        <div className={styles.authRightContent}>
          <h2>Business Formation Made Simple</h2>
          <p>
            Register your business in Ghana in minutes. Track progress, manage
            documents, and get your certificate — all from one platform.
          </p>
          <div className={styles.authRightFeatures}>
            <div className={styles.authRightFeature}>
              <div className={styles.authRightFeatureIcon}>⚡</div>
              <div>
                <h4>15-Minute Setup</h4>
                <p>Complete your registration in a single session</p>
              </div>
            </div>
            <div className={styles.authRightFeature}>
              <div className={styles.authRightFeatureIcon}>📊</div>
              <div>
                <h4>Real-Time Tracking</h4>
                <p>Monitor your application status 24/7</p>
              </div>
            </div>
            <div className={styles.authRightFeature}>
              <div className={styles.authRightFeatureIcon}>🏦</div>
              <div>
                <h4>Bank Account Setup</h4>
                <p>Open accounts with partner banks seamlessly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.authPage}>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
