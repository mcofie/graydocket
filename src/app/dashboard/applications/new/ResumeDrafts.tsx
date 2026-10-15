'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, HeartHandshake, History, Trash2, User, type LucideIcon } from 'lucide-react'
import { discardDraft } from '@/lib/actions'
import styles from './resume.module.css'

export type SavedDraft = { id: string; name: string; type: string | null; updatedAt: string; readyToPay: boolean; step: number | null }

// Same look per business type as the first step of the form
const LOOK: Record<string, { icon: LucideIcon; accent: string; steps: number }> = {
  'Sole Proprietorship': { icon: User, accent: 'var(--accent-blue)', steps: 6 },
  'Company Limited by Shares': { icon: Building2, accent: 'var(--accent-green)', steps: 7 },
  'Company Limited by Guarantee': { icon: HeartHandshake, accent: 'var(--accent-gold)', steps: 7 },
}

function savedWhen(iso: string) {
  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)
  if (days <= 0) return `today at ${then.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** "Pick up where you left off": unfinished applications, each with its progress, Continue and Delete */
export default function ResumeDrafts({ drafts, onDeleted }: { drafts: SavedDraft[]; onDeleted: (id: string) => void }) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (drafts.length === 0) return null
  const shown = drafts.slice(0, 3)

  const remove = async (id: string) => {
    setBusy(id)
    setError('')
    const res = await discardDraft(id)
    setBusy(null)
    if (res.error) return setError(res.error)
    setConfirming(null)
    onDeleted(id)
  }

  return (
    <section className={styles.resume} aria-labelledby="resume-title">
      <div className={styles.head}>
        <span className={styles.headIcon}><History size={18} /></span>
        <div>
          <h3 id="resume-title" className={styles.title}>Pick up where you left off</h3>
          <p className={styles.sub}>
            {drafts.length === 1 ? 'Your unfinished application is saved.' : `You have ${drafts.length} unfinished applications, all saved.`} Carry on
            whenever you’re ready.
          </p>
        </div>
      </div>

      <ul className={styles.list}>
        {shown.map((d, i) => {
          const look = (d.type && LOOK[d.type]) || { icon: Building2, accent: 'var(--accent-blue)', steps: 7 }
          const Icon = look.icon
          const step = d.readyToPay ? look.steps : Math.min(Math.max((d.step ?? 1) + 1, 1), look.steps)
          const pct = Math.round((step / look.steps) * 100)
          const isConfirming = confirming === d.id
          return (
            <li key={d.id} className={styles.card} style={{ '--accent': look.accent, animationDelay: `${i * 70}ms` } as React.CSSProperties}>
              {isConfirming ? (
                <div className={styles.confirm} role="alertdialog" aria-label={`Delete ${d.name}`}>
                  <p>
                    <strong>Delete “{d.name}”?</strong> Everything you’ve entered for it will be removed. This can’t be undone.
                  </p>
                  <div className={styles.confirmActions}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(null)} disabled={busy === d.id}>Keep it</button>
                    <button type="button" className={`btn btn-sm ${styles.danger}`} onClick={() => remove(d.id)} disabled={busy === d.id}>
                      {busy === d.id ? 'Deleting…' : 'Delete draft'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className={styles.icon}><Icon size={18} strokeWidth={2} /></span>
                  <div className={styles.body}>
                    <div className={styles.nameRow}>
                      <strong className={styles.name}>{d.name}</strong>
                      {d.readyToPay && <span className={styles.ready}>Ready to pay</span>}
                    </div>
                    <span className={styles.meta}>{[d.type, `saved ${savedWhen(d.updatedAt)}`].filter(Boolean).join(' · ')}</span>
                    <div className={styles.progress} aria-label={d.readyToPay ? 'Ready to pay' : `Step ${step} of ${look.steps}`}>
                      <span className={styles.bar}><span style={{ width: `${pct}%` }} /></span>
                      <span className={styles.stepText}>{d.readyToPay ? 'All done' : `Step ${step} of ${look.steps}`}</span>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    {/* A full page load, so the form starts from this draft */}
                    <a href={`/dashboard/applications/new?draft=${d.id}`} className={`btn btn-primary btn-sm ${styles.continue}`}>
                      {d.readyToPay ? 'Review and pay' : 'Continue'} <ArrowRight size={15} />
                    </a>
                    <button type="button" className={styles.delete} onClick={() => setConfirming(d.id)} aria-label={`Delete ${d.name}`} title="Delete draft">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>

      {drafts.length > shown.length && (
        <Link href="/dashboard/applications" className={styles.more}>See all {drafts.length} unfinished applications</Link>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.or}><span>or start a new registration</span></div>
    </section>
  )
}
