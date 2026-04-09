'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  Smartphone, 
  User, 
  AlertCircle, 
  X, 
  Download, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  MoreVertical,
  MessageSquare
} from 'lucide-react'
import { getApplicationDetails } from '@/lib/actions'
import styles from './detail.module.css'
import Skeleton from '@/components/ui/Skeleton'

export default function UserApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const appId = resolvedParams.id
  
  const [app, setApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [appId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await getApplicationDetails(appId)
      if (res.error) {
        setError(res.error)
      } else if (!res.application) {
        setError('Application record not found in the institutional registry.')
      } else {
        setApp(res.application)
      }
    } catch (err: any) {
      setError(err.message || 'A catastrophic synchronization error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton width="300px" height="40px" />
        <div style={{ marginTop: '24px' }}>
          <Skeleton width="100%" height="500px" borderRadius="16px" />
        </div>
      </div>
    )
  }

  if (error || !app) {
    return (
      <div className={styles.page} style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className={styles.card} style={{ textAlign: 'center', maxWidth: '500px', border: '1px solid var(--color-error-light)' }}>
           <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-error-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-8)' }}>
              <AlertCircle size={40} style={{ color: 'var(--color-error)' }} />
           </div>
           <h2 style={{ color: 'var(--color-neutral-900)', fontSize: '28px', fontWeight: 800 }}>Sync Error</h2>
           <p style={{ color: 'var(--color-neutral-500)', marginTop: '12px', lineHeight: 1.6 }}>
              {error || 'The institutional record index might have shifted during live migration.'}
           </p>
           <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button onClick={() => fetchData()} className="btn btn-secondary">Retry Sync</button>
              <Link href="/dashboard" className="btn btn-primary">Return Home</Link>
           </div>
        </div>
      </div>
    )
  }

  const currentStatus = app.status || 'draft'
  const isCompleted = ['completed', 'approved', 'delivered'].includes(currentStatus)
  const isCritical = ['rejected', 'cancelled', 'on_hold'].includes(currentStatus)
  const corrections = app.form_data?.corrections || {}
  const hasCorrections = Object.keys(corrections).length > 0

  return (
    <div className={styles.page}>
      {/* CORRECTION ALERT BANNER */}
      {hasCorrections && currentStatus === 'rejected' && (
        <div className={styles.correctionBanner}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle color="white" size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'var(--color-error)', fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>Action Required: Revisions</h3>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
              Our registrar has requested corrections. Please update these details to proceed.
            </p>
            <div className={styles.correctionGrid}>
              {Object.entries(corrections).map(([key, reason]: [string, any]) => (
                <div key={key} className={styles.correctionItem}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-neutral-400)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {key.split('.').pop()?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-neutral-800)', fontWeight: 600 }}>{reason}</div>
                </div>
              ))}
            </div>
            <Link href={`/dashboard/applications/${appId}/edit`} className="btn btn-primary" style={{ height: '44px', gap: '8px', background: 'var(--color-error)', border: 'none' }}>
               Fix & Resubmit <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
            </Link>
          </div>
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL */}
      {selectedDoc && (
        <div className={styles.modalOverlay}>
          <header className={styles.modalHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} color="white" />
              </div>
              <div>
                <h3 style={{ color: 'white', fontWeight: 700, fontSize: '16px' }}>{selectedDoc.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>GrayDocket Private Vault • Encrypted</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
               <a href={selectedDoc.url} download className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', gap: '8px' }}>
                  <Download size={16} /> Download
               </a>
               <button onClick={() => setSelectedDoc(null)} className="btn" style={{ background: 'white', color: 'black', border: 'none', width: '40px', padding: 0 }}>
                  <X size={20} />
               </button>
            </div>
          </header>
          
          <div className={styles.modalContent}>
             <div className={styles.documentFrame}>
                {selectedDoc.url.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={selectedDoc.url} style={{ width: '100%', height: '100%', border: 'none' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
                    <img src={selectedDoc.url} alt={selectedDoc.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <header className={styles.pageHeader}>
        <Link href="/dashboard/applications" className={styles.backLink}>
           <ArrowLeft size={16} /> Back to Directory
        </Link>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <h1>{app.business_name}</h1>
              <div className={styles.statusBadge} style={{ 
                background: isCompleted ? '#ecfdf5' : isCritical ? '#fef2f2' : '#eff6ff', 
                color: isCompleted ? '#059669' : isCritical ? '#dc2626' : '#2563eb',
                border: `1px solid ${isCompleted ? '#d1fae5' : isCritical ? '#fee2e2' : '#dbeafe'}`
              }}>
                {currentStatus.replace('_', ' ')}
              </div>
            </div>
            <div className={styles.trackingInfo}>
              <ShieldCheck size={14} /> Tracking ID: <span className={styles.trackingId}>{app.tracking_id || app.id}</span>
            </div>
          </div>
          <div className={styles.headerActions}>
             <button className="btn btn-secondary" style={{ height: '44px', width: '44px', padding: 0 }}>
                <MoreVertical size={18} />
             </button>
             <Link href={`/track/${app.tracking_id}`} target="_blank" className="btn btn-primary" style={{ height: '44px', gap: '8px' }}>
                Public Status <ExternalLink size={16} />
             </Link>
          </div>
        </div>
      </header>

      <div className={styles.mainGrid}>
        {/* LEFT COLUMN: TIMELINE & DETAILS */}
        <div className={styles.leftCol}>
          <div className={styles.card}>
             <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: 'var(--space-8)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={22} style={{ color: 'var(--color-primary-500)' }} /> Lifecycle Timeline
             </h3>
             <div className={styles.timelineSection}>
                {app.application_status_history && app.application_status_history.length > 0 ? (
                  app.application_status_history.map((hist: any, i: number) => {
                    const isLatest = i === 0;
                    return (
                      <div key={hist.id} className={`${styles.timelineItem} ${isLatest ? styles.active : ''}`}>
                        {/* Vertical Connecting Line */}
                        {i < app.application_status_history.length - 1 && (
                          <div className={styles.timelineLine} style={{ 
                            background: isLatest ? 'var(--color-primary-500)' : 'var(--color-neutral-200)',
                            opacity: isLatest ? 0.3 : 1
                          }} />
                        )}
                        
                        {/* Node */}
                        <div className={styles.timelineNode}>
                           {isLatest ? 
                             <CheckCircle2 size={16} style={{ color: 'white' }} /> : 
                             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-neutral-300)' }} />
                           }
                        </div>

                        {/* Content */}
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineHeader}>
                            <h4 className={styles.timelineStatus}>
                              {hist.status.replace('_', ' ')}
                            </h4>
                            <span className={styles.timelineDate}>
                               {new Date(hist.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ 
                            background: isLatest ? 'var(--color-neutral-50)' : 'transparent', 
                            padding: isLatest ? '16px' : '0', 
                            borderRadius: '12px', 
                            border: isLatest ? '1px solid var(--color-neutral-100)' : 'none' 
                          }}>
                            <p style={{ 
                              fontSize: '13.5px', 
                              color: isLatest ? 'var(--color-neutral-600)' : 'var(--color-neutral-400)',
                              lineHeight: 1.5,
                              fontStyle: isLatest ? 'normal' : 'italic'
                            }}>
                              {hist.notes || `Institutional state transitioned to ${hist.status.replace('_', ' ')}.`}
                            </p>
                            {isLatest && (
                               <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--color-neutral-500)', fontWeight: 600 }}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '1px solid var(--color-neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                     <User size={12} />
                                  </div>
                                  BY: <span style={{ color: 'var(--color-neutral-900)' }}>{hist.updater?.full_name || 'SYSTEM'}</span>
                               </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-neutral-400)', fontSize: '14px', border: '1px dashed var(--color-neutral-200)', borderRadius: '16px' }}>
                    No timeline data available.
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AGENT, DOCUMENTS, SUPPORT */}
        <div className={styles.rightCol}>
           {/* AGENT CARD */}
           <div className={styles.agentCard}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--color-primary-500)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }} />
              <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary-400)', textTransform: 'uppercase', marginBottom: 'var(--space-4)', letterSpacing: '0.1em' }}>Registry Control Partner</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                 <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 }}>
                    {app.assigned_registrar?.full_name?.charAt(0) || 'G'}
                 </div>
                 <div>
                    <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{app.assigned_registrar?.full_name || 'Registry Standard'}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-neutral-400)' }}>Official Case Manager</p>
                 </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                 <button className="btn" style={{ flex: 1, height: '40px', fontSize: '12px', background: 'var(--color-primary-600)', border: 'none', color: 'white', fontWeight: 700 }}>
                    <MessageSquare size={16} style={{marginRight: '8px'}} /> Message
                 </button>
                 <button className="btn" style={{ height: '40px', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '40px', padding: 0 }}>
                    <Smartphone size={18} />
                 </button>
              </div>
           </div>

           {/* DOCUMENTS CARD (LEGAL VAULT) */}
           <div className={styles.card} style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <FileText size={20} style={{ color: 'var(--color-primary-500)' }} /> Legal Vault
                </h3>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-neutral-400)', background: 'var(--color-neutral-50)', padding: '2px 8px', borderRadius: '4px' }}>
                  {app.documents?.length || 0} ITEMS
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 {app.documents && app.documents.length > 0 ? (
                   app.documents.map((doc: any) => (
                     <button 
                       key={doc.id} 
                       onClick={() => setSelectedDoc(doc)}
                       style={{ 
                          padding: '14px', 
                          borderRadius: '12px', 
                          border: '1px solid var(--color-neutral-100)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          background: 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          width: '100%'
                       }}
                       className="hover-lift"
                     >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={16} style={{ color: 'var(--color-primary-600)' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-neutral-800)' }}>{doc.title}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-neutral-400)', textTransform: 'uppercase', marginTop: '2px' }}>
                              {doc.url.split('.').pop()?.toUpperCase()} • PREVIEW
                            </div>
                          </div>
                        </div>
                        <MoreVertical size={16} style={{ color: 'var(--color-neutral-300)' }} />
                     </button>
                   ))
                 ) : (
                   <div style={{ padding: '32px 16px', textAlign: 'center', background: 'var(--color-neutral-50)', borderRadius: '12px', border: '1px dashed var(--color-neutral-200)' }}>
                      <FileText size={32} style={{ color: 'var(--color-neutral-200)', marginBottom: '8px' }} />
                      <p style={{ fontSize: '12px', color: 'var(--color-neutral-500)' }}>No encrypted artifacts found.</p>
                   </div>
                 )}
              </div>
           </div>

           {/* SUPPORT */}
           <div className={styles.card} style={{ border: '1px dashed var(--color-neutral-300)', background: 'linear-gradient(to bottom, white, var(--color-neutral-50))', padding: 'var(--space-6)' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-neutral-900)' }}>Institutional Support</div>
              <p style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '8px', lineHeight: 1.5 }}>
                Have questions regarding legal compliance or registry logistics? 
              </p>
              <div style={{ marginTop: '20px' }}>
                 <Link href="/support" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', gap: '6px' }} className="hover-primary">
                    Open Intelligence Ticket <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                 </Link>
              </div>
           </div>
        </div>
      </div>

      <style jsx global>{`
        .hover-lift:hover {
          transform: translateY(-2px);
          border-color: var(--color-primary-200) !important;
          box-shadow: var(--shadow-md);
        }
        .hover-primary:hover {
          color: var(--color-primary-600) !important;
        }
      `}</style>
    </div>
  )
}
