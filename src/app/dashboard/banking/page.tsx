'use client'

import { useState, useEffect } from 'react'
import { Landmark, Building2, CheckCircle2, ChevronRight, X, AlertCircle, FileText, Globe, CreditCard } from 'lucide-react'
import { getBankingPartners } from '@/lib/actions'
import styles from './banking.module.css'
import Skeleton from '@/components/ui/Skeleton'

interface BankFeature {
  text: string
  active?: boolean
}

interface Bank {
  id: string
  name: string
  type: string
  icon: string
  isImageLogo?: boolean
  color: string
  recommended?: boolean
  comingSoon?: boolean
  features: BankFeature[]
  requirements: string[]
}

function embellishBackendBank(dbBank: any): Bank {
  const name = dbBank.name.toLowerCase()
  let color = '#4f46e5'
  let type = 'Corporate Banking Partner'
  let recommended = false
  let features = [
    { text: dbBank.description || 'Verified Business Account', active: true },
    { text: 'Digital Banking Access', active: true },
    { text: 'Dedicated Account Manager', active: true },
    { text: 'Fast-track KYC Processing', active: true }
  ]
  let requirements = [
    'Certificate of Incorporation',
    'Valid IDs of all Directors/Signatories',
    'Proof of Address / Utility Bill'
  ]

  if (name.includes('ecobank')) {
    color = '#005a9c'
    type = 'Pan-African & Cross-Border'
    recommended = true
    features = [
      { text: dbBank.description || 'Multi-currency corporate accounts', active: true },
      { text: 'Open API access for payments', active: true },
      { text: 'Maker-Checker approval workflows', active: true }
    ]
  } else if (name.includes('stanbic')) {
    color = '#0033a1'
    type = 'Institutional & Corporate'
    features = [
      { text: dbBank.description || 'Business Checking Account', active: true },
      { text: 'Corporate Credit Cards', active: true },
      { text: 'Automated payroll management', active: true }
    ]
  } else if (name.includes('fidelity')) {
    color = '#ed8b00'
    type = 'SME & Local Business'
    features = [
      { text: dbBank.description || 'Zero minimum balance required', active: true },
      { text: 'Instant mobile app access', active: true },
      { text: 'Bulk mobile money disbursements', active: true }
    ]
  } else if (name.includes('gtbank') || name.includes('guaranty')) {
    color = '#e24301'
    type = 'Fintech & Digital First'
    features = [
      { text: dbBank.description || 'Instant digital onboarding', active: true },
      { text: 'White-label card issuance', active: true },
      { text: 'Automated FX conversions', active: true }
    ]
  }

  return {
    id: dbBank.id,
    name: dbBank.name,
    type,
    icon: dbBank.logo_url || '🏦',
    isImageLogo: !!dbBank.logo_url,
    color,
    recommended,
    comingSoon: !dbBank.is_active,
    features,
    requirements
  }
}

