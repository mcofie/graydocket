'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Search, MapPin, Clock, CheckCircle2, ShieldQuestion, ArrowRight, Activity, Calendar, ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getTrackingStatus } from '@/lib/actions'
import styles from '../track.module.css'

export default function DynamicTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const idFromUrl = resolvedParams.id
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (idFromUrl) {
      fetchStatus(idFromUrl)
    }
  }, [idFromUrl])

  const fetchStatus = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getTrackingStatus(id.toUpperCase())
      if (res.error) {
        setError(res.error)
        setData(null)
      } else {
        setData(res)
      }
    } catch (err) {
      setError('A connection error occurred while querying the registry.')
    } finally {
      setLoading(false)
    }
  }

  const formatStatus = (s: string) => s.replace(/_/g, ' ').toUpperCase()

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
             <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <div style={{ width: '48px', height: '48px', border: '3px solid var(--color-primary-100)', borderTopColor: 'var(--color-primary-600)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
                <h2 style={{ fontWeight: 800 }}>Decrypting Registry Data...</h2>
                <p style={{ color: 'var(--color-neutral-400)', marginTop: '8px' }}>Authenticating tracking ID: {idFromUrl.toUpperCase()}</p>
             </div>
          ) : error ? (
            <div className={styles.notFound}>
                 <div className={styles.errorState}>
                    <Search size={32} style={{ marginBottom: '16px' }} />
                    <h3>Security Check Failed</h3>
                    <p>
                       We could not find an application linked to "<strong>{idFromUrl.toUpperCase()}</strong>". 
                       Please verify the ID and ensure there are no trailing spaces.
                    </p>
                    <Link href="/track" className={styles.retryBtn} style={{ textDecoration: 'none', display: 'inline-block' }}>
                       Try New Search
                    </Link>
                 </div>
            </div>
          ) : data && (
            <div className={styles.resultContainer}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <div>
                    <span className={styles.idLabel}>ID: {idFromUrl.toUpperCase()}</span>
                    <h2 className={styles.businessName}>{data.application.business_name}</h2>
                    <div className={styles.metaRow}>
                      <span><Activity size={14} /> {data.application.business_types?.name || 'Standard'}</span>
                      <span><Calendar size={14} /> Submitted {new Date(data.application.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className={styles.statusBadge}>
                    <span className={styles.pulse} />
                    {formatStatus(data.application.status)}
                  </div>
                </div>

                <div className={styles.timeline}>
                   {data.history && data.history.length > 0 ? (
                      data.history.map((step: any, i: number) => (
                        <div key={i} className={`${styles.timelineItem} ${i === 0 ? styles.isActive : styles.isCompleted}`}>
                          <div className={styles.timelineVisual}>
                            <div className={styles.dot}>
                               {i > 0 && <CheckCircle2 size={16} />}
                            </div>
                            {i < data.history.length - 1 && <div className={styles.line} />}
                          </div>
                          <div className={styles.itemContent}>
                            <div className={styles.itemHeader}>
                              <h4>{formatStatus(step.status)}</h4>
                              <span className={styles.date}>{new Date(step.created_at).toLocaleString()}</span>
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
                               <span className={styles.date}>{new Date(data.application.created_at).toLocaleString()}</span>
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
                  <h3>Self-Service Portal</h3>
                  <p>Log in to your dashboard to upload missing documents or update details.</p>
                  <Link href="/login" className={styles.actionLink}>
                    Access Dashboard <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
