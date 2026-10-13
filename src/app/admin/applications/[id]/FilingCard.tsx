'use client'

import { useState } from 'react'
import { markAnnualFilingDone } from '@/lib/actions'
import { formatDeadline } from '@/lib/annual-filing'
import { ui } from '../../ui'
import styles from './workflow.module.css'

export type Filing = {
  kind: 'renewal' | 'annual_return'
  label: string
  registeredYear: number
  year: number
  deadline: string
  firstFiling: boolean
  filed: boolean
  overdue: boolean
}

/** This year's annual return or business name renewal for a registered business */
export default function FilingCard({ applicationId, filing, onChanged }: { applicationId: string; filing: Filing; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const title = filing.kind === 'renewal' ? 'Business name renewal' : 'Annual return'

  const markFiled = async () => {
    if (!window.confirm(`Mark the ${filing.year} ${filing.label} as filed with the ORC? Reminders to the customer stop.`)) return
    setBusy(true)
    setError('')
    const res = await markAnnualFilingDone(applicationId, filing.year)
    setBusy(false)
    if (res.error) return setError(res.error)
    onChanged()
  }

  const chip = filing.filed
    ? { cls: ui.green, text: 'Filed' }
    : filing.overdue
      ? { cls: ui.red, text: 'Overdue' }
      : filing.firstFiling
        ? { cls: ui.blue, text: 'Paid, we file' }
        : { cls: ui.neutral, text: 'Due' }

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2 className={ui.cardTitle}>{title} {filing.year}</h2>
        <span className={`${ui.chip} ${chip.cls}`}>{chip.text}</span>
      </div>
      <div className={ui.cardBody} style={{ display: 'grid', gap: 12 }}>
        <dl className={ui.kv}>
          <div><dt>Due by</dt><dd>{formatDeadline(filing.deadline)}</dd></div>
          <div><dt>Registered</dt><dd>{filing.registeredYear}</dd></div>
        </dl>
        {filing.firstFiling && !filing.filed && (
          <p className={styles.waiting}>First filing after registration. It’s included in the price they paid, so the team files it.</p>
        )}
        {!filing.filed && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={markFiled} disabled={busy} style={{ justifySelf: 'start' }}>
            {busy ? 'Saving…' : `Mark ${filing.year} as filed`}
          </button>
        )}
        {error && <p className={ui.error}>{error}</p>}
      </div>
    </section>
  )
}
