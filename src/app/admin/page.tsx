'use client'

import { useState, useEffect } from 'react'
import { getAdminStats } from '@/lib/actions'
import styles from '../dashboard/overview.module.css'

const statusColorMap: Record<string, string> = {
  draft: '#6b7280',
  submitted: '#3b82f6',
  name_search: '#f59e0b',
  under_review: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  completed: '#10b981',
  cancelled: '#6b7280',
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminStats().then((res) => {
      setData(res)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className={styles.overview}>Loading admin data...</div>
  }

  const statCards = [
    { icon: '📋', label: 'Total Applications', value: data?.appCount || 0, variant: 'primary' },
    { icon: '👥', label: 'Total Users', value: data?.userCount || 0, variant: 'info' },
    { icon: '💰', label: 'Revenue (GH₵)', value: data?.revenue || 0, variant: 'accent' },
    { icon: '✅', label: 'Completed', value: data?.completedCount || 0, variant: 'success' },
  ]

  return (
    <div className={styles.overview}>
      {/* Stats */}
      <div className={styles.statsGrid}>
        {statCards.map((stat, i) => (
          <div key={i} className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles[stat.variant as keyof typeof styles]}`}>
              {stat.icon}
            </div>
            <div className={styles.statContent}>
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Applications</h2>
        </div>

        {!data?.recentApps || data.recentApps.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <h3>No applications yet</h3>
            <p>Applications submitted by users will appear here.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--color-neutral-50)', borderBottom: '1px solid var(--color-neutral-200)' }}>
                <tr>
                  <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>TRK ID</th>
                  <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>BUSINESS NAME</th>
                  <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>USER</th>
                  <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>STATUS</th>
                  <th style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {data.recentApps.map((app: any) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>{app.tracking_id}</td>
                    <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{app.business_name}</td>
                    <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>{app.profiles?.full_name || 'User'}</td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        background: `${statusColorMap[app.status]}20`, 
                        color: statusColorMap[app.status] 
                      }}>
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
