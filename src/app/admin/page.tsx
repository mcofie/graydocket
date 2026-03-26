'use client'

import { useState, useEffect } from 'react'
import { getAdminStats } from '@/lib/actions'
import styles from '../dashboard/overview.module.css'
import Skeleton from '@/components/ui/Skeleton'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const data = await getAdminStats()
      setStats(data)
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className={styles.overview}>
        <div className={styles.sectionHeader}>
          <Skeleton width="200px" height="32px" />
        </div>
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.statCard}>
              <Skeleton circle width="48px" height="48px" />
              <div className={styles.statContent}>
                <Skeleton width="60px" height="28px" style={{ marginBottom: '4px' }} />
                <Skeleton width="100px" height="14px" />
              </div>
            </div>
          ))}
        </div>
        <div className={styles.sectionHeader} style={{ marginTop: 'var(--space-8)' }}>
          <Skeleton width="180px" height="28px" />
        </div>
        <div className={styles.applicationsTable}>
          <div style={{ padding: 'var(--space-6)' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <Skeleton width="100px" height="20px" />
                <Skeleton width="200px" height="20px" />
                <Skeleton width="150px" height="20px" />
                <Skeleton width="100px" height="20px" style={{ marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={styles.overview}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔒</div>
          <h3>Access Denied</h3>
          <p>You do not have administrative permissions to view these statistics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Platform Overview</h2>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.primary}`}>📋</div>
          <div className={styles.statContent}>
            <h3>{stats.appCount}</h3>
            <p>Total Apps</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.info}`}>👥</div>
          <div className={styles.statContent}>
            <h3>{stats.userCount}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.success}`}>✅</div>
          <div className={styles.statContent}>
            <h3>{stats.completedCount}</h3>
            <p>Completed Apps</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.accent}`}>💰</div>
          <div className={styles.statContent}>
            <h3>GH₵{stats.revenue.toLocaleString()}</h3>
            <p>Platform Revenue</p>
          </div>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Recent Submissions</h2>
      </div>

      <div className={styles.applicationsTable}>
        {stats.recentApps.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📂</div>
            <h3>No recent activity</h3>
            <p>New applications will appear here as they come in.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TRK ID</th>
                <th>Business Name</th>
                <th>User</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentApps.map((app: any) => (
                <tr key={app.id}>
                  <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{app.tracking_id}</td>
                  <td style={{ fontWeight: 600 }}>{app.business_name}</td>
                  <td>{app.profiles?.full_name}</td>
                  <td>
                    <span className={`badge badge-${app.status}`}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
