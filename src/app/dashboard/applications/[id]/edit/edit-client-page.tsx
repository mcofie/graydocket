'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ArrowLeft, ArrowRight, AlertCircle, Clock } from 'lucide-react'
import { 
  getApplicationDetails, resubmitApplication, updateApplicationDraft, getServices
} from '@/lib/actions'
import styles from '../../new/new.module.css'
import {
  businessTypes, businessSectors, ghanaRegions,
  PersonEntry, emptyPerson, ShareholderEntry, emptyShareholder
} from '../../new/constants'
import PersonForm from '../../new/PersonForm'
import NameCheck from '../../new/NameCheck'
import DomainCheck from '../../new/DomainCheck'
import { addOnsWithPrices } from '../../new/pricing'
import { useNameCheck, warmNameCheck } from '../../new/useNameCheck'
import { useDirectorInvites, awaitingInvite } from '../../new/useDirectorInvites'
import DirectorInvite, { DirectorInviteTip } from '../../new/DirectorInvite'
import { personDisplayName, type Issue } from '../../new/helpers'
import { districtsFor } from '../../new/districts'
import { businessIssues, proprietorIssues, directorIssues, secretaryIssues, ownershipIssues } from '../../new/validation'
import { useStepErrors, IssueList } from '../../new/StepErrors'
import OwnershipSection from '../../new/OwnershipSection'

interface Props {
  applicationId: string
}

