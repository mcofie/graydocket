'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Check, ArrowLeft, ArrowRight, Plus, Trash2, Clock, AlertTriangle, CheckCircle2, User, Building2, HeartHandshake, type LucideIcon } from 'lucide-react'
import { usePaystackPayment } from 'react-paystack'
import { 
  submitApplication, getBusinessTypes, getSystemFee, 
  saveApplicationDraft, getLatestDraft, getServices, getMyProfile, discardDraft
} from '@/lib/actions'
import styles from './new.module.css'
import {
  businessTypes, businessSectors, ghanaRegions,
  PersonEntry, emptyPerson, ShareholderEntry, emptyShareholder
} from './constants'
import PersonForm from './PersonForm'
import NameCheck from './NameCheck'
import { useNameCheck, warmNameCheck } from './useNameCheck'
import { priceForType, addOnsWithPrices } from './pricing'
import { regionFromDigitalAddress, todayISO, splitFullName, personDisplayName, missingPersonFields, missingLine } from './helpers'
import { results as typeRequirements } from '../../choose/quiz'


// =====================================================
// Small presentational helpers
// =====================================================

// Initial values, shared by a fresh form and by "Start over"
const initialFormData = () => ({
  // Business Details
  businessName: '',
  businessNameAlt: '',
  businessSector: '',
  businessSectorOther: '',
  natureOfBusiness: '',
  dateOfCommencement: todayISO(),

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

const initialCompanyDetails = () => ({
  constitutionType: 'standard', // 'standard' (Schedule 2 of Act 992) or 'custom'
  objectsOfCompany: '',
  authorizedShares: '',
  issuedShares: '',
  statedCapital: '',
  auditorName: '',
  auditorFirm: '',
  auditorLicense: '',
  beneficialOwnerName: '',
  beneficialOwnerNationality: 'Ghanaian',
  beneficialOwnerAddress: '',
  beneficialOwnerDOB: '',
})

const initialDeliveryAddress = () => ({
  street: '',
  city: '',
  region: '',
  digitalAddress: '',
  phone: '',
  recipientName: '',
})

// How each business type is presented on the first step: plain-English, one accent colour each
const TYPE_PRESENTATION: Record<string, { icon: LucideIcon; accent: string; tagline: string }> = {
  sole_proprietorship: {
    icon: User,
    accent: 'var(--accent-blue)',
    tagline: 'Just you, trading under a business name.',
  },
  limited_by_shares: {
    icon: Building2,
    accent: 'var(--accent-green)',
    tagline: 'A company that keeps your personal assets separate.',
  },
  limited_by_guarantee: {
    icon: HeartHandshake,
    accent: 'var(--accent-gold)',
    tagline: 'For NGOs, charities and associations.',
  },
}

function StepNav({
  onBack,
  onSave,
  saving,
  saveDisabled,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  nextId,
  missing,
}: {
  onBack?: () => void
  onSave: () => void
  saving: boolean
  saveDisabled?: boolean
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextId?: string
  /** Human-readable list of what still blocks Continue */
  missing?: string[]
}) {
  const blocked = nextDisabled || (missing?.length ?? 0) > 0
  return (
    <>
    {missing && missing.length > 0 && (
      <div className={styles.missing} role="status">
        <span className={styles.missingTitle}>To continue, add:</span>
        <ul>
          {missing.slice(0, 6).map((m) => <li key={m}>{m}</li>)}
          {missing.length > 6 && <li>and {missing.length - 6} more</li>}
        </ul>
      </div>
    )}
    <div className={styles.stepNav}>
      {onBack ? (
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
      ) : (
        <span />
      )}
      <div className={styles.navRight}>
        <button type="button" className="btn btn-secondary" onClick={onSave} disabled={saving || saveDisabled}>
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={blocked} id={nextId}>
          {nextLabel} <ArrowRight size={16} />
        </button>
      </div>
    </div>
    </>
  )
}

/** "Fill from" shortcuts that copy someone already entered */
function CopyChips({ label, options }: { label: string; options: Array<{ key: string; text: string; onClick: () => void }> }) {
  if (options.length === 0) return null
  return (
    <div className={styles.copyChips}>
      <span className={styles.copyLabel}>{label}</span>
      {options.map((o) => (
        <button key={o.key} type="button" className={styles.chip} onClick={o.onClick}>
          {o.text}
        </button>
      ))}
    </div>
  )
}

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
    const { total, timeline } = priceForType(t.id, dbBusinessTypes)
    return { ...t, price: total, timeline }
  })

  const dynamicAddOns = addOnsWithPrices(dbServices)

  // ---- Common fields (both Form A & Form 3) ----
  const [formData, setFormData] = useState(initialFormData)


  // Live ORC checks for the main and backup names
  const nameCheck = useNameCheck(formData.businessName)
  const altNameCheck = useNameCheck(formData.businessNameAlt)

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
  const [companyDetails, setCompanyDetails] = useState(initialCompanyDetails)
  // Founders without an auditor yet can add one after submitting
  const [auditorLater, setAuditorLater] = useState(false)
  // Issued shares / stated capital follow the shareholder table until edited by hand
  const [capitalAuto, setCapitalAuto] = useState(true)


  // ---- Delivery Details ----
  const [deliveryMethod, setDeliveryMethod] = useState<'digital' | 'courier'>('digital')
  const [deliveryAddress, setDeliveryAddress] = useState(initialDeliveryAddress)


  const [isDraftLoaded, setIsDraftLoaded] = useState(false)
  // The saved (database) draft this form is editing, so "Start over" can discard it
  const draftIdRef = useRef<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Fresh application: start the owner and contact details from the signed-in account
  const prefillFromAccount = async () => {
    const me = await getMyProfile()
    if (!me) return
    const fullName = me.profile?.full_name || (me.user?.user_metadata?.full_name as string | undefined) || ''
    const phone = me.profile?.phone || (me.user?.user_metadata?.phone as string | undefined) || ''
    const rawEmail = me.profile?.email || me.user?.email || ''
    const email = rawEmail.endsWith('@graydocket.user') ? '' : rawEmail
    const name = splitFullName(fullName)
    const fill = (p: PersonEntry): PersonEntry => ({
      ...p,
      firstName: p.firstName || name.firstName,
      otherNames: p.otherNames || name.otherNames,
      surname: p.surname || name.surname,
      phone: p.phone || phone,
      email: p.email || email,
    })
    setProprietor(fill)
    setDirectors((prev) => (prev.length ? [fill(prev[0]), ...prev.slice(1)] : prev))
    setFormData((prev) => ({ ...prev, mobilePhone: prev.mobilePhone || phone, email: prev.email || email }))
  }


  // Load from DB (prioritize) or LocalStorage (fallback)
  useEffect(() => {
    // A ?type= link (e.g. from the landing page guide) preselects the business type,
    // restarting at the first step if it differs from a saved draft's type
    const applyTypeParam = (draftType?: string | null) => {
      const urlType = searchParams.get('type')
      if (!urlType || !businessTypes.some((t) => t.id === urlType)) return
      setSelectedType(urlType)
      if (draftType && draftType !== urlType) setStep(0)
      // A name checked in the business-type quiz comes through as ?name=
      const urlName = searchParams.get('name')?.trim().slice(0, 120)
      if (urlName) setFormData((prev) => ({ ...prev, businessName: urlName }))
    }

    async function loadDraft() {
      // 1. Try DB
      const { draft } = await getLatestDraft()
      if (draft && draft.form_data) {
        draftIdRef.current = draft.id
        const data = draft.form_data as any
        if (data.currentStep !== undefined) setStep(data.currentStep)
        if (data.businessType) setSelectedType(data.businessType)
        if (data.selectedAddOns) setSelectedAddOns(data.selectedAddOns)
        if (data.formData) setFormData(data.formData)
        if (data.proprietor) setProprietor(data.proprietor)
        if (data.directors) setDirectors(data.directors)
        if (data.secretary) setSecretary(data.secretary)
        if (data.shareholders) setShareholders(data.shareholders)
        if (data.companyDetails) { setCompanyDetails(data.companyDetails); setAuditorLater(Boolean(data.companyDetails.auditorLater)); setCapitalAuto(data.companyDetails.capitalAuto ?? !data.companyDetails.issuedShares) }
        if (data.deliveryMethod) setDeliveryMethod(data.deliveryMethod)
        if (data.deliveryAddress) setDeliveryAddress(data.deliveryAddress)
        if (data.affiliateCode && !searchParams.get('ref')) setAffiliateCode(data.affiliateCode)
        applyTypeParam(data.businessType)
        setIsDraftLoaded(true)
        return
      }

      // 2. Fallback to LocalStorage
      const saved = localStorage.getItem('graydocket_draft')
      if (!saved) prefillFromAccount()
      let savedType: string | null = null
      if (saved) {
        try {
          const data = JSON.parse(saved)
          if(data.step !== undefined) setStep(data.step)
          if(data.selectedType !== undefined) setSelectedType(data.selectedType)
          savedType = data.selectedType
          if(data.selectedAddOns) setSelectedAddOns(data.selectedAddOns)
          if(data.formData) setFormData(data.formData)
          if(data.proprietor) setProprietor(data.proprietor)
          if(data.directors) setDirectors(data.directors)
          if(data.secretary) setSecretary(data.secretary)
          if(data.shareholders) setShareholders(data.shareholders)
          if(data.companyDetails) { setCompanyDetails(data.companyDetails); setAuditorLater(Boolean(data.companyDetails.auditorLater)); setCapitalAuto(data.companyDetails.capitalAuto ?? !data.companyDetails.issuedShares) }
          if(data.deliveryMethod) setDeliveryMethod(data.deliveryMethod)
          if(data.deliveryAddress) setDeliveryAddress(data.deliveryAddress)
          if(data.affiliateCode && !searchParams.get('ref')) setAffiliateCode(data.affiliateCode)
        } catch (e) {
          console.error("Draft load failed", e)
        }
      }
      applyTypeParam(savedType)
      setIsDraftLoaded(true)
    }
    loadDraft()
  }, [])

  // Auto-save to LocalStorage
  useEffect(() => {
    if(!isDraftLoaded) return;
    const appState = { step, selectedType, selectedAddOns, formData, proprietor, directors, secretary, shareholders, companyDetails: { ...companyDetails, auditorLater, capitalAuto }, deliveryMethod, deliveryAddress, affiliateCode }
    localStorage.setItem('graydocket_draft', JSON.stringify(appState))
  }, [step, selectedType, selectedAddOns, formData, proprietor, directors, secretary, shareholders, companyDetails, auditorLater, capitalAuto, deliveryMethod, deliveryAddress, affiliateCode, isDraftLoaded])

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
      companyDetails: { ...companyDetails, auditorLater, capitalAuto },
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
    else if (res.applicationId) draftIdRef.current = res.applicationId
    setSavingDraft(false)
  }

  // Start over: discard the saved draft (database and browser), reset every field in place,
  // drop any ?type=/&name= from the URL, then refill the owner's details from the account
  const handleStartOver = async () => {
    setResetting(true)
    if (draftIdRef.current) {
      const res = await discardDraft(draftIdRef.current)
      if (res.error) console.error('Draft discard failed:', res.error)
      draftIdRef.current = null
    }
    localStorage.removeItem('graydocket_draft')

    setStep(0)
    setSelectedType(null)
    setSelectedAddOns([])
    setFormData(initialFormData())
    setProprietor({ ...emptyPerson })
    setDirectors([{ ...emptyPerson }, { ...emptyPerson }])
    setSecretary({ ...emptyPerson })
    setShareholders([{ ...emptyShareholder }])
    setCompanyDetails(initialCompanyDetails())
    setAuditorLater(false)
    setCapitalAuto(true)
    setDeliveryMethod('digital')
    setDeliveryAddress(initialDeliveryAddress())
    setSubmitError('')

    if (searchParams.get('type') || searchParams.get('name')) router.replace(pathname)
    setConfirmingReset(false)
    setResetting(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    void prefillFromAccount()
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
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      // Fill the region from the digital address when it can be inferred and hasn't been chosen
      if (field === 'digitalAddress' && !prev.region) {
        const region = regionFromDigitalAddress(value)
        if (region) next.region = region
      }
      return next
    })
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
    if (field === 'issuedShares' || field === 'statedCapital' || field === 'authorizedShares') setCapitalAuto(false)
    setCompanyDetails((prev) => ({ ...prev, [field]: value }))
  }

  // Keep share totals in step with the shareholder table until the user overrides them
  const toNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, '')) || 0
  const totalShares = shareholders.reduce((sum, sh) => sum + toNumber(sh.numberOfShares), 0)
  const totalCapital = shareholders.reduce((sum, sh) => sum + toNumber(sh.numberOfShares) * toNumber(sh.valuePerShare), 0)
  useEffect(() => {
    if (!capitalAuto || totalShares === 0) return
    setCompanyDetails((prev) => ({
      ...prev,
      issuedShares: String(totalShares),
      authorizedShares: prev.authorizedShares && toNumber(prev.authorizedShares) >= totalShares ? prev.authorizedShares : String(totalShares),
      statedCapital: totalCapital ? String(Math.round(totalCapital * 100) / 100) : prev.statedCapital,
    }))
  }, [capitalAuto, totalShares, totalCapital])

  // ---- Reuse people already entered ----
  const namedDirectors = directors
    .map((d, i) => ({ d, i, name: personDisplayName(d) }))
    .filter((x) => x.name)

  const copySecretaryFrom = (person: PersonEntry) =>
    setSecretary({ ...person, idPhotos: [...(person.idPhotos || [])] })

  const addPersonAsShareholder = (person: PersonEntry) => {
    const entry: ShareholderEntry = {
      ...emptyShareholder,
      type: 'individual',
      name: personDisplayName(person),
      tinNumber: person.tinNumber,
      nationality: person.nationality || 'Ghanaian',
      address: [person.residentialAddress, person.city, person.region].filter(Boolean).join(', '),
    }
    setShareholders((prev) => {
      // Fill the first blank row before adding a new one
      const blank = prev.findIndex((sh) => !sh.name.trim())
      if (blank === -1) return [...prev, entry]
      const next = [...prev]
      next[blank] = { ...entry, numberOfShares: prev[blank].numberOfShares, valuePerShare: prev[blank].valuePerShare }
      return next
    })
  }

  const fillBeneficialOwner = (person: PersonEntry) =>
    setCompanyDetails((prev) => ({
      ...prev,
      beneficialOwnerName: personDisplayName(person),
      beneficialOwnerNationality: person.nationality || prev.beneficialOwnerNationality,
      beneficialOwnerDOB: person.dateOfBirth || prev.beneficialOwnerDOB,
      beneficialOwnerAddress: [person.residentialAddress, person.city, person.region].filter(Boolean).join(', ') || prev.beneficialOwnerAddress,
    }))

  // ---- What's still missing on each step (same rules that gate Continue) ----
  const step1Missing = [
    !formData.businessName.trim() && 'Business name',
    !formData.businessSector && 'Business sector',
    !formData.natureOfBusiness.trim() && 'Description of activities',
    !formData.city.trim() && 'City / town',
    !formData.region && 'Region',
  ].filter(Boolean) as string[]

  const proprietorMissing = [
    missingLine('Proprietor', missingPersonFields(proprietor, ['surname', 'firstName', 'ghanaCardNumber', 'tinNumber', 'phone', 'email'])),
  ].filter(Boolean) as string[]

  const directorsMissing = directors
    .map((d, i) => missingLine(`Director ${i + 1}`, missingPersonFields(d, ['surname', 'firstName', 'ghanaCardNumber', 'tinNumber'])))
    .filter(Boolean) as string[]

  const step3Missing = [
    missingLine('Secretary', missingPersonFields(secretary, ['surname', 'firstName'])),
    ...shareholders.map((sh, i) =>
      missingLine(`Shareholder ${i + 1}`, [!sh.name.trim() && 'Name', !sh.tinNumber.trim() && 'TIN'].filter(Boolean) as string[])
    ),
  ].filter(Boolean) as string[]

  const deliveryMissing = deliveryMethod === 'courier'
    ? ([
        !deliveryAddress.recipientName && 'Recipient name',
        !deliveryAddress.street && 'Street address',
        !deliveryAddress.city && 'City',
        !deliveryAddress.phone && 'Phone',
      ].filter(Boolean) as string[])
    : []

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
            companyDetails: { ...companyDetails, auditorLater, capitalAuto },
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
             <span className={styles.attachedBadge}>
               {person.idPhotos?.length ? `${person.idPhotos.length} photo${person.idPhotos.length > 1 ? 's' : ''}` : 'Photo attached'}
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
            <div className={styles.successIcon}><CheckCircle2 size={30} strokeWidth={1.75} /></div>
            <h2>Application submitted</h2>
            <p>Your {selectedBusiness?.name} registration is in. We&apos;ll take it from here and keep you updated at every step.</p>
            <div className={styles.trackingBox}>
              <label>Your Tracking ID</label>
              <span>{resultTrackingId}</span>
            </div>
            <p>Use this ID to track your application at any time.</p>
            <div className={styles.successActions}>
              <Link href="/dashboard" className="btn btn-primary">Back to your businesses</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.newReg}>
      <div className={styles.progressHead}>
        <span className={styles.progressMeta}>
          Step {step + 1} of {progressSteps.length} · <strong>{progressSteps[step]?.label}</strong>
        </span>
        {!confirmingReset && (
          <button type="button" className={styles.textBtn} onClick={() => setConfirmingReset(true)}>Start over</button>
        )}
      </div>
      {confirmingReset && (
        <div className={styles.resetConfirm} role="alertdialog" aria-labelledby="reset-title">
          <div>
            <p id="reset-title" className={styles.resetTitle}>Start over?</p>
            <p className={styles.resetText}>
              This clears every answer and deletes your saved draft. You can&apos;t undo this.
            </p>
          </div>
          <div className={styles.resetActions}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingReset(false)} disabled={resetting}>
              Keep my progress
            </button>
            <button type="button" className={`btn btn-sm ${styles.resetDanger}`} onClick={handleStartOver} disabled={resetting}>
              {resetting ? 'Clearing…' : 'Start over'}
            </button>
          </div>
        </div>
      )}
      <div className={styles.progressTrack} aria-hidden="true">
        {progressSteps.map((ps, i) => (
          <div
            key={ps.label}
            className={`${styles.progressSeg} ${i < step ? styles.segDone : i === step ? styles.segActive : ''}`}
          />
        ))}
      </div>

      {/* ============ Step 0: Business Type ============ */}
      {step === 0 && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>What are you registering?</h2>
          <p className={styles.stepDesc}>
            We&apos;ll handle the ORC filing.{' '}
            <Link href="/dashboard/choose" className={styles.quizLink}>Not sure? Take the quiz</Link>
          </p>
          <div className={styles.typeGrid} role="radiogroup" aria-label="Business type">
            {dynamicBusinessTypes.map((type: any) => {
              const look = TYPE_PRESENTATION[type.id]
              const Icon = look?.icon ?? Building2
              const isSelected = selectedType === type.id
              const needs = typeRequirements[type.id as keyof typeof typeRequirements]?.requirements ?? []
              return (
                <div
                  key={type.id}
                  className={`${styles.typeOption} ${isSelected ? styles.selected : ''} ${type.comingSoon ? styles.disabled : ''}`}
                  style={{ '--accent': look?.accent ?? '#9ca3af' } as React.CSSProperties}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={styles.typeCard}
                    onClick={() => !type.comingSoon && setSelectedType(type.id)}
                    disabled={type.comingSoon}
                    id={`type-${type.id}`}
                  >
                    <span className={styles.typeIcon}>
                      <Icon size={20} strokeWidth={2} />
                      {isSelected && (
                        <span className={styles.typeCheck}><Check size={11} strokeWidth={3.5} /></span>
                      )}
                    </span>
                    <span className={styles.typeBody}>
                      <span className={styles.typeTitleRow}>
                        <span className={styles.typeName}>{type.name}</span>
                        {type.comingSoon && <span className={styles.typeBadge}>Coming soon</span>}
                      </span>
                      <span className={styles.typeTagline}>{look?.tagline ?? type.desc}</span>
                    </span>
                    <span className={styles.typePrice}>GH₵ {type.price.toLocaleString()}</span>
                  </button>

                  {isSelected && needs.length > 0 && (
                    <div className={styles.typeNeeds}>
                      <span className={styles.typeNeedsTitle}>
                        You&apos;ll need
                        {type.timeline && (
                          <span className={styles.typeNeedsTime}>
                            <Clock size={12} /> {String(type.timeline).replace(/(\d)\s*-\s*(\d)/g, '$1–$2')}
                          </span>
                        )}
                      </span>
                      <ul>
                        {needs.slice(0, 3).map((n) => (
                          <li key={n}><Check size={14} strokeWidth={2.5} /> {n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <StepNav
            onSave={handleSaveDraft}
            saving={savingDraft}
            saveDisabled={!selectedType}
            onNext={() => setStep(1)}
            nextDisabled={!selectedType}
            nextId="next-step-0"
          />
        </div>
      )}

      {/* ============ Step 1: Business / Company Information ============ */}
      {step === 1 && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>
            {isCompany ? 'Tell us about your company' : 'Tell us about your business'}
          </h2>
          <p className={styles.stepDesc}>
            Fields marked * are required on ORC {selectedBusiness?.formRef}.
          </p>

          {/* Business / Company Name */}
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
                onFocus={warmNameCheck}
                required
              />
              <span className="form-hint">
                {isCompany
                  ? 'Name must end with "Limited" or "LTD" for private companies. We\'ll conduct a name search with ORC.'
                  : 'We\'ll conduct a name search with ORC to ensure availability. Use block letters, no abbreviations.'}
              </span>

              <NameCheck
                checking={nameCheck.checking}
                result={nameCheck.result}
                onRetry={nameCheck.retry}
              />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="businessNameAlt">Alternative Name (optional)</label>
              <input id="businessNameAlt" type="text" className="form-input" placeholder="Backup name if first choice is unavailable" value={formData.businessNameAlt} onChange={(e) => handleInputChange('businessNameAlt', e.target.value)} onFocus={warmNameCheck} />
              
              <NameCheck
                checking={altNameCheck.checking}
                result={altNameCheck.result}
                onRetry={altNameCheck.retry}
              />
            </div>
          </div>

          {/* Nature of Business */}
          <div className={styles.formSectionTitle}>Nature of Business</div>
          <div className={styles.formGrid}>
            <div className={`form-group ${formData.businessSector === 'Other (specify below)' ? '' : styles.formFull}`}>
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
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="natureOfBusiness">
                {isCompany ? 'Objects of the Company / Description of Activities *' : 'Description of Business Activities *'}
              </label>
              <textarea id="natureOfBusiness" className="form-input" placeholder="Describe the specific activities and services..." rows={3} value={formData.natureOfBusiness} onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)} required />
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
              <span className="form-hint">Get yours from the Ghana Post GPS app. We&apos;ll fill in the region where we can.</span>
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="postalAddress">Postal Address (optional)</label>
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
              <label className="form-label" htmlFor="alternatePhone">Alternate Phone (optional)</label>
              <input id="alternatePhone" type="tel" className="form-input" placeholder="+233 XXX XXX XXX" value={formData.alternatePhone} onChange={(e) => handleInputChange('alternatePhone', e.target.value)} />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="contactEmail">Email *</label>
              <input id="contactEmail" type="email" className="form-input" placeholder="company@example.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
            </div>
          </div>

          <StepNav
            onBack={() => setStep(0)}
            onSave={handleSaveDraft}
            saving={savingDraft}
            onNext={() => setStep(2)}
            missing={step1Missing}
            nextId="next-step-1"
          />
        </div>
      )}

      {/* ============ Step 2: Person(s) ============ */}
      {/* SOLE PROPRIETORSHIP: Single Proprietor */}
      {step === 2 && !isCompany && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Proprietor Details</h2>
          <p className={styles.stepDesc}>Personal information of the business owner as required on ORC Form A.</p>
          <PersonForm person={proprietor} onChange={handleProprietorChange} prefix="prop" title="Proprietor" />
          <StepNav
            onBack={() => setStep(1)}
            onSave={handleSaveDraft}
            saving={savingDraft}
            onNext={() => setStep(3)}
            missing={proprietorMissing}
            nextId="next-step-2"
          />
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
              {directors.length > 2 && (
                <div className={styles.personBlockActions}>
                  <button className={`btn btn-ghost btn-sm ${styles.removeBtn}`} onClick={() => removeDirector(index)} type="button">
                    <Trash2 size={14} /> Remove director {index + 1}
                  </button>
                </div>
              )}
              <PersonForm person={director} onChange={(f,v) => handleDirectorChange(index, f, v)} prefix={`dir-${index}`} title={`Director ${index + 1}`} />
            </div>
          ))}

          <button className={`btn btn-secondary ${styles.addPersonBtn}`} onClick={addDirector} type="button">
            <Plus size={16} /> Add Another Director
          </button>

          <StepNav
            onBack={() => setStep(1)}
            onSave={handleSaveDraft}
            saving={savingDraft}
            onNext={() => setStep(3)}
            missing={directorsMissing}
            nextId="next-step-2"
          />
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
            <CopyChips
              label="Same as"
              options={namedDirectors.map(({ d, i, name }) => ({ key: `sec-${i}`, text: name, onClick: () => copySecretaryFrom(d) }))}
            />
            <PersonForm person={secretary} onChange={handleSecretaryChange} prefix="sec" title="Company secretary" />
          </div>

          {/* Shareholders */}
          <div className={styles.formSectionTitle}>Shareholders</div>
          <CopyChips
            label="Add as shareholder"
            options={namedDirectors
              .filter(({ name }) => !shareholders.some((sh) => sh.name.trim().toLowerCase() === name.toLowerCase()))
              .map(({ d, i, name }) => ({ key: `sh-${i}`, text: `+ ${name}`, onClick: () => addPersonAsShareholder(d) }))}
          />
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
                    {capitalAuto && totalShares > 0
                      ? 'Calculated from your shareholders. Edit any figure if it’s different.'
                      : 'Under Act 992, shares are no-par-value. The stated capital is the aggregate of considerations received for issued shares.'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Auditor */}
          <div className={styles.formSectionTitle}>Auditor</div>
          <label className={styles.laterToggle}>
            <input type="checkbox" checked={auditorLater} onChange={(e) => setAuditorLater(e.target.checked)} />
            <span>I don&apos;t have an auditor yet. I&apos;ll add one later.</span>
          </label>
          {auditorLater ? (
            <p className={styles.laterNote}>
              No problem. You can submit now, and we&apos;ll ask for your auditor&apos;s details before we file. We can also
              recommend a licensed auditor.
            </p>
          ) : (
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="auditorName">Auditor Name *</label>
              <input id="auditorName" type="text" className="form-input" placeholder="Full name of licensed auditor" value={companyDetails.auditorName} onChange={(e) => handleCompanyDetailChange('auditorName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auditorFirm">Audit Firm (optional)</label>
              <input id="auditorFirm" type="text" className="form-input" placeholder="Name of audit firm" value={companyDetails.auditorFirm} onChange={(e) => handleCompanyDetailChange('auditorFirm', e.target.value)} />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="auditorLicense">ICAG License Number *</label>
              <input id="auditorLicense" type="text" className="form-input" placeholder="Auditor's ICAG license number" value={companyDetails.auditorLicense} onChange={(e) => handleCompanyDetailChange('auditorLicense', e.target.value)} required />
              <span className="form-hint">A consent letter from the auditor will be required</span>
            </div>
          </div>
          )}

          {/* Beneficial Ownership */}
          <div className={styles.formSectionTitle}>Beneficial Ownership</div>
          <CopyChips
            label="Same as"
            options={namedDirectors.map(({ d, i, name }) => ({ key: `bo-${i}`, text: name, onClick: () => fillBeneficialOwner(d) }))}
          />
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

          <StepNav
            onBack={() => setStep(2)}
            onSave={handleSaveDraft}
            saving={savingDraft}
            onNext={() => setStep(4)}
            missing={step3Missing}
            nextId="next-step-3"
          />
        </div>
      )}

      {/* ============ Add-Ons Step ============ */}
      {step === (isCompany ? 4 : 3) && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Add extras</h2>
          <p className={styles.stepDesc}>Optional services you can bundle with your registration.</p>

          <div className={styles.addOnGrid}>
            {dynamicAddOns.filter(a => a.id !== 'bank').map((addon) => (
              <button
                key={addon.id}
                type="button"
                className={`${styles.addOnCard} ${selectedAddOns.includes(addon.id) ? styles.selected : ''}`}
                onClick={() => toggleAddOn(addon.id)}
                aria-pressed={selectedAddOns.includes(addon.id)}
                id={`addon-${addon.id}`}
              >
                <span className={`${styles.addOnCheck} ${selectedAddOns.includes(addon.id) ? styles.checked : ''}`}>
                  {selectedAddOns.includes(addon.id) && <Check size={14} strokeWidth={3} />}
                </span>
                <span className={styles.addOnBody}>
                  <h4>{addon.name}</h4>
                  <p>{addon.desc}</p>
                </span>
                <span className={styles.addOnPrice}>{addon.price === 0 ? 'Free' : `GH₵ ${addon.price}`}</span>
              </button>
            ))}
          </div>

          <div className={styles.totalBar}>
            <span className={styles.totalLabel}>Estimated Total</span>
            <span className={styles.totalAmount}>GH₵ {totalPrice.toLocaleString()}</span>
          </div>

          <StepNav
            onBack={() => setStep(step - 1)}
            onSave={handleSaveDraft}
            saving={savingDraft}
            onNext={() => setStep(step + 1)}
            nextLabel="Continue to delivery"
          />
        </div>
      )}

      {/* ============ Step: Delivery Preference ============ */}
      {progressSteps[step]?.label === 'Delivery' && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>How should we deliver your documents?</h2>
          <p className={styles.stepDesc}>Choose how you&apos;d like to receive your official registration documents.</p>

          <div className={styles.typeGrid}>
            <button
              type="button"
              className={`${styles.typeCard} ${deliveryMethod === 'digital' ? styles.selected : ''}`}
              onClick={() => setDeliveryMethod('digital')}
              aria-pressed={deliveryMethod === 'digital'}
            >
              <span className={styles.typeRadio} />
              <span className={styles.typeBody}>
                <h3>Digital only</h3>
                <p>PDF certificates by email and in your Documents.</p>
              </span>
              <span className={styles.typePrice}>Free</span>
            </button>
            <button
              type="button"
              className={`${styles.typeCard} ${deliveryMethod === 'courier' ? styles.selected : ''}`}
              onClick={() => setDeliveryMethod('courier')}
              aria-pressed={deliveryMethod === 'courier'}
            >
              <span className={styles.typeRadio} />
              <span className={styles.typeBody}>
                <h3>Courier delivery</h3>
                <p>Printed documents delivered to your door by our courier partner.</p>
              </span>
              <span className={styles.typePrice}>GH₵ {deliveryFee.toLocaleString()}</span>
            </button>
          </div>

          {deliveryMethod === 'courier' && (
            <div className={styles.deliveryForm}>
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

          <StepNav
            onBack={() => setStep(step - 1)}
            onSave={handleSaveDraft}
            saving={savingDraft}
            onNext={() => setStep(step + 1)}
            nextLabel="Continue to review"
            missing={deliveryMissing}
          />
        </div>
      )}

      {/* ============ Review Step ============ */}
      {step === lastStep && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Review and pay</h2>
          <p className={styles.stepDesc}>Check everything carefully. You can go back to change any step.</p>

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
              {auditorLater ? (
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Status</span>
                  <span className={styles.reviewValue}>To be added after submitting</span>
                </div>
              ) : (
              <>
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
              </>
              )}
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

          <div className={styles.referral}>
            <h3>Referral code</h3>
            <p>Did someone refer you? Enter their code so they get credit.</p>
            <input
              type="text"
              className={`form-input ${styles.referralInput}`}
              placeholder="e.g. OTH74D"
              aria-label="Referral code"
              value={affiliateCode}
              onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
            />
          </div>

          <div className={styles.totalBar}>
            <span className={styles.totalLabel}>Total Amount</span>
            <span className={styles.totalAmount}>GH₵ {totalPrice.toLocaleString()}</span>
          </div>

          <div className={styles.disclaimerBanner}>
            <div className={styles.disclaimerIcon}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4>About timelines</h4>
              <p>
                The {selectedBusiness?.timeline} estimate depends on the ORC&apos;s processing. Registry maintenance or name queries can occasionally cause delays. We&apos;ll update your dashboard and text you at every step.
              </p>
            </div>
          </div>

          {submitError && <div className={styles.submitError}>{submitError}</div>}

          <div className={styles.stepNav}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(lastStep - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={handlePayAndSubmit} disabled={submitting} id="submit-application">
              {submitting ? 'Processing payment…' : `Pay GH₵ ${totalPrice.toLocaleString()} and submit`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewRegistrationContent
