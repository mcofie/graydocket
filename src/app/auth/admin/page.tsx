'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

function AdminLoginContent() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !authData.user) {
        setError(signInError?.message || 'Login failed')
        setLoading(false)
        return
      }

      // Strictly verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        setError(`DB Error: ${profileError.message || JSON.stringify(profileError)}`)
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (!profile) {
        setError(`Profile missing for ID: ${authData.user.id}`)
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      const isAdminRole = ['admin', 'registrar', 'bank_manager', 'service_manager'].includes(profile.role || 'user')
      
      if (!isAdminRole) {
        setError(`Unauthorized. Your current role is: ${profile.role || 'none'}`)
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
      
      router.push('/admin')
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
            <span className={styles.authLogoIcon} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>A</span>
            <span>GrayDocket Admin</span>
          </Link>

          <h1 className={styles.authTitle}>Secure Portal</h1>
          <p className={styles.authSubtitle}>
            Log in with your administrator credentials
          </p>

          {error && <div className={styles.authError}>{error}</div>}

          <form onSubmit={handleEmailSubmit} className={styles.authForm}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Administrative Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="admin@graydocket.com"
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
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ background: '#dc2626', borderColor: '#b91c1c' }} disabled={loading} id="admin-login-submit">
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>

          <div className={styles.authFooter} style={{ marginTop: 'var(--space-6)' }}>
            <Link href="/auth/login" style={{ color: 'var(--color-neutral-500)', fontSize: '13px' }}>Return to Customer Login</Link>
          </div>
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authRightOverlay} style={{ background: 'rgba(0,0,0,0.8)' }} />
        <div className={styles.authRightContent}>
          <h2>GrayDocket Command Center</h2>
          <p>
            This portal is restricted to authorized administrative personnel only. 
            All access and activities are monitored.
          </p>
          <div className={styles.authRightFeatures}>
            <div className={styles.authRightFeature}>
              <div className={styles.authRightFeatureIcon} style={{ color: '#ef4444' }}>🛡️</div>
              <div>
                <h4>Secure Environment</h4>
                <p>Ensure you are on a trusted network before authenticating</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className={styles.authPage}>Loading...</div>}>
      <AdminLoginContent />
    </Suspense>
  )
}
