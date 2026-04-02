'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Clock,
  Briefcase,
  Settings,
  CreditCard,
  Phone,
  HelpCircle,
  AlertCircle,
  Wallet,
  ArrowUpRight
} from 'lucide-react'
import { getAffiliateStats, applyToBeAffiliate, updatePayoutInfo } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'
import styles from '../overview.module.css'
import Skeleton from '@/components/ui/Skeleton'

export default function AffiliateDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [isApplying, setIsApplying] = useState(false)
  
  // Payout section state
  const [isEditingPayout, setIsEditingPayout] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState('momo')
  const [payoutAddress, setPayoutAddress] = useState('')
  const [payoutLoading, setPayoutLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)
      if (prof) {
        setPayoutMethod(prof.payout_method || 'momo')
        setPayoutAddress(prof.payout_address || '')
      }
    }

    const res = await getAffiliateStats()
    setStats(res)
    setLoading(false)
  }

  const handleApply = async () => {
    setIsApplying(true)
    const res = await applyToBeAffiliate()
    if (res.error) {
      alert(res.error)
    } else {
      await loadData()
    }
    setIsApplying(false)
  }

  const handleSavePayout = async () => {
    if (!payoutAddress) return
    setPayoutLoading(true)
    const res = await updatePayoutInfo(payoutMethod, payoutAddress)
    if (res.error) {
       alert(res.error)
    } else {
       await loadData()
       setIsEditingPayout(false)
    }
    setPayoutLoading(false)
  }

  const referralLink = profile?.affiliate_code 
    ? typeof window !== 'undefined' ? `${window.location.origin}/dashboard/applications/new?ref=${profile.affiliate_code}` : ''
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  if (loading) {
    return (
      <div className={styles.overview}>
        <div className={styles.sectionHeader}><Skeleton width="220px" height="32px" /></div>
        <div className={styles.statsGrid}>
          {[1, 2, 3].map(i => <Skeleton key={i} height="120px" style={{ borderRadius: '16px' }} />)}
        </div>
      </div>
    )
  }

  if (!profile?.is_affiliate) {
    return (
      <div className={styles.overview}>
        <div className={styles.emptyState} style={{ padding: '80px var(--space-8)', background: 'var(--color-neutral-0)', borderStyle: 'solid' }}>
          <div className={styles.statIcon} style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)', width: '80px', height: '80px', margin: '0 auto 24px' }}>
             <TrendingUp size={40} />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-neutral-900)', marginBottom: '16px' }}>Become a GrayDocket Partner</h2>
          <p style={{ color: 'var(--color-neutral-500)', maxWidth: 540, margin: '0 auto 40px', fontSize: '16px', lineHeight: 1.6 }}>
            Earn revenue by referring businesses to register their companies. Get <strong style={{ color: 'var(--color-neutral-900)' }}>20% commission</strong> on all service fees for every successful incorporation.
          </p>
          <button 
            onClick={handleApply}
            disabled={isApplying}
            className="btn btn-primary btn-lg" 
            style={{ padding: '16px 48px' }}
          >
            {isApplying ? 'Activating account...' : 'Apply for Partner Program'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overview}>
      <header className={styles.headerSection}>
        <h1 className={styles.sectionTitle}>Partner Program</h1>
        <p className={styles.healthDetail}>Manage your referrals, track commissions, and configure payouts.</p>
      </header>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.info}`}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.referralCount}</h3>
            <p>Total Referrals</p>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.accent}`}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>GH₵ {stats.pendingEarnings.toLocaleString()}</h3>
            <p>Pending Payout</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.success}`}>
            <Wallet size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>GH₵ {stats.totalEarned.toLocaleString()}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Left Col: Tools and Activity */}
        <div className={styles.leftCol}>
          
          {/* Referral Tool */}
          <section className={styles.healthScoreCard}>
            <div className={styles.healthHeader}>
               <h3>Referral Link</h3>
               <div className={styles.liveBadge}><div className={styles.pulseDot} /> Active & Tracking</div>
            </div>
            
            <p className={styles.healthDetail}>Share this personalized link with clients. Our system will automatically track their registration and credit your account upon completion.</p>
            
            <div style={{ display: 'flex', gap: 'var(--space-3)', background: 'var(--color-neutral-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-neutral-200)', marginTop: 'var(--space-2)' }}>
              <code style={{ flex: 1, fontSize: '13px', color: 'var(--color-neutral-700)', overflow: 'hidden', textOverflow: 'ellipsis', alignSelf: 'center' }}>{referralLink}</code>
              <button 
                onClick={copyLink}
                className="btn btn-primary btn-sm"
                style={{ borderRadius: 'var(--radius-md)', display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }}
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
               <div className={styles.insightCard}>
                  <div className={styles.insightType}>Partner Code</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-neutral-900)' }}>{profile.affiliate_code}</div>
               </div>
               <div className={styles.insightCard}>
                  <div className={styles.insightType}>Share Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-neutral-900)' }}>20%</div>
               </div>
            </div>
          </section>

          {/* Activity section */}
          <section className={styles.applicationsTable}>
            <div style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-neutral-900)' }}>Recent Conversions</h3>
               <button className="btn btn-ghost btn-xs">View all commissions</button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client Date</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.commissions.length > 0 ? (
                  stats.commissions.slice(0, 5).map((c: any) => (
                    <tr key={c.id}>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>GH₵ {Number(c.amount).toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${c.status === 'paid' ? 'success' : 'warning'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className={styles.emptyState} style={{ border: 'none', background: 'transparent' }}>
                       <p>No commissions tracked yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>

        {/* Right Col: Settings and Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Payout Card */}
          <section className={styles.timelineSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
               <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-neutral-900)' }}>Payout Configuration</h3>
               {!isEditingPayout && (
                 <button className="btn btn-link btn-xs" onClick={() => setIsEditingPayout(true)}>Change</button>
               )}
            </div>

            {isEditingPayout ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                 <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-input" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
                       <option value="momo">MTN/AirtelTigo Mobile Money</option>
                       <option value="bank">Local Bank Account</option>
                    </select>
                 </div>
                 <div className="form-group">
                    <label className="form-label">Account details</label>
                    <input className="form-input" placeholder="024XXXXXXXX" value={payoutAddress} onChange={(e) => setPayoutAddress(e.target.value)} />
                 </div>
                 <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleSavePayout} disabled={payoutLoading}>
                       {payoutLoading ? 'Saving...' : 'Update Settings'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingPayout(false)}>Cancel</button>
                 </div>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-5)', background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-neutral-200)' }}>
                 {profile.payout_address ? (
                   <>
                     <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase', marginBottom: '8px' }}>Receiving Account</div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '50%', border: '1px solid var(--color-neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <CreditCard size={20} color="var(--color-primary-600)" />
                        </div>
                        <div>
                           <div style={{ fontWeight: 600, fontSize: '14px' }}>{payoutMethod === 'momo' ? 'Mobile Money' : 'Bank Transfer'}</div>
                           <div style={{ color: 'var(--color-neutral-500)', fontSize: '13px' }}>{payoutAddress}</div>
                        </div>
                     </div>
                   </>
                 ) : (
                   <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                      <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-4)' }}>Configure where you'd like to receive your commissions.</p>
                      <button className="btn btn-primary btn-sm" onClick={() => setIsEditingPayout(true)}>Setup Payouts</button>
                   </div>
                 )}
              </div>
            )}
            
            <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)', display: 'flex', gap: 'var(--space-3)' }}>
               <AlertCircle size={18} color="var(--color-primary-600)" style={{ flexShrink: 0 }} />
               <p style={{ fontSize: '12px', color: 'var(--color-primary-800)', lineHeight: '1.5' }}>
                 Settlements are processed every Friday for balances exceeding <strong style={{ fontWeight: 800 }}>GH₵ 50.00</strong>.
               </p>
            </div>
          </section>

          {/* Marketing Card */}
          <section className={styles.engineMonitorCard} style={{ padding: 'var(--space-6)' }}>
             <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'white' }}>Quick Referral Guide</h3>
             <ul className={styles.timeline} style={{ paddingLeft: 'var(--space-4)', gap: 'var(--space-4)' }}>
                <li className={styles.timelineItem} style={{ border: 'none' }}>
                   <div className={styles.timelinePoint} style={{ top: '4px' }} />
                   <div className={styles.timelineContent}>
                      <h4 style={{ color: 'white' }}>Copy Link</h4>
                      <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Use your unique URL for tracking.</p>
                   </div>
                </li>
                <li className={styles.timelineItem}>
                   <div className={styles.timelinePoint} style={{ top: '4px' }} />
                   <div className={styles.timelineContent}>
                      <h4 style={{ color: 'white' }}>Client Registers</h4>
                      <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Automatic name search & filing.</p>
                   </div>
                </li>
                <li className={styles.timelineItem}>
                   <div className={styles.timelinePoint} style={{ top: '4px' }} />
                   <div className={styles.timelineContent}>
                      <h4 style={{ color: 'white' }}>Get Paid</h4>
                      <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>20% commission on completion.</p>
                   </div>
                </li>
             </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
