'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { sendZendOtp, verifyZendOtp, checkPhoneExists } from '../zendActions'
import styles from '../auth.module.css'
import PhoneInput from '@/components/ui/PhoneInput'
import AuthShell from '../AuthShell'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Only follow same-site paths so the redirect param can't send users off-site
  const redirectParam = searchParams.get('redirect')
  const redirectTo = redirectParam?.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : null
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Check if phone already registered
      const { exists, error: checkError } = await checkPhoneExists(phone)
      if (checkError) throw new Error(checkError)
      
      if (exists) {
        setError('This phone number is already registered. Please sign in instead.')
        setLoading(false)
        return
      }

      // 2. Send OTP
      const res = await sendZendOtp(phone)
      if (res.success && res.id) {
        setOtpId(res.id)
        setStep('otp')
      } else {
        setError(res.error || 'Failed to send OTP')
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await verifyZendOtp(otpId, otp, phone, fullName, email)
      if (res.success) {
        router.push(redirectTo || '/dashboard')
        router.refresh()
      } else {
        setError(res.message || 'Invalid verification code')
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loginHref = redirectTo ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}` : '/auth/login'

  return (
    <AuthShell pill={{ text: 'Not sure which business type?', label: 'Take the quiz', href: '/find-your-business-type' }}>
      {step === 'phone' ? (
        <>
          <h1 className={styles.shellTitle}>Start your business with GrayDocket</h1>
          <p className={styles.shellSubtitle}>Create your account. We&apos;ll handle the paperwork.</p>

          {error && <div className={styles.shellError} role="alert">{error}</div>}

          <form onSubmit={handleSendOTP} className={styles.shellForm}>
            <label className="sr-only" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              className={styles.shellInput}
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
              autoFocus
            />
            <label className="sr-only" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.shellInput}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <label className="sr-only" htmlFor="phone">Phone number</label>
            <PhoneInput id="phone" value={phone} onChange={setPhone} required />
            <div className={styles.shellReveal} data-open={phone ? 'true' : 'false'} inert={!phone}>
              <div>
                <button type="submit" className={styles.shellBtn} disabled={loading || !fullName.trim() || !email.trim()} id="send-otp">
                  {loading ? 'Sending code…' : 'Continue'}
                </button>
              </div>
            </div>
          </form>

          <p className={styles.shellHint}>
            {phone ? (
              <>
                By continuing, you agree to our <Link href="/terms">Terms</Link> and{' '}
                <Link href="/privacy">Privacy Policy</Link>, and to receive an SMS with a one-time code.
              </>
            ) : (
              <>Already have an account? <Link href={loginHref}>Log in</Link></>
            )}
          </p>
        </>
      ) : (
        <>
          <h1 className={styles.shellTitle}>Check your phone</h1>
          <p className={styles.shellSubtitle}>Enter the 6-digit code we sent to {phone}.</p>

          {error && <div className={styles.shellError} role="alert">{error}</div>}

          <form onSubmit={handleVerifyOTP} className={styles.shellForm}>
            <label className="sr-only" htmlFor="otp">Verification code</label>
            <input
              id="otp"
              type="text"
              className={`${styles.shellInput} ${styles.shellCode}`}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
            />
            <div className={styles.shellReveal} data-open="true">
              <div>
                <button type="submit" className={styles.shellBtn} disabled={loading || otp.length < 6} id="verify-otp">
                  {loading ? 'Verifying…' : 'Create account'}
                </button>
              </div>
            </div>
          </form>

          <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError('') }} className={styles.shellTextBtn}>
            Use a different number
          </button>
        </>
      )}
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  )
}
