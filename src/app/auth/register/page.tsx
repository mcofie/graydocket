'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { sendZendOtp, verifyZendOtp, checkPhoneExists } from '../zendActions'
import styles from '../auth.module.css'
import Header from '@/components/Header'
import PhoneInput from '@/components/ui/PhoneInput'

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
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.')
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
    } catch (err: any) {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <Header />
      <div className={styles.authLeft}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>
            {step === 'phone' ? 'Start your business' : 'Verify Your Identity'}
          </h1>
          <p className={styles.authSubtitle}>
            {step === 'phone' 
              ? 'Create your account. We’ll take care of the paperwork from here.' 
              : `We've sent a 6-digit code to ${phone}`}
          </p>

          {error && <div className={styles.authError}>{error}</div>}

          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className={styles.authForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  placeholder="Kwame Asante"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Phone Number
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  required
                />
                <span className="form-hint">
                  Use your WhatsApp or primary mobile number
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                id="send-otp"
              >
                {loading ? 'Sending Code...' : 'Register & Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className={styles.authForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="otp">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  className="form-input"
                  placeholder="X X X X X X"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  autoFocus
                  style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.5rem' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                id="verify-otp"
              >
                {loading ? 'Verifying...' : 'Complete Registration'}
              </button>
              
              <button type="button" onClick={() => setStep('phone')} className={styles.authTextBtn}>
                Change phone number
              </button>
            </form>
          )}


          <div className={styles.authFooter}>
            Already have an account? <Link href={redirectTo ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}` : '/auth/login'}>Sign in</Link>
            <span className={styles.authLegal}>
              GrayDocket is an administrative automation platform and does not provide legal advice. By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  )
}
