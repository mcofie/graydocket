'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { setFilingDeadline } from '@/lib/actions'
import { getAdminFilingDeadline } from '@/lib/admin-data'
import { formatDeadline } from '@/lib/annual-filing'
import { Skeleton, ui } from './ui'

/**
 * This year's ORC deadline for annual returns and business name renewals. The ORC announces it
 * (usually 30 April) and often extends it, so the team updates it here; reminders count down to it.
 */
export default function FilingDeadline() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminFilingDeadline>> | null>(null)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminFilingDeadline().then(setData)
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await setFilingDeadline(value)
    setSaving(false)
    if (res.error) return setError(res.error)
    setEditing(false)
    setData(await getAdminFilingDeadline())
  }

  return (
    <section className={ui.card}>
      <div className={ui.cardBody} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <CalendarDays size={20} style={{ color: 'var(--brand-ink)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 220, display: 'grid', gap: 2 }}>
          <span className={ui.statLabel}>ORC deadline for {data?.year ?? new Date().getUTCFullYear()} annual returns and renewals</span>
          {data === null ? (
            <Skeleton width={180} height={20} />
          ) : (
            <strong style={{ fontSize: 16 }}>
              {formatDeadline(data.deadline)}{' '}
              <span className={ui.muted} style={{ fontWeight: 400 }}>{data.saved ? '· set by the team' : '· usual date'}</span>
            </strong>
          )}
          <span className={ui.hint}>Customers are texted 30 and 7 days before, on the day, and 2 weeks after if it isn’t filed.</span>
        </div>
        {editing ? (
          <form onSubmit={save} className={ui.actions}>
            <input type="date" className={ui.input} value={value} onChange={(e) => setValue(e.target.value)} required aria-label="New deadline" />
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </form>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setValue(data?.deadline || '')
              setEditing(true)
            }}
            disabled={data === null}
          >
            Change date
          </button>
        )}
        {error && <p className={ui.error} style={{ width: '100%' }}>{error}</p>}
      </div>
    </section>
  )
}
