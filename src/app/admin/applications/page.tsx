'use client'

import { useState, useEffect } from 'react'
import { getAdminApplications, updateApplicationStatus } from '@/lib/actions'
import Modal from '../components/Modal'
import styles from '../../dashboard/overview.module.css'
import Skeleton from '@/components/ui/Skeleton'

const statusOptions = [
  'draft', 'submitted', 'name_search', 'under_review', 
  'approved', 'rejected', 'dispatched', 'delivered', 'completed', 'cancelled', 'on_hold'
]

const statusColorMap: Record<string, string> = {
  draft: '#6b7280',
  submitted: '#3b82f6',
  name_search: '#f59e0b',
  under_review: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  dispatched: '#8b5cf6',
  delivered: '#10b981',
  completed: '#10b981',
  cancelled: '#6b7280',
  on_hold: '#ef4444',
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
    return (
      <div className={styles.overview}>
        <div className={styles.sectionHeader}>
          <Skeleton width="180px" height="28px" />
        </div>
        <div className={styles.applicationsTable}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-6)', borderBottom: '1px solid var(--color-neutral-100)' }}>
              <Skeleton width="120px" height="20px" />
              <Skeleton width="200px" height="20px" />
              <Skeleton width="150px" height="20px" />
              <Skeleton width="100px" height="20px" />
              <Skeleton width="120px" height="20px" style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </div>
    )
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
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>DELIVERY</th>
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
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
                    {(() => {
                      const method = app.delivery_method || app.form_data?.delivery_method;
                      const addr = app.delivery_address || app.form_data?.delivery_address;
                      const isCourier = method === 'courier';
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: isCourier ? '#fef3c7' : '#f3f4f6',
                              color: isCourier ? '#92400e' : '#4b5563',
                              fontWeight: 600
                            }}>
                              {isCourier ? '📦 COURIER' : '📧 DIGITAL'}
                            </span>
                          </div>
                          {isCourier && addr && (
                            <div style={{ marginTop: '4px', color: 'var(--color-neutral-500)', fontSize: '10px', maxWidth: '150px' }}>
                              {addr.recipientName || addr.street} - {addr.city} ({addr.phone || 'No phone'})
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </td>
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
                    {app.updated_at ? new Date(app.updated_at).toLocaleDateString() : new Date(app.created_at).toLocaleDateString()}
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
