import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getTrackingStatus } from '@/lib/actions'
import styles from '../track.module.css'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Application Status: ${id}`,
    description: `Track real-time progress for GrayDocket business registration application ${id}.`,
  }
}

type Tone = 'neutral' | 'blue' | 'amber' | 'green' | 'red'

const statusMap: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' },
  submitted: { tone: 'blue', label: 'Submitted' },
  name_search: { tone: 'amber', label: 'Name search' },
  under_review: { tone: 'amber', label: 'Under review' },
  on_hold: { tone: 'amber', label: 'On hold' },
  approved: { tone: 'green', label: 'Approved' },
  completed: { tone: 'green', label: 'Registered' },
  delivered: { tone: 'green', label: 'Delivered' },
  rejected: { tone: 'red', label: 'Action required' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
}

const statusLabel = (status: string) =>
  statusMap[status]?.label ?? status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

type TrackingResult = {
  application?: {
    business_name: string
    status: string
    created_at: string
    business_types?: { name?: string | null } | { name?: string | null }[] | null
  }
  history?: Array<{ status: string; notes?: string | null; created_at: string }>
  error?: string
}

export default async function TrackResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const trackingId = decodeURIComponent(id).trim().toUpperCase()
  const res = (await getTrackingStatus(trackingId)) as TrackingResult
  const app = res.application
  const businessType = Array.isArray(app?.business_types) ? app?.business_types[0] : app?.business_types
  const history = res.history || []

  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        <div className={styles.column}>
          <Link href="/track" className={styles.back}>
            <ArrowLeft size={16} />
            <span>Track another application</span>
          </Link>

          {!app ? (
            <div className={styles.notFound}>
              <h1 className={styles.title}>We couldn&apos;t find that application</h1>
              <p className={styles.lead}>
                No application matches <span className={styles.mono}>{trackingId}</span>. Check the ID in your confirmation
                message and try again.
              </p>
              <Link href="/track" className={styles.primaryBtn}>
                Try another ID
              </Link>
            </div>
          ) : (
            <>
              <header className={styles.result}>
                <p className={styles.eyebrow}>
                  <span className={styles.mono}>{trackingId}</span>
                </p>
                <h1 className={styles.title}>{app.business_name}</h1>
                <div className={styles.resultMeta}>
                  <span className={`${styles.status} ${styles[statusMap[app.status]?.tone ?? 'neutral']}`}>
                    {statusLabel(app.status)}
                  </span>
                  <span>
                    {businessType?.name ? `${businessType.name} · ` : ''}Started {formatDate(app.created_at)}
                  </span>
                </div>
              </header>

              <section>
                <h2 className={styles.sectionTitle}>Progress</h2>
                <ol className={styles.timeline}>
                  {(history.length > 0 ? history : [{ status: app.status, created_at: app.created_at, notes: null }]).map(
                    (step, i) => (
                      <li key={`${step.status}-${step.created_at}`} className={`${styles.step} ${i === 0 ? styles.stepLatest : ''}`}>
                        <span className={styles.dot} />
                        <div className={styles.stepBody}>
                          <div className={styles.stepHead}>
                            <span className={styles.stepTitle}>{statusLabel(step.status)}</span>
                            <span className={styles.stepDate}>{formatDate(step.created_at)}</span>
                          </div>
                          {step.notes && <p className={styles.stepNote}>{step.notes}</p>}
                        </div>
                      </li>
                    )
                  )}
                </ol>
              </section>

              <div className={styles.help}>
                <p>Is this your application? Log in to see full details, upload documents or make changes.</p>
                <div className={styles.helpActions}>
                  <Link href="/auth/login" className={styles.primaryBtn}>Log in</Link>
                  <Link href="/support" className={styles.secondaryBtn}>Contact support</Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
