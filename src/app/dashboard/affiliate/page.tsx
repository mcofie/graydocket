'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  Check,
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
      <div className={styles.overview} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 'var(--space-8)' }}>
        <div style={{ maxWidth: '640px', width: '100%', textAlign: 'center' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-700) 100%)', 
            color: 'white', 
            width: '100px', 
            height: '100px', 
            borderRadius: '24px', 
            margin: '0 auto 32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(var(--color-primary-rgb), 0.2)'
          }}>
            <TrendingUp size={48} />
          </div>
          
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-neutral-900)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            The Partner Program
          </h1>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '18px', lineHeight: '1.6', marginBottom: '48px' }}>
            Scale your earnings by helping founders launch their companies. Join an exclusive ecosystem of institutional partners.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', textAlign: 'left', marginBottom: '48px' }}>
             <div style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--color-neutral-200)', background: 'white' }}>
                <div style={{ color: 'var(--color-primary-600)', marginBottom: '12px' }}><DollarSign size={24} /></div>
                <h4 style={{ fontWeight: 800, marginBottom: '8px' }}>20% Yield</h4>
                <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', margin: 0 }}>Earn high-margin commissions on all GrayDocket service fees.</p>
             </div>
             <div style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--color-neutral-200)', background: 'white' }}>
                <div style={{ color: 'var(--color-primary-600)', marginBottom: '12px' }}><Clock size={24} /></div>
                <h4 style={{ fontWeight: 800, marginBottom: '8px' }}>30-Day Persistence</h4>
                <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', margin: 0 }}>Our tracking infrastructure ensures attribution for a full month.</p>
             </div>
             <div style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--color-neutral-200)', background: 'white' }}>
                <div style={{ color: 'var(--color-primary-600)', marginBottom: '12px' }}><Wallet size={24} /></div>
                <h4 style={{ fontWeight: 800, marginBottom: '8px' }}>Weekly Payouts</h4>
                <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', margin: 0 }}>Liquidate your earnings every Friday directly to MoMo or Bank.</p>
             </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            <button 
              className="btn btn-primary btn-lg" 
              style={{ padding: '16px 40px', borderRadius: '16px', fontWeight: 800, fontSize: '16px' }}
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? 'Processing Enrollment...' : 'Enroll as Partner'}
            </button>
            <a href="/dashboard" className="btn btn-ghost btn-lg" style={{ padding: '16px 40px' }}>
              Back to Dashboard
            </a>
          </div>

          <p style={{ marginTop: '40px', fontSize: '12px', color: 'var(--color-neutral-400)' }}>
            By enrolling, you agree to the GrayDocket Partner Terms & Conditions.
          </p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Referral Tool */}
          <section className="card" style={{ padding: 'var(--space-8)', background: 'white', borderRadius: '24px', border: '1px solid var(--color-neutral-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
               <h3 style={{ fontSize: '18px', fontWeight: 750, color: 'var(--color-neutral-900)' }}>Elite Referral Tool</h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: '20px' }}>
                 <div style={{ width: '6px', height: '6px', background: '#059669', borderRadius: '50%' }} /> Active Tracking
               </div>
            </div>
            
            <p style={{ color: 'var(--color-neutral-500)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Redirect clients to GrayDocket using your institutional link. Our tracking infrastructure maintains referral persistence for <strong style={{ fontWeight: 700 }}>30 days</strong>.
            </p>
            
            <div style={{ position: 'relative' }}>
              <div style={{ 
                background: 'var(--color-neutral-50)', 
                padding: '16px 20px', 
                borderRadius: '16px', 
                border: '1px solid var(--color-neutral-200)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <ExternalLink size={18} color="var(--color-neutral-400)" />
                <code style={{ flex: 1, fontSize: '13px', color: 'var(--color-neutral-700)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{referralLink}</code>
                <button 
                  onClick={copyLink}
                  style={{ 
                    padding: '8px 20px', 
                    borderRadius: '10px', 
                    fontSize: '12px', 
                    fontWeight: 800,
                    background: copied ? 'var(--color-success)' : 'var(--color-neutral-900)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </section>

          {/* Activity section */}
          <section style={{ background: 'white', borderRadius: '24px', border: '1px solid var(--color-neutral-200)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-neutral-900)' }}>Commission Ledger</h3>
               <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--color-neutral-100)', padding: '4px 12px', borderRadius: '20px' }}>Total {stats.commissions.length} Conversions</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)' }}>Entity / Project</th>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)' }}>Earnings</th>
                    <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.commissions.length > 0 ? (
                    stats.commissions.map((c: any) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-neutral-900)' }}>{c.applications?.business_name || 'Anonymous User'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{c.applications?.tracking_id || 'REFR-' + c.id.split('-')[0].toUpperCase()}</div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--color-neutral-900)' }}>GH₵ {Number(c.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-neutral-400)', marginTop: '2px' }}>{new Date(c.created_at).toLocaleDateString()}</div>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: 800, 
                            textTransform: 'uppercase', 
                            padding: '4px 10px', 
                            borderRadius: '20px',
                            background: c.status === 'paid' ? '#ecfdf5' : '#fff7ed',
                            color: c.status === 'paid' ? '#059669' : '#c2410c'
                          }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ padding: '60px 24px', textAlign: 'center' }}>
                         <div style={{ color: 'var(--color-neutral-300)', marginBottom: '12px' }}><Users size={32} /></div>
                         <p style={{ color: 'var(--color-neutral-500)', fontSize: '14px' }}>No commissions have been recorded yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Col: Settings and Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Payout Card */}
          <section style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid var(--color-neutral-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Transfer Logic</h3>
               {!isEditingPayout && (
                 <button style={{ color: 'var(--color-primary-600)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }} onClick={() => setIsEditingPayout(true)}>Modify</button>
               )}
            </div>

            {isEditingPayout ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-neutral-500)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Payment Channel</label>
                    <select className="form-input" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} style={{ borderRadius: '12px' }}>
                       <option value="momo">Mobile Money (GHS)</option>
                       <option value="bank">Local Bank Transfer</option>
                    </select>
                 </div>
                 <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-neutral-500)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Destination Identifier</label>
                    <input className="form-input" placeholder="024XXXXXXXX or Account No." value={payoutAddress} onChange={(e) => setPayoutAddress(e.target.value)} style={{ borderRadius: '12px' }} />
                 </div>
                 <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, borderRadius: '10px' }} onClick={handleSavePayout} disabled={payoutLoading}>
                       {payoutLoading ? 'Syncing...' : 'Save Protocol'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingPayout(false)} style={{ borderRadius: '10px' }}>Cancel</button>
                 </div>
              </div>
            ) : (
              <div style={{ padding: '20px', background: '#fafafa', borderRadius: '16px', border: '1px solid var(--color-neutral-100)' }}>
                 {profile.payout_address ? (
                   <>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <CreditCard size={22} color="var(--color-primary-600)" />
                        </div>
                        <div>
                           <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-neutral-900)' }}>{payoutMethod === 'momo' ? 'Mobile Money' : 'Bank Transfer'}</div>
                           <div style={{ color: 'var(--color-neutral-500)', fontSize: '13px', marginTop: '2px' }}>{payoutAddress}</div>
                        </div>
                     </div>
                   </>
                 ) : (
                   <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', marginBottom: '16px' }}>Define your institutional payout destination to enable auto-settlements.</p>
                      <button className="btn btn-primary btn-sm" style={{ borderRadius: '10px' }} onClick={() => setIsEditingPayout(true)}>Init Configuration</button>
                   </div>
                 )}
              </div>
            )}
            
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)', display: 'flex', gap: '12px' }}>
               <AlertCircle size={18} color="var(--color-primary-600)" style={{ flexShrink: 0 }} />
               <p style={{ fontSize: '12px', color: 'var(--color-primary-900)', lineHeight: '1.6', margin: 0 }}>
                 Settlement operations occur every <strong style={{ fontWeight: 800 }}>Friday</strong> for balances above <strong style={{ fontWeight: 800 }}>GH₵ 50.00</strong>.
               </p>
            </div>
          </section>

          {/* Guide Card */}
          <section style={{ background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', color: 'white', borderRadius: '24px', padding: '24px' }}>
             <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>Protocol Guidelines</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                   <div style={{ width: '8px', height: '8px', background: 'var(--color-primary-400)', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }} />
                   <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Client Activation</h4>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>Link usage ensures multi-touch attribution for all registrations.</p>
                   </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                   <div style={{ width: '8px', height: '8px', background: 'var(--color-primary-400)', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }} />
                   <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Commission Yield</h4>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>Earn a 20% institutional share on all GrayDocket service fees.</p>
                   </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                   <div style={{ width: '8px', height: '8px', background: 'var(--color-primary-400)', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }} />
                   <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Verified Liquidity</h4>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>Commissions transition to settled state upon ORC filing approval.</p>
                   </div>
                </div>
             </div>
          </section>
        </div>
      </div>
    </div>
  )
}
