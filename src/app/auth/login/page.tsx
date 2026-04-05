'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendZendOtp, verifyZendOtp } from '../zendActions'
import styles from '../auth.module.css'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [method, setMethod] = useState<'otp' | 'email'>('otp')
  
  // OTP State
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpId, setOtpId] = useState('')
  const [code, setCode] = useState('')
  
  // Email State (Fallback)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await sendZendOtp(phone)
      if (res.success && res.id) {
        setOtpId(res.id)
        setOtpSent(true)
      } else {
        setError(res.error || 'Failed to send OTP')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await verifyZendOtp(otpId, code, phone)
      if (res.success) {
        // Here we simulate successful routing. 
        // NOTE: In a real Supabase setup, you need to issue a custom JWT from the server 
        // to authenticate the @supabase/ssr client. 
        const redirectTo = searchParams.get('redirect')
        router.push(redirectTo || '/dashboard')
        router.refresh()
      } else {
        setError(res.message || res.error || 'Invalid OTP code')
      }
    } catch {
      setError('An unexpected error occurred during verification.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
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

      // Check auth profile but don't redirect to admin since we are separating it
      const redirectTo = searchParams.get('redirect')
      
      // If a standard user was trying to access an admin page and somehow got to this login, 
      // we still drop them safely in dashboard instead. Only /admin/login handles admin routing now.
      if (redirectTo && !redirectTo.startsWith('/admin')) {
        router.push(redirectTo)
      } else {
        router.push('/dashboard')
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

          {/* Toggle between OTP and Email */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--color-neutral-100)', padding: '4px', borderRadius: '8px' }}>
            <button 
              type="button"
              onClick={() => { setMethod('otp'); setError(''); setOtpSent(false); }}
              style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: method === 'otp' ? 'white' : 'transparent', fontWeight: method === 'otp' ? 600 : 400, boxShadow: method === 'otp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Phone (OTP)
            </button>
            <button 
              type="button"
              onClick={() => { setMethod('email'); setError(''); }}
              style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: method === 'email' ? 'white' : 'transparent', fontWeight: method === 'email' ? 600 : 400, boxShadow: method === 'email' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Email & Password
            </button>
          </div>

          {method === 'otp' ? (
            !otpSent ? (
               <form onSubmit={handleSendOtp} className={styles.authForm}>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    className="form-input"
                    placeholder="+233 XXX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Continue with Phone'}
                </button>
              </form>
            ) : (
               <form onSubmit={handleVerifyOtp} className={styles.authForm}>
                <div className="form-group">
                  <label className="form-label" htmlFor="code">Enter Verification Code</label>
                  <p style={{fontSize: '13px', color: 'var(--color-neutral-500)', marginBottom: '8px'}}>We sent a code to {phone}</p>
                  <input
                    id="code"
                    type="text"
                    className="form-input"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    maxLength={6}
                    style={{ letterSpacing: '0.2em', fontSize: '1.2rem', textAlign: 'center' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button type="button" onClick={() => setOtpSent(false)} style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                    Change phone number
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleEmailSubmit} className={styles.authForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
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
                <label className="form-label" htmlFor="password">Password</label>
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

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="login-submit">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

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
