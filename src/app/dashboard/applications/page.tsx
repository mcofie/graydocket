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
          <h2>Registry Directory</h2>
          <p className={styles.subtitle}>Manage and track your institutional assets</p>
        </div>
        <Link href="/dashboard/applications/new" className="btn btn-primary" style={{ height: '44px', padding: '0 var(--space-6)' }}>
          <PlusCircle size={18} />
          New Registration
        </Link>
      </div>

      <div className={styles.searchContainer}>
         <Search size={18} className={styles.searchIcon} />
         <input 
           type="text" 
           placeholder="Search by business name or tracking ID..." 
           className={styles.searchInput}
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
      </div>

      <div className={styles.cardGrid}>
        {filteredApplications.map((app) => {
          const colors = statusColors[app.status] || statusColors.draft
          return (
            <div 
              key={app.id} 
              className={styles.entityCard}
              onClick={() => window.location.href = `/dashboard/applications/${app.id}`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.iconBox}>
                   <FileText size={24} />
                </div>
                <span
                  className={styles.statusBadge}
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {app.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <div className={styles.businessType}>{app.business_types?.name || 'Standard Registration'}</div>
                <h3 className={styles.businessName}>{app.business_name}</h3>
              </div>

              <div className={styles.cardMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Tracking ID</span>
                  <span className={styles.metaValue} style={{ fontFamily: 'var(--font-mono)' }}>{app.tracking_id}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Registry Date</span>
                  <span className={styles.metaValue}>{new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Fee Structure</span>
                  <span className={styles.metaValue}>GH₵ {app.total_amount?.toLocaleString()}</span>
                </div>
              </div>

              <div className={styles.cardAction}>
                <div className={styles.viewStatus}>
                   View Portfolio <ChevronRight size={14} />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Secure Dossier
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
