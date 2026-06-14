'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  FileText,
  Activity,
  Clock,
  Zap,
  BarChart3
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
        <div>
          <h1 className={styles.title}>Admin Control Center</h1>
          <p className={styles.subtitle}>
            Monitor platform flow, system revenue, and corporate applications in real-time.
          </p>
        </div>

      </div>

      <div className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {stats.role === 'admin' ? (
            <>
              {/* Revenue Card */}
              <div className={styles.statCard} style={{ borderBottom: '4px solid #10b981' }}>
                <div className={styles.statHeader}>
                  <h3 className={styles.statTitle}>MTD Revenue (GHS)</h3>
                  <div className={`${styles.statIconWrapper}`} style={{ background: '#10b98115', color: '#10b981' }}>
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className={styles.statValue}>¢{stats.monthlyRevenue.toLocaleString()}</span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Active Month</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* My Workload Card */}
              <div className={styles.statCard} style={{ borderBottom: '4px solid var(--color-primary-600)' }}>
                <div className={styles.statHeader}>
                  <h3 className={styles.statTitle}>My Assigned Workload</h3>
                  <div className={`${styles.statIconWrapper} ${styles.primary}`}>
                    <Building2 size={20} />
                  </div>
                </div>
                <span className={styles.statValue}>{stats.totalApplications}</span>
                <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Units requiring your action</div>
              </div>
            </>
          )}

          {/* Urgent Apps Card - Same for both but different copy */}
          <div className={styles.statCard} style={{ borderBottom: stats.urgentCount > 0 ? '4px solid #ef4444' : '4px solid var(--color-neutral-200)' }}>
            <div className={styles.statHeader}>
              <h3 className={styles.statTitle}>{stats.role === 'admin' ? 'Urgent / Unassigned' : 'Available in Queue'}</h3>
              <div className={`${styles.statIconWrapper}`} style={{ background: stats.urgentCount > 0 ? '#ef444415' : 'var(--color-neutral-100)', color: stats.urgentCount > 0 ? '#ef4444' : 'var(--color-neutral-400)' }}>
                <Clock size={20} />
              </div>
            </div>
            <span className={styles.statValue}>{stats.urgentCount}</span>
            <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>{stats.role === 'admin' ? 'Apps unassigned for > 6 hrs' : 'Unassigned apps waiting'}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <h3 className={styles.statTitle}>{stats.role === 'admin' ? 'Active Capacity' : 'In Progress'}</h3>
              <div className={`${styles.statIconWrapper} ${styles.primary}`}>
                <Activity size={20} />
              </div>
            </div>
            <span className={styles.statValue}>{stats.totalApplications - stats.completedApplications}</span>
            <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Apps in processing flow</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <h3 className={styles.statTitle}>{stats.role === 'admin' ? 'Platform Users' : 'Cases Completed'}</h3>
              <div className={`${styles.statIconWrapper} ${styles.secondary}`}>
                {stats.role === 'admin' ? <Users size={20} /> : <CheckCircle2 size={20} />}
              </div>
            </div>
            <span className={styles.statValue}>{stats.role === 'admin' ? stats.totalUsers : stats.completedApplications}</span>
          </div>
        </div>
      </div>

        <div className={stats.role === 'admin' ? styles.dashboardGrid : styles.singleGrid} style={{ marginTop: 'var(--space-6)' }}>
           {/* Recent Applications */}
           <div className={styles.tableContainer} style={{ margin: 0 }}>
             <div className={styles.tableHeader}>
               <h2 className={styles.tableTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <FileText size={18} /> {stats.role === 'admin' ? 'Platform Activity' : 'My Recent Activity'}
               </h2>
               <Link href="/admin/applications" className={styles.viewAllLink} style={{ fontSize: '13px', color: 'var(--color-primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                 View all <ArrowRight size={16} />
               </Link>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: 'var(--space-6)' }}>
               {stats.recentApplications.map((app: any) => (
                 <Link 
                   key={app.id} 
                   href={`/admin/applications/${app.id}`}
                   style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-neutral-0)', border: '1px solid var(--color-neutral-100)', borderRadius: '12px', textDecoration: 'none', color: 'inherit' }}
                 >
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ background: 'var(--color-neutral-50)', padding: '8px', borderRadius: '8px' }}>
                       <FileText size={18} />
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontWeight: 600, fontSize: '14px' }}>{app.business_name}</span>
                       <span style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                         {app.profiles?.full_name || 'Anonymous User'} • {new Date(app.created_at).toLocaleDateString()}
                       </span>
                     </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <span className={`badge badge-${app.status}`} style={{ fontSize: '10px' }}>
                       {app.status.replace('_', ' ')}
                     </span>
                     <ArrowRight size={14} style={{ color: 'var(--color-neutral-400)' }} />
                   </div>
                 </Link>
               ))}
               {stats.recentApplications.length === 0 && (
                 <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-neutral-400)' }}>
                   <Inbox size={32} style={{ marginBottom: '12px' }} />
                   <p>No recent activity found.</p>
                 </div>
               )}
             </div>
           </div>

           {/* Registrar Radar - Only for Admins */}
           {stats.role === 'admin' && (
             <div className={styles.tableContainer} style={{ margin: 0, padding: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                   <BarChart3 size={20} style={{ color: 'var(--color-primary-600)' }} />
                   <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Registrar Radar</h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', marginBottom: '24px' }}>
                   Real-time workload distribution across the processing team.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   {stats.registrarStats.map((reg: any) => (
                      <div key={reg.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ fontWeight: 600 }}>{reg.name}</span>
                            <span style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{reg.activeCases} Cases</span>
                         </div>
                         <div style={{ width: '100%', height: '8px', background: 'var(--color-neutral-100)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div 
                               style={{ 
                                 width: `${Math.min((reg.activeCases / (stats.totalApplications || 50)) * 100 * 3, 100)}%`, 
                                 height: '100%', 
                                 background: 'var(--color-primary-600)', 
                                 borderRadius: '4px' 
                               }} 
                            />
                         </div>
                      </div>
                   ))}
                   {stats.registrarStats.length === 0 && (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-neutral-400)', fontSize: '13px' }}>
                         No registrars currently active.
                      </div>
                   )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                   <div style={{ background: 'var(--color-neutral-50)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-neutral-200)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-neutral-500)', marginBottom: '4px' }}>Efficiency Tip</div>
                      <p style={{ fontSize: '12px', color: 'var(--color-neutral-600)', lineHeight: 1.5 }}>
                         Urgent applications unassigned for &gt; 6 hours trigger an automated alert to all active registrars.
                      </p>
                   </div>
                </div>
             </div>
           )}
        </div>
    </div>
  )
}
