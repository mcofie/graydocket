'use client'

import { useState, useEffect } from 'react'
import { getAdminStats } from '@/lib/actions'
import styles from './admin.module.css'
import Skeleton from '@/components/ui/Skeleton'
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Banknote,
  LockKeyhole,
  Inbox,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react'

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
      <div className={styles.adminContainer}>
        <div className={styles.headerSection}>
          <Skeleton width="300px" height="40px" />
          <Skeleton width="450px" height="20px" />
        </div>
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statHeader}>
                <Skeleton width="100px" height="20px" />
                <Skeleton circle width="44px" height="44px" />
              </div>
              <Skeleton width="120px" height="40px" style={{ marginTop: 'var(--space-2)' }} />
            </div>
          ))}
        </div>
        
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <Skeleton width="200px" height="24px" />
          </div>
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
      <div className={styles.adminContainer}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrapper}>
            <LockKeyhole size={32} />
          </div>
          <h3 className={styles.emptyStateTitle}>Access Denied</h3>
          <p className={styles.emptyStateDesc}>You do not have administrative permissions to view these statistics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>Admin Control Center</h1>
        <p className={styles.subtitle}>
          Monitor platform flow, system revenue, and corporate applications in real-time.
        </p>
      </div>

      <div className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {/* Total Apps Card */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <h3 className={styles.statTitle}>Total Applications</h3>
              <div className={`${styles.statIconWrapper} ${styles.primary}`}>
                <Building2 size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div className={styles.statValue}>
              {stats.appCount}
              <span className={`${styles.trendIndicator} ${styles.trendPositive}`}>
                <TrendingUp size={12} strokeWidth={3} /> +12%
              </span>
            </div>
          </div>
          
          {/* Total Users Card */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <h3 className={styles.statTitle}>Total Users</h3>
              <div className={`${styles.statIconWrapper} ${styles.info}`}>
                <Users size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div className={styles.statValue}>
              {stats.userCount}
            </div>
          </div>

          {/* Completed Card */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <h3 className={styles.statTitle}>Completed Filings</h3>
              <div className={`${styles.statIconWrapper} ${styles.success}`}>
                <CheckCircle2 size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div className={styles.statValue}>
              {stats.completedCount}
            </div>
          </div>

          {/* Revenue Card */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <h3 className={styles.statTitle}>Platform Revenue</h3>
              <div className={`${styles.statIconWrapper} ${styles.accent}`}>
                <Banknote size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div className={styles.statValue}>
              <span style={{ fontSize: 'var(--text-xl)', color: 'var(--color-neutral-500)', transform: 'translateY(-2px)' }}>GH₵</span>
              {stats.revenue.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>
            <span className={styles.entityIcon}><FileText size={18} strokeWidth={2.5} /></span>
            Recent Submissions
          </h2>
          <button className={styles.viewAllBtn}>
            View All <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className={styles.tableWrapper}>
          {stats.recentApps.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrapper}>
                <Inbox size={32} />
              </div>
              <h3 className={styles.emptyStateTitle}>No recent activity</h3>
              <p className={styles.emptyStateDesc}>New applications will appear here as they come in.</p>
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
                    <td>
                      <span className={styles.tableRowId}>{app.tracking_id}</span>
                    </td>
                    <td>
                      <div className={styles.tableRowEntity}>
                        {app.business_name}
                      </div>
                    </td>
                    <td>
                      <span className={styles.tableRowUser}>{app.profiles?.full_name || 'N/A'}</span>
                    </td>
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
    </div>
  )
}
