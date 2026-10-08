'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { sendZendOtp, verifyZendOtp } from '../zendActions'
import styles from '../auth.module.css'
import PhoneInput from '@/components/ui/PhoneInput'
import AuthShell from '../AuthShell'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const registerHref = redirectParam ? `/auth/register?redirect=${encodeURIComponent(redirectParam)}` : '/auth/register'
  
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
    <AuthShell pill={{ text: 'New to GrayDocket?', label: 'Start my business', href: registerHref }}>
      {!otpSent ? (
        <>
          <h1 className={styles.shellTitle}>Welcome back to GrayDocket</h1>
          <p className={styles.shellSubtitle}>Log in with your phone number.</p>

          {error && <div className={styles.shellError} role="alert">{error}</div>}

          <form onSubmit={handleSendOtp} className={styles.shellForm}>
            <label className="sr-only" htmlFor="phone">Phone number</label>
            <PhoneInput id="phone" autoFocus value={phone} onChange={setPhone} required />
            <div className={styles.shellReveal} data-open={phone ? 'true' : 'false'} inert={!phone}>
              <div>
                <button type="submit" className={styles.shellBtn} disabled={loading || !isPhoneValid}>
                  {loading ? 'Sending code…' : 'Continue'}
                </button>
              </div>
            </div>
          </form>

          <p className={styles.shellHint}>
            {phone ? (
              'By continuing, you agree to receive an SMS with a one-time code to verify your phone number.'
            ) : (
              <>Don&apos;t have an account? <Link href={registerHref}>Create one</Link></>
            )}
          </p>
        </>
      ) : (
        <>
          <h1 className={styles.shellTitle}>Check your phone</h1>
          <p className={styles.shellSubtitle}>Enter the 6-digit code we sent to {phone}.</p>

          {error && <div className={styles.shellError} role="alert">{error}</div>}

          <form onSubmit={handleVerifyOtp} className={styles.shellForm}>
            <label className="sr-only" htmlFor="code">Verification code</label>
            <input
              id="code"
              type="text"
              className={`${styles.shellInput} ${styles.shellCode}`}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
            />
            <div className={styles.shellReveal} data-open="true">
              <div>
                <button type="submit" className={styles.shellBtn} disabled={loading || code.length < 6}>
                  {loading ? 'Verifying…' : 'Log in'}
                </button>
              </div>
            </div>
          </form>

          <button type="button" onClick={() => { setOtpSent(false); setCode(''); setError('') }} className={styles.shellTextBtn}>
            Use a different number
          </button>
        </>
      )}
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
