'use client'

import { useState, useEffect } from 'react'
import { getAdminPayments } from '@/lib/actions'
import Link from 'next/link'
import { DollarSign, TrendingUp, CreditCard, Activity } from 'lucide-react'
import styles from '../../dashboard/overview.module.css'

export default function AdminRevenueDashboard() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    const res = await getAdminPayments()
    setPayments(res.payments)
    setLoading(false)
  }

  // --- Calculations ---
  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0)
  const totalTransactions = payments.length
  const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

  // Quick 30-day calculation
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentPayments = payments.filter(p => new Date(p.updated_at) >= thirtyDaysAgo)
  const recentRevenue = recentPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0)

  if (loading) {
    return <div className={styles.overview}>Loading financial data...</div>
  }

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Revenue Dashboard</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>
          Real-time financial metrics and transaction ledger.
        </p>
      </div>

      {/* --- Stat Cards --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        
        <div style={{ background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', color: 'white', padding: 'var(--space-6)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}><DollarSign size={20} color="#fff" /></div>
          </div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', fontWeight: 600 }}>Total Earned</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '4px' }}>GH₵ {totalRevenue.toLocaleString()}</div>
        </div>

        <div style={{ background: 'white', padding: 'var(--space-6)', borderRadius: '16px', border: '1px solid var(--color-neutral-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'var(--color-success-background)', borderRadius: '8px' }}><TrendingUp size={20} color="var(--color-success)" /></div>
          </div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)', fontWeight: 600 }}>Past 30 Days</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: 'var(--color-neutral-900)' }}>GH₵ {recentRevenue.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '8px', fontWeight: 500 }}>Active Cashflow</div>
        </div>

        <div style={{ background: 'white', padding: 'var(--space-6)', borderRadius: '16px', border: '1px solid var(--color-neutral-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'var(--color-primary-100)', borderRadius: '8px' }}><CreditCard size={20} color="var(--color-primary-600)" /></div>
          </div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)', fontWeight: 600 }}>Transactions</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: 'var(--color-neutral-900)' }}>{totalTransactions}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-neutral-400)', marginTop: '8px', fontWeight: 500 }}>Total Successful Checkouts</div>
        </div>

        <div style={{ background: 'white', padding: 'var(--space-6)', borderRadius: '16px', border: '1px solid var(--color-neutral-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'var(--color-neutral-100)', borderRadius: '8px' }}><Activity size={20} color="var(--color-neutral-700)" /></div>
          </div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)', fontWeight: 600 }}>Avg. Ticket Size</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: 'var(--color-neutral-900)' }}>GH₵ {Math.round(averageTicket).toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-neutral-400)', marginTop: '8px', fontWeight: 500 }}>Per Registration</div>
        </div>

      </div>

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--color-neutral-200)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Transaction Ledger</h3>
          <span style={{ fontSize: '12px', color: 'var(--color-neutral-500)', background: 'var(--color-neutral-100)', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
            {totalTransactions} Records
          </span>
        </div>
        
        {payments.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: 'var(--space-12)' }}>
            <div className={styles.emptyIcon}>💰</div>
            <h3>No revenue settled yet</h3>
            <p>Successful checkout sessions will populate here.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--color-neutral-50)' }}>
              <tr>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)' }}>Timestamp</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)' }}>Link</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)' }}>Customer / Project</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-500)' }}>Settle Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--color-neutral-100)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--color-neutral-500)' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-neutral-900)' }}>{new Date(p.updated_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>{new Date(p.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                    <Link href={`/admin/applications/${p.id}`} style={{ color: 'var(--color-primary-600)', textDecoration: 'none', background: 'var(--color-primary-50)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      {p.tracking_id}
                    </Link>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-neutral-900)' }}>{p.business_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '2px' }}>{p.profiles?.full_name || 'Anonymous'} - {p.profiles?.email}</div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-success)' }}>
                      + GH₵ {p.total_amount?.toLocaleString() || '0.00'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-neutral-400)', marginTop: '2px', fontWeight: 500 }}>
                      Paid
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
