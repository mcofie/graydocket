'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  FileText, 
  Smartphone, 
  AlertCircle, 
  X, 
  Download, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  MoreVertical,
  MessageSquare,
  Users,
  MapPin,
  Briefcase,
  History
} from 'lucide-react'
import styles from './detail.module.css'

export default function ApplicationDetailContent({ app, appId }: { app: any, appId: string }) {
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'timeline' | 'dossier'>('timeline')

  const currentStatus = app.status || 'draft'
  const isCompleted = ['completed', 'approved', 'delivered'].includes(currentStatus)
  const isCritical = ['rejected', 'cancelled', 'on_hold'].includes(currentStatus)
  const corrections = app.form_data?.corrections || {}
  const hasCorrections = Object.keys(corrections).length > 0
  const formData = app.form_data || {}

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

      {/* DRAFT ALERT BANNER */}
      {currentStatus === 'draft' && (
        <div className={styles.correctionBanner} style={{ background: 'var(--color-info-light)', border: '1px solid #93c5fd' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText color="white" size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#1e3a8a', fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>Draft Application</h3>
            <p style={{ color: 'var(--color-neutral-700)', fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
              This application has not been submitted yet. You can edit and complete it before final submission.
            </p>
            <Link href={`/dashboard/applications/${appId}/edit`} className="btn btn-primary" style={{ height: '44px', gap: '8px' }}>
               Edit & Complete Draft <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
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
             {currentStatus === 'draft' && (
               <Link href={`/dashboard/applications/${appId}/edit`} className="btn btn-secondary" style={{ height: '44px', gap: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  Edit Draft
               </Link>
             )}
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
        {/* LEFT COLUMN: TABS (TIMELINE & DOSSIER) */}
        <div className={styles.leftCol}>
          <div className={styles.card} style={{ padding: 0 }}>
             <div style={{ display: 'flex', borderBottom: '1px solid var(--color-neutral-100)', padding: '0 16px' }}>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  style={{ 
                    padding: '24px 16px', 
                    fontSize: '14px', 
                    fontWeight: 800, 
                    color: activeTab === 'timeline' ? 'var(--color-primary-600)' : 'var(--color-neutral-400)',
                    borderBottom: '2px solid',
                    borderColor: activeTab === 'timeline' ? 'var(--color-primary-600)' : 'transparent',
                    background: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                >
                   <History size={18} /> Timeline
                </button>
                <button 
                   onClick={() => setActiveTab('dossier')}
                   style={{ 
                     padding: '24px 16px', 
                     fontSize: '14px', 
                     fontWeight: 800, 
                     color: activeTab === 'dossier' ? 'var(--color-primary-600)' : 'var(--color-neutral-400)',
                     borderBottom: '2px solid',
                     borderColor: activeTab === 'dossier' ? 'var(--color-primary-600)' : 'transparent',
                     background: 'none',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '10px',
                     transition: 'all 0.2s',
                     cursor: 'pointer'
                   }}
                >
                   <FileText size={18} /> Submission Dossier
                </button>
             </div>

             <div style={{ padding: 'var(--space-8)' }}>
                {activeTab === 'timeline' ? (
                   <div className={styles.timelineSection}>
                      {app.application_status_history && app.application_status_history.length > 0 ? (
                        app.application_status_history.map((hist: any, i: number) => {
                          const isLatest = i === 0;
                          return (
                            <div key={hist.id} className={`${styles.timelineItem} ${isLatest ? styles.active : ''}`}>
                              {i < app.application_status_history.length - 1 && (
                                <div className={styles.timelineLine} style={{ 
                                  background: isLatest ? 'var(--color-primary-500)' : 'var(--color-neutral-200)',
                                  opacity: isLatest ? 0.3 : 1
                                }} />
                              )}
                              <div className={styles.timelineNode}>
                                 {isLatest ? 
                                   <CheckCircle2 size={16} style={{ color: 'white' }} /> : 
                                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-neutral-300)' }} />
                                 }
                              </div>
                              <div className={styles.timelineContent}>
                                <div className={styles.timelineHeader}>
                                  <h4 className={styles.timelineStatus}>{hist.status.replace('_', ' ')}</h4>
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
                                  <p style={{ fontSize: '13.5px', color: isLatest ? 'var(--color-neutral-600)' : 'var(--color-neutral-400)', lineHeight: 1.5 }}>
                                    {hist.notes || `Institutional state transitioned to ${hist.status.replace('_', ' ')}.`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-neutral-400)' }}>No timeline data.</div>
                      )}
                   </div>
                ) : (
                   <div className={styles.dataSection}>
                      {/* BASIC DETAILS */}
                      <div className={styles.dataGroup}>
                         <div className={styles.dataGroupTitle}><Briefcase size={16} /> Business Overview</div>
                         <div className={styles.dataGrid}>
                            <div className={styles.dataItem}>
                               <label>Business Name</label>
                               <p>{app.business_name}</p>
                            </div>
                            <div className={styles.dataItem}>
                               <label>Registration Type</label>
                               <p>{app.business_types?.name || 'Standard Registration'}</p>
                            </div>
                            <div className={styles.dataItem}>
                               <label>Nature of Business</label>
                               <p>{formData.natureOfBusiness || 'N/A'}</p>
                            </div>
                            <div className={styles.dataItem}>
                               <label>Submission Date</label>
                               <p>{new Date(app.created_at).toLocaleDateString()}</p>
                            </div>
                         </div>
                      </div>

                      {/* CONTACT DETAILS */}
                      <div className={styles.dataGroup}>
                         <div className={styles.dataGroupTitle}><Smartphone size={16} /> Contact Information</div>
                         <div className={styles.dataGrid}>
                            <div className={styles.dataItem}>
                               <label>Primary Phone</label>
                               <p>{formData.mobilePhone || 'N/A'}</p>
                            </div>
                            <div className={styles.dataItem}>
                               <label>Notification Email</label>
                               <p>{formData.email || app.profiles?.email || 'N/A'}</p>
                            </div>
                            <div className={styles.dataItem}>
                               <label>Preferred Delivery</label>
                               <p style={{ textTransform: 'capitalize' }}>{formData.delivery_method || 'Standard'}</p>
                            </div>
                         </div>
                      </div>

                      {/* ADDRESSES */}
                      <div className={styles.dataGroup}>
                         <div className={styles.dataGroupTitle}><MapPin size={16} /> Registered Office</div>
                         <div className={styles.dataGrid}>
                            <div className={styles.dataItem}>
                               <label>House No/Street</label>
                               <p>{formData.businessAddress?.houseNo || 'N/A'}</p>
                            </div>
                            <div className={styles.dataItem}>
                               <label>Town/City</label>
                               <p>{formData.businessAddress?.town || 'N/A'}</p>
                            </div>
                            <div className={styles.dataItem}>
                               <label>Region</label>
                               <p>{formData.businessAddress?.region || 'N/A'}</p>
                            </div>
                         </div>
                      </div>

                      {/* PERSONNEL (DIRECTORS) */}
                      {formData.directors && formData.directors.length > 0 && (
                        <div className={styles.dataGroup}>
                           <div className={styles.dataGroupTitle}><Users size={16} /> Appointed Directors</div>
                           {formData.directors.map((director: any, idx: number) => (
                             <div key={idx} className={styles.entityCard}>
                                <div className={styles.entityHeader}>
                                   <div className={styles.entityName}>{director.fullName}</div>
                                   <div className={styles.entityRole}>DIRECTOR / {director.nationality || 'Ghanian'}</div>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)', display: 'flex', gap: '16px' }}>
                                   <div>TIN: {director.tin || 'N/A'}</div>
                                   <div>ID: {director.idNumber || 'N/A'}</div>
                                </div>
                             </div>
                           ))}
                        </div>
                      )}

                      {/* PERSONNEL (SHAREHOLDERS) */}
                      {formData.shareholders && formData.shareholders.length > 0 && (
                        <div className={styles.dataGroup}>
                           <div className={styles.dataGroupTitle}><Users size={16} /> Registered Shareholders</div>
                           {formData.shareholders.map((sh: any, idx: number) => (
                             <div key={idx} className={styles.entityCard}>
                                <div className={styles.entityHeader}>
                                   <div className={styles.entityName}>{sh.fullName}</div>
                                   <div className={styles.entityRole}>{sh.shares} SHARES ({sh.percentage || '0'}%)</div>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)' }}>
                                   Residential Address: {sh.address || 'N/A'}
                                </div>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AGENT, DOCUMENTS, SUPPORT */}
        <div className={styles.rightCol}>
           <div className={styles.agentCard}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '120px', height: '120px', background: 'var(--color-primary-500)', opacity: 0.08, borderRadius: '50%', filter: 'blur(40px)' }} />
              
              <div className={styles.agentCardHeader}>Registry Control Partner</div>
              
              <div className={styles.agentProfile}>
                 <div className={styles.agentAvatar}>
                    {app.assigned_registrar?.full_name?.charAt(0) || 'G'}
                 </div>
                 <div className={styles.agentInfo}>
                    <h4>{app.assigned_registrar?.full_name || 'Registry Standard'}</h4>
                    <p>Official Case Manager</p>
                 </div>
              </div>

              <div className={styles.agentActions}>
                 <button className={styles.messageBtn}>
                    <MessageSquare size={18} /> Message
                 </button>
                 <button className={styles.phoneBtn} aria-label="Call Partner">
                    <Smartphone size={20} />
                 </button>
              </div>
           </div>

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
                     <button key={doc.id} onClick={() => setSelectedDoc(doc)} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--color-neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', cursor: 'pointer', textAlign: 'left', width: '100%' }} className="hover-lift">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={16} style={{ color: 'var(--color-primary-600)' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-neutral-800)' }}>{doc.title}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-neutral-400)', textTransform: 'uppercase', marginTop: '2px' }}>{doc.url.split('.').pop()?.toUpperCase() || 'DAT'} • PREVIEW</div>
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
