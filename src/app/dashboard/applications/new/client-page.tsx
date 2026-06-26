'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, ArrowLeft, ArrowRight, Plus, Trash2, Clock, AlertTriangle } from 'lucide-react'
import { usePaystackPayment } from 'react-paystack'
import { 
  submitApplication, getBusinessTypes, getSystemFee, 
  saveApplicationDraft, getLatestDraft, getServices,
  checkBusinessNameAvailability
} from '@/lib/actions'
import styles from './new.module.css'
import {
  businessTypes, businessSectors, ghanaRegions, addOns,
  PersonEntry, emptyPerson, ShareholderEntry, emptyShareholder
} from './constants'
import PersonForm from './PersonForm'


// =====================================================
// Component
// =====================================================

function NewRegistrationContent() {
  const [step, setStep] = useState(0)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [resultTrackingId, setResultTrackingId] = useState('')
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityResult, setAvailabilityResult] = useState<{
    available: boolean
    matches?: Array<{ name: string; type: string }> | string[]
    error?: string | null
    message?: string
  } | null>(null)
  
  const searchParams = useSearchParams()
  // Hold affiliate code in state so user can edit it
  const [affiliateCode, setAffiliateCode] = useState(searchParams.get('ref') || '')

  // Ensure ref codes from URLs override local storage instantly on first load
  useEffect(() => {
    const urlRef = searchParams.get('ref')
    if (urlRef) {
      setAffiliateCode(urlRef)
      return
    }

    const persistedReferral =
      localStorage.getItem('graydocket_referral') ||
      document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('gd_ref='))
        ?.split('=')[1]

    if (persistedReferral) {
      setAffiliateCode(decodeURIComponent(persistedReferral))
    }
  }, [searchParams])
  const [dbBusinessTypes, setDbBusinessTypes] = useState<Array<{id: string; name: string; description: string; base_price: number; service_fee: number}>>([]) 
  const [dbServices, setDbServices] = useState<any[]>([])
  const [deliveryFee, setDeliveryFee] = useState(50)

  useEffect(() => {
    getBusinessTypes().then((types) => {
      if (types.length > 0) setDbBusinessTypes(types)
    })
    getServices().then((res) => {
      if (res.services) setDbServices(res.services)
    })
    getSystemFee('Courier Delivery').then((fee) => setDeliveryFee(fee))
  }, [])

  // Dynamic overrides
  const dynamicBusinessTypes = businessTypes.map(t => {
    const dbMatch = dbBusinessTypes.find(bt => bt.name === t.name)
    const orcFee = (dbMatch as any)?.orc_fee || 0
    const agentFee = (dbMatch as any)?.agent_fee || 0
    const returnsPortion = (dbMatch as any)?.returns_portion || 0
    const totalFromBreakdown = orcFee + agentFee + returnsPortion

    return {
      ...t,
      price: totalFromBreakdown > 0 
        ? totalFromBreakdown 
        : (dbMatch ? dbMatch.base_price + dbMatch.service_fee : t.price),
      timeline: (dbMatch as any)?.processing_timeline || t.timeline
    }
  })

  const addOnMapping: Record<string, string> = {
    domain: 'domain_name_purchase',
    email: 'business_email_setup',
    website: 'business_website',
    bank: 'bank_account_setup',
  }

  const dynamicAddOns = addOns.map(a => {
    const key = addOnMapping[a.id]
    const dbMatch = dbServices.find(s => s.name.toLowerCase().replace(/\s+/g, '_') === key)
    return {
      ...a,
      price: dbMatch !== undefined ? dbMatch.price : a.price
    }
  })

  // ---- Common fields (both Form A & Form 3) ----
  const [formData, setFormData] = useState({
    // Business Details
    businessName: '',
    businessNameAlt: '',
    businessSector: '',
    businessSectorOther: '',
    natureOfBusiness: '',
    dateOfCommencement: '',

    // Registered Office / Business Address
    buildingName: '',
    streetName: '',
    city: '',
    district: '',
    region: '',
    digitalAddress: '',
    postalAddress: '',

    // Contact
    mobilePhone: '',
    alternatePhone: '',
    email: '',
  })

  useEffect(() => {
    if (!formData.businessName || formData.businessName.trim().length < 3) {
      setAvailabilityResult(null)
      return
    }

    const nameToCheck = formData.businessName.trim()
    setCheckingAvailability(true)

    const timer = setTimeout(async () => {
      try {
        const res = await checkBusinessNameAvailability(nameToCheck)
        if (nameToCheck === formData.businessName.trim()) {
          setAvailabilityResult(res)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (nameToCheck === formData.businessName.trim()) {
          setCheckingAvailability(false)
        }
      }
    }, 700)

    return () => {
      clearTimeout(timer)
    }
  }, [formData.businessName])

  // ---- Form A: Sole Proprietorship specific ----
  const [proprietor, setProprietor] = useState<PersonEntry>({ ...emptyPerson })

  // ---- Form 3: Company Limited fields ----
  const [directors, setDirectors] = useState<PersonEntry[]>([
    { ...emptyPerson },
    { ...emptyPerson },
  ])
  const [secretary, setSecretary] = useState<PersonEntry>({ ...emptyPerson })
  const [shareholders, setShareholders] = useState<ShareholderEntry[]>([
    { ...emptyShareholder },
  ])
  const [companyDetails, setCompanyDetails] = useState({
    constitutionType: 'standard', // 'standard' (Schedule 2 of Act 992) or 'custom'
    objectsOfCompany: '',
    authorizedShares: '',
    issuedShares: '',
    statedCapital: '',
    auditorName: '',
    auditorFirm: '',
    auditorLicense: '',
    beneficialOwnerName: '',
    beneficialOwnerNationality: '',
    beneficialOwnerAddress: '',
    beneficialOwnerDOB: '',
  })

  // ---- Delivery Details ----
  const [deliveryMethod, setDeliveryMethod] = useState<'digital' | 'courier'>('digital')
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    region: '',
    digitalAddress: '',
    phone: '',
    recipientName: '',
  })

  const [isDraftLoaded, setIsDraftLoaded] = useState(false)

  // Load from DB (prioritize) or LocalStorage (fallback)
  useEffect(() => {
    async function loadDraft() {
      // 1. Try DB
      const { draft } = await getLatestDraft()
      if (draft && draft.form_data) {
        const data = draft.form_data as any
        if (data.currentStep !== undefined) setStep(data.currentStep)
        if (data.businessType) setSelectedType(data.businessType)
        if (data.selectedAddOns) setSelectedAddOns(data.selectedAddOns)
        if (data.formData) setFormData(data.formData)
        if (data.proprietor) setProprietor(data.proprietor)
        if (data.directors) setDirectors(data.directors)
        if (data.secretary) setSecretary(data.secretary)
        if (data.shareholders) setShareholders(data.shareholders)
        if (data.companyDetails) setCompanyDetails(data.companyDetails)
        if (data.deliveryMethod) setDeliveryMethod(data.deliveryMethod)
        if (data.deliveryAddress) setDeliveryAddress(data.deliveryAddress)
        if (data.affiliateCode && !searchParams.get('ref')) setAffiliateCode(data.affiliateCode)
        setIsDraftLoaded(true)
        return
      }

      // 2. Fallback to LocalStorage
      const saved = localStorage.getItem('graydocket_draft')
      if (saved) {
        try {
          const data = JSON.parse(saved)
          if(data.step !== undefined) setStep(data.step)
          if(data.selectedType !== undefined) setSelectedType(data.selectedType)
          if(data.selectedAddOns) setSelectedAddOns(data.selectedAddOns)
          if(data.formData) setFormData(data.formData)
          if(data.proprietor) setProprietor(data.proprietor)
          if(data.directors) setDirectors(data.directors)
          if(data.secretary) setSecretary(data.secretary)
          if(data.shareholders) setShareholders(data.shareholders)
          if(data.companyDetails) setCompanyDetails(data.companyDetails)
          if(data.deliveryMethod) setDeliveryMethod(data.deliveryMethod)
          if(data.deliveryAddress) setDeliveryAddress(data.deliveryAddress)
          if(data.affiliateCode && !searchParams.get('ref')) setAffiliateCode(data.affiliateCode)
        } catch (e) {
          console.error("Draft load failed", e)
        }
      }
      setIsDraftLoaded(true)
    }
    loadDraft()
  }, [])

  // Auto-save to LocalStorage
  useEffect(() => {
    if(!isDraftLoaded) return;
    const appState = { step, selectedType, selectedAddOns, formData, proprietor, directors, secretary, shareholders, companyDetails, deliveryMethod, deliveryAddress, affiliateCode }
    localStorage.setItem('graydocket_draft', JSON.stringify(appState))
  }, [step, selectedType, selectedAddOns, formData, proprietor, directors, secretary, shareholders, companyDetails, deliveryMethod, deliveryAddress, affiliateCode, isDraftLoaded])

  const handleSaveDraft = async () => {
    if (!selectedType) return
    const dbTypeId = getDbBusinessTypeId()
    if (!dbTypeId) return

    setSavingDraft(true)
    const fullState = {
      formData,
      proprietor,
      directors,
      secretary,
      shareholders,
      companyDetails,
      selectedAddOns,
      businessType: selectedType,
      affiliateCode: affiliateCode
    }

    const res = await saveApplicationDraft({
      businessTypeId: dbTypeId,
      businessName: formData.businessName,
      formData: fullState,
      selectedAddOns,
      totalAmount: totalPrice,
      deliveryMethod,
      deliveryAddress,
      step
    })

    if (res.error) console.error("Draft save failed:", res.error)
    setSavingDraft(false)
  }

  const handleClearDraft = () => {
    if(confirm('Are you sure you want to clear your current progress?')) {
      localStorage.removeItem('graydocket_draft')
      window.location.reload()
    }
  }

  const [submitted, setSubmitted] = useState(false)

  const selectedBusiness = businessTypes.find((t) => t.id === selectedType)
  const isCompany = selectedType === 'limited_by_shares' || selectedType === 'limited_by_guarantee'

  // Map frontend type ID to DB business_type_id
  const getDbBusinessTypeId = (): string | null => {
    if (!selectedBusiness || dbBusinessTypes.length === 0) return null
    const nameMap: Record<string, string> = {
      'sole_proprietorship': 'Sole Proprietorship',
      'limited_by_shares': 'Company Limited by Shares',
      'limited_by_guarantee': 'Company Limited by Guarantee',
    }
    const dbName = nameMap[selectedType || '']
    const found = dbBusinessTypes.find(bt => bt.name === dbName)
    return found?.id || null
  }

  const nameMap: Record<string, string> = {
    'sole_proprietorship': 'Sole Proprietorship',
    'limited_by_shares': 'Company Limited by Shares',
    'limited_by_guarantee': 'Company Limited by Guarantee',
  }
  const dbMatch = dbBusinessTypes.find(bt => bt.name === nameMap[selectedType || ''])
  
  const basePrice = dbMatch ? dbMatch.base_price : (selectedBusiness?.price || 0)
  const serviceFee = dbMatch?.service_fee || 0

  const totalPrice = basePrice + serviceFee +
    dynamicAddOns.filter((a) => selectedAddOns.includes(a.id)).reduce((sum, a) => sum + a.price, 0) +
    (deliveryMethod === 'courier' ? deliveryFee : 0)

  const progressSteps = isCompany
    ? [
        { label: 'Business Type' },
        { label: 'Company Info' },
        { label: 'Directors' },
        { label: 'Secretary & Shareholders' },
        { label: 'Add-Ons' },
        { label: 'Delivery' },
        { label: 'Review' },
      ]
    : [
        { label: 'Business Type' },
        { label: 'Business Info' },
        { label: 'Proprietor' },
        { label: 'Add-Ons' },
        { label: 'Delivery' },
        { label: 'Review' },
      ]

  const lastStep = progressSteps.length - 1

  // ---- Handlers ----

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleProprietorChange = (field: string, value: string) => {
    setProprietor((prev) => ({ ...prev, [field]: value }))
  }

  const handleDirectorChange = (index: number, field: string, value: string) => {
    setDirectors((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addDirector = () => {
    setDirectors((prev) => [...prev, { ...emptyPerson }])
  }

  const removeDirector = (index: number) => {
    if (directors.length <= 2) return // Minimum 2 directors
    setDirectors((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSecretaryChange = (field: string, value: string) => {
    setSecretary((prev) => ({ ...prev, [field]: value }))
  }

  const handleShareholderChange = (index: number, field: string, value: string) => {
    setShareholders((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addShareholder = () => {
    setShareholders((prev) => [...prev, { ...emptyShareholder }])
  }

  const removeShareholder = (index: number) => {
    if (shareholders.length <= 1) return
    setShareholders((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCompanyDetailChange = (field: string, value: string) => {
    setCompanyDetails((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (paymentRef?: string) => {
    setSubmitting(true)
    setSubmitError('')

    const dbTypeId = getDbBusinessTypeId()
    if (!dbTypeId) {
      setSubmitError('Could not match business type. Please refresh and try again.')
      setSubmitting(false)
      return
    }

    const fullFormData = {
      ...formData,
      businessType: selectedType,
      paystackReference: paymentRef,
      ...(isCompany
        ? {
            directors,
            secretary,
            shareholders,
            companyDetails,
          }
        : {
            proprietor,
          }),
    }

    const result = await submitApplication({
      businessTypeId: dbTypeId,
      businessTypeName: selectedBusiness?.name || '',
      businessName: formData.businessName,
      formData: fullFormData,
      selectedAddOns,
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'courier' ? deliveryAddress : null,
      totalAmount: totalPrice,
      affiliateCode: affiliateCode,
      paystackReference: paymentRef,
    })

    if (result.error) {
      setSubmitError(result.error)
      setSubmitting(false)
      return
    }

    setResultTrackingId(result.trackingId || '')
    setSubmitted(true)
    setSubmitting(false)
  }

  // --- Paystack Setup ---
  const paystackConfig = {
    reference: `GD-${new Date().getTime()}`,
    email: formData.email || 'customer@graydocket.com',
    amount: totalPrice * 100, // Paystack requires amount in pesewas/kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    currency: 'GHS',
  }

  // @ts-ignore
  const initializePayment = usePaystackPayment(paystackConfig)

  const handlePayAndSubmit = () => {
    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      setSubmitError('Payment gateway not configured (missing Paystack Key).')
      return;
    }
    
    setSubmitting(true)
    initializePayment({
      onSuccess: (reference: any) => {
        handleSubmit(reference.reference)
      },
      onClose: () => {
        setSubmitting(false)
        setSubmitError('Payment was cancelled.')
      }
    })
  }

  const businessFullAddress = [
    formData.buildingName,
    formData.streetName,
    formData.city,
    formData.district,
    formData.region,
  ].filter(Boolean).join(', ')

  const personFullName = (p: PersonEntry) =>
    [p.title, p.firstName, p.otherNames, p.surname].filter(Boolean).join(' ')

  
  // Removed renderPersonFields


  // =====================================================
  // Reusable: Review person
  // =====================================================

  const renderPersonReview = (person: PersonEntry, label: string) => (
    <div className={styles.reviewSection}>
      <h3>{label}</h3>
      <div className={styles.reviewRow}>
        <span className={styles.reviewLabel}>Full Name</span>
        <span className={styles.reviewValue}>{personFullName(person)}</span>
      </div>
      <div className={styles.reviewRow}>
        <span className={styles.reviewLabel}>Date of Birth</span>
        <span className={styles.reviewValue}>{person.dateOfBirth || '—'}</span>
      </div>
      <div className={styles.reviewRow}>
        <span className={styles.reviewLabel}>Nationality</span>
        <span className={styles.reviewValue}>{person.nationality || '—'}</span>
      </div>
      <div className={styles.reviewRow}>
        <span className={styles.reviewLabel}>Occupation</span>
        <span className={styles.reviewValue}>{person.occupation || '—'}</span>
      </div>
      <div className={styles.reviewRow}>
        <span className={styles.reviewLabel}>Ghana Card</span>
        <span className={styles.reviewValue}>
           {person.ghanaCardNumber || '—'} 
           {(person.idPhotos?.length ? person.idPhotos.length > 0 : person.ghanaCardPhotoUrl) && (
             <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--color-success)', fontWeight: 600, background: 'var(--color-success-light)', padding: '2px 6px', borderRadius: '4px' }}>
               {person.idPhotos?.length ? `${person.idPhotos.length} PHOTO(S) ATTACHED` : 'PHOTO ATTACHED'}
             </span>
           )}
        </span>
      </div>
      <div className={styles.reviewRow}>
        <span className={styles.reviewLabel}>TIN</span>
        <span className={styles.reviewValue}>{person.tinNumber || '—'}</span>
      </div>
      <div className={styles.reviewRow}>
        <span className={styles.reviewLabel}>Address</span>
        <span className={styles.reviewValue}>
          {[person.residentialAddress, person.city, person.region].filter(Boolean).join(', ') || '—'}
        </span>
      </div>
      <div className={styles.reviewRow}>
        <span className={styles.reviewLabel}>Phone</span>
        <span className={styles.reviewValue}>{person.phone || '—'}</span>
      </div>
      <div className={styles.reviewRow}>
        <span className={styles.reviewLabel}>Email</span>
        <span className={styles.reviewValue}>{person.email || '—'}</span>
      </div>
    </div>
  )

  // =====================================================
  // Submitted State
  // =====================================================

  if (submitted) {
    return (
      <div className={styles.newReg}>
        <div className={styles.stepCard}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>🎉</div>
            <h2>Application Submitted!</h2>
            <p>Your {selectedBusiness?.name} registration has been submitted successfully and is now being processed.</p>
            <div className={styles.trackingBox}>
              <label>Your Tracking ID</label>
              <span>{resultTrackingId}</span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)', marginTop: 'var(--space-2)' }}>
              Use this ID to track your application status anytime.
            </p>
            <div className={styles.successActions}>
              <Link href="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
              <Link href="/dashboard/applications" className="btn btn-secondary">View Applications</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.newReg}>
      <div className={styles.newRegHeader}>
        <div className={styles.newRegHeaderTop}>
          <h1>Register Your Business</h1>
          <button className="btn btn-ghost btn-sm" onClick={handleClearDraft} style={{ color: 'var(--color-neutral-400)' }}>Clear Draft</button>
        </div>
        <p>
          {isCompany
            ? 'Complete the ORC Form 3 details below to incorporate your company in Ghana.'
            : 'Complete the ORC Form A details below to register your business name in Ghana.'}
        </p>
      </div>

      {/* ============ Progress Bar ============ */}
      <div className={styles.progressBar}>
        {progressSteps.map((ps, i) => (
          <div key={i} className={styles.progressStep}>
            <div className={`${styles.progressDot} ${i < step ? styles.completed : i === step ? styles.active : ''}`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`${styles.progressLabel} ${i === step ? styles.active : ''}`}>
              {ps.label}
            </span>
            {i < progressSteps.length - 1 && (
              <div className={`${styles.progressLine} ${i < step ? styles.completed : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* ============ Step 0: Business Type ============ */}
      {step === 0 && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Select Business Type</h2>
          <p className={styles.stepDesc}>Choose the type of entity you want to register with the ORC.</p>
          <div className={styles.typeGrid}>
            {dynamicBusinessTypes.map((type: any) => (
              <button
                key={type.id}
                className={`${styles.typeCard} ${selectedType === type.id ? styles.selected : ''} ${type.comingSoon ? styles.disabled : ''}`}
                onClick={() => !type.comingSoon && setSelectedType(type.id)}
                disabled={type.comingSoon}
                id={`type-${type.id}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className={styles.typeIcon}>{type.icon}</div>
                  {type.comingSoon ? (
                    <span className={styles.comingSoonBadge}>COMING SOON</span>
                  ) : (
                    <div className={styles.timelineBadge}>
                      <Clock size={12} />
                      <span>{type.timeline}</span>
                    </div>
                  )}
                </div>
                <h3>{type.name}</h3>
                <p>{type.desc}</p>
                <div className={styles.typePrice}>GH₵ {type.price.toLocaleString()}</div>
                <div className={styles.typeFormRef}>{type.formRef}</div>
              </button>
            ))}
          </div>
          <div className={styles.stepNav}>
            <div />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={!selectedType || savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button className="btn btn-primary" disabled={!selectedType} onClick={() => setStep(1)} id="next-step-0">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Step 1: Business / Company Information ============ */}
      {step === 1 && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>
            {isCompany ? 'Company Information' : 'Business Information'}
          </h2>
          <p className={styles.stepDesc}>
            Provide details about your {selectedBusiness?.name}. All fields marked * are required on ORC {selectedBusiness?.formRef}.
          </p>

          {/* Business / Company Name */}
          <div className={styles.formSectionTitle}>
            {isCompany ? 'Proposed Company Name' : 'Proposed Business Name'}
          </div>
          <div className={styles.formGrid}>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="businessName">
                {isCompany ? 'Proposed Company Name *' : 'Proposed Business Name *'}
              </label>
              <input
                id="businessName"
                type="text"
                className="form-input"
                placeholder={isCompany ? 'e.g., Asante Tech Solutions Limited' : 'e.g., Asante Tech Solutions'}
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                required
              />
              <span className="form-hint">
                {isCompany
                  ? 'Name must end with "Limited" or "LTD" for private companies. We\'ll conduct a name search with ORC.'
                  : 'We\'ll conduct a name search with ORC to ensure availability. Use block letters, no abbreviations.'}
              </span>

              <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}} />

              {formData.businessName.trim().length >= 3 && (
                <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {checkingAvailability && (
                    <div style={{ color: 'var(--color-neutral-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--color-neutral-300)', borderTopColor: 'var(--color-primary-500)', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      <span>Verifying name availability in ORC registry...</span>
                    </div>
                  )}
                  {!checkingAvailability && availabilityResult && (
                    <>
                      {availabilityResult.error === 'unreachable' ? (
                        <div style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800 }}>⚠</span>
                          <span>{availabilityResult.message || 'ORC registry lookup offline. We will verify availability manually.'}</span>
                        </div>
                      ) : availabilityResult.available ? (
                        <div style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <span>✓</span>
                          <span>Name is likely available (No exact/partial conflicts found in ORC).</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                            <span>✗</span>
                            <span>Potential conflict found in ORC registry.</span>
                          </div>
                          {availabilityResult.matches && availabilityResult.matches.length > 0 && (
                            <div style={{ padding: '8px 12px', background: 'var(--color-error-light)', borderRadius: '8px', border: '1px solid var(--color-error-light)', color: 'var(--color-neutral-800)', fontSize: '12px' }}>
                              <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--color-error)' }}>Conflicting registrations:</strong>
                              <ul style={{ listStyleType: 'disc', paddingLeft: '16px', margin: 0 }}>
                                {availabilityResult.matches.map((m: any) => (
                                  <li key={typeof m === 'string' ? m : m.name} style={{ fontWeight: 600 }}>
                                    {typeof m === 'string' ? m : `${m.name} (${m.type})`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="businessNameAlt">Alternative Name (optional)</label>
              <input id="businessNameAlt" type="text" className="form-input" placeholder="Backup name if first choice is unavailable" value={formData.businessNameAlt} onChange={(e) => handleInputChange('businessNameAlt', e.target.value)} />
            </div>
          </div>

          {/* Nature of Business */}
          <div className={styles.formSectionTitle}>Nature of Business</div>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="businessSector">Business Sector *</label>
              <select id="businessSector" className="form-input" value={formData.businessSector} onChange={(e) => handleInputChange('businessSector', e.target.value)} required>
                <option value="">Select sector</option>
                {businessSectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {formData.businessSector === 'Other (specify below)' && (
              <div className="form-group">
                <label className="form-label" htmlFor="businessSectorOther">Specify Sector</label>
                <input id="businessSectorOther" type="text" className="form-input" placeholder="Describe your sector" value={formData.businessSectorOther} onChange={(e) => handleInputChange('businessSectorOther', e.target.value)} />
              </div>
            )}
            <div className={`form-group ${formData.businessSector === 'Other (specify below)' ? '' : styles.formFull}`}>
              <label className="form-label" htmlFor="natureOfBusiness">
                {isCompany ? 'Objects of the Company / Description of Activities *' : 'Description of Business Activities *'}
              </label>
              <textarea id="natureOfBusiness" className="form-input" placeholder="Describe the specific activities and services..." rows={3} value={formData.natureOfBusiness} onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)} required style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dateOfCommencement">Date of Commencement *</label>
              <input id="dateOfCommencement" type="date" className="form-input" value={formData.dateOfCommencement} onChange={(e) => handleInputChange('dateOfCommencement', e.target.value)} required />
              <span className="form-hint">Date business started or will start operations</span>
            </div>
          </div>

          {/* Company-specific: Constitution */}
          {isCompany && (
            <>
              <div className={styles.formSectionTitle}>Company Constitution</div>
              <div className={styles.formGrid}>
                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Constitution Type *</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input type="radio" name="constitution" value="standard" checked={companyDetails.constitutionType === 'standard'} onChange={(e) => handleCompanyDetailChange('constitutionType', e.target.value)} />
                      <span>Standard Constitution (Schedule 2, Act 992)</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input type="radio" name="constitution" value="custom" checked={companyDetails.constitutionType === 'custom'} onChange={(e) => handleCompanyDetailChange('constitutionType', e.target.value)} />
                      <span>Custom / Registered Constitution</span>
                    </label>
                  </div>
                  <span className="form-hint">Most companies adopt the standard constitution. A custom one requires separate drafting and submission.</span>
                </div>
              </div>
            </>
          )}

          {/* Registered Office Address */}
          <div className={styles.formSectionTitle}>
            {isCompany ? 'Registered Office Address' : 'Principal Place of Business / Registered Office'}
          </div>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="buildingName">House / Building / Flat *</label>
              <input id="buildingName" type="text" className="form-input" placeholder="e.g., Suite 5, Osu Ventures Building" value={formData.buildingName} onChange={(e) => handleInputChange('buildingName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="streetName">Street Name *</label>
              <input id="streetName" type="text" className="form-input" placeholder="e.g., Oxford Street" value={formData.streetName} onChange={(e) => handleInputChange('streetName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="city">City / Town *</label>
              <input id="city" type="text" className="form-input" placeholder="e.g., Accra" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="district">District *</label>
              <input id="district" type="text" className="form-input" placeholder="e.g., Accra Metropolitan" value={formData.district} onChange={(e) => handleInputChange('district', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="region">Region *</label>
              <select id="region" className="form-input" value={formData.region} onChange={(e) => handleInputChange('region', e.target.value)} required>
                <option value="">Select region</option>
                {ghanaRegions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="digitalAddress">Digital Address *</label>
              <input id="digitalAddress" type="text" className="form-input" placeholder="e.g., GA-XXX-XXXX" value={formData.digitalAddress} onChange={(e) => handleInputChange('digitalAddress', e.target.value)} required />
              <span className="form-hint">Get yours from the Ghana Post GPS app</span>
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="postalAddress">Postal Address</label>
              <input id="postalAddress" type="text" className="form-input" placeholder="P.O. Box, PMB, or DTD" value={formData.postalAddress} onChange={(e) => handleInputChange('postalAddress', e.target.value)} />
            </div>
          </div>

          {/* Contact Information */}
          <div className={styles.formSectionTitle}>Contact Information</div>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="mobilePhone">Mobile Phone *</label>
              <input id="mobilePhone" type="tel" className="form-input" placeholder="+233 XXX XXX XXX" value={formData.mobilePhone} onChange={(e) => handleInputChange('mobilePhone', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="alternatePhone">Alternate Phone</label>
              <input id="alternatePhone" type="tel" className="form-input" placeholder="+233 XXX XXX XXX" value={formData.alternatePhone} onChange={(e) => handleInputChange('alternatePhone', e.target.value)} />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="contactEmail">Email *</label>
              <input id="contactEmail" type="email" className="form-input" placeholder="company@example.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
            </div>
          </div>

          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(0)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(2)}
                disabled={!formData.businessName || !formData.businessSector || !formData.natureOfBusiness || !formData.city || !formData.region}
                id="next-step-1"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Step 2: Person(s) ============ */}
      {/* SOLE PROPRIETORSHIP: Single Proprietor */}
      {step === 2 && !isCompany && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Proprietor Details</h2>
          <p className={styles.stepDesc}>Personal information of the business owner as required on ORC Form A.</p>
          <PersonForm person={proprietor} onChange={handleProprietorChange} prefix="prop" title="Proprietor" />
          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(3)}
                disabled={!proprietor.surname || !proprietor.firstName || !proprietor.ghanaCardNumber || !proprietor.tinNumber || !proprietor.phone || !proprietor.email}
                id="next-step-2"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPANY: Directors */}
      {step === 2 && isCompany && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Directors</h2>
          <p className={styles.stepDesc}>
            Minimum 2 directors required. At least one must be a Ghana resident. Each director needs a TIN.
          </p>

          {directors.map((director, index) => (
            <div key={index} className={styles.personBlock}>
              <div className={styles.personBlockHeader}>
                <h3 className={styles.personBlockTitle}>Director {index + 1}</h3>
                {directors.length > 2 && (
                  <button className={`btn btn-ghost btn-sm ${styles.removeBtn}`} onClick={() => removeDirector(index)} type="button">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <PersonForm person={director} onChange={(f,v) => handleDirectorChange(index, f, v)} prefix={`dir-${index}`} title={`Director ${index + 1}`} />
            </div>
          ))}

          <button className={`btn btn-secondary ${styles.addPersonBtn}`} onClick={addDirector} type="button">
            <Plus size={16} /> Add Another Director
          </button>

          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(3)}
                disabled={directors.some((d) => !d.surname || !d.firstName || !d.ghanaCardNumber || !d.tinNumber)}
                id="next-step-2"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPANY: Secretary & Shareholders */}
      {step === 3 && isCompany && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Secretary, Shareholders & Capital</h2>
          <p className={styles.stepDesc}>
            A company secretary is mandatory. Provide details of shareholders and the stated capital structure.
          </p>

          {/* Company Secretary */}
          <div className={styles.personBlock}>
            <div className={styles.personBlockHeader}>
              <h3 className={styles.personBlockTitle}>Company Secretary</h3>
            </div>
            <PersonForm person={secretary} onChange={handleSecretaryChange} prefix="sec" title="Secretary" />
          </div>

          {/* Shareholders */}
          <div className={styles.formSectionTitle}>Shareholders</div>
          {shareholders.map((sh, index) => (
            <div key={index} className={styles.shareholderBlock}>
              <div className={styles.personBlockHeader}>
                <h3 className={styles.personBlockTitle}>Shareholder {index + 1}</h3>
                {shareholders.length > 1 && (
                  <button className={`btn btn-ghost btn-sm ${styles.removeBtn}`} onClick={() => removeShareholder(index)} type="button">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-type`}>Type *</label>
                  <select id={`sh-${index}-type`} className="form-input" value={sh.type} onChange={(e) => handleShareholderChange(index, 'type', e.target.value)}>
                    <option value="individual">Individual</option>
                    <option value="corporate">Corporate Entity</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-name`}>
                    {sh.type === 'individual' ? 'Full Name *' : 'Entity Name *'}
                  </label>
                  <input id={`sh-${index}-name`} type="text" className="form-input" placeholder={sh.type === 'individual' ? 'Full legal name' : 'Registered company name'} value={sh.name} onChange={(e) => handleShareholderChange(index, 'name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-tin`}>TIN *</label>
                  <input id={`sh-${index}-tin`} type="text" className="form-input" placeholder="e.g., CXXXXXXXX" value={sh.tinNumber} onChange={(e) => handleShareholderChange(index, 'tinNumber', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-nationality`}>
                    {sh.type === 'individual' ? 'Nationality *' : 'Country of Registration *'}
                  </label>
                  <input id={`sh-${index}-nationality`} type="text" className="form-input" placeholder="e.g., Ghanaian" value={sh.nationality} onChange={(e) => handleShareholderChange(index, 'nationality', e.target.value)} required />
                </div>
                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label" htmlFor={`sh-${index}-address`}>Address *</label>
                  <input id={`sh-${index}-address`} type="text" className="form-input" placeholder="Full residential or registered address" value={sh.address} onChange={(e) => handleShareholderChange(index, 'address', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-shares`}>Number of Shares *</label>
                  <input id={`sh-${index}-shares`} type="text" className="form-input" placeholder="e.g., 1000" value={sh.numberOfShares} onChange={(e) => handleShareholderChange(index, 'numberOfShares', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-value`}>Value per Share (GH₵) *</label>
                  <input id={`sh-${index}-value`} type="text" className="form-input" placeholder="e.g., 1.00" value={sh.valuePerShare} onChange={(e) => handleShareholderChange(index, 'valuePerShare', e.target.value)} required />
                </div>
              </div>
            </div>
          ))}

          <button className={`btn btn-secondary ${styles.addPersonBtn}`} onClick={addShareholder} type="button">
            <Plus size={16} /> Add Another Shareholder
          </button>

          {/* Stated Capital */}
          {selectedType === 'limited_by_shares' && (
            <>
              <div className={styles.formSectionTitle}>Stated Capital</div>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label" htmlFor="authorizedShares">Total Authorized Shares *</label>
                  <input id="authorizedShares" type="text" className="form-input" placeholder="e.g., 10,000" value={companyDetails.authorizedShares} onChange={(e) => handleCompanyDetailChange('authorizedShares', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="issuedShares">Issued Shares *</label>
                  <input id="issuedShares" type="text" className="form-input" placeholder="e.g., 1,000" value={companyDetails.issuedShares} onChange={(e) => handleCompanyDetailChange('issuedShares', e.target.value)} required />
                </div>
                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label" htmlFor="statedCapital">Stated Capital (GH₵) *</label>
                  <input id="statedCapital" type="text" className="form-input" placeholder="Total paid-up value of issued shares" value={companyDetails.statedCapital} onChange={(e) => handleCompanyDetailChange('statedCapital', e.target.value)} required />
                  <span className="form-hint">
                    Under Act 992, shares are no-par-value. The stated capital is the aggregate of considerations received for issued shares.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Auditor */}
          <div className={styles.formSectionTitle}>Auditor</div>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="auditorName">Auditor Name *</label>
              <input id="auditorName" type="text" className="form-input" placeholder="Full name of licensed auditor" value={companyDetails.auditorName} onChange={(e) => handleCompanyDetailChange('auditorName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auditorFirm">Audit Firm</label>
              <input id="auditorFirm" type="text" className="form-input" placeholder="Name of audit firm" value={companyDetails.auditorFirm} onChange={(e) => handleCompanyDetailChange('auditorFirm', e.target.value)} />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="auditorLicense">ICAG License Number *</label>
              <input id="auditorLicense" type="text" className="form-input" placeholder="Auditor's ICAG license number" value={companyDetails.auditorLicense} onChange={(e) => handleCompanyDetailChange('auditorLicense', e.target.value)} required />
              <span className="form-hint">A consent letter from the auditor will be required</span>
            </div>
          </div>

          {/* Beneficial Ownership */}
          <div className={styles.formSectionTitle}>Beneficial Ownership</div>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="beneficialOwnerName">Beneficial Owner Name *</label>
              <input id="beneficialOwnerName" type="text" className="form-input" placeholder="Full legal name" value={companyDetails.beneficialOwnerName} onChange={(e) => handleCompanyDetailChange('beneficialOwnerName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="beneficialOwnerNationality">Nationality *</label>
              <input id="beneficialOwnerNationality" type="text" className="form-input" placeholder="e.g., Ghanaian" value={companyDetails.beneficialOwnerNationality} onChange={(e) => handleCompanyDetailChange('beneficialOwnerNationality', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="beneficialOwnerDOB">Date of Birth *</label>
              <input id="beneficialOwnerDOB" type="date" className="form-input" value={companyDetails.beneficialOwnerDOB} onChange={(e) => handleCompanyDetailChange('beneficialOwnerDOB', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="beneficialOwnerAddress">Residential Address *</label>
              <input id="beneficialOwnerAddress" type="text" className="form-input" placeholder="Full residential address" value={companyDetails.beneficialOwnerAddress} onChange={(e) => handleCompanyDetailChange('beneficialOwnerAddress', e.target.value)} required />
            </div>
          </div>

          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(4)}
                disabled={!secretary.surname || !secretary.firstName || shareholders.some((s) => !s.name || !s.tinNumber)}
                id="next-step-3"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Add-Ons Step ============ */}
      {step === (isCompany ? 4 : 3) && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Value-Added Services</h2>
          <p className={styles.stepDesc}>Enhance your business with these optional services.</p>

          <div className={styles.addOnGrid}>
            {dynamicAddOns.filter(a => a.id !== 'bank').map((addon) => (
              <button
                key={addon.id}
                className={`${styles.addOnCard} ${selectedAddOns.includes(addon.id) ? styles.selected : ''}`}
                onClick={() => toggleAddOn(addon.id)}
                id={`addon-${addon.id}`}
              >
                <div className={`${styles.addOnCheck} ${selectedAddOns.includes(addon.id) ? styles.checked : ''}`}>
                  {selectedAddOns.includes(addon.id) && '✓'}
                </div>
                <div>
                  <h4>{addon.name}</h4>
                  <p>{addon.desc}</p>
                  <div className={styles.addOnPrice}>{addon.price === 0 ? 'Free' : `GH₵ ${addon.price}`}</div>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.totalBar}>
            <span className={styles.totalLabel}>Estimated Total</span>
            <span className={styles.totalAmount}>GH₵ {totalPrice.toLocaleString()}</span>
          </div>

          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
                Continue to Delivery <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Step: Delivery Preference ============ */}
      {progressSteps[step]?.label === 'Delivery' && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Delivery Preference</h2>
          <p className={styles.stepDesc}>How would you like to receive your official registration documents?</p>

          <div className={styles.typeGrid}>
            <button
              className={`${styles.typeCard} ${deliveryMethod === 'digital' ? styles.selected : ''}`}
              onClick={() => setDeliveryMethod('digital')}
            >
              <div className={styles.typeIcon}>📧</div>
              <h3>Digital-Only</h3>
              <p>Receive high-resolution PDF certificates via email and in your vault.</p>
              <div className={styles.typePrice}>Free</div>
            </button>
            <button
              className={`${styles.typeCard} ${deliveryMethod === 'courier' ? styles.selected : ''}`}
              onClick={() => setDeliveryMethod('courier')}
            >
              <div className={styles.typeIcon}>📦</div>
              <h3>Courier Delivery</h3>
              <p>Physical hard-copy docs delivered to your door via partner courier.</p>
              <div className={styles.typePrice}>GH₵ {deliveryFee.toLocaleString()}</div>
            </button>
          </div>

          {deliveryMethod === 'courier' && (
            <div className={styles.deliveryForm} style={{ marginTop: 'var(--space-8)' }}>
              <div className={styles.formSectionTitle}>Delivery Address</div>
              <div className={styles.formGrid}>
                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Recipient Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Full name of person receiving docs"
                    value={deliveryAddress.recipientName}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, recipientName: e.target.value})}
                    required
                  />
                </div>
                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Street / House Address *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="House number, street name"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Accra"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Region *</label>
                  <select 
                    className="form-input"
                    value={deliveryAddress.region}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, region: e.target.value})}
                    required
                  >
                    <option value="">Select Region</option>
                    {ghanaRegions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Digital Address (GPS)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. GA-XXX-XXXX"
                    value={deliveryAddress.digitalAddress}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, digitalAddress: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="+233 XXX XXX XXX"
                    value={deliveryAddress.phone}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, phone: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setStep(step + 1)}
                disabled={deliveryMethod === 'courier' && (!deliveryAddress.recipientName || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.phone)}
              >
                Continue to Review <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Review Step ============ */}
      {step === lastStep && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Review Your Application</h2>
          <p className={styles.stepDesc}>Please review all details carefully before submitting.</p>

          {/* Registration Type */}
          <div className={styles.reviewSection}>
            <h3>Registration Type</h3>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Business Type</span>
              <span className={styles.reviewValue}>{selectedBusiness?.name}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>ORC Form</span>
              <span className={styles.reviewValue}>{selectedBusiness?.formRef}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Base Fee (ORC)</span>
              <span className={styles.reviewValue}>GH₵ {basePrice.toLocaleString()}</span>
            </div>
            {serviceFee > 0 && (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>GrayDocket Service Fee</span>
                <span className={styles.reviewValue}>GH₵ {serviceFee.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Business Info */}
          <div className={styles.reviewSection}>
            <h3>{isCompany ? 'Company Information' : 'Business Information'}</h3>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Proposed Name</span>
              <span className={styles.reviewValue}>{formData.businessName}</span>
            </div>
            {formData.businessNameAlt && (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Alternative Name</span>
                <span className={styles.reviewValue}>{formData.businessNameAlt}</span>
              </div>
            )}
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Sector</span>
              <span className={styles.reviewValue}>{formData.businessSector === 'Other (specify below)' ? formData.businessSectorOther : formData.businessSector}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Nature of Business</span>
              <span className={styles.reviewValue}>{formData.natureOfBusiness}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Commencement Date</span>
              <span className={styles.reviewValue}>{formData.dateOfCommencement || '—'}</span>
            </div>
            {isCompany && (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Constitution</span>
                <span className={styles.reviewValue}>
                  {companyDetails.constitutionType === 'standard' ? 'Standard (Schedule 2, Act 992)' : 'Custom / Registered'}
                </span>
              </div>
            )}
          </div>

          {/* Address */}
          <div className={styles.reviewSection}>
            <h3>Registered Office Address</h3>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Address</span>
              <span className={styles.reviewValue}>{businessFullAddress || '—'}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Digital Address</span>
              <span className={styles.reviewValue}>{formData.digitalAddress || '—'}</span>
            </div>
            {formData.postalAddress && (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Postal Address</span>
                <span className={styles.reviewValue}>{formData.postalAddress}</span>
              </div>
            )}
          </div>

          {/* Proprietor (sole prop) */}
          {!isCompany && renderPersonReview(proprietor, 'Proprietor Details')}

          {/* Directors (company) */}
          {isCompany && directors.map((d, i) => renderPersonReview(d, `Director ${i + 1}`))}

          {/* Secretary (company) */}
          {isCompany && renderPersonReview(secretary, 'Company Secretary')}

          {/* Shareholders (company) */}
          {isCompany && (
            <div className={styles.reviewSection}>
              <h3>Shareholders</h3>
              {shareholders.map((sh, i) => (
                <div key={i} className={styles.reviewSubBlock}>
                  <strong>Shareholder {i + 1} — {sh.type === 'individual' ? 'Individual' : 'Corporate'}</strong>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Name</span>
                    <span className={styles.reviewValue}>{sh.name}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>TIN</span>
                    <span className={styles.reviewValue}>{sh.tinNumber}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Shares</span>
                    <span className={styles.reviewValue}>{sh.numberOfShares} @ GH₵ {sh.valuePerShare} each</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stated Capital (company) */}
          {isCompany && selectedType === 'limited_by_shares' && (
            <div className={styles.reviewSection}>
              <h3>Stated Capital</h3>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Authorized Shares</span>
                <span className={styles.reviewValue}>{companyDetails.authorizedShares}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Issued Shares</span>
                <span className={styles.reviewValue}>{companyDetails.issuedShares}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Stated Capital</span>
                <span className={styles.reviewValue}>GH₵ {companyDetails.statedCapital}</span>
              </div>
            </div>
          )}

          {/* Auditor (company) */}
          {isCompany && (
            <div className={styles.reviewSection}>
              <h3>Auditor</h3>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Name</span>
                <span className={styles.reviewValue}>{companyDetails.auditorName}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Firm</span>
                <span className={styles.reviewValue}>{companyDetails.auditorFirm || '—'}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>ICAG License</span>
                <span className={styles.reviewValue}>{companyDetails.auditorLicense}</span>
              </div>
            </div>
          )}

          {/* Beneficial Ownership (company) */}
          {isCompany && (
            <div className={styles.reviewSection}>
              <h3>Beneficial Ownership</h3>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Name</span>
                <span className={styles.reviewValue}>{companyDetails.beneficialOwnerName}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Nationality</span>
                <span className={styles.reviewValue}>{companyDetails.beneficialOwnerNationality}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Date of Birth</span>
                <span className={styles.reviewValue}>{companyDetails.beneficialOwnerDOB}</span>
              </div>
            </div>
          )}

          {/* Contact */}
          <div className={styles.reviewSection}>
            <h3>Contact Information</h3>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Mobile Phone</span>
              <span className={styles.reviewValue}>{formData.mobilePhone}</span>
            </div>
            {formData.alternatePhone && (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Alternate Phone</span>
                <span className={styles.reviewValue}>{formData.alternatePhone}</span>
              </div>
            )}
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Email</span>
              <span className={styles.reviewValue}>{formData.email}</span>
            </div>
          </div>

          {/* Add-Ons */}
          {selectedAddOns.length > 0 && (
            <div className={styles.reviewSection}>
              <h3>Add-On Services</h3>
              {dynamicAddOns
                .filter((a) => selectedAddOns.includes(a.id))
                .map((addon) => (
                  <div key={addon.id} className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>{addon.name}</span>
                    <span className={styles.reviewValue}>{addon.price === 0 ? 'Free' : `GH₵ ${addon.price}`}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Delivery Review */}
          <div className={styles.reviewSection}>
            <h3>Delivery Preference</h3>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Method</span>
              <span className={styles.reviewValue}>
                {deliveryMethod === 'digital' ? 'Digital-Only (Vault & Email)' : 'Courier Delivery (Hard Copy)'}
              </span>
            </div>
            {deliveryMethod === 'courier' && (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Delivery Destination</span>
                <span className={styles.reviewValue}>
                  {deliveryAddress.recipientName}<br />
                  {deliveryAddress.street}, {deliveryAddress.city}, {deliveryAddress.region}<br />
                  {deliveryAddress.phone}
                </span>
              </div>
            )}
          </div>

          <div className={styles.reviewSection} style={{ backgroundColor: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }}>
            <h3>Affiliate / Referral Code</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-3)' }}>
              Did someone refer you? Enter their code here so they get credit for this registration.
            </p>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. OTH74D" 
                value={affiliateCode} 
                onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                style={{ maxWidth: '200px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
              />
            </div>
          </div>

          <div className={styles.totalBar}>
            <span className={styles.totalLabel}>Total Amount</span>
            <span className={styles.totalAmount}>GH₵ {totalPrice.toLocaleString()}</span>
          </div>

          <div className={styles.disclaimerBanner}>
            <div className={styles.disclaimerIcon}>
              <AlertTriangle size={20} color="#d97706" />
            </div>
            <div>
              <h4>Timeline Disclaimer</h4>
              <p>
                Processing estimates (<strong style={{ fontWeight: 800 }}>{selectedBusiness?.timeline}</strong>) are subject to the Registrar General&apos;s Department (ORC) workflow. While rare, external delays can occur due to registry system maintenance or name search queries.
                <br /><strong style={{ fontWeight: 800 }}>Our Promise:</strong> GrayDocket will communicate every status shift directly to your dashboard and via SMS.
              </p>
            </div>
          </div>

          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(lastStep - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
            {submitError && <div className="form-error" style={{ color: 'red', marginBottom: 'var(--space-4)' }}>{submitError}</div>}
            <button className="btn btn-primary btn-lg" onClick={handlePayAndSubmit} disabled={submitting} id="submit-application">
              {submitting ? 'Processing Payment...' : `Pay GH₵ ${totalPrice.toLocaleString()} & Submit`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewRegistrationContent
