'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sendZendOtp, verifyZendOtp, checkPhoneExists } from '../zendActions'
import styles from '../auth.module.css'
import PhoneInput from '@/components/ui/PhoneInput'

export default function RegisterPage() {
  const router = useRouter()
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
        router.push('/dashboard')
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
      <div className={styles.authLeft}>
        <div className={styles.authCard}>
          <Link href="/" className={styles.authLogo}>
            <span className={styles.authLogoIcon}>G</span>
            <span>GrayDocket</span>
          </Link>

          <h1 className={styles.authTitle}>
            {step === 'phone' ? 'Launch Your Business' : 'Verify Your Identity'}
          </h1>
          <p className={styles.authSubtitle}>
            {step === 'phone' 
              ? 'Complete your details to get started' 
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
              
              <button 
                type="button" 
                onClick={() => setStep('phone')}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '12px', width: '100%', background: 'transparent' }}
              >
                Change Phone Number
              </button>
            </form>
          )}

          <div className={styles.authFooter}>
            By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>. 
            <br />
            <span style={{ fontSize: '11px', display: 'block', marginTop: '8px', color: 'var(--color-neutral-400)' }}>
              GrayDocket is an administrative automation platform, not a law firm, and does not provide legal advice.
            </span>
          </div>
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authRightOverlay} />
        <div className={styles.authRightContent}>
          <h2>Join 500+ Entrepreneurs</h2>
          <p>
            Create your account and register your business in Ghana in just 15
            minutes. No paperwork, no hassle.
          </p>
          <div className={styles.authRightFeatures}>
            <div className={styles.authRightFeature}>
              <div className={styles.authRightFeatureIcon}>🏢</div>
              <div>
                <h4>Multiple Business Types</h4>
                <p>Sole Proprietorship, Limited Company, and more</p>
              </div>
            </div>
            <div className={styles.authRightFeature}>
              <div className={styles.authRightFeatureIcon}>📄</div>
              <div>
                <h4>Digital Certificates</h4>
                <p>Receive all documents digitally</p>
              </div>
            </div>
            <div className={styles.authRightFeature}>
              <div className={styles.authRightFeatureIcon}>🔔</div>
              <div>
                <h4>Smart Reminders</h4>
                <p>Annual renewal and compliance alerts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
