'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAdminStats } from '@/lib/admin-data'
import { PageHeader, StageChip, cedis, timeAgo, ui, StatsSkeleton, TableSkeleton } from './ui'

type Stats = NonNullable<Awaited<ReturnType<typeof getAdminStats>>>
type RecentRow = {
  id: string
  business_name: string
  status: string
  updated_at: string | null
  created_at: string
  profiles?: { full_name?: string | null } | null
  business_types?: { name?: string | null } | null
}

export default function AdminOverview() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getAdminStats().then((s) => (s ? setStats(s) : setFailed(true)))
  }, [])

  if (failed) return <div className={ui.page}><p className={ui.error}>You don’t have access to the admin, or your session has expired.</p></div>
  if (!stats) {
    return (
      <div className={ui.page} aria-busy="true">
        <PageHeader title="Overview" sub="What needs doing, and how the month is going." />
        <StatsSkeleton />
        <StatsSkeleton />
        <section className={ui.card}>
          <div className={ui.cardHead}><h2 className={ui.cardTitle}>Recent activity</h2></div>
          <TableSkeleton rows={6} cols={4} />
        </section>
      </div>
    )
  }

  const q = stats.queues
  const queue = (label: string, value: number, href: string, hint: string, alert = false) => (
    <Link href={href} className={`${ui.stat} ${alert && value > 0 ? ui.statAlert : ''}`}>
      <span className={ui.statLabel}>{label}</span>
      <span className={ui.statValue}>{value}</span>
      <span className={ui.statHint}>{hint}</span>
    </Link>
  )

  return (
    <div className={ui.page}>
      <PageHeader title="Overview" sub="What needs doing, and how the month is going." />

      {stats.overdue > 0 && (
        <p className={ui.notice}>
          <strong>{stats.overdue} paid application{stats.overdue === 1 ? ' has' : 's have'} waited over a day.</strong>{' '}
          <Link href="/admin/applications?queue=new" style={{ textDecoration: 'underline' }}>Start them now</Link>
        </p>
      )}

      <section className={ui.stats} aria-label="Work queues">
        {queue('New', q.new, '/admin/applications?queue=new', 'Paid, ready to start', true)}
        {queue('In progress', q.inProgress, '/admin/applications?queue=in_progress', 'Name search or filing')}
        {queue('Waiting on customer', q.waiting, '/admin/applications?queue=waiting', 'Changes requested')}
        {queue('Approved & delivery', q.finishing, '/admin/applications?queue=finishing', 'Finish or dispatch')}
      </section>

      <section className={ui.stats} aria-label="This month">
        <div className={ui.stat}>
          <span className={ui.statLabel}>Paid this month</span>
          <span className={ui.statValue}>{cedis(stats.revenueThisMonth)}</span>
          <span className={ui.statHint}>{stats.paidThisMonth} application{stats.paidThisMonth === 1 ? '' : 's'}</span>
        </div>
        {queue('Completed', q.completed, '/admin/applications?queue=done', 'All time')}
        {queue('Not paid yet', q.unpaid, '/admin/applications?queue=unpaid', 'Saved, waiting for payment')}
        <Link href="/admin/users" className={ui.stat}>
          <span className={ui.statLabel}>Customers</span>
          <span className={ui.statValue}>{stats.customers}</span>
          <span className={ui.statHint}>With an account</span>
        </Link>
      </section>

      <section className={ui.card}>
        <div className={ui.cardHead}>
          <h2 className={ui.cardTitle}>Recent activity</h2>
          <Link href="/admin/applications" className={ui.cardNote}>All applications →</Link>
        </div>
        {stats.recent.length === 0 ? (
          <p className={ui.empty}>No applications yet.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr><th>Business</th><th>Customer</th><th>Stage</th><th className={ui.right}>Updated</th></tr>
              </thead>
              <tbody>
                {(stats.recent as RecentRow[]).map((a) => (
                  <tr key={a.id} className={ui.rowLink} onClick={() => router.push(`/admin/applications/${a.id}`)}>
                    <td>
                      <span className={ui.cellMain}>
                        <strong>{a.business_name}</strong>
                        <small>{a.business_types?.name}</small>
                      </span>
                    </td>
                    <td>{a.profiles?.full_name || <span className={ui.muted}>No name</span>}</td>
                    <td><StageChip status={a.status} /></td>
                    <td className={`${ui.right} ${ui.muted}`}>{timeAgo(a.updated_at || a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
