'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, MapPin, Clock, CheckCircle2, ShieldQuestion, ArrowRight } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import styles from './track.module.css'

// Demo data — in production this would query Supabase
const demoApplication = {
  trackingId: 'GD-DEMO123',
  businessName: 'Asante Tech Solutions',
  type: 'Limited Liability Company',
  status: 'under_review',
  submissionDate: 'March 20, 2026',
  timeline: [
    { status: 'submitted', label: 'Application Submitted', desc: 'Package received and successfully queued for processing.', date: 'Mar 20, 2026', completed: true },
    { status: 'name_search', label: 'Official Name Search', desc: 'ORC name availability check completed. "Asante Tech Solutions" reserved.', date: 'Mar 21, 2026', completed: true },
    { status: 'under_review', label: 'Officer Review', desc: 'Internal review of Articles of Incorporation and Director details.', date: 'Mar 23, 2026', active: true },
    { status: 'approved', label: 'ORC Approval', desc: 'Official digital seal and certification generation.', date: '', completed: false },
    { status: 'completed', label: 'Final Delivery', desc: 'Dispatch of physical and digital documentation.', date: '', completed: false },
  ],
}

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState('')
  const [result, setResult] = useState<typeof demoApplication | null>(null)
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingId.trim()) return
    
    setLoading(true)
    // Simulate API delay
    setTimeout(() => {
      setSearched(true)
      setResult({ ...demoApplication, trackingId: trackingId.toUpperCase() })
      setLoading(false)
    }, 800)
  }

  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.trackPage}>
        <div className={styles.container}>
          <div className={styles.trackHeader}>
            <div className={styles.badge}>Live Infrastructure</div>
            <h1>Real-time Tracking</h1>
            <p className={styles.subtitle}>
              Monitor the lifecycle of your business registration across ORC, GRA, and partner institutions.
            </p>
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchCard}>
              <form onSubmit={handleSearch} className={styles.form}>
                <div className={styles.inputWrapper}>
                  <Search className={styles.searchIcon} size={20} />
                  <input
                    type="text"
                    placeholder="Enter Tracking ID (e.g. GD-192-X)"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <button 
                  type="submit" 
                  className={`btn btn-primary ${loading ? styles.loading : ''}`}
                  disabled={loading}
                >
                  {loading ? 'Analyzing...' : 'Fetch Status'}
                </button>
              </form>
              {!searched && (
                <div className={styles.searchHelper}>
                  <ShieldQuestion size={14} />
                  <span>Tracking ID can be found in your confirmation email.</span>
                </div>
              )}
            </div>
          </div>

          {searched && result && (
            <div className={styles.resultContainer}>
              <div className={styles.resultMain}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryHeader}>
                    <div>
                      <span className={styles.idLabel}>Tracking ID: {result.trackingId}</span>
                      <h2 className={styles.businessName}>{result.businessName}</h2>
                      <div className={styles.metaRow}>
                        <span><MapPin size={14} /> Accra, Ghana</span>
                        <span><Clock size={14} /> Submitted {result.submissionDate}</span>
                      </div>
                    </div>
                    <div className={styles.statusBadge}>
                      <span className={styles.pulse} />
                      Under Review
                    </div>
                  </div>

                  <div className={styles.timeline}>
                    {result.timeline.map((item, i) => (
                      <div key={i} className={`${styles.timelineItem} ${item.completed ? styles.isCompleted : ''} ${item.active ? styles.isActive : ''}`}>
                        <div className={styles.timelineVisual}>
                          <div className={styles.dot}>
                            {item.completed && <CheckCircle2 size={16} />}
                          </div>
                          {i < result.timeline.length - 1 && <div className={styles.line} />}
                        </div>
                        <div className={styles.itemContent}>
                          <div className={styles.itemHeader}>
                            <h4>{item.label}</h4>
                            {item.date && <span className={styles.date}>{item.date}</span>}
                          </div>
                          <p>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.actionCard}>
                  <h3>Need Assistance?</h3>
                  <p>Our registrar support team is available mon-fri, 9am-5pm.</p>
                  <Link href="/contact" className={styles.actionLink}>
                    Contact Registrar Office <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {searched && !result && (
            <div className={styles.notFound}>
              <div className={styles.notFoundContent}>
                <h3>No data found for "{trackingId}"</h3>
                <p>Please double check your ID and try again, or contact support if the problem persists.</p>
                <button onClick={() => setSearched(false)} className="btn btn-secondary">Clear Search</button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
