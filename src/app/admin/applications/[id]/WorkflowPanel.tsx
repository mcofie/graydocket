'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, MoreHorizontal, Plus } from 'lucide-react'
import { assignApplication, updateApplicationStatus } from '@/lib/actions'
import { CUSTOMER_STEPS, nextStep, stageOf, canMove, type AppStatus } from '@/lib/application-flow'
import { PaymentChip, cedis, ui } from '../../ui'
import styles from './workflow.module.css'

type Props = {
  app: {
    id: string
    status: string
    payment_status?: string | null
    total_amount?: number | null
    paystack_reference?: string | null
    delivery_method?: string | null
    assigned_to?: string | null
    form_data?: { price_lines?: Array<{ label: string; amount: number }> } | null
  }
  /** Admins who can own the application */
  team: Array<{ id: string; full_name: string | null; email: string | null }>
  /** Opens the existing "request a correction" dialog */
  onRequestChanges: () => void
  onChanged: () => void
}

/**
 * Where the application is and the one obvious next step. Less common moves (request changes,
 * rejected, cancel) live in the ⋯ menu; the note and the price breakdown open on demand.
 */
export default function WorkflowPanel({ app, team, onRequestChanges, onChanged }: Props) {
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const paid = app.payment_status === 'paid'
  const next = paid ? nextStep(app.status, app.delivery_method) : undefined
  const resume = paid && app.status === 'on_hold' && canMove(app.status, 'under_review')
  const primary = next || (resume ? { to: 'under_review' as AppStatus, label: 'Resume filing' } : undefined)
  const done = app.status === 'completed'
  const stepIndex = done ? CUSTOMER_STEPS.length - 1 : CUSTOMER_STEPS.findIndex((s) => s.status === app.status)
  const stage = stageOf(app.status)
  const offTrack = stepIndex === -1 // on hold, rejected, cancelled, draft

  const menu = paid
    ? [
        canMove(app.status, 'on_hold') && { label: 'Request changes', hint: 'Ask the customer to fix something', run: onRequestChanges },
        canMove(app.status, 'rejected') && {
          label: 'Rejected by ORC',
          hint: 'The customer is told',
          run: () => move('rejected', 'Mark this application as rejected by the ORC? The customer will be told.'),
        },
        canMove(app.status, 'cancelled') && {
          label: 'Cancel application',
          hint: 'Can’t be undone',
          danger: true,
          run: () => move('cancelled', 'Cancel this application? This can’t be undone.'),
        },
      ].filter(Boolean) as Array<{ label: string; hint: string; danger?: boolean; run: () => void }>
    : []

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  async function move(to: AppStatus, confirmText?: string) {
    setMenuOpen(false)
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(true)
    setError('')
    const res = await updateApplicationStatus(app.id, to, note.trim() || undefined)
    setBusy(false)
    if (res.error) return setError(res.error)
    setNote('')
    setNoteOpen(false)
    onChanged()
  }

  const assign = async (adminId: string) => {
    if (!adminId) return
    setBusy(true)
    const res = await assignApplication(app.id, adminId)
    setBusy(false)
    if (res.error) setError(res.error)
    else onChanged()
  }

  const priceLines = app.form_data?.price_lines || []

  return (
    <section className={ui.card}>
      <div className={styles.head}>
        <div className={styles.where}>
          <span className={styles.eyebrow}>{offTrack ? 'Status' : `Step ${stepIndex + 1} of ${CUSTOMER_STEPS.length}`}</span>
          <h2 className={styles.stage}>{stage.admin}</h2>
        </div>
        {menu.length > 0 && (
          <div className={styles.menuWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More actions"
              aria-expanded={menuOpen}
              disabled={busy}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <ul className={styles.menu} role="menu">
                {menu.map((m) => (
                  <li key={m.label}>
                    <button type="button" role="menuitem" className={`${styles.menuItem} ${m.danger ? styles.danger : ''}`} onClick={m.run}>
                      <span>{m.label}</span>
                      <small>{m.hint}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className={styles.body}>
        {/* The same five steps the customer sees, as one thin bar */}
        <div className={styles.progress} aria-label={`Progress: ${offTrack ? stage.admin : CUSTOMER_STEPS[stepIndex].label}`}>
          {CUSTOMER_STEPS.map((s, i) => (
            <span
              key={s.status}
              title={s.label}
              className={`${styles.seg} ${!offTrack && (i < stepIndex || done) ? styles.segDone : ''} ${!offTrack && i === stepIndex && !done ? styles.segNow : ''}`}
            />
          ))}
        </div>

        {!paid ? (
          <p className={styles.waiting}>Waiting for payment. It moves to <strong>New</strong> on its own once the customer pays.</p>
        ) : primary ? (
          <div className={styles.actions}>
            <button type="button" className={`btn btn-primary ${styles.primary}`} onClick={() => move(primary.to)} disabled={busy}>
              {busy ? 'Saving…' : primary.label} {!busy && <ArrowRight size={16} />}
            </button>

            {noteOpen ? (
              <textarea
                className={`${ui.input} ${styles.note}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Texted to the customer with this update, e.g. “Your name has been reserved.”"
                autoFocus
              />
            ) : (
              <button type="button" className={styles.addNote} onClick={() => setNoteOpen(true)}>
                <Plus size={14} /> Add a note for the customer
              </button>
            )}
          </div>
        ) : (
          <p className={styles.waiting}>{done ? 'Finished. Nothing more to do.' : `${stage.admin}. Nothing more to do here.`}</p>
        )}

        {error && <p className={ui.error}>{error}</p>}

        <div className={styles.rows}>
          <details className={styles.row}>
            <summary>
              <span className={styles.rowLabel}>Payment</span>
              <span className={styles.rowValue}>
                <strong>{cedis(app.total_amount)}</strong>
                <PaymentChip status={app.payment_status} />
                <ChevronDown size={14} className={styles.chev} />
              </span>
            </summary>
            <dl className={styles.breakdown}>
              {priceLines.map((l) => (
                <div key={l.label}><dt>{l.label}</dt><dd>{cedis(l.amount)}</dd></div>
              ))}
              <div><dt>Delivery</dt><dd>{app.delivery_method === 'courier' ? 'Courier' : 'Digital'}</dd></div>
              {app.paystack_reference && (
                <div><dt>Reference</dt><dd className={ui.mono}>{app.paystack_reference}</dd></div>
              )}
            </dl>
          </details>

          <label className={styles.row}>
            <span className={styles.rowLabel}>Owner</span>
            <select className={styles.owner} value={app.assigned_to || ''} onChange={(e) => assign(e.target.value)} disabled={busy}>
              <option value="">Nobody yet</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  )
}
