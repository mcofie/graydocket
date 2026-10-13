'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Award, FileText, X } from 'lucide-react'
import Tabs from '@/components/ui/Tabs'
import EmptyState from '@/components/ui/EmptyState'
import { getMyBusinessDocuments } from '@/lib/actions'
import { stageOf } from '@/lib/application-flow'
import { isImageUrl } from '@/lib/documents'
import styles from './documents.module.css'

type Business = Awaited<ReturnType<typeof getMyBusinessDocuments>>['businesses'][number]
type View = 'all' | 'issued' | 'provided'

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null

// Certificates get a distinct icon so they stand out from other filings
const isCertificate = (title: string) => /certificate/i.test(title)

export default function DocumentsPage() {
  const [businesses, setBusinesses] = useState<Business[] | null>(null)
  const [view, setView] = useState<View>('all')
  const [viewing, setViewing] = useState<{ src: string; title: string } | null>(null)

  useEffect(() => {
    getMyBusinessDocuments().then((res) => setBusinesses(res.businesses))
  }, [])

  useEffect(() => {
    if (!viewing) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setViewing(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [viewing])

  const totals = useMemo(() => {
    const list = businesses || []
    const issued = list.reduce((n, b) => n + b.issued.length, 0)
    const provided = list.reduce((n, b) => n + b.provided.length, 0)
    return { issued, provided, all: issued + provided }
  }, [businesses])

  if (businesses === null) {
    return (
      <div className={styles.column} aria-busy="true">
        {[0, 1].map((i) => <div key={i} className={styles.skeleton} />)}
      </div>
    )
  }

  if (totals.all === 0) {
    return (
      <div className={styles.column}>
        <EmptyState
          variant="documents"
          message="No documents yet. Your certificates, filings and the ID photos you send us will all appear here."
        />
      </div>
    )
  }

  return (
    <div className={styles.column}>
      <p className={styles.lead}>Everything for your businesses in one place: what we’ve issued and filed, and what you’ve sent us.</p>

      <Tabs
        label="Show"
        value={view}
        onChange={setView}
        items={[
          { id: 'all', label: 'All', count: totals.all },
          { id: 'issued', label: 'From GrayDocket', count: totals.issued },
          { id: 'provided', label: 'You provided', count: totals.provided },
        ]}
      />

      {businesses.map((b) => {
        const showIssued = view !== 'provided'
        const showProvided = view !== 'issued'
        const hasAny = (showIssued && b.issued.length > 0) || (showProvided && b.provided.length > 0)
        if (!hasAny && view !== 'all') return null
        const stage = stageOf(b.status)

        return (
          <section key={b.id} className={styles.business}>
            <div className={styles.businessHead}>
              <div>
                <h2 className={styles.businessName}>{b.name}</h2>
                <p className={styles.businessMeta}>
                  {b.type}
                  {b.trackingId && <> · <span className={styles.mono}>{b.trackingId}</span></>}
                </p>
              </div>
              <span className={`${styles.stage} ${styles[stage.tone]}`}>{stage.customer}</span>
            </div>

            {showIssued && (
              <div className={styles.group}>
                <h3 className={styles.groupTitle}>From GrayDocket</h3>
                {b.issued.length === 0 ? (
                  <p className={styles.none}>
                    Your certificate and filings will appear here once they’re issued.{' '}
                    <Link href={`/dashboard/applications/${b.id}`}>See progress</Link>
                  </p>
                ) : (
                  <ul className={styles.list}>
                    {b.issued.map((d) => {
                      const Icon = isCertificate(d.title) ? Award : FileText
                      return (
                        <li key={d.id}>
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.row}
                            onClick={(e) => {
                              if (isImageUrl(d.url) && d.url.startsWith('data:')) {
                                e.preventDefault()
                                setViewing({ src: d.url, title: d.title })
                              }
                            }}
                          >
                            <span className={`${styles.icon} ${isCertificate(d.title) ? styles.iconCert : ''}`}>
                              <Icon size={18} strokeWidth={1.75} />
                            </span>
                            <span className={styles.rowText}>
                              <span className={styles.rowTitle}>{d.title}</span>
                              <span className={styles.rowSub}>{formatDate(d.addedAt) ? `Added ${formatDate(d.addedAt)}` : 'Added by GrayDocket'}</span>
                            </span>
                            <span className={styles.open}>Open <ArrowUpRight size={15} /></span>
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}

            {showProvided && b.provided.length > 0 && (
              <div className={styles.group}>
                <h3 className={styles.groupTitle}>You provided</h3>
                <ul className={styles.photos}>
                  {b.provided.map((d) => (
                    <li key={d.id}>
                      <button type="button" className={styles.photo} onClick={() => setViewing({ src: d.src, title: `${d.title} · ${d.person}` })}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- inline data URLs from the form */}
                        <img src={d.src} alt={`${d.title} for ${d.person}`} loading="lazy" />
                        <span className={styles.photoText}>
                          <strong>{d.person}</strong>
                          <small>{d.role} · {d.title}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}

      {viewing && (
        <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={viewing.title} onClick={() => setViewing(null)}>
          <div className={styles.viewerBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.viewerHead}>
              <strong>{viewing.title}</strong>
              <button type="button" onClick={() => setViewing(null)} aria-label="Close" className={styles.viewerClose}>
                <X size={20} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- inline data URLs from the form */}
            <img src={viewing.src} alt={viewing.title} className={styles.viewerImg} />
          </div>
        </div>
      )}
    </div>
  )
}
