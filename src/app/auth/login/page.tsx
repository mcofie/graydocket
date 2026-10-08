'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendZendOtp, verifyZendOtp } from '../zendActions'
import styles from '../auth.module.css'
import Header from '@/components/Header'

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

  const rawDigits = phone.replace('+233', '')
  const isPhoneValid = rawDigits.length === 9 || rawDigits.length === 10

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
        // Only follow same-site paths so a crafted link can't send users off-site after login
        const redirectParam = searchParams.get('redirect')
        const redirectTo = redirectParam?.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : null
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
      <Header />
      <div className={styles.authLeft}>
        <div className={styles.authCard}>
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
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !isPhoneValid}>
                  {loading ? 'Sending OTP...' : 'Continue with Phone'}
                </button>
              </form>
            ) : (
               <form onSubmit={handleVerifyOtp} className={styles.authForm}>
                <div className="form-group">
                  <label className="form-label" htmlFor="code">Enter Verification Code</label>
                  <p className={styles.authNote}>We sent a code to {phone}</p>
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
                <button type="button" onClick={() => setOtpSent(false)} className={styles.authTextBtn}>
                  Change phone number
                </button>
              </form>
            )
          }


          <div className={styles.authFooter}>
            Don&apos;t have an account?{' '}
            <Link href={searchParams.get('redirect') ? `/auth/register?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : '/auth/register'}>Create one</Link>
            <span className={styles.authLegal}>
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
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
