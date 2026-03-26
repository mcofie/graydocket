'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
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
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      setSuccess(
        'Account created! Please check your email to verify your account.'
      )
    } catch {
      setError('An unexpected error occurred. Please try again.')
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

          <h1 className={styles.authTitle}>Create your account</h1>
          <p className={styles.authSubtitle}>
            Start your business registration journey today
          </p>

          {error && <div className={styles.authError}>{error}</div>}
          {success && <div className={styles.authSuccess}>{success}</div>}

          <form onSubmit={handleSubmit} className={styles.authForm}>
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

            <div className={styles.authFormRow}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="form-input"
                  placeholder="+233 XXX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <span className="form-hint">
                Must be at least 8 characters
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              id="register-submit"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className={styles.authFooter}>
            Already have an account?{' '}
            <Link href="/auth/login">Sign in</Link>
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
