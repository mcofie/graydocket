'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowUpRight, FileText, X, Download, ChevronRight } from 'lucide-react'
import Tabs from '@/components/ui/Tabs'
import styles from './detail.module.css'
import EmptyState from '@/components/ui/EmptyState'

/* eslint-disable @typescript-eslint/no-explicit-any -- application rows and form_data are untyped JSON */

type Tab = 'progress' | 'details' | 'documents'
type Tone = 'neutral' | 'blue' | 'amber' | 'green' | 'red'

const statusMap: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' },
  submitted: { tone: 'blue', label: 'Submitted' },
  name_search: { tone: 'amber', label: 'Name search' },
  under_review: { tone: 'amber', label: 'Under review' },
  on_hold: { tone: 'amber', label: 'On hold' },
  approved: { tone: 'green', label: 'Approved' },
  completed: { tone: 'green', label: 'Active' },
  delivered: { tone: 'green', label: 'Delivered' },
  rejected: { tone: 'red', label: 'Action required' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
}

const statusLabel = (status: string) =>
  statusMap[status]?.label ?? status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// "directors.0.ghanaCardNumber" -> "Ghana card number"
const fieldLabel = (key: string) => {
  const last = key.split('.').pop() || key
  const words = last.replace(/([A-Z])/g, ' $1').toLowerCase().trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Form entries use surname/firstName/otherNames; older records used fullName
const personName = (p: any) =>
  [p?.firstName, p?.otherNames, p?.surname].filter(Boolean).join(' ') || p?.fullName || p?.name || 'Unnamed'

const join = (...parts: Array<string | undefined | null>) => parts.filter(Boolean).join(', ')

function Rows({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  const visible = rows.filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (visible.length === 0) return null
  return (
    <div className={styles.group}>
      {visible.map(([label, value]) => (
        <div key={label} className={styles.row}>
          <span className={styles.rowLabel}>{label}</span>
          <span className={styles.rowValue}>{value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ApplicationDetailContent({ app, appId }: { app: any; appId: string }) {
  const [tab, setTab] = useState<Tab>('progress')
  const [selectedDoc, setSelectedDoc] = useState<any>(null)

  useEffect(() => {
    if (!selectedDoc) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelectedDoc(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedDoc])

  const status: string = app.status || 'draft'
  const tone = statusMap[status]?.tone ?? 'neutral'
  const formData = app.form_data || {}
  const corrections: Record<string, string> = formData.corrections || {}
  const hasCorrections = status === 'rejected' && Object.keys(corrections).length > 0
  const history: any[] = app.application_status_history || []
  const documents: any[] = app.documents || []
  const directors: any[] = formData.directors || []
  const shareholders: any[] = formData.shareholders || []
  const proprietor = formData.proprietor
  const legacyAddress = formData.businessAddress || {}
  const editHref = `/dashboard/applications/${appId}/edit`

  return (
    <div className={styles.page}>
      <Link href="/dashboard" className={styles.back}>
        <ArrowLeft size={16} />
        <span>Your businesses</span>
      </Link>

      {/* Header */}
      <header className={styles.header}>
        <span className={styles.badge}>{(app.business_name || '?').charAt(0).toUpperCase()}</span>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{app.business_name || 'Untitled business'}</h1>
          <p className={styles.meta}>
            {app.business_types?.name || 'Business registration'}
            {app.tracking_id && <> · <span className={styles.mono}>{app.tracking_id}</span></>}
          </p>
        </div>
        <span className={`${styles.status} ${styles[tone]}`}>{statusLabel(status)}</span>
      </header>

      {/* Callouts */}
      {hasCorrections && (
        <section className={`${styles.callout} ${styles.calloutRed}`}>
          <h2>Some details need fixing</h2>
          <p>Our registrar asked for these changes before your application can continue.</p>
          <ul className={styles.corrections}>
            {Object.entries(corrections).map(([key, reason]) => (
              <li key={key}>
                <strong>{fieldLabel(key)}</strong>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          <Link href={editHref} className={styles.primaryBtn}>
            Fix and resubmit <ArrowRight size={16} />
          </Link>
        </section>
      )}

      {formData.companyDetails?.auditorLater && !['draft', 'cancelled'].includes(status) && (
        <section className={`${styles.callout} ${styles.calloutBlue}`}>
          <h2>Still needed: your auditor</h2>
          <p>
            We&apos;ll need your auditor&apos;s name and ICAG licence number before we can file. Your case manager will be in
            touch, or <Link href="/support">contact support</Link> if you&apos;d like us to recommend one.
          </p>
        </section>
      )}

      {status === 'draft' && (
        <section className={`${styles.callout} ${styles.calloutBlue}`}>
          <h2>This application isn&apos;t submitted yet</h2>
          <p>Pick up where you left off and submit when you&apos;re ready.</p>
          <Link href={editHref} className={styles.primaryBtn}>
            Continue application <ArrowRight size={16} />
          </Link>
        </section>
      )}

      {/* Tabs */}
      <Tabs
        label="Application sections"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'progress', label: 'Progress' },
          { id: 'details', label: 'Details' },
          { id: 'documents', label: 'Documents', count: documents.length },
        ]}
      />

      {/* Progress */}
      {tab === 'progress' && (
        history.length > 0 ? (
          <ol className={styles.timeline}>
            {history.map((h, i) => (
              <li key={h.id} className={`${styles.step} ${i === 0 ? styles.stepLatest : ''}`}>
                <span className={styles.dot} />
                <div className={styles.stepBody}>
                  <div className={styles.stepHead}>
                    <span className={styles.stepTitle}>{statusLabel(h.status)}</span>
                    <span className={styles.stepDate}>{formatDate(h.created_at)}</span>
                  </div>
                  {h.notes && <p className={styles.stepNote}>{h.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState variant="progress" message="No updates yet. We'll post every step here." />
        )
      )}

      {/* Details */}
      {tab === 'details' && (
        <div className={styles.sections}>
          <section>
            <h2 className={styles.sectionTitle}>Business</h2>
            <Rows
              rows={[
                ['Name', app.business_name],
                ['Alternative name', formData.businessNameAlt],
                ['Type', app.business_types?.name],
                ['Sector', formData.businessSector === 'Other (specify below)' ? formData.businessSectorOther : formData.businessSector],
                ['Activities', formData.natureOfBusiness],
                ['Started', formData.dateOfCommencement && formatDate(formData.dateOfCommencement)],
                ['Submitted', app.created_at && formatDate(app.created_at)],
              ]}
            />
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Registered office</h2>
            <Rows
              rows={[
                ['Address', join(formData.buildingName || legacyAddress.houseNo, formData.streetName, formData.city || legacyAddress.town, formData.district)],
                ['Region', formData.region || legacyAddress.region],
                ['Digital address', formData.digitalAddress],
                ['Postal address', formData.postalAddress],
              ]}
            />
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Contact</h2>
            <Rows
              rows={[
                ['Phone', formData.mobilePhone],
                ['Email', formData.email || app.profiles?.email],
                ['Delivery', formData.delivery_method === 'courier' ? 'Courier' : formData.delivery_method ? 'Digital only' : undefined],
              ]}
            />
          </section>

          {proprietor && (
            <section>
              <h2 className={styles.sectionTitle}>Proprietor</h2>
              <Rows
                rows={[
                  ['Name', personName(proprietor)],
                  ['Nationality', proprietor.nationality],
                  ['Ghana Card', proprietor.ghanaCardNumber],
                  ['TIN', proprietor.tinNumber],
                ]}
              />
            </section>
          )}

          {directors.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Directors</h2>
              <div className={styles.group}>
                {directors.map((d, i) => (
                  <div key={i} className={styles.row}>
                    <span className={styles.rowLabel}>{personName(d)}</span>
                    <span className={styles.rowValue}>
                      {[d.nationality, d.ghanaCardNumber || d.idNumber].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {formData.secretary && (formData.secretary.surname || formData.secretary.firstName) && (
            <section>
              <h2 className={styles.sectionTitle}>Company secretary</h2>
              <Rows rows={[['Name', personName(formData.secretary)], ['Ghana Card', formData.secretary.ghanaCardNumber]]} />
            </section>
          )}

          {shareholders.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Shareholders</h2>
              <div className={styles.group}>
                {shareholders.map((s, i) => (
                  <div key={i} className={styles.row}>
                    <span className={styles.rowLabel}>{s.name || s.fullName || 'Unnamed'}</span>
                    <span className={styles.rowValue}>
                      {s.numberOfShares || s.shares ? `${s.numberOfShares || s.shares} shares` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Documents */}
      {tab === 'documents' && (
        documents.length > 0 ? (
          <div className={styles.docList}>
            {documents.map((doc) => (
              <button key={doc.id} type="button" className={styles.docRow} onClick={() => setSelectedDoc(doc)}>
                <span className={styles.docIcon}>
                  <FileText size={18} strokeWidth={1.75} />
                </span>
                <span className={styles.docText}>
                  <span className={styles.docTitle}>{doc.title}</span>
                  <span className={styles.docSub}>{doc.url?.split('.').pop()?.split('?')[0]?.toUpperCase() || 'File'}</span>
                </span>
                <ChevronRight size={18} className={styles.chevron} />
              </button>
            ))}
          </div>
        ) : (
          <EmptyState variant="documents" message="Certificates and filings will appear here once they're ready." />
        )
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        {app.assigned_registrar?.full_name && (
          <p>
            Your case manager is <strong>{app.assigned_registrar.full_name}</strong>.
          </p>
        )}
        <p>
          Questions? <Link href="/support">Contact support</Link>
          {app.tracking_id && (
            <>
              {' · '}
              <Link href={`/track/${app.tracking_id}`} target="_blank">
                Public tracking page <ArrowUpRight size={13} />
              </Link>
            </>
          )}
        </p>
      </footer>

      {/* Document viewer */}
      {selectedDoc && (
        <div
          className={styles.viewer}
          role="dialog"
          aria-modal="true"
          aria-label={selectedDoc.title}
          onMouseDown={(e) => e.target === e.currentTarget && setSelectedDoc(null)}
        >
          <div className={styles.viewerPanel}>
            <header className={styles.viewerHeader}>
              <span className={styles.viewerTitle}>{selectedDoc.title}</span>
              <a href={selectedDoc.url} download className={styles.viewerBtn}>
                <Download size={16} /> Download
              </a>
              <button type="button" onClick={() => setSelectedDoc(null)} className={styles.viewerClose} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            <div className={styles.viewerBody}>
              {selectedDoc.url?.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                <iframe src={selectedDoc.url} title={selectedDoc.title} className={styles.viewerFrame} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedDoc.url} alt={selectedDoc.title} className={styles.viewerImg} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
