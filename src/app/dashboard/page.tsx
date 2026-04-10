'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusCircle, FileText, Building2, LayoutGrid, CheckCircle2, Clock, FolderOpen, ArrowRight, Briefcase, ChevronRight, AlertCircle, Sparkles } from 'lucide-react'
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

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const quickActions = [
  { icon: <PlusCircle size={22} />, title: 'Register a Business', desc: 'Start a new sole proprietorship or limited company.', href: '/dashboard/applications/new' },
  { icon: <FileText size={22} />, title: 'Track Your Applications', desc: 'See real-time updates on all your filings.', href: '/dashboard/applications' },
  { icon: <Building2 size={22} />, title: 'Open a Business Account', desc: 'Get matched with a banking partner.', href: '/dashboard/banking' },
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
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Skeleton width="260px" height="30px" />
          <Skeleton width="180px" height="16px" style={{ marginTop: '8px' }} />
        </div>
        <Skeleton width="100%" height="120px" borderRadius="20px" />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.statCard}>
              <Skeleton circle width="42px" height="42px" />
              <div>
                <Skeleton width="60px" height="24px" />
                <Skeleton width="70px" height="12px" style={{ marginTop: '3px' }} />
              </div>
            </div>
          ))}
        </div>
        <Skeleton width="100%" height="300px" borderRadius="20px" />
      </div>
    )
  }

  const firstName = data?.profile?.full_name?.split(' ')[0] || 'there'
  const greeting = getGreeting()

  return (
    <div className={styles.overview}>
      {/* ── Warm Greeting ── */}
      <header className={styles.pageHeader}>
        <h1>
          {greeting}, {firstName} 👋
        </h1>
        <p>
          {data?.hasApplications
            ? "Here's an update on your businesses."
            : "Let's get your first business registered."}
        </p>
      </header>

      {/* ── Hero CTA ── */}
      {!data?.hasApplications ? (
        <Link href="/dashboard/applications/new" style={{ textDecoration: 'none' }}>
          <div className={styles.heroCta}>
            <div className={styles.heroContent}>
              <h2>Start Your Business Journey</h2>
              <p>Register a sole proprietorship or limited company in Ghana. We handle the paperwork — you focus on building.</p>
            </div>
            <button className={styles.heroBtn} type="button">
              <Sparkles size={16} /> Get Started
            </button>
          </div>
        </Link>
      ) : (
        <Link href="/dashboard/applications/new" style={{ textDecoration: 'none' }}>
          <div className={styles.heroCta}>
            <div className={styles.heroContent}>
              <h2>Register Another Entity</h2>
              <p>Expand your portfolio — add a new company or business name to your account.</p>
            </div>
            <button className={styles.heroBtn} type="button">
              <PlusCircle size={16} /> New Registration
            </button>
          </div>
        </Link>
      )}

      {/* ── Compact Stats ── */}
      {data?.hasApplications && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.primary}`}><LayoutGrid size={20} /></div>
            <div className={styles.statContent}>
              <h3>{data?.total || 0}</h3>
              <p>Entities</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.accent}`}><Clock size={20} /></div>
            <div className={styles.statContent}>
              <h3>{data?.inProgress || 0}</h3>
              <p>Processing</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.success}`}><CheckCircle2 size={20} /></div>
            <div className={styles.statContent}>
              <h3>{data?.completed || 0}</h3>
              <p>Active</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.info}`}><FolderOpen size={20} /></div>
            <div className={styles.statContent}>
              <h3>{data?.documents || 0}</h3>
              <p>Documents</p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.mainGrid}>
        {/* Left Column: Entities */}
        <div className={styles.leftCol}>
          {data?.hasApplications && (
            <>
              <div className={styles.sectionHeaderRow}>
                <h2 className={styles.sectionTitle}>Your Businesses</h2>
                <Link href="/dashboard/applications" className={styles.viewAllLink}>
                  See all <ArrowRight size={13} />
                </Link>
              </div>

              <div className={styles.entityList}>
                {data?.recentApplications && data.recentApplications.length > 0 ? (
                  data.recentApplications.slice(0, 5).map((app: any) => {
                    const colors = statusColorMap[app.status] || statusColorMap.draft
                    return (
                      <div 
                        key={app.id} 
                        className={styles.entityCard}
                        onClick={() => window.location.href = `/dashboard/applications/${app.id}`}
                      >
                        <div className={styles.cardHeader}>
                          <div className={styles.cardIcon}>
                            <Briefcase size={18} />
                          </div>
                          <span
                            className={styles.statusBadge}
                            style={{ 
                              background: colors.bg, 
                              color: colors.text,
                            }}
                          >
                            {colors.label}
                          </span>
                        </div>

                        <div className={styles.cardBody}>
                           <h3>{app.business_name || 'Untitled Business'}</h3>
                           <p>{app.business_types?.name || 'Standard Formation'}</p>
                        </div>

                        <div className={styles.cardFooter}>
                           <div className={styles.cardLink}>
                              View details <ChevronRight size={14} />
                           </div>
                           <div style={{ fontSize: '11px', color: 'var(--color-neutral-400)', fontFamily: 'var(--font-mono)' }}>
                              {app.tracking_id || app.id.split('-')[0]}
                           </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-neutral-400)' }}>
                    No active businesses found.
                  </div>
                )}
              </div>
            </>
          )}

          {/* Empty State for no applications */}
          {!data?.hasApplications && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏢</div>
              <h3>No businesses yet</h3>
              <p style={{ marginBottom: 'var(--space-6)' }}>Once you register your first entity, it'll show up right here so you can track its progress.</p>
            </div>
          )}
        </div>

        {/* Right Column: Quick Start + Notifications */}
        <div className={styles.rightCol}>
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className={styles.sectionTitle}>Quick Start</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              {quickActions.map((action: any, i) => (
                <Link key={i} href={action.href} className={styles.quickAction}>
                  <div className={styles.quickActionIcon}>{action.icon}</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 750, color: 'var(--color-neutral-900)', marginBottom: '1px' }}>{action.title}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-neutral-500)', margin: 0, lineHeight: 1.4 }}>{action.desc}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-neutral-300)', flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className={styles.sectionTitle}>Notifications</h2>
            <div className={styles.insightCards} style={{ marginTop: 'var(--space-4)' }}>
              {!data?.hasApplications ? (
                <div className={styles.actionCard}>
                  <div className={styles.actionIndicator} style={{ backgroundColor: 'var(--color-primary-500)' }} />
                  <div className={styles.actionContent}>
                    <div className={styles.actionHeader}>
                      <span className={styles.actionType}>Getting Started</span>
                    </div>
                    <h4>Complete your profile</h4>
                    <p>Add your details so we can process your registrations faster.</p>
                  </div>
                </div>
              ) : (
                <>
                  {data.inProgress > 0 && (
                    <div className={styles.actionCard}>
                      <div className={styles.actionIndicator} style={{ backgroundColor: '#d97706' }} />
                      <div className={styles.actionContent}>
                        <div className={styles.actionHeader}>
                          <span className={styles.actionType} style={{ color: '#d97706' }}>In Progress</span>
                          <Clock size={13} color="#d97706" />
                        </div>
                        <h4>{data.inProgress} application{data.inProgress > 1 ? 's' : ''} being processed</h4>
                        <p>We're working on your registration{data.inProgress > 1 ? 's' : ''}. You'll be notified of any updates.</p>
                      </div>
                    </div>
                  )}
                  <div className={styles.actionCard}>
                    <div className={styles.actionIndicator} style={{ backgroundColor: 'var(--color-primary-400)' }} />
                    <div className={styles.actionContent}>
                      <div className={styles.actionHeader}>
                        <span className={styles.actionType}>Tip</span>
                        <Sparkles size={13} color="var(--color-primary-400)" />
                      </div>
                      <h4>Keep your documents handy</h4>
                      <p>All your certificates and filed forms are stored in your vault for easy access.</p>
                    </div>
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
