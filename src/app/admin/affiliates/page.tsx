'use client'

import { useState, useEffect } from 'react'
import { getAdminAffiliates, updateAffiliateCommissionStatus } from '@/lib/actions'
import styles from '../../dashboard/overview.module.css'

type CommissionRow = {
  id: string
  amount: number | string
  status: 'pending' | 'approved' | 'paid' | 'void'
  created_at: string
}

type AffiliateRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  affiliate_code: string | null
  payout_method: string | null
  payout_address: string | null
  referral_count: number
  commissions: CommissionRow[]
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function fetchAffiliates() {
    const res = await getAdminAffiliates()
    setAffiliates((res.affiliates || []) as AffiliateRow[])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAffiliates()
  }, [])

  const handleStatusUpdate = async (
    affiliateId: string,
    fromStatus: 'pending' | 'approved',
    toStatus: 'approved' | 'paid'
  ) => {
    setUpdatingId(`${affiliateId}:${fromStatus}:${toStatus}`)
    const res = await updateAffiliateCommissionStatus(affiliateId, fromStatus, toStatus)
    if (res.error) {
      alert(res.error)
    } else {
      await fetchAffiliates()
    }
    setUpdatingId(null)
  }

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
                const totalReferrals = a.referral_count || 0
                const pendingAmount = commissions
                  .filter((c) => c.status === 'pending')
                  .reduce((sum, c) => sum + Number(c.amount), 0)
                const approvedAmount = commissions
                  .filter((c) => c.status === 'approved')
                  .reduce((sum, c) => sum + Number(c.amount), 0)
                const paidAmount = commissions
                  .filter((c) => c.status === 'paid')
                  .reduce((sum, c) => sum + Number(c.amount), 0)

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
                      <div>GH₵ {pendingAmount.toLocaleString()}</div>
                      <div style={{ fontSize: '10px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>
                        Approved: GH₵ {approvedAmount.toLocaleString()} | Paid: GH₵ {paidAmount.toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStatusUpdate(a.id, 'pending', 'approved')}
                          disabled={pendingAmount <= 0 || updatingId !== null}
                        >
                          {updatingId === `${a.id}:pending:approved` ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStatusUpdate(a.id, 'approved', 'paid')}
                          disabled={approvedAmount <= 0 || updatingId !== null}
                        >
                          {updatingId === `${a.id}:approved:paid` ? 'Paying...' : 'Mark Paid'}
                        </button>
                      </div>
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
