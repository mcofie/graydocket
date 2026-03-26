'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import styles from './track.module.css'

// Demo data — in production this would query Supabase
const demoApplication = {
  trackingId: 'GD-DEMO123',
  businessName: 'Asante Tech Solutions',
  type: 'Sole Proprietorship',
  status: 'under_review',
  timeline: [
    { status: 'submitted', label: 'Application Submitted', desc: 'Received and queued for processing', date: 'Mar 20, 2026', completed: true },
    { status: 'name_search', label: 'Name Search', desc: 'ORC name availability check completed', date: 'Mar 21, 2026', completed: true },
    { status: 'under_review', label: 'Under Review', desc: 'Application is being reviewed by ORC', date: 'Mar 23, 2026', active: true },
    { status: 'approved', label: 'Registration Approved', desc: 'Certificate of registration', date: '', completed: false },
    { status: 'completed', label: 'Certificate Delivered', desc: 'Digital certificate sent via email', date: '', completed: false },
  ],
}

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState('')
  const [result, setResult] = useState<typeof demoApplication | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearched(true)
    // Demo: show result for any input
    if (trackingId.trim()) {
      setResult({ ...demoApplication, trackingId: trackingId.toUpperCase() })
    } else {
      setResult(null)
    }
  }

  return (
    <>
      <Header />
      <div className={styles.trackPage}>
        <div className={styles.trackContent}>
          <div className={styles.trackHeader}>
            <h1>Track Your Application</h1>
            <p>Enter your tracking ID to check the status of your business registration.</p>
          </div>

          <div className={styles.trackForm}>
            <form onSubmit={handleSearch}>
              <div className={styles.trackInputGroup}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter tracking ID (e.g., GD-DEMO123)"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  id="tracking-input"
                />
                <button type="submit" className="btn btn-primary" id="track-submit">
                  <Search size={16} />
                  Track
                </button>
              </div>
            </form>

            {searched && result && (
              <div className={styles.trackResult}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <h3 style={{ marginBottom: 'var(--space-1)' }}>{result.businessName}</h3>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
                      {result.type} • {result.trackingId}
                    </p>
                  </div>
                  <span className="badge badge-warning">Under Review</span>
                </div>

                <div className={styles.trackTimeline}>
                  {result.timeline.map((item, i) => (
                    <div key={i} className={styles.timelineItem}>
                      <div
                        className={`${styles.timelineDot} ${
                          item.completed
                            ? styles.completed
                            : 'active' in item && item.active
                            ? styles.active
                            : ''
                        }`}
                      />
                      <h4>{item.label}</h4>
                      <p>{item.desc}</p>
                      {item.date && (
                        <span className={styles.timelineDate}>{item.date}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searched && !result && (
              <div className={styles.trackNotFound}>
                <p>No application found with that tracking ID.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
