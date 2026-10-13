import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { stageOf } from '@/lib/application-flow'
import styles from './admin-ui.module.css'

// Small building blocks shared by the admin pages

export const cedis = (amount: number | string | null | undefined) =>
  `GH₵ ${Number(amount || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`

export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '—'
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days < 30 ? `${days} d ago` : shortDate(iso)
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {sub && <p className={styles.pageSub}>{sub}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}

/** Where an application is, in our team's words */
export function StageChip({ status }: { status: string | null | undefined }) {
  const stage = stageOf(status)
  return <span className={`${styles.chip} ${styles[stage.tone]}`}>{stage.admin}</span>
}

export function PaymentChip({ status }: { status: string | null | undefined }) {
  if (status === 'paid') return <span className={`${styles.chip} ${styles.green}`}>Paid</span>
  if (status === 'refunded') return <span className={`${styles.chip} ${styles.neutral}`}>Refunded</span>
  return <span className={`${styles.chip} ${styles.amber}`}>Unpaid</span>
}

/** Value that settles after the user stops typing, for search boxes that query the server */
export function useDebounced<T>(value: T, ms = 300) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}

/** "26–50 of 132" with previous/next, under a paginated table. Hidden when everything fits on one page. */
export function Pagination({ page, total, pageSize, onChange, busy }: { page: number; total: number; pageSize: number; onChange: (page: number) => void; busy?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize && page === 1) return null
  const first = Math.min(total, (page - 1) * pageSize + 1)
  const last = Math.min(total, page * pageSize)
  return (
    <nav className={styles.pager} aria-label="Pages">
      <span className={styles.pagerInfo}>
        {first}–{last} of {total.toLocaleString()}
      </span>
      <span className={styles.pagerButtons}>
        <button type="button" className={styles.pagerBtn} onClick={() => onChange(page - 1)} disabled={page <= 1 || busy} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <span className={styles.pagerPage}>
          Page {page} of {pages}
        </span>
        <button type="button" className={styles.pagerBtn} onClick={() => onChange(page + 1)} disabled={page >= pages || busy} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </span>
    </nav>
  )
}

/** A grey shimmering block, for text or numbers that are still loading */
export function Skeleton({ width = '100%', height = 14, radius = 6, style }: { width?: number | string; height?: number | string; radius?: number; style?: React.CSSProperties }) {
  return <span className={styles.skeletonRow} style={{ display: 'block', width, height, borderRadius: radius, ...style }} aria-hidden="true" />
}

/** Placeholder stat tiles, same size as the real ones so nothing jumps when they load */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className={styles.stats} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.stat}>
          <Skeleton width="45%" height={13} />
          <Skeleton width="60%" height={30} style={{ margin: '2px 0' }} />
          <Skeleton width="35%" height={12} />
        </div>
      ))}
    </section>
  )
}

/** Placeholder card: a title bar and a few lines */
export function CardSkeleton({ lines = 4, title = true }: { lines?: number; title?: boolean }) {
  return (
    <section className={styles.card} aria-hidden="true">
      {title && (
        <div className={styles.cardHead}>
          <Skeleton width={140} height={16} />
        </div>
      )}
      <div className={styles.cardBody} style={{ display: 'grid', gap: 14 }}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={`${[90, 70, 80, 60, 75][i % 5]}%`} />
        ))}
      </div>
    </section>
  )
}

/** Grey placeholder rows for a table's first load */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className={styles.tableWrap} aria-busy="true" aria-label="Loading">
      <table className={styles.table}>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}><div className={styles.skeletonRow} style={{ width: c === 0 ? '70%' : '50%' }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { styles as ui }
