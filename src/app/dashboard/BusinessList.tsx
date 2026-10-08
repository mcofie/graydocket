'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Eye, Pencil, Globe, Copy, Check, LifeBuoy, ArrowUpRight } from 'lucide-react'
import styles from './overview.module.css'

export type Business = {
  id: string
  tracking_id?: string | null
  business_name?: string | null
  status: string
  business_types?: { name?: string } | null
}

const statusMap: Record<string, { tone: 'neutral' | 'blue' | 'amber' | 'green' | 'red'; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' },
  submitted: { tone: 'blue', label: 'Submitted' },
  name_search: { tone: 'amber', label: 'Name search' },
  under_review: { tone: 'amber', label: 'Under review' },
  approved: { tone: 'green', label: 'Approved' },
  rejected: { tone: 'red', label: 'Action required' },
  completed: { tone: 'green', label: 'Active' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
}

// Soft, stable avatar colours picked from the business name
const AVATAR_COLORS = ['#34c759', '#5aa9f2', '#f5b041', '#a78bfa', '#f472b6', '#2dd4bf']
const avatarColor = (name: string) =>
  AVATAR_COLORS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

function RowMenu({ business }: { business: Business }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const canEdit = business.status === 'draft' || business.status === 'rejected'
  const canTrack = Boolean(business.tracking_id) && business.status !== 'draft'

  const copyId = async () => {
    if (!business.tracking_id) return
    try {
      await navigator.clipboard.writeText(business.tracking_id)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setOpen(false)
      }, 900)
    } catch {
      setOpen(false)
    }
  }

  return (
    <div className={styles.menuWrap} ref={ref}>
      <button
        type="button"
        className={`${styles.moreBtn} ${open ? styles.moreBtnOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Actions for ${business.business_name || 'this business'}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <Link href={`/dashboard/applications/${business.id}`} className={styles.menuItem} role="menuitem">
            <Eye size={19} strokeWidth={1.75} />
            <span>View details</span>
          </Link>
          {canEdit && (
            <Link href={`/dashboard/applications/${business.id}/edit`} className={styles.menuItem} role="menuitem">
              <Pencil size={19} strokeWidth={1.75} />
              <span>{business.status === 'draft' ? 'Continue application' : 'Fix and resubmit'}</span>
            </Link>
          )}
          {canTrack && (
            <a
              href={`/track/${business.tracking_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.menuItem}
              role="menuitem"
            >
              <Globe size={19} strokeWidth={1.75} />
              <span>Track publicly</span>
              <ArrowUpRight size={16} className={styles.menuTrail} />
            </a>
          )}
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={copyId}
            disabled={!business.tracking_id}
          >
            {copied ? <Check size={19} strokeWidth={2} /> : <Copy size={19} strokeWidth={1.75} />}
            <span>{copied ? 'Copied' : 'Copy tracking ID'}</span>
          </button>
          <Link href="/support" className={styles.menuItem} role="menuitem">
            <LifeBuoy size={19} strokeWidth={1.75} />
            <span>Get help</span>
          </Link>
        </div>
      )}
    </div>
  )
}

export function BusinessList({ businesses }: { businesses: Business[] }) {
  return (
    <div className={styles.list}>
      {businesses.map((b) => {
        const status = statusMap[b.status] ?? statusMap.draft
        const name = b.business_name || 'Untitled business'
        return (
          <div key={b.id} className={styles.row}>
            <Link href={`/dashboard/applications/${b.id}`} className={styles.rowLink}>
              <span className={styles.badge} style={{ background: avatarColor(name) }}>
                {name.charAt(0).toUpperCase()}
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{name}</span>
                <span className={styles.rowSub}>
                  {b.business_types?.name || 'Business registration'}
                  {b.tracking_id && <> · {b.tracking_id}</>}
                </span>
              </span>
              <span className={`${styles.status} ${styles[status.tone]}`}>{status.label}</span>
            </Link>
            <RowMenu business={b} />
          </div>
        )
      })}
    </div>
  )
}
