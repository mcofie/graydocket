'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Check, ArrowLeft, ArrowRight, Plus, Trash2, Clock, AlertTriangle, CheckCircle2, User, Building2, HeartHandshake, Info, type LucideIcon } from 'lucide-react'
import { usePaystackPayment } from 'react-paystack'
import { startCheckout, confirmPayment } from '@/lib/checkout'
import { 
  getBusinessTypes, 
  saveApplicationDraft, getDraft, getMyDrafts, getServices, getMyProfile, discardDraft
} from '@/lib/actions'
import styles from './new.module.css'
import {
  businessTypes, businessSectors, ghanaRegions,
  PersonEntry, emptyPerson, ShareholderEntry, emptyShareholder
} from './constants'
import PersonForm from './PersonForm'
import NameCheck from './NameCheck'
import DomainCheck from './DomainCheck'
import ResumeDrafts, { type SavedDraft } from './ResumeDrafts'
import { useNameCheck, warmNameCheck } from './useNameCheck'
import { priceForType, addOnsWithPrices, courierFeeFrom, quoteApplication, type DbBusinessType } from './pricing'
import { regionFromDigitalAddress, todayISO, splitFullName, personDisplayName, isValidPhone, type Issue } from './helpers'
import { businessIssues, proprietorIssues, directorIssues, secretaryIssues, ownershipIssues } from './validation'
import { useStepErrors, IssueList } from './StepErrors'
import OwnershipSection, { CopyChips } from './OwnershipSection'
import { districtsFor } from './districts'
import { useDirectorInvites, awaitingInvite } from './useDirectorInvites'
import DirectorInvite, { DirectorInviteTip } from './DirectorInvite'
import { results as typeRequirements } from '../../choose/quiz'


// =====================================================
// Small presentational helpers
// =====================================================

