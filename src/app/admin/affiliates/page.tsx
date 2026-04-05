'use client'

import { useState, useEffect } from 'react'
import { getAdminAffiliates } from '@/lib/actions'
import styles from '../../dashboard/overview.module.css'

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAffiliates()
  }, [])

  const fetchAffiliates = async () => {
    const res = await getAdminAffiliates()
    setAffiliates(res.affiliates)
    setLoading(false)
  }

  // To mark commissioned as paid, we would need a new action. 
  // For now, we will just display and allow tracking.

  if (loading) {
    return <div className={styles.overview}>Loading Affiliate Brands...</div>
  }

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Partner & Affiliate Brands</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>
          Manage commissioned partners and track their generated revenue.
        </p>
      </div>

      {affiliates.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🤝</div>
          <h3>No affiliate partners yet</h3>
          <p>Promote users to affiliates via the Users tab.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--color-neutral-50)', borderBottom: '1px solid var(--color-neutral-200)' }}>
              <tr>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>PARTNER</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>REF CODE</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>PAYOUT ROUTING</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>REFERRALS</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>PENDING COMM.</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => {
                const commissions = a.commissions || []
                const totalReferrals = commissions.length
                const pendingAmount = commissions
                  .filter((c: any) => c.status === 'pending')
                  .reduce((sum: number, c: any) => sum + Number(c.amount), 0)

                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                      <div style={{ fontWeight: 600 }}>{a.full_name || 'Anonymous'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--color-neutral-500)' }}>{a.email} • {a.phone}</div>
                    </td>
                    <td style={{ padding: 'var(--space-4)', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary-600)' }}>
                      {a.affiliate_code}
                    </td>
                    <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                      {a.payout_method ? (
                        <>
                          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{a.payout_method}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>{a.payout_address}</div>
                        </>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>Not Configured</span>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      {totalReferrals}
                    </td>
                    <td style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-sm)', fontWeight: 600, color: pendingAmount > 0 ? 'var(--color-primary-600)' : 'var(--color-neutral-400)' }}>
                      GH₵ {pendingAmount.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
