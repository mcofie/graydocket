'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { getMyApplications } from '@/lib/actions'
import styles from './applications.module.css'

interface Application {
  id: string
  tracking_id: string
  business_name: string
  status: string
  payment_status: string
  total_amount: number
  created_at: string
  business_types: { name: string } | null
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  submitted: { bg: '#dbeafe', text: '#1d4ed8' },
  name_search: { bg: '#fef3c7', text: '#b45309' },
  under_review: { bg: '#fef3c7', text: '#b45309' },
  approved: { bg: '#d1fae5', text: '#065f46' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
  completed: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280' },
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMyApplications().then((result) => {
      setApplications(result.applications as Application[])
      setError(result.error)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2>All Applications</h2>
        </div>
        <p style={{ color: 'var(--color-neutral-400)', textAlign: 'center', padding: 'var(--space-16)' }}>
          Loading your applications...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2>All Applications</h2>
        </div>
        <p style={{ color: 'var(--color-error)', textAlign: 'center', padding: 'var(--space-16)' }}>
          {error}
        </p>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2>All Applications</h2>
          <Link href="/dashboard/applications/new" className="btn btn-primary btn-sm">
            <PlusCircle size={16} />
            New Registration
          </Link>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>No applications yet</h3>
          <p>
            You haven&apos;t submitted any business registration applications.
            Start your first one now!
          </p>
          <Link href="/dashboard/applications/new" className="btn btn-primary">
            <PlusCircle size={16} />
            Start Registration
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>All Applications</h2>
        <Link href="/dashboard/applications/new" className="btn btn-primary btn-sm">
          <PlusCircle size={16} />
          New Registration
        </Link>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Business Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const colors = statusColors[app.status] || statusColors.draft
              return (
                <tr key={app.id}>
                  <td>
                    <span className={styles.trackingId}>{app.tracking_id}</span>
                  </td>
                  <td><strong>{app.business_name}</strong></td>
                  <td>{app.business_types?.name || '—'}</td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>GH₵ {app.total_amount?.toLocaleString() || '0'}</td>
                  <td>{new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
