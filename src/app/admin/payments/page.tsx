'use client'

import { useState, useEffect } from 'react'
import { getAdminPayments } from '@/lib/actions'
import Link from 'next/link'
import { DollarSign, TrendingUp, CreditCard, Activity, RefreshCw, AlertCircle, Filter } from 'lucide-react'
import styles from '../../dashboard/overview.module.css'

export default function AdminRevenueDashboard() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'paid' | 'all'>('paid')

  useEffect(() => {
    fetchPayments()
  }, [statusFilter])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getAdminPayments(statusFilter === 'all' ? undefined : 'paid')
      if (res.error) {
        setError(res.error)
      } else {
        setPayments(res.payments || [])
      }
    } catch (err: any) {
      setError(err.message || 'Synchronization failure in financial layer.')
    } finally {
      setLoading(false)
    }
  }

  // --- Calculations ---
  const paidPayments = payments.filter(p => p.payment_status === 'paid')
  const totalRevenue = paidPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0)
  const totalTransactions = paidPayments.length
  const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

  // Quick 30-day calculation
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentPayments = paidPayments.filter(p => new Date(p.updated_at) >= thirtyDaysAgo)
  const recentRevenue = recentPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0)

  if (loading && payments.length === 0) {
    return (
      <div className={styles.overview} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <RefreshCw className="animate-spin" size={32} color="var(--color-primary-500)" />
        <p style={{ marginTop: '16px', color: 'var(--color-neutral-500)', fontWeight: 600 }}>Syncing ledger...</p>
      </div>
    )
  }

  return (
    <div className={styles.overview}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
        <div>
          <h2 className={styles.sectionTitle}>Financial Oversight</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>
            Audited revenue metrics and real-time transaction reconciliation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'var(--color-neutral-100)', padding: '4px', borderRadius: '10px', border: '1px solid var(--color-neutral-200)' }}>
            <button 
              onClick={() => setStatusFilter('paid')}
              style={{ 
                padding: '6px 16px', 
                borderRadius: '8px', 
                fontSize: '12px', 
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: statusFilter === 'paid' ? 'white' : 'transparent',
                color: statusFilter === 'paid' ? 'var(--color-neutral-900)' : 'var(--color-neutral-500)',
                boxShadow: statusFilter === 'paid' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Settled Only
            </button>
            <button 
              onClick={() => setStatusFilter('all')}
              style={{ 
                padding: '6px 16px', 
                borderRadius: '8px', 
                fontSize: '12px', 
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: statusFilter === 'all' ? 'white' : 'transparent',
                color: statusFilter === 'all' ? 'var(--color-neutral-900)' : 'var(--color-neutral-500)',
                boxShadow: statusFilter === 'all' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              All Activities
            </button>
          </div>
          <button onClick={() => fetchPayments()} className="btn btn-secondary" style={{ width: '40px', padding: 0 }}>
             <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: 'var(--color-error-light)', 
          border: '1px solid var(--color-error)', 
          borderRadius: '12px', 
          padding: '16px', 
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          color: 'var(--color-error-dark)'
        }}>
          <AlertCircle size={20} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{error}</div>
        </div>
      )}

      {/* --- Stat Cards --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        <div style={{ background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', color: 'white', padding: 'var(--space-6)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}><DollarSign size={20} color="#fff" /></div>
          </div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', fontWeight: 600 }}>Total Revenue</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '4px' }}>GH₵ {totalRevenue.toLocaleString()}</div>
        </div>

        <div style={{ background: 'white', padding: 'var(--space-6)', borderRadius: '16px', border: '1px solid var(--color-neutral-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '8px' }}><TrendingUp size={20} color="#059669" /></div>
          </div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)', fontWeight: 600 }}>Past 30 Days</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: 'var(--color-neutral-900)' }}>GH₵ {recentRevenue.toLocaleString()}</div>
        </div>

        <div style={{ background: 'white', padding: 'var(--space-6)', borderRadius: '16px', border: '1px solid var(--color-neutral-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'var(--color-primary-50)', borderRadius: '8px' }}><CreditCard size={20} color="var(--color-primary-600)" /></div>
          </div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)', fontWeight: 600 }}>Settled Transactions</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: 'var(--color-neutral-900)' }}>{totalTransactions}</div>
        </div>

        <div style={{ background: 'white', padding: 'var(--space-6)', borderRadius: '16px', border: '1px solid var(--color-neutral-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'var(--color-neutral-100)', borderRadius: '8px' }}><Activity size={20} color="var(--color-neutral-700)" /></div>
          </div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)', fontWeight: 600 }}>Avg. Transaction</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: 'var(--color-neutral-900)' }}>GH₵ {Math.round(averageTicket).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--color-neutral-200)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Filter size={18} style={{ color: 'var(--color-neutral-400)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-neutral-900)' }}>Transaction Ledger</h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-neutral-500)', background: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 750, border: '1px solid var(--color-neutral-200)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            {payments.length} Entities Found
          </span>
        </div>
        
        {payments.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: 'var(--color-neutral-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <DollarSign size={32} style={{ color: 'var(--color-neutral-300)' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-neutral-900)' }}>No records detected</h3>
            <p style={{ color: 'var(--color-neutral-500)', marginTop: '8px', fontSize: '14px' }}>
              Financial activities matching your current filters will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-neutral-400)', borderBottom: '1px solid var(--color-neutral-100)' }}>Timestamp</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-neutral-400)', borderBottom: '1px solid var(--color-neutral-100)' }}>Business Entity</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-neutral-400)', borderBottom: '1px solid var(--color-neutral-100)' }}>Status</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-neutral-400)', borderBottom: '1px solid var(--color-neutral-100)' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const isPaid = p.payment_status === 'paid'
                  return (
                    <tr key={p.id} style={{ transition: 'all 0.2s', borderBottom: '1px solid var(--color-neutral-50)' }} className="hover-row">
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-neutral-900)' }}>{new Date(p.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-neutral-400)', marginTop: '2px' }}>{new Date(p.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <Link href={`/admin/applications/${p.id}`} style={{ fontSize: '14px', fontWeight: 750, color: 'var(--color-neutral-900)', textDecoration: 'none' }} className="hover-primary">
                          {p.business_name || 'Unnamed Project'}
                        </Link>
                        <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'var(--color-neutral-100)', padding: '2px 6px', borderRadius: '4px' }}>{p.tracking_id}</span>
                          • {p.profiles?.full_name || 'Anonymous'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '10px', 
                          fontWeight: 800, 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background: isPaid ? '#ecfdf5' : '#fff7ed',
                          color: isPaid ? '#059669' : '#c2410c',
                          border: `1px solid ${isPaid ? '#d1fae5' : '#ffedd5'}`
                        }}>
                          {p.payment_status || 'Pending'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: isPaid ? 'var(--color-neutral-900)' : 'var(--color-neutral-400)' }}>
                          GH₵ {(Number(p.total_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        {p.form_data?.paystack_reference && (
                          <div style={{ fontSize: '9px', color: 'var(--color-neutral-400)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                            REF: {p.form_data.paystack_reference}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style jsx global>{`
        .hover-row:hover {
          background-color: #fbfbfb;
        }
        .hover-primary:hover {
          color: var(--color-primary-600) !important;
          text-decoration: underline !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