export default function EditSubmissionContent({ applicationId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const isCompany = selectedType === 'limited_by_shares' || selectedType === 'limited_by_guarantee'
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [appStatus, setAppStatus] = useState<string>('draft')
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSavedMessage, setDraftSavedMessage] = useState('')
  const [isAutosaving, setIsAutosaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [initialLoaded, setInitialLoaded] = useState(false)

  // ---- Form State (initialized with defaults, then loaded from DB) ----
  const [formData, setFormData] = useState({
    businessName: '',
    businessNameAlt: '',
    preferredDomain: '',
    businessSector: '',
    businessSectorOther: '',
    natureOfBusiness: '',
    dateOfCommencement: '',
    buildingName: '',
    streetName: '',
    city: '',
    district: '',
    region: '',
    digitalAddress: '',
    postalAddress: '',
    mobilePhone: '',
    alternatePhone: '',
    email: '',
  })

  const [proprietor, setProprietor] = useState<PersonEntry>({ ...emptyPerson })
  const [directors, setDirectors] = useState<PersonEntry[]>([{ ...emptyPerson }, { ...emptyPerson }])
  const [secretary, setSecretary] = useState<PersonEntry>({ ...emptyPerson })
  const [shareholders, setShareholders] = useState<ShareholderEntry[]>([{ ...emptyShareholder }])
  const [companyDetails, setCompanyDetails] = useState({
    constitutionType: 'standard',
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

  // Extras chosen in the registration form (kept when saving); a website address rides on the domain add-on
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [domainPrice, setDomainPrice] = useState(0)
  useEffect(() => {
    getServices().then((res) => setDomainPrice(addOnsWithPrices(res.services || []).find((a) => a.id === 'domain')?.price ?? 0))
  }, [])
  const chooseDomain = (domain: string | null) => {
    setFormData((prev) => ({ ...prev, preferredDomain: domain || '' }))
    setSelectedAddOns((prev) => (domain ? (prev.includes('domain') ? prev : [...prev, 'domain']) : prev.filter((a) => a !== 'domain')))
  }

  // Founders without an auditor yet can add one later; capital follows the shareholders until edited
  const [auditorLater, setAuditorLater] = useState(false)
  const [capitalAuto, setCapitalAuto] = useState(false)
  const setCompanyDetailsPatch = useCallback((patch: Record<string, string>) => setCompanyDetails((prev) => ({ ...prev, ...patch })), [])

  // Same rules and error display as the registration form (../../new/validation, ../../new/StepErrors)
  const errs = useStepErrors()

  // Live ORC checks for the main and backup names
  const nameCheck = useNameCheck(formData.businessName)
  const altNameCheck = useNameCheck(formData.businessNameAlt)

  // Director invite links (shared with the registration form). The application already exists, and
  // the server records each link on the director, so nothing extra needs saving here.
  const inv = useDirectorInvites({
    directors,
    setDirectors,
    ensureApplicationId: async () => applicationId,
    knownApplicationId: applicationId,
    businessName: formData.businessName,
  })
  const waitingOn = isCompany ? directors.filter(awaitingInvite) : []

  useEffect(() => {
    if (!initialLoaded || appStatus !== 'draft') return

    const fullFormData = {
      formData,
      businessType: selectedType,
      selectedAddOns,
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

    setIsAutosaving('saving')
    const timer = setTimeout(async () => {
      try {
        const result = await updateApplicationDraft(applicationId, fullFormData)
        if (result.error) {
          setIsAutosaving('error')
        } else {
          setIsAutosaving('saved')
          setTimeout(() => setIsAutosaving('idle'), 3000)
        }
      } catch (error) {
        console.error(error)
        setIsAutosaving('error')
      }
    }, 4000)

    return () => {
      clearTimeout(timer)
    }
  }, [formData, proprietor, directors, secretary, shareholders, companyDetails, auditorLater, capitalAuto, selectedAddOns, initialLoaded, appStatus])

  useEffect(() => {
    async function loadApp() {
      const res = await getApplicationDetails(applicationId)
      
      if (res.error) {
         setSubmitError("We couldn't load this application. Please refresh the page or try again later.")
         setLoading(false)
         return
      }

      if (res.application) {
        setAppStatus(res.application.status || 'draft')
      }

      if (res.application && res.application.form_data) {
        let data = res.application.form_data as any
        
        if (typeof data === 'string') {
           try { data = JSON.parse(data) } catch(e) { console.error(e) }
        }
        
        // --- Extremely Robust Hydration ---
        // Helper to find a value by key (case-insensitive) in an object
        const getValue = (obj: any, key: string): string => {
            if (!obj) return ''
            // Direct match
            if (obj[key] !== undefined) return String(obj[key])
            
            // Case-insensitive search
            const lowerKey = key.toLowerCase()
            const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey)
            if (foundKey) return String(obj[foundKey])
            
            // Nested formData check
            if (obj.formData && typeof obj.formData === 'object') {
                return getValue(obj.formData, key)
            }
            if (obj.form_data && typeof obj.form_data === 'object') {
                return getValue(obj.form_data, key)
            }
            return ''
        }

        if (data.businessType || data.business_type) {
            setSelectedType(data.businessType || data.business_type)
        }
        
        const newFormData = {
            businessName: getValue(data, 'businessName'),
            businessNameAlt: getValue(data, 'businessNameAlt'),
            preferredDomain: getValue(data, 'preferredDomain'),
            businessSector: getValue(data, 'businessSector'),
            businessSectorOther: getValue(data, 'businessSectorOther'),
            natureOfBusiness: getValue(data, 'natureOfBusiness'),
            dateOfCommencement: getValue(data, 'dateOfCommencement'),
            buildingName: getValue(data, 'buildingName'),
            streetName: getValue(data, 'streetName'),
            city: getValue(data, 'city'),
            district: getValue(data, 'district'),
            region: getValue(data, 'region'),
            digitalAddress: getValue(data, 'digitalAddress'),
            postalAddress: getValue(data, 'postalAddress'),
            mobilePhone: getValue(data, 'mobilePhone'),
            alternatePhone: getValue(data, 'alternatePhone'),
            email: getValue(data, 'email'),
        }
        setFormData(newFormData)

        setProprietor(data.proprietor || data.formData?.proprietor || { ...emptyPerson })
        setDirectors(data.directors || data.formData?.directors || [{ ...emptyPerson }, { ...emptyPerson }])
        setSecretary(data.secretary || data.formData?.secretary || { ...emptyPerson })
        setShareholders(data.shareholders || data.formData?.shareholders || [{ ...emptyShareholder }])
        setCompanyDetails(data.companyDetails || data.formData?.companyDetails || {
            constitutionType: 'standard', objectsOfCompany: '', authorizedShares: '',
            issuedShares: '', statedCapital: '', auditorName: '', auditorFirm: '',
            auditorLicense: '', beneficialOwnerName: '', beneficialOwnerNationality: '',
            beneficialOwnerAddress: '', beneficialOwnerDOB: '',
        })
        
        if (Array.isArray(data.selectedAddOns)) setSelectedAddOns(data.selectedAddOns)
        const savedCompany = data.companyDetails || data.formData?.companyDetails
        if (savedCompany) {
          setAuditorLater(Boolean(savedCompany.auditorLater))
          setCapitalAuto(Boolean(savedCompany.capitalAuto))
        }
        if (data.corrections) setCorrections(data.corrections)
        setStep(1)
        setTimeout(() => setInitialLoaded(true), 1500)
      } else {
        setSubmitError("We couldn't load this application. Please check your connection and try again.")
      }
      setLoading(false)
    }
    loadApp()
  }, [applicationId])



  // Steps start at 1: the business type can't be changed here
  const stepLabels = isCompany
    ? ['Company info', 'Directors', 'Secretary & shareholders', 'Review']
    : ['Business info', 'Proprietor', 'Review']
  const lastStep = stepLabels.length

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
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

  const handleSecretaryChange = (field: string, value: string) => {
    setSecretary((prev) => ({ ...prev, [field]: value }))
  }


  const handleCompanyDetailChange = (field: string, value: string) => {
    setCompanyDetails((prev) => ({ ...prev, [field]: value }))
  }

  /** "Save and exit": save, then go back to the application's page */
  const handleSaveDraft = async () => {
    setSavingDraft(true)
    setSubmitError('')
    setDraftSavedMessage('')

    const fullFormData = {
      formData,
      businessType: selectedType,
      selectedAddOns,
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

    const result = await updateApplicationDraft(applicationId, fullFormData)

    if (result.error) {
      setSubmitError(result.error)
      setSavingDraft(false)
      return
    }
    setDraftSavedMessage('Draft saved')
    router.push(`/dashboard/applications/${applicationId}`)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')

    const fullFormData = {
      formData,
      businessType: selectedType,
      selectedAddOns,
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

    const result = await resubmitApplication(applicationId, fullFormData)

    if (result.error) {
      setSubmitError(result.error)
      setSubmitting(false)
      return
    }

    // Unpaid applications are saved; payment (then submission) happens on the details page
    router.push(`/dashboard/applications/${applicationId}${'needsPayment' in result && result.needsPayment ? '?pay=1' : ''}`)
  }

  if (loading) return <div className={styles.newReg} aria-busy="true" />

  const isDraft = appStatus === 'draft'
  const typeName = businessTypes.find((t) => t.id === selectedType)?.name

  // ---- What needs fixing on each step (shared rules) ----
  const isShares = selectedType === 'limited_by_shares'
  const step1Issues = businessIssues(formData)
  const step2Issues = isCompany ? directorIssues(directors) : proprietorIssues(proprietor)
  const step3Issues: Issue[] = isCompany
    ? [...secretaryIssues(secretary), ...ownershipIssues({ shareholders, details: companyDetails, auditorLater, isShares })]
    : []
  const issuesFor: Record<number, Issue[]> = { 1: step1Issues, 2: step2Issues, 3: step3Issues }

  const go = (n: number) => {
    errs.setShowErrors(false)
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  /** Continue: move on, or show what's wrong on this step and go to the first problem */
  const next = (from: number, to: number) => errs.tryNext(issuesFor[from] || [], () => go(to))
  const issueList = (n: number) => <IssueList issues={issuesFor[n] || []} show={errs.showErrors} onJump={errs.jumpTo} />
  // Submit checks every step: go to the first one with a problem and highlight it
  const allIssues = [1, 2, 3].flatMap((n) => (issuesFor[n] || []).map((issue) => ({ ...issue, step: n })))
  const jumpAcross = (issue: Issue & { step: number }) => {
    go(issue.step)
    errs.setShowErrors(true)
    errs.jumpTo(issue)
  }
  const trySubmit = () => {
    if (allIssues.length > 0) return jumpAcross(allIssues[0])
    handleSubmit()
  }
  const F = (id: string) => errs.fieldState(step1Issues, id)
  const M = (id: string) => errs.fieldMessage(step1Issues, id)

  // A correction note shown under the field the registrar flagged
  const renderCorrection = (path: string) => {
    const msg = corrections[path]
    if (!msg) return null
    return (
      <p className={styles.fieldFix}>
        <AlertCircle size={14} /> <span>{msg}</span>
      </p>
    )
  }

  const hasSectionCorrection = (stepIdx: number) => {
    const keys = Object.keys(corrections)
    if (stepIdx === 1) {
      // Business info fields are top-level keys that aren't part of another section
      return keys.some(k =>
        !k.startsWith('proprietor.') &&
        !k.startsWith('directors.') &&
        !k.startsWith('secretary.') &&
        !k.startsWith('shareholders.') &&
        k !== 'corrections'
      )
    }
    if (stepIdx === 2) {
      if (!isCompany) return keys.some(k => k.startsWith('proprietor.'))
      return keys.some(k => k.startsWith('directors.'))
    }
    if (stepIdx === 3 && isCompany) {
      return keys.some(k => k.startsWith('secretary.')) || keys.some(k => k.startsWith('shareholders.'))
    }
    return false
  }

  const sectionNotice = (stepIdx: number, text: string) =>
    hasSectionCorrection(stepIdx) && (
      <div className={styles.notice}>
        <AlertCircle size={16} />
        <span>{text}</span>
      </div>
    )

  const saveStatus = !isDraft
    ? null
    : draftSavedMessage
      ? 'Draft saved'
      : isAutosaving === 'saving'
        ? 'Saving…'
        : isAutosaving === 'saved'
          ? 'All changes saved'
          : isAutosaving === 'error'
            ? "Couldn't autosave"
            : null

  const nav = (onBack: (() => void) | null, next: React.ReactNode) => (
    <div className={styles.stepNav}>
      {onBack ? (
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
      ) : (
        <span />
      )}
      <div className={styles.navRight}>
        {isDraft && (
          <button type="button" className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
            {savingDraft ? 'Saving…' : 'Save and exit'}
          </button>
        )}
        {next}
      </div>
    </div>
  )

  const reviewButtonLabel = isDraft ? 'Review and submit' : 'Review changes'

  return (
    <div className={styles.newReg}>
      <Link href={`/dashboard/applications/${applicationId}`} className={styles.backLink}>
        <ArrowLeft size={16} />
        <span>Back to application</span>
      </Link>

      <div className={styles.editIntro}>
        <h1 className={styles.stepTitle}>{isDraft ? 'Finish your application' : 'Fix and resubmit'}</h1>
        <p className={styles.stepDesc}>
          {isDraft
            ? 'Your progress saves automatically. Submit when everything is complete.'
            : 'Our team flagged a few details. Update the highlighted fields, then resubmit. There is nothing extra to pay.'}
        </p>
      </div>

      {submitError && <div className={styles.submitError}>{submitError}</div>}

      <div className={styles.progressHead}>
        <span className={styles.progressMeta}>
          Step {step} of {lastStep} · <strong>{stepLabels[step - 1]}</strong>
        </span>
        {saveStatus && (
          <span className={styles.saveStatus} aria-live="polite">
            {saveStatus === 'All changes saved' || saveStatus === 'Draft saved' ? <Check size={13} /> : null}
            {saveStatus}
          </span>
        )}
      </div>
      <div className={styles.progressTrack} aria-hidden="true">
        {stepLabels.map((label, i) => {
          const n = i + 1
          return (
            <div
              key={label}
              className={`${styles.progressSeg} ${hasSectionCorrection(n) ? styles.segFix : n < step ? styles.segDone : n === step ? styles.segActive : ''}`}
            />
          )
        })}
      </div>

      {step === 1 && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepHeading}>{isCompany ? 'Company info' : 'Business info'}</h2>
          <p className={styles.stepDesc}>Fields marked * are required.</p>
          {sectionNotice(1, 'Some fields on this step need changes. Look for the red notes below.')}

          <div className={styles.formGrid}>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="businessName">
                {isCompany ? 'Proposed Company Name *' : 'Proposed Business Name *'}
              </label>
              <input
                id="businessName"
                type="text"
                className="form-input" {...F('businessName')}
                placeholder={isCompany ? 'e.g., Asante Tech Solutions Limited' : 'e.g., Asante Tech Solutions'}
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                onFocus={warmNameCheck}
                required
              />
              {M('businessName')}
              {renderCorrection('businessName')}
              <NameCheck
                checking={nameCheck.checking}
                result={nameCheck.result}
                onRetry={nameCheck.retry}
              />
              <DomainCheck
                businessName={formData.businessName}
                enabled={Boolean(nameCheck.result && (nameCheck.result.available || nameCheck.result.error))}
                chosen={selectedAddOns.includes('domain') ? formData.preferredDomain || '' : ''}
                onChoose={chooseDomain}
                price={domainPrice}
                canChoose={isDraft}
              />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="businessNameAlt">Alternative Name (optional)</label>
              <input id="businessNameAlt" type="text" className="form-input" placeholder="Backup name if first choice is unavailable" value={formData.businessNameAlt} onChange={(e) => handleInputChange('businessNameAlt', e.target.value)} onFocus={warmNameCheck} />
              {renderCorrection('businessNameAlt')}
              <NameCheck
                checking={altNameCheck.checking}
                result={altNameCheck.result}
                onRetry={altNameCheck.retry}
              />
            </div>
          </div>

          <div className={styles.formSectionTitle}>Nature of Business</div>
          <div className={styles.formGrid}>
            <div className={`form-group ${formData.businessSector === 'Other (specify below)' ? '' : styles.formFull}`}>
              <label className="form-label" htmlFor="businessSector">Business Sector *</label>
              <select id="businessSector" className="form-input" {...F('businessSector')} value={formData.businessSector} onChange={(e) => handleInputChange('businessSector', e.target.value)} required>
                <option value="">Select sector</option>
                {businessSectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {M('businessSector')}
              {renderCorrection('businessSector')}
            </div>
            {formData.businessSector === 'Other (specify below)' && (
              <div className="form-group">
                <label className="form-label" htmlFor="businessSectorOther">Specify Sector</label>
                <input id="businessSectorOther" type="text" className="form-input" {...F('businessSectorOther')} placeholder="Describe your sector" value={formData.businessSectorOther} onChange={(e) => handleInputChange('businessSectorOther', e.target.value)} />
                {M('businessSectorOther')}
              {renderCorrection('businessSectorOther')}
              </div>
            )}
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="natureOfBusiness">
                {isCompany ? 'Objects of the Company / Description of Activities *' : 'Description of Business Activities *'}
              </label>
              <textarea id="natureOfBusiness" className="form-input" {...F('natureOfBusiness')} placeholder="Describe the specific activities and services..." rows={3} value={formData.natureOfBusiness} onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)} required />
              {M('natureOfBusiness')}
              {renderCorrection('natureOfBusiness')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dateOfCommencement">Date of Commencement *</label>
              <input id="dateOfCommencement" type="date" className="form-input" {...F('dateOfCommencement')} value={formData.dateOfCommencement} onChange={(e) => handleInputChange('dateOfCommencement', e.target.value)} required />
              {M('dateOfCommencement')}
              {renderCorrection('dateOfCommencement')}
            </div>
          </div>

          {isCompany && (
            <>
              <div className={styles.formSectionTitle}>Company Constitution</div>
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
            </>
          )}

          <div className={styles.formSectionTitle}>
            {isCompany ? 'Registered Office Address' : 'Principal Place of Business'}
          </div>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="buildingName">House / Building / Flat *</label>
              <input id="buildingName" type="text" className="form-input" {...F('buildingName')} placeholder="e.g., Suite 5, Osu Ventures Building" value={formData.buildingName} onChange={(e) => handleInputChange('buildingName', e.target.value)} required />
              {M('buildingName')}
              {renderCorrection('buildingName')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="streetName">Street Name *</label>
              <input id="streetName" type="text" className="form-input" {...F('streetName')} placeholder="e.g., Oxford Street" value={formData.streetName} onChange={(e) => handleInputChange('streetName', e.target.value)} required />
              {M('streetName')}
              {renderCorrection('streetName')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="city">City / Town *</label>
              <input id="city" type="text" className="form-input" {...F('city')} placeholder="e.g., Accra" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} required />
              {M('city')}
              {renderCorrection('city')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="region">Region *</label>
              <select id="region" className="form-input" {...F('region')} value={formData.region} onChange={(e) => handleInputChange('region', e.target.value)} required>
                <option value="">Select region</option>
                {ghanaRegions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {M('region')}
              {renderCorrection('region')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="district">District *</label>
              <select id="district" className="form-input" {...F('district')} value={formData.district} onChange={(e) => handleInputChange('district', e.target.value)} disabled={!formData.region} required>
                <option value="">{formData.region ? 'Select district' : 'Choose a region first'}</option>
                {formData.district && !districtsFor(formData.region).includes(formData.district) && (
                  <option value={formData.district}>{formData.district}</option>
                )}
                {districtsFor(formData.region).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {M('district')}
              {renderCorrection('district')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="digitalAddress">Digital Address *</label>
              <input id="digitalAddress" type="text" className="form-input" {...F('digitalAddress')} placeholder="e.g., GA-XXX-XXXX" value={formData.digitalAddress} onChange={(e) => handleInputChange('digitalAddress', e.target.value)} required />
              {M('digitalAddress')}
              {renderCorrection('digitalAddress')}
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="postalAddress">Postal Address</label>
              <input id="postalAddress" type="text" className="form-input" placeholder="P.O. Box, PMB, or DTD" value={formData.postalAddress} onChange={(e) => handleInputChange('postalAddress', e.target.value)} />
              {renderCorrection('postalAddress')}
            </div>
          </div>

          <div className={styles.formSectionTitle}>Contact Information</div>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="mobilePhone">Mobile Phone *</label>
              <input id="mobilePhone" type="tel" className="form-input" {...F('mobilePhone')} placeholder="+233 XXX XXX XXX" value={formData.mobilePhone} onChange={(e) => handleInputChange('mobilePhone', e.target.value)} required />
              {M('mobilePhone')}
              {renderCorrection('mobilePhone')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="alternatePhone">Alternate Phone</label>
              <input id="alternatePhone" type="tel" className="form-input" placeholder="+233 XXX XXX XXX" value={formData.alternatePhone} onChange={(e) => handleInputChange('alternatePhone', e.target.value)} />
              {renderCorrection('alternatePhone')}
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="contactEmail">Email *</label>
              <input id="contactEmail" type="email" className="form-input" {...F('contactEmail')} placeholder="company@example.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
              {M('contactEmail')}
              {renderCorrection('email')}
            </div>
          </div>

          {issueList(1)}
          {nav(null, (
            <button type="button" className="btn btn-primary" onClick={() => next(1, 2)}>
              Continue <ArrowRight size={16} />
            </button>
          ))}
        </div>
      )}

      {step === 2 && !isCompany && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepHeading}>Proprietor</h2>
          <p className={styles.stepDesc}>The business owner&apos;s details, as on ORC Form A.</p>
          {sectionNotice(2, 'Some proprietor details need changes.')}
          {renderCorrection('proprietor.ghanaCardNumber')}
          <PersonForm person={proprietor} onChange={handleProprietorChange} prefix="prop" title="Proprietor" showErrors={errs.showErrors} focusRequest={errs.focusRequest} />
          {issueList(2)}
          {nav(() => go(1), (
            <button type="button" className="btn btn-primary" onClick={() => next(2, lastStep)}>
              {reviewButtonLabel} <ArrowRight size={16} />
            </button>
          ))}
        </div>
      )}

      {step === 2 && isCompany && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepHeading}>Directors</h2>
          <p className={styles.stepDesc}>At least two directors, one of whom lives in Ghana.</p>
          {sectionNotice(2, 'One or more directors need changes.')}
          <DirectorInviteTip />
          {directors.map((director, i) => (
            <div key={i} className={styles.personBlock}>
              {renderCorrection(`directors.${i}.ghanaCardNumber`)}
              <DirectorInvite index={i} director={director} inv={inv}>
                <PersonForm
                  person={director}
                  onChange={(f, v) => handleDirectorChange(i, f, v)}
                  prefix={`dir-${i}`}
                  title={`Director ${i + 1}`}
                  showErrors={errs.showErrors}
                  focusRequest={errs.focusRequest}
                />
              </DirectorInvite>
            </div>
          ))}
          {issueList(2)}
          {nav(() => go(1), (
            <button type="button" className="btn btn-primary" onClick={() => next(2, 3)}>
              Continue <ArrowRight size={16} />
            </button>
          ))}
        </div>
      )}

      {step === 3 && isCompany && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepHeading}>Secretary and shareholders</h2>
          <p className={styles.stepDesc}>Your company secretary and who owns the shares.</p>
          {sectionNotice(3, 'The secretary or shareholder details need changes.')}

          <div className={styles.personBlock}>
            {renderCorrection('secretary.ghanaCardNumber')}
            <PersonForm person={secretary} onChange={handleSecretaryChange} prefix="sec" title="Company Secretary" showErrors={errs.showErrors} focusRequest={errs.focusRequest} />
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
            people={directors.map((d, i) => ({ d, i, name: personDisplayName(d) })).filter((x) => x.name)}
            issues={step3Issues}
            errors={errs}
            note={renderCorrection}
          />

          {issueList(3)}
          {nav(() => go(2), (
            <button type="button" className="btn btn-primary" onClick={() => next(3, lastStep)}>
              {reviewButtonLabel} <ArrowRight size={16} />
            </button>
          ))}
        </div>
      )}

      {step === lastStep && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepHeading}>{isDraft ? 'Review and submit' : 'Review your changes'}</h2>
          <p className={styles.stepDesc}>
            {isDraft
              ? 'Check everything before you submit. You can go back to change any step.'
              : 'Check everything before you resubmit. There is nothing extra to pay for corrections.'}
          </p>

          <div className={styles.reviewSection}>
            <h3>Business</h3>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Name</span>
              <span className={styles.reviewValue}>{formData.businessName || '—'}</span>
            </div>
            {formData.businessNameAlt && (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Alternative name</span>
                <span className={styles.reviewValue}>{formData.businessNameAlt}</span>
              </div>
            )}
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Type</span>
              <span className={styles.reviewValue}>{typeName || '—'}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Office</span>
              <span className={styles.reviewValue}>
                {[formData.buildingName, formData.streetName, formData.city, formData.region].filter(Boolean).join(', ') || '—'}
              </span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Contact</span>
              <span className={styles.reviewValue}>{[formData.mobilePhone, formData.email].filter(Boolean).join(' · ') || '—'}</span>
            </div>
          </div>

          <div className={styles.reviewSection}>
            <h3>People</h3>
            {isCompany ? (
              <>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Directors</span>
                  <span className={styles.reviewValue}>
                    {directors.map((d) => [d.firstName, d.surname].filter(Boolean).join(' ')).filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Secretary</span>
                  <span className={styles.reviewValue}>{[secretary.firstName, secretary.surname].filter(Boolean).join(' ') || '—'}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Shareholders</span>
                  <span className={styles.reviewValue}>
                    {shareholders.map((sh) => sh.name && `${sh.name}${sh.numberOfShares ? ` (${sh.numberOfShares})` : ''}`).filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
              </>
            ) : (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Proprietor</span>
                <span className={styles.reviewValue}>{[proprietor.firstName, proprietor.surname].filter(Boolean).join(' ') || '—'}</span>
              </div>
            )}
          </div>

          <IssueList
            issues={allIssues}
            show={allIssues.length > 0}
            onJump={(issue) => jumpAcross(issue as Issue & { step: number })}
            verb={isDraft ? 'submit' : 'resubmit'}
          />

          {waitingOn.length > 0 && (
            <div className={styles.issues} role="status">
              <p className={styles.issuesTitle}>
                <Clock size={18} /> Waiting for {waitingOn.map((d) => personDisplayName(d) || 'a director').join(' and ')} to add their details
              </p>
              <p className={styles.issuesText}>
                You can {isDraft ? 'submit' : 'resubmit'} as soon as they’ve filled in the link you sent. This page updates on its own.{' '}
                <button type="button" className={styles.linkBtn} onClick={() => setStep(2)}>Go to directors</button>
              </p>
            </div>
          )}

          {nav(() => go(step - 1), (
            <button type="button" className="btn btn-primary btn-lg" onClick={trySubmit} disabled={submitting || waitingOn.length > 0}>
              {submitting
                ? (isDraft ? 'Submitting…' : 'Resubmitting…')
                : (isDraft ? 'Submit application' : 'Resubmit application')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