// Initial values, shared by a fresh form and by "Start over"
const initialFormData = () => ({
  // Business Details
  businessName: '',
  businessNameAlt: '',
  // Website address picked under the name (adds the Domain Name add-on)
  preferredDomain: '',
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
  issues = [],
  showIssues,
  onJump,
  saveError,
}: {
  onBack?: () => void
  onSave: () => void
  saving: boolean
  saveDisabled?: boolean
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextId?: string
  /** What still needs fixing on this step (Continue stays clickable and points to these) */
  issues?: Issue[]
  /** Continue was pressed with problems: show the list */
  showIssues?: boolean
  onJump?: (issue: Issue) => void
  /** Why the last save failed, shown above the buttons */
  saveError?: string
}) {
  return (
    <>
    <IssueList issues={issues} show={Boolean(showIssues)} onJump={(i) => onJump?.(i)} />
    {saveError && <p className={styles.saveErrorNote} role="alert">{saveError}</p>}
    <div className={styles.stepNav}>
      {onBack ? (
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
      ) : (
        <span />
      )}
      <div className={styles.navRight}>
        <button type="button" className="btn btn-secondary" onClick={() => onSave()} disabled={saving || saveDisabled}>
          {saving ? 'Saving…' : 'Save and exit'}
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={nextDisabled} id={nextId}>
          {nextLabel} <ArrowRight size={16} />
        </button>
      </div>
    </div>
    </>
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
  // Last database save, shown by the step counter ("Saved 2:41 pm" or why it failed)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState('')
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
  // Prices come from the database through the shared pricing helpers (./pricing), the same ones
  // the server uses to charge, so the total shown here is exactly what checkout asks for
  const [dbBusinessTypes, setDbBusinessTypes] = useState<DbBusinessType[]>([])
  const [dbServices, setDbServices] = useState<Array<{ name: string; price: number; is_active?: boolean | null }>>([])

  useEffect(() => {
    getBusinessTypes().then((types) => {
      if (types.length > 0) setDbBusinessTypes(types)
    })
    getServices().then((res) => {
      if (res.services) setDbServices(res.services)
    })
  }, [])
  const deliveryFee = courierFeeFrom(dbServices)

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
  // The same id as state, for things that render from it (invite links)
  const [draftId, setDraftId] = useState<string | null>(null)
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


  // ---- Which application this form is for ----
  // /dashboard/applications/new             a blank form (saved drafts are offered in a banner)
  // /dashboard/applications/new?draft=<id>   continue that saved draft
  // Unsaved typing is kept in the browser per draft, so a reload doesn't lose it.
  const draftParam = searchParams.get('draft')
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([])
  const [draftMissing, setDraftMissing] = useState(false)
  const localKey = (id: string | null) => `graydocket_draft:${id || 'new'}`

  useEffect(() => {
    // A ?type= link (e.g. from the quiz or a guide) preselects the business type on a blank form
    const applyTypeParam = () => {
      const urlType = searchParams.get('type')
      if (!urlType || !businessTypes.some((t) => t.id === urlType)) return
      setSelectedType(urlType)
      const urlName = searchParams.get('name')?.trim().slice(0, 120)
      if (urlName) setFormData((prev) => ({ ...prev, businessName: urlName }))
    }

    /** Fill the form from a saved state: a database draft (either saved shape) or the browser copy */
    const applySaved = (data: any) => {
      const type = data.selectedType ?? data.businessType ?? null
      if (type) setSelectedType(type)
      // Business fields are under formData in drafts, but at the top level once checkout has run
      const base = initialFormData()
      const business = data.formData && typeof data.formData === 'object'
        ? data.formData
        : Object.fromEntries(Object.keys(base).filter((k) => data[k] !== undefined).map((k) => [k, data[k]]))
      setFormData({ ...base, ...business })
      if (data.selectedAddOns) setSelectedAddOns(data.selectedAddOns)
      if (data.proprietor) setProprietor(data.proprietor)
      if (data.directors) setDirectors(data.directors)
      if (data.secretary) setSecretary(data.secretary)
      if (data.shareholders) setShareholders(data.shareholders)
      if (data.companyDetails) { setCompanyDetails({ ...initialCompanyDetails(), ...data.companyDetails }); setAuditorLater(Boolean(data.companyDetails.auditorLater)); setCapitalAuto(data.companyDetails.capitalAuto ?? !data.companyDetails.issuedShares) }
      const method = data.deliveryMethod ?? data.delivery_method
      if (method === 'courier' || method === 'digital') setDeliveryMethod(method)
      const address = data.deliveryAddress ?? data.delivery_address
      if (address) setDeliveryAddress({ ...initialDeliveryAddress(), ...address })
      if (data.affiliateCode && !searchParams.get('ref')) setAffiliateCode(data.affiliateCode)
      // Where to pick up: the saved step, or the review step for an application that's ready to pay
      const company = type === 'limited_by_shares' || type === 'limited_by_guarantee'
      const saved = data.step ?? data.currentStep
      setStep(typeof saved === 'number' ? saved : data.ready_for_payment ? (company ? 6 : 5) : type ? 1 : 0)
    }

    const readLocal = (id: string | null) => {
      try {
        const raw = localStorage.getItem(localKey(id))
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    }

    async function load() {
      // The single shared copy used before drafts were kept apart
      try { localStorage.removeItem('graydocket_draft') } catch {}
      getMyDrafts().then((r) => setSavedDrafts(r.drafts))

      if (draftParam) {
        const { draft } = await getDraft(draftParam)
        if (draft) {
          draftIdRef.current = draft.id
          setDraftId(draft.id)
          applySaved(readLocal(draft.id) || draft.form_data || {})
          setIsDraftLoaded(true)
          return
        }
        // Paid, deleted, or someone else's: start a blank form and say so
        setDraftMissing(true)
      }

      // A blank form, with the owner's details from their account
      try { localStorage.removeItem(localKey(null)) } catch {}
      void prefillFromAccount()
      applyTypeParam()
      setIsDraftLoaded(true)
    }
    load()
    // Runs once: the URL's draft decides what this page is for
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep unsaved typing in the browser for this draft
  useEffect(() => {
    if (!isDraftLoaded) return
    const appState = { step, selectedType, selectedAddOns, formData, proprietor, directors, secretary, shareholders, companyDetails: { ...companyDetails, auditorLater, capitalAuto }, deliveryMethod, deliveryAddress, affiliateCode }
    const key = localKey(draftId)
    // Browser storage holds about 5 MB. ID photos can exceed that, so if the full draft doesn't fit,
    // keep everything except the photos here (they're in the form and in the saved application)
    const noPhotos = (p: PersonEntry) => ({ ...p, idPhotos: [], ghanaCardPhotoUrl: '' })
    try {
      localStorage.setItem(key, JSON.stringify(appState))
    } catch {
      try {
        localStorage.setItem(key, JSON.stringify({
          ...appState,
          proprietor: noPhotos(proprietor),
          directors: directors.map(noPhotos),
          secretary: noPhotos(secretary),
        }))
      } catch {
        // Storage unavailable (private browsing): the database draft still works
      }
    }
  }, [step, selectedType, selectedAddOns, formData, proprietor, directors, secretary, shareholders, companyDetails, auditorLater, capitalAuto, deliveryMethod, deliveryAddress, affiliateCode, isDraftLoaded, draftId])

  /** Save to the database. Returns the application id (invites need one). */
  const handleSaveDraft = async (override?: { directors?: PersonEntry[] }): Promise<string | null> => {
    if (!selectedType) return null
    const dbTypeId = getDbBusinessTypeId()
    if (!dbTypeId) return null

    setSavingDraft(true)
    const fullState = {
      formData,
      proprietor,
      directors: override?.directors ?? directors,
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
      step,
      applicationId: draftIdRef.current,
    })

    if (res.error) {
      console.error('Draft save failed:', res.error)
      setSaveError('Couldn’t save just now. Your answers are kept on this device; try again in a moment.')
    } else if (res.applicationId) {
      setSaveError('')
      setSavedAt(new Date())
      const first = draftIdRef.current !== res.applicationId
      draftIdRef.current = res.applicationId
      setDraftId(res.applicationId)
      // Now it's saved, the address points at it, so a reload or a shared tab continues this one
      if (first) {
        try { localStorage.removeItem(localKey(null)) } catch {}
        router.replace(`${pathname}?draft=${res.applicationId}`, { scroll: false })
      }
    }
    setSavingDraft(false)
    return res.error ? null : draftIdRef.current
  }

  /** "Save and exit": save, then go to the application's page (it has "Continue application") */
  const handleSaveAndExit = async () => {
    const id = await handleSaveDraft()
    if (id) router.push(`/dashboard/applications/${id}`)
  }

  // Start over: discard the saved draft (database and browser), reset every field in place,
  // drop any ?type=/&name= from the URL, then refill the owner's details from the account
  const handleStartOver = async () => {
    setResetting(true)
    if (draftIdRef.current) {
      const res = await discardDraft(draftIdRef.current)
      if (res.error) console.error('Draft discard failed:', res.error)
      draftIdRef.current = null
      setDraftId(null)
    }
    try {
      localStorage.removeItem(localKey(draftIdRef.current))
      localStorage.removeItem(localKey(null))
    } catch {}

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

    if (searchParams.get('type') || searchParams.get('name') || searchParams.get('draft')) router.replace(pathname)
    setConfirmingReset(false)
    setResetting(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    void prefillFromAccount()
  }

  const [submitted, setSubmitted] = useState(false)

  const selectedBusiness = businessTypes.find((t) => t.id === selectedType)
  const isCompany = selectedType === 'limited_by_shares' || selectedType === 'limited_by_guarantee'

  // One quote drives the totals on screen and the business type row the application points at
  const quote = quoteApplication(
    { typeId: selectedType || '', addOnIds: selectedAddOns, delivery: deliveryMethod },
    dbBusinessTypes,
    dbServices
  )
  const totalPrice = quote.total
  const getDbBusinessTypeId = (): string | null => (selectedType ? quote.dbTypeId : null)

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

  /** Pick (or drop) a website address: it rides on the Domain Name add-on */
  const chooseDomain = (domain: string | null) => {
    setFormData((prev) => ({ ...prev, preferredDomain: domain || '' }))
    setSelectedAddOns((prev) => (domain ? (prev.includes('domain') ? prev : [...prev, 'domain']) : prev.filter((a) => a !== 'domain')))
  }

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
      // A district belongs to one region: clear it when the region changes
      if (next.region !== prev.region && prev.district && !districtsFor(next.region).includes(prev.district)) next.district = ''
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

  const setCompanyDetailsPatch = useCallback((patch: Record<string, string>) => setCompanyDetails((prev) => ({ ...prev, ...patch })), [])

  const handleCompanyDetailChange = (field: string, value: string) => {
    if (field === 'issuedShares' || field === 'statedCapital' || field === 'authorizedShares') setCapitalAuto(false)
    setCompanyDetails((prev) => ({ ...prev, [field]: value }))
  }

  // ---- Reuse people already entered ----
  const namedDirectors = directors
    .map((d, i) => ({ d, i, name: personDisplayName(d) }))
    .filter((x) => x.name)

  const copySecretaryFrom = (person: PersonEntry) =>
    setSecretary({ ...person, idPhotos: [...(person.idPhotos || [])] })

  // ---- Delivery address from details already entered ----
  const applicant = isCompany ? directors[0] : proprietor
  const businessStreet = [formData.buildingName, formData.streetName].filter(Boolean).join(', ')
  const deliveryFrom = (source: 'me' | 'business') => ({
    recipientName: personDisplayName(applicant),
    street: source === 'me' ? applicant?.residentialAddress || businessStreet : businessStreet,
    city: (source === 'me' && applicant?.city) || formData.city,
    region: (source === 'me' && applicant?.region) || formData.region,
    digitalAddress: (source === 'me' && applicant?.digitalAddress) || formData.digitalAddress,
    phone: applicant?.phone || formData.mobilePhone,
  })
  /** Fill only the empty delivery fields, so nothing typed is overwritten */
  const fillDeliveryBlanks = (source: 'me' | 'business') =>
    setDeliveryAddress((prev) => {
      const from = deliveryFrom(source)
      return Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v || from[k as keyof typeof from] || ''])) as typeof prev
    })
  const replaceDeliveryWith = (source: 'me' | 'business') => setDeliveryAddress({ ...deliveryFrom(source) })
  const chooseCourier = () => {
    setDeliveryMethod('courier')
    fillDeliveryBlanks('me')
  }

  // ---- What still needs fixing on each step: the shared rules in ./validation, also used by the edit
  // form and by the server. Continue stays clickable and points at the problems (./StepErrors). ----
  const isShares = selectedType === 'limited_by_shares'
  const step1Issues = businessIssues(formData)
  const proprietorIssueList = proprietorIssues(proprietor)
  const directorsIssues = directorIssues(directors)
  const step3Issues: Issue[] = [
    ...secretaryIssues(secretary),
    ...ownershipIssues({ shareholders, details: companyDetails, auditorLater, isShares }),
  ]
  const deliveryIssues: Issue[] = deliveryMethod === 'courier'
    ? [
        ...(!deliveryAddress.recipientName.trim() ? [{ id: 'del-recipient', label: 'Recipient name', message: 'Required' }] : []),
        ...(!deliveryAddress.street.trim() ? [{ id: 'del-street', label: 'Street address', message: 'Required' }] : []),
        ...(!deliveryAddress.city.trim() ? [{ id: 'del-city', label: 'City', message: 'Required' }] : []),
        ...(!deliveryAddress.region ? [{ id: 'del-region', label: 'Region', message: 'Required' }] : []),
        ...(!deliveryAddress.phone.trim() ? [{ id: 'del-phone', label: 'Phone', message: 'Required' }] : []),
        ...(deliveryAddress.phone.trim() && !isValidPhone(deliveryAddress.phone)
          ? [{ id: 'del-phone', label: 'Phone (check the number)', message: 'Enter a valid phone number' }]
          : []),
      ]
    : []

  const errs = useStepErrors()
  const { showErrors, focusRequest, jumpTo, fieldState, fieldMessage } = errs

  const goTo = (n: number) => {
    errs.setShowErrors(false)
    // Moving forward from the business details on saves the application, so it's never lost and
    // shows up under "unfinished applications"
    if (n > step && step >= 1 && selectedType) void handleSaveDraft()
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Pay: check every step first; if something's wrong, go to that step and highlight it */
  const deliveryStep = progressSteps.findIndex((p) => p.label === 'Delivery')
  const allIssues = [
    ...step1Issues.map((i) => ({ ...i, step: 1 })),
    ...(isCompany ? directorsIssues : proprietorIssueList).map((i) => ({ ...i, step: 2 })),
    ...(isCompany ? step3Issues.map((i) => ({ ...i, step: 3 })) : []),
    ...deliveryIssues.map((i) => ({ ...i, step: deliveryStep })),
  ]
  const jumpAcross = (issue: Issue & { step: number }) => {
    errs.setShowErrors(true)
    setStep(issue.step)
    errs.jumpTo(issue)
  }

  /** Continue: move on, or show what's wrong and go to the first problem */
  const tryNext = (issues: Issue[], next: number) => errs.tryNext(issues, () => goTo(next))

  // ---- Director invite links (shared with the edit form) ----
  const inv = useDirectorInvites({
    directors,
    setDirectors,
    ensureApplicationId: () => handleSaveDraft(),
    knownApplicationId: draftId,
    afterChange: (next) => handleSaveDraft({ directors: next }),
    businessName: formData.businessName,
  })

  // --- Checkout ---
  // The server saves the application, sets the amount and payment reference, and only submits it
  // once Paystack confirms payment (src/lib/checkout.ts). The amount is never taken from this page.
  const initializePayment = usePaystackPayment({
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    currency: 'GHS',
  })

  const handlePayAndSubmit = async () => {
    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      setSubmitError('Payments aren’t set up yet. Please contact support.')
      return
    }
    if (!selectedType) return
    setSubmitting(true)
    setSubmitError('')

    const fullFormData = {
      ...formData,
      businessType: selectedType,
      ...(isCompany
        ? { directors, secretary, shareholders, companyDetails: { ...companyDetails, auditorLater, capitalAuto } }
        : { proprietor }),
    }

    const checkout = await startCheckout({
      typeId: selectedType,
      businessName: formData.businessName,
      formData: fullFormData,
      selectedAddOns,
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'courier' ? deliveryAddress : null,
      affiliateCode,
      applicationId: draftIdRef.current,
    })
    if (checkout.error !== null) {
      setSubmitError(checkout.error)
      setSubmitting(false)
      return
    }
    draftIdRef.current = checkout.applicationId
    setDraftId(checkout.applicationId)

    initializePayment({
      config: {
        email: checkout.email,
        amount: Math.round(checkout.amount * 100), // pesewas
        reference: checkout.reference,
        currency: 'GHS',
        metadata: {
          application_id: checkout.applicationId,
          custom_fields: [{ display_name: 'Business', variable_name: 'business_name', value: formData.businessName }],
        },
      },
      onSuccess: async (response?: { reference?: string }) => {
        const confirmed = await confirmPayment(checkout.applicationId, response?.reference || checkout.reference)
        if (confirmed.error) {
          setSubmitError(confirmed.error)
          setSubmitting(false)
          return
        }
        try { localStorage.removeItem(localKey(draftIdRef.current)) } catch {}
        setSavedDrafts((prev) => prev.filter((d) => d.id !== draftIdRef.current))
        setResultTrackingId(confirmed.trackingId || '')
        setSubmitted(true)
        setSubmitting(false)
      },
      onClose: () => {
        setSubmitting(false)
        setSubmitError('Payment wasn’t completed. Your application is saved, so you can pay whenever you’re ready.')
      },
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
        {(savingDraft || savedAt || saveError) && (
          <span className={`${styles.saveStatus} ${saveError && !savingDraft ? styles.saveStatusBad : ''}`} aria-live="polite">
            {savingDraft
              ? 'Saving…'
              : saveError
                ? 'Couldn’t save'
                : <><Check size={13} /> Saved {savedAt!.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}</>}
          </span>
        )}
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

      {draftMissing && (
        <p className={styles.draftsNote}>That application can’t be continued here: it may have been paid for or removed. You’re starting a new one.</p>
      )}

      {/* ============ Step 0: Business Type ============ */}
      {step === 0 && (
        <div className={styles.stepCard}>
          <ResumeDrafts
            drafts={savedDrafts.filter((d) => d.id !== draftId)}
            onDeleted={(id) => setSavedDrafts((prev) => prev.filter((d) => d.id !== id))}
          />
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
            onSave={handleSaveAndExit}
            saveError={saveError}
            saving={savingDraft}
            saveDisabled={!selectedType}
            onNext={() => goTo(1)}
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
                {...fieldState(step1Issues, 'businessName')}
              />
              {fieldMessage(step1Issues, 'businessName')}
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
              <DomainCheck
                businessName={formData.businessName}
                enabled={Boolean(nameCheck.result && (nameCheck.result.available || nameCheck.result.error))}
                chosen={formData.preferredDomain || ''}
                onChoose={chooseDomain}
                price={dynamicAddOns.find((a) => a.id === 'domain')?.price ?? 0}
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
              <select id="businessSector" className="form-input" {...fieldState(step1Issues, 'businessSector')} value={formData.businessSector} onChange={(e) => handleInputChange('businessSector', e.target.value)} required>
                <option value="">Select sector</option>
                {businessSectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {fieldMessage(step1Issues, 'businessSector')}
            </div>
            {formData.businessSector === 'Other (specify below)' && (
              <div className="form-group">
                <label className="form-label" htmlFor="businessSectorOther">Specify Sector</label>
                <input id="businessSectorOther" type="text" className="form-input" {...fieldState(step1Issues, 'businessSectorOther')} placeholder="Describe your sector" value={formData.businessSectorOther} onChange={(e) => handleInputChange('businessSectorOther', e.target.value)} />
                {fieldMessage(step1Issues, 'businessSectorOther')}
              </div>
            )}
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="natureOfBusiness">
                {isCompany ? 'Objects of the Company / Description of Activities *' : 'Description of Business Activities *'}
              </label>
              <textarea id="natureOfBusiness" className="form-input" {...fieldState(step1Issues, 'natureOfBusiness')} placeholder="Describe the specific activities and services..." rows={3} value={formData.natureOfBusiness} onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)} required />
              {fieldMessage(step1Issues, 'natureOfBusiness')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dateOfCommencement">Date of Commencement *</label>
              <input id="dateOfCommencement" type="date" className="form-input" {...fieldState(step1Issues, 'dateOfCommencement')} value={formData.dateOfCommencement} onChange={(e) => handleInputChange('dateOfCommencement', e.target.value)} required />
              {fieldMessage(step1Issues, 'dateOfCommencement')}
              <span className="form-hint">Date business started or will start operations</span>
            </div>
          </div>

          {/* Company-specific: Constitution */}
          {isCompany && (
            <>
              <div className={styles.formSectionTitle}>Company Constitution</div>
              <details className={styles.explainer}>
                <summary>
                  <Info size={16} /> What’s a constitution?
                </summary>
                <div className={styles.explainerBody}>
                  <p>
                    A company’s constitution is its rulebook. It sets out how directors are appointed and removed,
                    how decisions are made at meetings, how shares can be sold or passed on, and what the company is
                    allowed to do.
                  </p>
                  <p>
                    You don’t have to write one. If you choose the standard option, the model rules in the Companies
                    Act, 2019 (Act 992) apply, and most new companies go this way.
                  </p>
                </div>
              </details>
              <div className={styles.choiceCards} role="radiogroup" aria-label="Constitution">
                {[
                  {
                    value: 'standard',
                    title: 'Standard constitution',
                    badge: 'Most common',
                    desc: 'Use the model rules set out in the Companies Act, 2019 (Act 992). Nothing to draft, and it suits most small companies.',
                  },
                  {
                    value: 'custom',
                    title: 'Your own constitution',
                    desc: 'Rules written for your company, usually with a lawyer: for example different share classes, investor approval rights, or limits on selling shares. We’ll ask for the signed document before we file.',
                  },
                ].map((o) => (
                  <label key={o.value} className={`${styles.choiceCard} ${companyDetails.constitutionType === o.value ? styles.choiceCardOn : ''}`}>
                    <input
                      type="radio"
                      name="constitution"
                      value={o.value}
                      checked={companyDetails.constitutionType === o.value}
                      onChange={(e) => handleCompanyDetailChange('constitutionType', e.target.value)}
                    />
                    <span>
                      <span className={styles.choiceCardTitle}>
                        {o.title}
                        {o.badge && <span className={styles.choiceBadge}>{o.badge}</span>}
                      </span>
                      <span className={styles.choiceCardDesc}>{o.desc}</span>
                    </span>
                  </label>
                ))}
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
              <input id="buildingName" type="text" className="form-input" {...fieldState(step1Issues, 'buildingName')} placeholder="e.g., Suite 5, Osu Ventures Building" value={formData.buildingName} onChange={(e) => handleInputChange('buildingName', e.target.value)} required />
              {fieldMessage(step1Issues, 'buildingName')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="streetName">Street Name *</label>
              <input id="streetName" type="text" className="form-input" {...fieldState(step1Issues, 'streetName')} placeholder="e.g., Oxford Street" value={formData.streetName} onChange={(e) => handleInputChange('streetName', e.target.value)} required />
              {fieldMessage(step1Issues, 'streetName')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="city">City / Town *</label>
              <input id="city" type="text" className="form-input" {...fieldState(step1Issues, 'city')} placeholder="e.g., Accra" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} required />
              {fieldMessage(step1Issues, 'city')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="region">Region *</label>
              <select id="region" className="form-input" {...fieldState(step1Issues, 'region')} value={formData.region} onChange={(e) => handleInputChange('region', e.target.value)} required>
                <option value="">Select region</option>
                {ghanaRegions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {fieldMessage(step1Issues, 'region')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="district">District *</label>
              {/* Districts follow the region; a value saved before the list existed stays selectable */}
              <select
                id="district"
                className="form-input"
                {...fieldState(step1Issues, 'district')}
                value={formData.district}
                onChange={(e) => handleInputChange('district', e.target.value)}
                disabled={!formData.region}
                required
              >
                <option value="">{formData.region ? 'Select district' : 'Choose a region first'}</option>
                {formData.district && !districtsFor(formData.region).includes(formData.district) && (
                  <option value={formData.district}>{formData.district}</option>
                )}
                {districtsFor(formData.region).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {fieldMessage(step1Issues, 'district')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="digitalAddress">Digital Address *</label>
              <input id="digitalAddress" type="text" className="form-input" {...fieldState(step1Issues, 'digitalAddress')} placeholder="e.g., GA-XXX-XXXX" value={formData.digitalAddress} onChange={(e) => handleInputChange('digitalAddress', e.target.value)} required />
              {fieldMessage(step1Issues, 'digitalAddress') || <span className="form-hint">Get yours from the Ghana Post GPS app. We&apos;ll fill in the region where we can.</span>}
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
              <input id="mobilePhone" type="tel" className="form-input" {...fieldState(step1Issues, 'mobilePhone')} placeholder="+233 XXX XXX XXX" value={formData.mobilePhone} onChange={(e) => handleInputChange('mobilePhone', e.target.value)} required />
              {fieldMessage(step1Issues, 'mobilePhone')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="alternatePhone">Alternate Phone (optional)</label>
              <input id="alternatePhone" type="tel" className="form-input" placeholder="+233 XXX XXX XXX" value={formData.alternatePhone} onChange={(e) => handleInputChange('alternatePhone', e.target.value)} />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="contactEmail">Email *</label>
              <input id="contactEmail" type="email" className="form-input" {...fieldState(step1Issues, 'contactEmail')} placeholder="company@example.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
              {fieldMessage(step1Issues, 'contactEmail')}
            </div>
          </div>

          <StepNav
            onBack={() => goTo(0)}
            onSave={handleSaveAndExit}
            saveError={saveError}
            saving={savingDraft}
            onNext={() => tryNext(step1Issues, 2)}
            issues={step1Issues}
            showIssues={showErrors}
            onJump={jumpTo}
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
          <PersonForm person={proprietor} onChange={handleProprietorChange} prefix="prop" title="Proprietor" showErrors={showErrors} focusRequest={focusRequest} />
          <StepNav
            onBack={() => goTo(1)}
            onSave={handleSaveAndExit}
            saveError={saveError}
            saving={savingDraft}
            onNext={() => tryNext(proprietorIssueList, 3)}
            issues={proprietorIssueList}
            showIssues={showErrors}
            onJump={jumpTo}
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

          <DirectorInviteTip />

          {directors.map((director, index) => (
            <div key={index} className={styles.personBlock}>
              <DirectorInvite
                index={index}
                director={director}
                inv={inv}
                actions={
                  directors.length > 2 && (
                    <button className={`btn btn-ghost btn-sm ${styles.removeBtn}`} onClick={() => removeDirector(index)} type="button">
                      <Trash2 size={14} /> Remove director {index + 1}
                    </button>
                  )
                }
              >
                <PersonForm
                  person={director}
                  onChange={(f, v) => handleDirectorChange(index, f, v)}
                  prefix={`dir-${index}`}
                  title={`Director ${index + 1}`}
                  showErrors={showErrors}
                  focusRequest={focusRequest}
                />
              </DirectorInvite>
            </div>
          ))}

          <button className={`btn btn-secondary ${styles.addPersonBtn}`} onClick={addDirector} type="button">
            <Plus size={16} /> Add Another Director
          </button>

          <StepNav
            onBack={() => goTo(1)}
            onSave={handleSaveAndExit}
            saveError={saveError}
            saving={savingDraft}
            onNext={() => tryNext(directorsIssues, 3)}
            issues={directorsIssues}
            showIssues={showErrors}
            onJump={jumpTo}
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
            <PersonForm person={secretary} onChange={handleSecretaryChange} prefix="sec" title="Company secretary" showErrors={showErrors} focusRequest={focusRequest} />
          </div>

          <OwnershipSection
            shareholders={shareholders}
            setShareholders={setShareholders}
            details={companyDetails as unknown as Record<string, string>}
            setDetail={handleCompanyDetailChange}
            setDetails={setCompanyDetailsPatch}
            auditorLater={auditorLater}
            setAuditorLater={setAuditorLater}
            capitalAuto={capitalAuto}
            setCapitalAuto={setCapitalAuto}
            isShares={isShares}
            people={namedDirectors}
            issues={step3Issues}
            errors={errs}
          />

          <StepNav
            onBack={() => goTo(2)}
            onSave={handleSaveAndExit}
            saveError={saveError}
            saving={savingDraft}
            onNext={() => tryNext(step3Issues, 4)}
            issues={step3Issues}
            showIssues={showErrors}
            onJump={jumpTo}
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
                  <p>{addon.id === 'domain' && formData.preferredDomain ? `${formData.preferredDomain}, the address you picked` : addon.desc}</p>
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
            onBack={() => goTo(step - 1)}
            onSave={handleSaveAndExit}
            saveError={saveError}
            saving={savingDraft}
            onNext={() => goTo(step + 1)}
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
              onClick={chooseCourier}
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
              <p className={styles.prefillNote}>We’ve filled this in from your details. Change anything that’s different.</p>
              <CopyChips
                label="Use"
                options={[
                  ...(applicant?.residentialAddress ? [{ key: 'me', text: 'My address', onClick: () => replaceDeliveryWith('me') }] : []),
                  ...(businessStreet ? [{ key: 'biz', text: 'Business address', onClick: () => replaceDeliveryWith('business') }] : []),
                ]}
              />
              <div className={styles.formGrid}>
                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Recipient Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    id="del-recipient"
                    {...fieldState(deliveryIssues, 'del-recipient')}
                    placeholder="Full name of person receiving docs"
                    value={deliveryAddress.recipientName}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, recipientName: e.target.value})}
                    required
                  />
                  {fieldMessage(deliveryIssues, 'del-recipient')}
                </div>
                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Street / House Address *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    id="del-street"
                    {...fieldState(deliveryIssues, 'del-street')}
                    placeholder="House number, street name"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                    required
                  />
                  {fieldMessage(deliveryIssues, 'del-street')}
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    id="del-city"
                    {...fieldState(deliveryIssues, 'del-city')}
                    placeholder="e.g. Accra"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                    required
                  />
                  {fieldMessage(deliveryIssues, 'del-city')}
                </div>
                <div className="form-group">
                  <label className="form-label">Region *</label>
                  <select
                    id="del-region"
                    className="form-input"
                    {...fieldState(deliveryIssues, 'del-region')}
                    value={deliveryAddress.region}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, region: e.target.value})}
                    required
                  >
                    <option value="">Select Region</option>
                    {ghanaRegions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {fieldMessage(deliveryIssues, 'del-region')}
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
                    id="del-phone"
                    {...fieldState(deliveryIssues, 'del-phone')}
                    placeholder="+233 XXX XXX XXX"
                    value={deliveryAddress.phone}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, phone: e.target.value})}
                    required
                  />
                  {fieldMessage(deliveryIssues, 'del-phone')}
                </div>
              </div>
            </div>
          )}

          <StepNav
            onBack={() => goTo(step - 1)}
            onSave={handleSaveAndExit}
            saveError={saveError}
            saving={savingDraft}
            onNext={() => tryNext(deliveryIssues, step + 1)}
            nextLabel="Continue to review"
            issues={deliveryIssues}
            showIssues={showErrors}
            onJump={jumpTo}
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
            {/* Same breakdown as the pricing page and checkout */}
            {priceForType(selectedType || '', dbBusinessTypes).lines.map((line) => (
              <div key={line.label} className={styles.reviewRow}>
                <span className={styles.reviewLabel}>{line.label}</span>
                <span className={styles.reviewValue}>GH₵ {line.amount.toLocaleString()}</span>
              </div>
            ))}
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
            {formData.preferredDomain && selectedAddOns.includes('domain') && (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Website address</span>
                <span className={styles.reviewValue}>{formData.preferredDomain}</span>
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

          {isCompany && directors.some(awaitingInvite) && (
            <div className={styles.issues} role="status">
              <p className={styles.issuesTitle}>
                <Clock size={18} /> Waiting for {directors.filter(awaitingInvite).map((d) => personDisplayName(d) || 'a director').join(' and ')} to add their details
              </p>
              <p className={styles.issuesText}>
                You can pay as soon as they’ve filled in the link you sent. This page updates on its own.{' '}
                <button type="button" className={styles.linkBtn} onClick={() => goTo(2)}>Go to directors</button>
              </p>
            </div>
          )}

          <IssueList issues={allIssues} show={allIssues.length > 0} onJump={(i) => jumpAcross(i as Issue & { step: number })} verb="pay" />

          {submitError && <div className={styles.submitError}>{submitError}</div>}

          <div className={styles.stepNav}>
            <button type="button" className="btn btn-ghost" onClick={() => goTo(lastStep - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => (allIssues.length > 0 ? jumpAcross(allIssues[0]) : handlePayAndSubmit())} disabled={submitting || (isCompany && directors.some(awaitingInvite))} id="submit-application">
              {submitting ? 'Processing payment…' : `Pay GH₵ ${totalPrice.toLocaleString()} and submit`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewRegistrationContent
