'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Search, CheckCircle2, ArrowRight, Activity, Calendar, ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getTrackingStatus } from '@/lib/actions'
import styles from '../track.module.css'

type TrackingHistoryEntry = {
  id?: string
  status: string
  notes?: string | null
  created_at: string
}

type TrackingApplication = {
  business_name: string
  status: string
  created_at: string
  business_types?: {
    name?: string | null
  } | null
}

type TrackingResult = {
  application: TrackingApplication
  history?: TrackingHistoryEntry[]
  error?: string | null
}

export default function DynamicTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const idFromUrl = resolvedParams.id
  
  const [data, setData] = useState<TrackingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getTrackingStatus(id.toUpperCase())
      if (res.error) {
        setError(res.error)
        setData(null)
      } else {
        setData(res as TrackingResult)
      }
    } catch {
      setError('A connection error occurred while querying the registry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (idFromUrl) {
      void fetchStatus(idFromUrl)
    }
  }, [idFromUrl])

  const formatStatus = (s: string) => s.replace(/_/g, ' ').toUpperCase()
  const history = data?.history || []

  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.trackPage}>
        <div className={styles.container}>
          <div style={{ marginBottom: '32px' }}>
             <Link href="/track" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-neutral-500)', fontSize: '14px', fontWeight: 600 }}>
                <ArrowLeft size={16} /> New Search
             </Link>
          </div>

          {loading ? (
             <div className={styles.loadingContainer}>
                <div className={styles.premiumLoader} />
                <h2>Decrypting Registry Data...</h2>
                <p>Authenticating tracking ID: <strong>{idFromUrl.toUpperCase()}</strong></p>
             </div>
          ) : error ? (
             <div className={styles.loadingContainer}>
                  <div style={{ background: '#fff1f1', color: '#ef4444', padding: 'var(--space-10)', borderRadius: 'var(--radius-2xl)', border: '1px solid #fee2e2', maxWidth: '500px', width: '100%' }}>
                     <Search size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }} />
                     <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Security Check Failed</h3>
                     <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                        We could not find an application linked to &quot;<strong>{idFromUrl.toUpperCase()}</strong>&quot;.
                        Please verify the ID and ensure there are no trailing spaces.
                     </p>
                     <Link href="/track" style={{ marginTop: 'var(--space-6)', textDecoration: 'none', display: 'inline-block', background: 'white', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}>
                        Try New Search
                     </Link>
                  </div>
             </div>
          ) : data && (
            <div className={styles.resultContainer}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <div>
                    <span className={styles.idLabel}>TRACKING ID: {idFromUrl.toUpperCase()}</span>
                    <h2 className={styles.businessName}>{data.application.business_name}</h2>
                    <div className={styles.metaRow}>
                      <span><Activity size={16} /> {data.application.business_types?.name || 'Standard'}</span>
                      <span><Calendar size={16} /> Submitted {new Date(data.application.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className={styles.statusBadge}>
                    <span className={styles.pulse} />
                    {formatStatus(data.application.status)}
                  </div>
                </div>

                <div className={styles.timeline}>
                   {history.length > 0 ? (
                      history.map((step, i) => (
                        <div key={i} className={`${styles.timelineItem} ${i === 0 ? styles.isActive : styles.isCompleted}`}>
                          <div className={styles.timelineVisual}>
                            <div className={styles.dot}>
                               {i > 0 && <CheckCircle2 size={16} />}
                            </div>
                            {i < history.length - 1 && <div className={styles.line} />}
                          </div>
                          <div className={styles.itemContent}>
                            <div className={styles.itemHeader}>
                              <h4>{formatStatus(step.status)}</h4>
                              <span className={styles.date}>{new Date(step.created_at).toLocaleDateString()} • {new Date(step.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p>{step.notes || `Institutional state transitioned to ${formatStatus(step.status)}.`}</p>
                          </div>
                        </div>
                      ))
                   ) : (
                      <div className={`${styles.timelineItem} ${styles.isActive}`}>
                         <div className={styles.timelineVisual}>
                            <div className={styles.dot} />
                         </div>
                         <div className={styles.itemContent}>
                            <div className={styles.itemHeader}>
                               <h4>SUBMITTED</h4>
                               <span className={styles.date}>{new Date(data.application.created_at).toLocaleDateString()}</span>
                            </div>
                            <p>Application successfully received and queued for initial verification.</p>
                         </div>
                      </div>
                   )}
                </div>
              </div>

              <div className={styles.actionPanel}>
                <div className={styles.actionCard}>
                  <h3>Official Support</h3>
                  <p>Speak to the registrar overseeing your business registration process.</p>
                  <Link href="/support" className={styles.actionLink}>
                    Open Support Ticket <ArrowRight size={14} />
                  </Link>
                </div>
                <div className={styles.actionCard}>
                  <h3>Founder Dashboard</h3>
                  <p>Log in to your dashboard to upload missing documents or update details.</p>
                  <Link href="/auth/login" className={styles.actionLink}>
                    Access Dashboard <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