export default function BankingPage() {
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMode, setSuccessMode] = useState(false)

  useEffect(() => {
    getBankingPartners().then(res => {
      if (res.partners) {
        setBanks(res.partners.map(embellishBackendBank))
      }
      setLoading(false)
    })
  }, [])

  const handleSelect = (bank: Bank) => {
    if (bank.comingSoon) return
    setSelectedBank(bank)
  }

  const handleConfirm = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSuccessMode(true)
    }, 1500)
  }

  const closeDialog = () => {
    setSelectedBank(null)
    setSuccessMode(false)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Partner Banking</h1>
        <p className={styles.subtitle}>
          We have partnered with leading tier-1 institutions to fast-track your corporate account opening. 
          Select a bank to directly transfer your KYC payload and initiate account creation.
        </p>
      </header>

      {loading ? (
        <div className={styles.bankGrid}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.bankCard} style={{ minHeight: '300px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <Skeleton width="48px" height="48px" style={{ borderRadius: '12px' }} />
                <div>
                  <Skeleton width="150px" height="24px" style={{ marginBottom: '8px' }} />
                  <Skeleton width="100px" height="14px" />
                </div>
              </div>
              <Skeleton width="100%" height="16px" style={{ marginBottom: '12px' }} />
              <Skeleton width="100%" height="16px" style={{ marginBottom: '12px' }} />
              <Skeleton width="100%" height="16px" style={{ marginBottom: '24px' }} />
              <div style={{ marginTop: 'auto' }}>
                <Skeleton width="100%" height="40px" style={{ borderRadius: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : banks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', background: 'var(--color-neutral-0)', borderRadius: '16px', border: '1px dashed var(--color-neutral-300)' }}>
          <Building2 size={48} style={{ color: 'var(--color-neutral-300)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-neutral-900)', marginBottom: '8px' }}>No partner banks available</h3>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '14px' }}>We are currently onboarding new banking partners to the platform.</p>
        </div>
      ) : (
        <div className={styles.bankGrid}>
          {banks.map((bank) => (
            <div 
              key={bank.id} 
              className={`${styles.bankCard} ${bank.comingSoon ? styles.comingSoonCard : ''}`}
            >
              {bank.recommended && (
                <span className={styles.recommendedBadge} style={{ color: bank.color, borderColor: `${bank.color}30`, backgroundColor: `${bank.color}10` }}>
                  Highly Recommended
                </span>
              )}
              {bank.comingSoon && (
                <span className={styles.comingSoonBadge}>
                  Integration Pending
                </span>
              )}

              <div className={styles.bankHeader}>
                <div className={styles.bankLogo} style={{ color: bank.color, overflow: 'hidden' }}>
                  {bank.isImageLogo ? (
                    <img src={bank.icon} alt={bank.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    bank.icon
                  )}
                </div>
                <div className={styles.bankInfo}>
                  <h3>{bank.name}</h3>
                  <p>{bank.type}</p>
                </div>
              </div>

              <div className={styles.featuresList}>
                {bank.features.map((feature, idx) => (
                  <div key={idx} className={styles.featureItem}>
                    {feature.active ? (
                      <CheckCircle2 size={16} className={styles.featureIcon} />
                    ) : (
                      <CheckCircle2 size={16} className={styles.featureIconInactive} />
                    )}
                    <span className={feature.active ? '' : styles.featureTextInactive}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.bankAction}>
                {bank.comingSoon ? (
                  <button className="btn btn-secondary" disabled style={{ width: '100%' }}>
                    Coming Soon
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', background: bank.recommended ? bank.color : '', borderColor: bank.recommended ? bank.color : '' }}
                    onClick={() => handleSelect(bank)}
                  >
                    Initiate Setup <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {selectedBank && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialogContent}>
            {!successMode ? (
              <>
                <button className={styles.closeButton} onClick={closeDialog}>
                  <X size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                  <div className={styles.bankLogo} style={{ color: selectedBank.color, fontSize: '32px', width: '64px', height: '64px', overflow: 'hidden' }}>
                    {selectedBank.isImageLogo ? (
                      <img src={selectedBank.icon} alt={selectedBank.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      selectedBank.icon
                    )}
                  </div>
                  <div>
                    <h2 className={styles.dialogTitle}>Open an account with {selectedBank.name}</h2>
                    <p style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>
                      We will securely transfer your verified KYC and incorporation documents.
                    </p>
                  </div>
                </div>

                <div className={styles.requirementList}>
                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-neutral-600)', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                    Standard Requirements
                  </h4>
                  {selectedBank.requirements.map((req, idx) => (
                    <div key={idx} className={styles.reqItem}>
                      <FileText size={16} className={styles.reqIcon} />
                      <span>{req}</span>
                    </div>
                  ))}
                  <div className={styles.reqItem}>
                    <AlertCircle size={16} className={styles.reqIcon} style={{ color: 'var(--color-warning-500)' }} />
                    <span style={{ color: 'var(--color-neutral-600)', fontSize: '13px' }}>
                      Additional mandates may be required depending on your business sector.
                    </span>
                  </div>
                </div>

                <div className={styles.dialogActions}>
                  <button className="btn btn-ghost" onClick={closeDialog} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleConfirm} 
                    disabled={isSubmitting}
                    style={{ background: selectedBank.color, borderColor: selectedBank.color }}
                  >
                    {isSubmitting ? 'Transferring KYC...' : 'Confirm & Proceed'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
                <div style={{ 
                  width: '80px', height: '80px', background: 'var(--color-success-50)', 
                  color: 'var(--color-success-600)', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto var(--space-6)'
                }}>
                  <CheckCircle2 size={40} />
                </div>
                <h2 className={styles.dialogTitle}>Request Sent Successfully!</h2>
                <p className={styles.dialogDesc}>
                  Your KYC payload has been securely transmitted to {selectedBank.name}. 
                  A Corporate Relationship Manager will contact you via email within 24 hours to complete your mandate configuration.
                </p>
                <button className="btn btn-primary" onClick={closeDialog} style={{ width: '100%' }}>
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
