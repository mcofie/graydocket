'use client'

import { useState } from 'react'
import { Search, Clock, CheckCircle2, ShieldQuestion } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import styles from './track.module.css'

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingId.trim()) return
    setLoading(true)
    window.location.href = `/track/${trackingId.trim().toUpperCase()}`
  }

  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.trackPage}>
        <form className={styles.container} onSubmit={handleSearch}>
          <div className={styles.trackHeader} style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            <span className={styles.idLabel}>Institutional Gateway</span>
            <h1 className={styles.businessName}>Track Application</h1>
            <p style={{ color: 'var(--color-neutral-500)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
              Monitor your business registration status via our unified registry gateway.
            </p>
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchCard}>
              <div className={styles.inputWrapper}>
                <Search className={styles.searchIcon} size={20} />
                <input
                  type="text"
                  placeholder="Enter Tracking ID (e.g. GD-MNM3...)"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ height: '54px', borderRadius: '12px' }}
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Track Now'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: 'var(--space-4)', fontSize: '12px', color: 'var(--color-neutral-400)' }}>
              <ShieldQuestion size={14} />
              <span>Security verified gateway. ID required.</span>
            </div>
          </div>

          <div className={styles.actionPanel} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div className={styles.actionCard}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-600)', marginBottom: 'var(--space-4)' }}>
                <Clock size={20} />
              </div>
              <h3>Real-time Updates</h3>
              <p>Our nodes synchronize directly with the Office of the Registrar of Companies every 15 minutes.</p>
            </div>
            <div className={styles.actionCard}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)', marginBottom: 'var(--space-4)' }}>
                <CheckCircle2 size={20} />
              </div>
              <h3>Institutional Trust</h3>
              <p>GrayDocket is the preferred channel for over 1,000+ Ghanaian business owners for compliance.</p>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  )
}
