'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAdminApplications, updateApplicationStatus, adminCreateApplication, getAdminUsers, getAllBusinessTypes, adminDeleteApplication } from '@/lib/actions'
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
  const [users, setUsers] = useState<any[]>([])
  const [businessTypes, setBusinessTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [userRole, setUserRole] = useState('registrar')
  
  // Form State
  const [formData, setFormData] = useState({
    userId: '',
    businessTypeId: '',
    businessName: '',
    status: 'submitted',
    paymentStatus: 'paid',
    totalAmount: 0
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    const [resApps, resUsers, resTypes] = await Promise.all([
      getAdminApplications(),
      getAdminUsers(),
      getAllBusinessTypes()
    ])
    setApps(resApps.applications)
    setUserRole(resApps.role || 'registrar')
    setUsers(resUsers.users || [])
    const uniqueBTypes = (resTypes.business_types || []).filter((v: any, i: number, a: any[]) => 
      a.findIndex(t => t.name === v.name) === i
    )
    setBusinessTypes(uniqueBTypes)
    setLoading(false)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.userId || !formData.businessTypeId || !formData.businessName) {
      alert('Please fill out all required fields')
      return
    }

    setCreating(true)
    const res = await adminCreateApplication(formData)
    setCreating(false)

    if (res.error) {
      alert(res.error)
    } else {
      setShowNewModal(false)
      setFormData({
        userId: '',
        businessTypeId: '',
        businessName: '',
        status: 'submitted',
        paymentStatus: 'paid',
        totalAmount: 0
      })
      fetchApplications()
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await updateApplicationStatus(id, newStatus)
    if (error) {
      alert(error)
    } else {
      setApps(apps.map(a => a.id === id ? { ...a, status: newStatus } : a))
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you absolutely sure you want to permanently delete this application? This action cannot be undone.')) {
       const res = await adminDeleteApplication(id)
       if (res.error) {
          alert(`Failed to delete: ${res.error}`)
       } else {
          setApps(apps.filter(a => a.id !== id))
       }
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
        {userRole === 'admin' && (
          <button 
            onClick={() => setShowNewModal(true)}
            className="btn btn-primary"
          >
            + New Application
          </button>
        )}
      </div>

      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Create New Application">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">User / Client</label>
            <select 
              className="form-input" 
              value={formData.userId} 
              onChange={e => setFormData({ ...formData, userId: e.target.value })}
              required
            >
              <option value="">-- Select User --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Business Type</label>
            <select 
              className="form-input" 
              value={formData.businessTypeId} 
              onChange={e => {
                const bType = businessTypes.find(b => b.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  businessTypeId: e.target.value,
                  totalAmount: bType ? bType.base_price : formData.totalAmount
                });
              }}
              required
            >
              <option value="">-- Select Business Type --</option>
              {businessTypes.map(b => {
                 const orcFee = b.orc_fee || 0;
                 const agentFee = b.agent_fee || 0;
                 const returnsPortion = b.returns_portion || 0;
                 const basePrice = b.base_price || 0;
                 const serviceFee = b.service_fee || 0;
                 const totalPrice = returnsPortion > 0 
                    ? (orcFee + agentFee + returnsPortion) 
                    : (basePrice + serviceFee);
                 return (
                    <option key={b.id} value={b.id}>
                       {b.name} (GH₵ {totalPrice.toLocaleString()})
                    </option>
                 );
              })}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Business Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.businessName}
              onChange={e => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="e.g. Acme Corp"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount Paid (GH₵)</label>
            <input 
              type="number" 
              step="0.01"
              className="form-input" 
              value={formData.totalAmount}
              onChange={e => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Status</label>
              <select 
                className="form-input" 
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                {statusOptions.map(opt => (
                  <option key={opt} value={opt}>{opt.toUpperCase().replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Payment Status</label>
              <select 
                className="form-input" 
                value={formData.paymentStatus} 
                onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNewModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Application'}
            </button>
          </div>
        </form>
      </Modal>


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
                <th style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                  <td style={{ padding: 'var(--space-4)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    <Link href={`/admin/applications/${app.id}`} style={{ color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
                      {app.tracking_id}
                    </Link>
                  </td>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    <Link href={`/admin/applications/${app.id}`} style={{ color: 'var(--color-neutral-900)', textDecoration: 'none' }}>
                      {app.business_name}
                    </Link>
                  </td>
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
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                    {userRole === 'admin' && (
                      <button 
                         onClick={() => handleDelete(app.id)}
                         style={{ 
                           background: 'none', 
                           border: 'none', 
                           color: 'var(--color-error)', 
                           cursor: 'pointer', 
                           fontSize: '14px', 
                           padding: '4px',
                           borderRadius: '4px'
                         }}
                         title="Delete Application"
                      >
                         🗑️
                      </button>
                    )}
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
