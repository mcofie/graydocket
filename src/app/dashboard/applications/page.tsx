'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusCircle, Search, Eye, ChevronRight, FileText } from 'lucide-react'
import { getMyApplications } from '@/lib/actions'
import styles from './applications.module.css'

interface Application {
  id: string
  tracking_id: string
  business_name: string
  status: string
  payment_status: string
  total_amount: number
  created_at: string
  business_types: { name: string } | null
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  submitted: { bg: '#eff6ff', text: '#2563eb' },
  name_search: { bg: '#fffbeb', text: '#d97706' },
  under_review: { bg: '#fffbeb', text: '#d97706' },
  approved: { bg: '#ecfdf5', text: '#059669' },
  rejected: { bg: '#fef2f2', text: '#dc2626' },
  completed: { bg: '#ecfdf5', text: '#059669' },
  cancelled: { bg: '#f9fafb', text: '#9ca3af' },
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getMyApplications().then((result) => {
      setApplications(result.applications as Application[])
      setError(result.error)
      setLoading(false)
    })
  }, [])

  const filteredApplications = applications.filter(app => 
    app.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.tracking_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2>Registry Directory</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '40px 0' }}>
           {[1,2,3].map(i => (
             <div key={i} style={{ height: '72px', background: 'var(--color-neutral-50)', borderRadius: '12px', animation: 'pulse 2s infinite' }} />
           ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2>Registry Directory</h2>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '48px', border: '1px solid var(--color-error-light)' }}>
          <p style={{ color: 'var(--color-error)', fontWeight: 600 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2>Registry Directory</h2>
          <Link href="/dashboard/applications/new" className="btn btn-primary btn-sm">
            <PlusCircle size={16} />
            New Registration
          </Link>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>No applications found</h3>
          <p>
            You haven&apos;t submitted any business registration applications to the GrayDocket registry.
          </p>
          <Link href="/dashboard/applications/new" className="btn btn-primary">
            <PlusCircle size={16} />
            Start Registration
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Registry Directory</h2>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '14px', marginTop: '4px' }}>Manage and track your institutional assets</p>
        </div>
        <Link href="/dashboard/applications/new" className="btn btn-primary" style={{ padding: '0 24px', height: '44px' }}>
          <PlusCircle size={18} />
          New Registration
        </Link>
      </div>

      <div style={{ marginBottom: '24px', position: 'relative' }}>
         <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
         <input 
           type="text" 
           placeholder="Search by business name or tracking ID..." 
           className="form-input"
           style={{ paddingLeft: '48px', height: '48px', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', background: 'white' }}
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Business Entity</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Registry Date</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map((app) => {
              const colors = statusColors[app.status] || statusColors.draft
              return (
                <tr key={app.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/dashboard/applications/${app.id}`}>
                  <td>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      color: 'var(--color-neutral-400)',
                      letterSpacing: '0.05em'
                    }}>{app.tracking_id}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-neutral-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={18} color="var(--color-neutral-400)" />
                       </div>
                       <div>
                          <div style={{ fontWeight: 800, color: 'var(--color-neutral-900)' }}>{app.business_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-neutral-400)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '2px' }}>{app.business_types?.name || 'Standard'}</div>
                       </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{ background: colors.bg, color: colors.text, fontWeight: 800, fontSize: '10px' }}
                    >
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>GH₵ {app.total_amount?.toLocaleString() || '0'}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px', color: 'var(--color-neutral-600)' }}>{new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                     <Link href={`/dashboard/applications/${app.id}`} className="btn" style={{ background: 'var(--color-neutral-900)', color: 'white', border: 'none', fontSize: '11px', fontWeight: 700, padding: '0 16px', height: '32px', gap: '8px' }}>
                        <Eye size={14} /> View Dossier
                     </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
