'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusCircle, FileText, Building2 } from 'lucide-react'
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
    tracking_id: string
    business_name: string
    status: string
    created_at: string
  }>
  profile: { full_name?: string; role?: string } | null
  user: { email?: string } | null
}

const quickActions = [
  {
    icon: <PlusCircle size={20} />,
    title: 'New Registration',
    desc: 'Launch a new entity in minutes.',
    href: '/dashboard/applications/new',
  },
  {
    icon: <FileText size={20} />,
    title: 'Track Status',
    desc: 'Real-time ORC sync status.',
    href: '/dashboard/applications',
  },
  {
    icon: <Building2 size={20} />,
    title: 'Partner Banking',
    desc: 'Unlock business accounts.',
    href: '/dashboard/applications/new',
  },
]

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats().then((result) => {
      setData(result)
      setLoading(false)
    })
  }, [])

  // Compute readiness score
  const readinessScore = data
    ? Math.min(
        100,
        20 + // base: account exists
        (data.profile?.full_name ? 15 : 0) +
        (data.total > 0 ? 25 : 0) +
        (data.completed > 0 ? 25 : 0) +
        (data.documents > 0 ? 15 : 0)
      )
    : 20

  const complianceStatus = data?.hasApplications
    ? data.completed > 0
      ? 'Good Standing'
      : 'Pending Review'
    : 'Setup Required'

  const nextRenewal = data?.completed && data.completed > 0 
    ? 'Dec 31, 2026' 
    : 'None Pending'

  const healthStats = [
    { label: 'Compliance Status', value: complianceStatus, variant: 'success' },
    { label: 'Compliance Engine', value: 'Active', variant: 'primary' },
    { label: 'Vault Security', value: 'Bank-Level', variant: 'info' },
    { label: 'Next Renewal', value: nextRenewal, variant: 'accent' },
  ]

  const readinessLabel = readinessScore >= 80 ? 'Optimized for Growth' : readinessScore >= 50 ? 'Getting Ready' : 'Just Getting Started'
  const readinessDetail = readinessScore >= 80
    ? 'Your business profile is nearly complete. Keep going!'
    : readinessScore >= 50
      ? 'Complete your first registration to unlock more features.'
      : 'Create your account profile and register your first business to get started.'

  if (loading) {
    return (
      <div className={styles.overview}>
        <div className={styles.topSection}>
          <div className={styles.healthScoreCard}>
            <div className={styles.healthHeader}>
              <Skeleton width="180px" height="24px" />
            </div>
            <div className={styles.healthScoreContent}>
              <Skeleton circle width="120px" height="120px" />
              <div className={styles.healthInfo}>
                <Skeleton width="150px" height="20px" style={{ marginBottom: '8px' }} />
                <Skeleton width="250px" height="40px" />
              </div>
            </div>
          </div>
          <div className={styles.engineMonitorCard}>
            <div className={styles.engineHeader}>
              <Skeleton width="180px" height="24px" />
            </div>
            <div className={styles.engineActivity}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={styles.engineStat}>
                  <Skeleton width="200px" height="18px" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.mainGrid}>
          <div className={styles.leftCol}>
            <Skeleton width="150px" height="28px" style={{ marginBottom: '16px' }} />
            <div className={styles.quickActions}>
              {[1, 2, 3].map(i => (
                <div key={i} className={styles.quickAction}>
                  <Skeleton circle width="40px" height="40px" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="100px" height="18px" style={{ marginBottom: '4px' }} />
                    <Skeleton width="150px" height="14px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.rightCol}>
            <Skeleton width="150px" height="28px" style={{ marginBottom: '16px' }} />
            <div className={styles.timeline}>
              {[1, 2, 3].map(i => (
                <div key={i} className={styles.timelineItem} style={{ marginBottom: '24px' }}>
                  <Skeleton circle width="12px" height="12px" />
                  <div className={styles.timelineContent}>
                    <Skeleton width="120px" height="18px" />
                    <Skeleton width="200px" height="32px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overview}>
      <div className={styles.topSection}>
        {/* Health Score Card */}
        <div className={styles.healthScoreCard}>
          <div className={styles.healthHeader}>
            <h3>Business Readiness Index</h3>
            <span className={styles.liveBadge}>
              <span className={styles.pulseDot} /> LIVE
            </span>
          </div>
          <div className={styles.healthScoreContent}>
            <div className={styles.scoreCircle}>
              <svg viewBox="0 0 36 36" className={styles.circularChart}>
                <path className={styles.circleBg}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path className={styles.circle}
                  strokeDasharray={`${readinessScore}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className={styles.percentage}>{readinessScore}%</text>
              </svg>
            </div>
            <div className={styles.healthInfo}>
              <p className={styles.healthStatus}>{readinessLabel}</p>
              <p className={styles.healthDetail}>{readinessDetail}</p>
              {readinessScore < 100 && (
                <Link href="/dashboard/applications/new" className="btn btn-secondary btn-sm">
                  {data?.hasApplications ? 'Complete Profile' : 'Register Now'}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Engine Monitor */}
        <div className={styles.engineMonitorCard}>
          <div className={styles.engineHeader}>
            <h3>Compliance Engine Monitor</h3>
            <span className={styles.engineStatusBadge}>ACTIVE</span>
          </div>
          <div className={styles.engineActivity}>
            {healthStats.map((stat, i) => (
              <div key={i} className={styles.engineStat}>
                <span className={styles.statDot} style={{ background: `var(--color-${stat.variant}-500)` }} />
                <span className={styles.statLabel}>{stat.label}:</span>
                <span className={styles.statValue}>{stat.value}</span>
              </div>
            ))}
          </div>
          <div className={styles.engineWaveform}>
            <div className={styles.wave} />
            <div className={styles.wave} />
            <div className={styles.wave} />
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Left Col: Actions & Insights */}
        <div className={styles.leftCol}>
          <section>
            <h2 className={styles.sectionTitle}>Command Center</h2>
            <div className={styles.quickActions}>
              {quickActions.map((action, i) => (
                <Link key={i} href={action.href} className={styles.quickAction}>
                  <div className={styles.quickActionIcon}>{action.icon}</div>
                  <div>
                    <h4>{action.title}</h4>
                    <p>{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Recent Applications (if any) */}
          {data?.recentApplications && data.recentApplications.length > 0 && (
            <section>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Recent Applications</h2>
                <Link href="/dashboard/applications" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-600)' }}>
                  View All →
                </Link>
              </div>
              <div className={styles.insightCards}>
                {data.recentApplications.map((app) => (
                  <div key={app.id} className={styles.insightCard}>
                    <div className={styles.insightType} style={{ color: statusColorMap[app.status] || '#6b7280' }}>
                      {app.status.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <h4>{app.business_name}</h4>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{app.tracking_id}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Insights (static) */}
          <section className={styles.insightsSection}>
            <h2 className={styles.sectionTitle}>Compliance Insights</h2>
            <div className={styles.insightCards}>
              <div className={styles.insightCard}>
                <div className={styles.insightType}>Requirement</div>
                <h4>Annual Return Deadline</h4>
                <p>Dec 31, 2026</p>
              </div>
              <div className={styles.insightCard}>
                <div className={styles.insightType}>Guidance</div>
                <h4>Local Director Rules</h4>
                <p>New Regulation</p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Col: Timeline */}
        <div className={styles.rightCol}>
          <section className={styles.timelineSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Compliance Journey</h2>
            </div>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelinePoint} />
                <div className={styles.timelineContent}>
                  <h4>System Initialized</h4>
                  <p>Account security verified and encrypted storage active.</p>
                  <span>Completed</span>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={data?.hasApplications ? styles.timelinePoint : styles.timelinePointPending} />
                <div className={styles.timelineContent}>
                  <h4>First Registration</h4>
                  <p>
                    {data?.hasApplications
                      ? `${data.total} application${data.total > 1 ? 's' : ''} submitted.`
                      : 'Register your first business to unlock the full Engine features.'}
                  </p>
                  <span>{data?.hasApplications ? 'Completed' : 'Next Step'}</span>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={data?.completed && data.completed > 0 ? styles.timelinePoint : styles.timelinePointEmpty} />
                <div className={styles.timelineContent}>
                  <h4>Tax Portal Integration</h4>
                  <p>Automated GRA filing sync once registered.</p>
                  <span>{data?.completed && data.completed > 0 ? 'Active' : 'Locked'}</span>
                </div>
              </div>
            </div>
            <Link href="/dashboard/applications/new" className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-6)' }}>
              {data?.hasApplications ? 'Register Another Business' : 'Start Your Journey'}
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
