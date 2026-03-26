'use client'

import { useState, useEffect } from 'react'
import { getAdminApplications, updateApplicationStatus } from '@/lib/actions'
import styles from '../../dashboard/overview.module.css'

const statusOptions = [
  'draft', 'submitted', 'name_search', 'under_review', 
  'approved', 'rejected', 'completed', 'cancelled'
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

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    const res = await getAdminApplications()
    setApps(res.applications)
    setLoading(false)
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await updateApplicationStatus(id, newStatus)
    if (error) {
      alert(error)
    } else {
      setApps(apps.map(a => a.id === id ? { ...a, status: newStatus } : a))
    }
  }

  if (loading) {
    return <div className={styles.overview}>Loading applications...</div>
  }

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Global Applications</h2>
      </div>

      {apps.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>No applications</h3>
          <p>User-submitted applications will be managed from here.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--color-neutral-50)', borderBottom: '1px solid var(--color-neutral-200)' }}>
              <tr>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>TRK ID</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>BUSINESS NAME</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>USER</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>TYPE</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>STATUS</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>UPDATED ON</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                  <td style={{ padding: 'var(--space-4)', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-primary-600)' }}>{app.tracking_id}</td>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{app.business_name}</td>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                    <div>{app.profiles?.full_name || 'Anonymous'}</div>
                  </td>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>{app.business_types?.name}</td>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <select 
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: 'var(--text-xs)', 
                        background: `${statusColorMap[app.status]}15`, 
                        color: statusColorMap[app.status],
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt} style={{ color: '#000' }}>
                          {opt.toUpperCase().replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
                    {new Date(app.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
