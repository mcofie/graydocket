'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendZendOtp, verifyZendOtp } from '../zendActions'
import styles from '../auth.module.css'

import PhoneInput from '@/components/ui/PhoneInput'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // OTP State
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpId, setOtpId] = useState('')
  const [code, setCode] = useState('')
  
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
            Sign in with your mobile number
          </p>

          {error && <div className={styles.authError}>{error}</div>}

          {!otpSent ? (
               <form onSubmit={handleSendOtp} className={styles.authForm}>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone Number</label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
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
          }


          <div className={styles.authFooter}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/register">Create one</Link>
            <span style={{ fontSize: '11px', display: 'block', marginTop: '24px', color: 'var(--color-neutral-400)', textAlign: 'center' }}>
              GrayDocket is an administrative automation platform and does not provide legal advice.
            </span>
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
