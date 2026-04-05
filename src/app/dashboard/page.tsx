'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusCircle, FileText, Building2, LayoutGrid, CheckCircle2, Clock, FolderOpen, ArrowRight, ExternalLink } from 'lucide-react'
import { getDashboardStats } from '@/lib/actions'
import styles from './overview.module.css'
import Skeleton from '@/components/ui/Skeleton'

interface DashboardData {
  total: number
  completed: number
  inProgress: number
  documents: number
  hasApplications: boolean
  recentApplications: Array<{
    id: string
    tracking_id?: string
    business_name: string
    status: string
    created_at: string
  }>
  profile: { full_name?: string; role?: string } | null
  user: { email?: string } | null
}

const statusColorMap: Record<string, { bg: string, text: string, label: string }> = {
  draft: { bg: '#f3f4f6', text: '#4b5563', label: 'Draft' },
  submitted: { bg: '#eff6ff', text: '#2563eb', label: 'Submitted' },
  name_search: { bg: '#fffbeb', text: '#d97706', label: 'Name Search' },
  under_review: { bg: '#fffbeb', text: '#d97706', label: 'Under Review' },
  approved: { bg: '#ecfdf5', text: '#059669', label: 'Approved' },
  rejected: { bg: '#fef2f2', text: '#dc2626', label: 'Action Required' },
  completed: { bg: '#ecfdf5', text: '#059669', label: 'Active' },
  cancelled: { bg: '#f3f4f6', text: '#4b5563', label: 'Cancelled' },
}

const quickActions = [
  { icon: <PlusCircle size={20} />, title: 'New Registration', desc: 'Launch a new entity.', href: '/dashboard/applications/new' },
  { icon: <FileText size={20} />, title: 'Application Tracker', desc: 'Real-time ORC sync.', href: '/dashboard/applications' },
  { icon: <Building2 size={20} />, title: 'Partner Banking', desc: 'Corporate accounts.', href: '#', comingSoon: true },
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats().then((result) => {
      setData(result)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className={styles.overview}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Skeleton width="300px" height="32px" />
          <Skeleton width="200px" height="20px" style={{ marginTop: '8px' }} />
        </div>
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.statCard}>
              <Skeleton circle width="54px" height="54px" />
              <div>
                <Skeleton width="100px" height="28px" />
                <Skeleton width="80px" height="14px" style={{ marginTop: '4px' }} />
              </div>
            </div>
          ))}
        </div>
        <div className={styles.mainGrid}>
          <div className={styles.leftCol}>
            <Skeleton width="100%" height="300px" />
          </div>
          <div className={styles.rightCol}>
            <Skeleton width="100%" height="250px" />
          </div>
        </div>
      </div>
    )
  }

  const firstName = data?.profile?.full_name?.split(' ')[0] || 'Founder'

  return (
    <div className={styles.overview}>
      <header className={styles.pageHeader}>
        <h1>
          Welcome back, {firstName}.
        </h1>
        <p>
          Here is your business infrastructure overview.
        </p>
      </header>

      {/* 1. High-level Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.primary}`}><LayoutGrid size={24} /></div>
          <div className={styles.statContent}>
            <h3>{data?.total || 0}</h3>
            <p>Total Entities</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.accent}`}><Clock size={24} /></div>
          <div className={styles.statContent}>
            <h3>{data?.inProgress || 0}</h3>
            <p>Processing</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.success}`}><CheckCircle2 size={24} /></div>
          <div className={styles.statContent}>
            <h3>{data?.completed || 0}</h3>
            <p>Active</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.info}`}><FolderOpen size={24} /></div>
          <div className={styles.statContent}>
            <h3>{data?.documents || 0}</h3>
            <p>Vault Documents</p>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Left Column: Main Entities/Table */}
        <div className={styles.leftCol}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Your Registered Entities</h2>
            {data?.hasApplications && (
              <Link href="/dashboard/applications" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-600)', fontWeight: 500 }}>
                View All Directory →
              </Link>
            )}
          </div>

          {!data?.hasApplications ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏢</div>
              <h3>No entities registered yet</h3>
              <p style={{ marginBottom: 'var(--space-6)' }}>Launch your first business, reserve a company name, or set up a corporate bank account.</p>
              <Link href="/dashboard/applications/new" className="btn btn-primary">
                Incorporate Now <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className={styles.applicationsTable}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Entity Name</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentApplications && data.recentApplications.length > 0 ? (
                    data.recentApplications.map((app) => {
                      const status = statusColorMap[app.status] || statusColorMap.draft
                      return (
                        <tr key={app.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--color-neutral-900)' }}>{app.business_name || 'Untitled Business'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-neutral-400)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                              {app.tracking_id || app.id.split('-')[0]}
                            </div>
                          </td>
                          <td>{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td>
                            <span style={{ 
                              padding: '4px 10px', 
                              backgroundColor: status.bg, 
                              color: status.text, 
                              borderRadius: 'var(--radius-full)', 
                              fontSize: '11px', 
                              fontWeight: 600, 
                              letterSpacing: '0.02em' 
                            }}>
                              {status.label}
                            </span>
                          </td>
                          <td>
                            <Link href={`/dashboard/applications/${app.id}`} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                              Manage
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-neutral-500)' }}>
                        No recent applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Quick Actions & Alerts */}
        <div className={styles.rightCol}>
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className={styles.sectionTitle}>Command Center</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {quickActions.map((action: any, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <Link href={action.href} className={`${styles.quickAction} ${action.comingSoon ? styles.quickActionDisabled : ''}`} style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-4)', gap: 'var(--space-4)' }}>
                    <div className={styles.quickActionIcon} style={{ margin: 0 }}>{action.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-neutral-900)' }}>{action.title}</h4>
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>{action.desc}</p>
                    </div>
                  </Link>
                  {action.comingSoon && (
                    <span style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '12px', 
                      fontSize: '9px', 
                      fontWeight: 800, 
                      backgroundColor: 'var(--color-neutral-100)', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      color: 'var(--color-neutral-500)'
                    }}>
                      COMING SOON
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className={styles.sectionTitle}>Action Items</h2>
            <div className={styles.insightCards} style={{ gridTemplateColumns: '1fr' }}>
              {!data?.hasApplications ? (
                <div className={styles.insightCard} style={{ borderLeft: '3px solid var(--color-primary-500)' }}>
                  <div className={styles.insightType}>Onboarding</div>
                  <h4>Complete KYC Profile</h4>
                  <p style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Verify your identity to unlock all platform features.</p>
                </div>
              ) : (
                <>
                  <div className={styles.insightCard} style={{ borderLeft: '3px solid var(--color-accent-500)' }}>
                    <div className={styles.insightType}>Action Required</div>
                    <h4>Provide Beneficial Ownership</h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Due by next week for active companies.</p>
                  </div>
                  <div className={styles.insightCard} style={{ borderLeft: '3px solid var(--color-info-500)' }}>
                    <div className={styles.insightType}>System Notice</div>
                    <h4>ORC Portal Maintenance</h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Expect slowness on Friday at 2am.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
