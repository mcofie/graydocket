'use client'

import { useState, useEffect } from 'react'
import { Check, CreditCard, ChevronRight, ArrowRight, ShieldCheck, Zap, Star, Loader2 } from 'lucide-react'
import styles from './banking.module.css'
import { getBankingPartners } from '@/lib/actions'

export default function BankingPage() {
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getBankingPartners().then((res) => {
      // Deduplicate by name just in case the DB has clones
      const raw = res.partners || []
      const unique = Array.from(new Map(raw.map(p => [p.name, p])).values())
      setPartners(unique)
      setLoading(false)
    })
  }, [])

  const handleRequest = (bankId: string) => {
    setSelectedBank(bankId)
    setSubmitted(true)
  }

  const getPartnerLabel = (name: string) => {
    if (name.includes('Zenith')) return 'Preferred'
    if (name.includes('Ecobank')) return 'Regional Giant'
    if (name.includes('GCB') || name.includes('Ghana Commercial')) return 'Institutional'
    return 'Partner'
  }

  const getIcon = (index: number) => {
    const icons = [<ShieldCheck key="s" size={16} />, <Zap key="z" size={16} />, <Star key="st" size={16} />]
    return icons[index % icons.length]
  }

  const defaultPerks = "Dedicated Relationship Manager, Instant Portal Access, Business Credit Line"

  if (loading) {
    return (
      <div className={styles.bankingPage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--color-primary-500)" />
      </div>
    )
  }

  return (
    <div className={styles.bankingPage}>
      <header className={styles.header}>
        <h1>Business Banking Partners</h1>
        <p>
          Skip the paperwork. We've partnered with Ghana's leading financial institutions to fast-track your corporate account opening. 
          Choose a partner to begin your application using your registered company details.
        </p>
      </header>

      <div className={styles.gallery}>
        {partners.filter(p => p.is_active).map((bank, index) => (
          <div key={bank.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.logo}>{bank.logo_url || '🏦'}</div>
              <span className={styles.badge}>{getPartnerLabel(bank.name)}</span>
            </div>
            
            <h3 className={styles.name}>{bank.name}</h3>
            <p className={styles.description}>
              {bank.description || `Unlock seamless corporate financial services with ${bank.name}. Fully integrated with GrayDocket for instant document verification.`}
            </p>

            <div className={styles.perksList}>
              {(bank.requirements?.perks || defaultPerks).split(',').map((perk: string, i: number) => (
                <div key={i} className={styles.perkItem}>
                  <span className={styles.perkIcon}>{getIcon(i)}</span>
                  <span>{perk.trim()}</span>
                </div>
              ))}
            </div>

            <div className={styles.footer}>
              <div className={styles.minBalance}>
                <span className={styles.minLabel}>Min. Starting Balance</span>
                <span className={styles.minValue}>GH₵ {(bank.requirements?.min_balance || 0).toLocaleString()}</span>
              </div>

              <button className={styles.actionBtn} onClick={() => handleRequest(bank.id)}>
                Apply Now <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {submitted && (
        <div className={styles.successOverlay}>
          <div className={styles.successContent}>
            <div className={styles.successIcon}>🎉</div>
            <h2>Request Transmitted</h2>
            <p>
              Your interest in opening a corporate account with <strong>{partners.find(b => b.id === selectedBank)?.name}</strong> has been shared with their institutional team. 
              Once your business registration is finalized, our banking partners will reach out to complete your onboarding.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setSubmitted(false)}
              >
                Go to Overview
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => window.location.href = '/dashboard/applications'}
              >
                Track Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
