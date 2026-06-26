'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { 
  getApplicationDetails, resubmitApplication, updateApplicationDraft
} from '@/lib/actions'
import styles from '../../new/new.module.css'
import {
  businessTypes, businessSectors, ghanaRegions,
  PersonEntry, emptyPerson, ShareholderEntry, emptyShareholder
} from '../../new/constants'
import PersonForm from '../../new/PersonForm'

interface Props {
  applicationId: string
}

export default function EditSubmissionContent({ applicationId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [appStatus, setAppStatus] = useState<string>('draft')
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSavedMessage, setDraftSavedMessage] = useState('')

  // ---- Form State (initialized with defaults, then loaded from DB) ----
  const [formData, setFormData] = useState({
    businessName: '',
    businessNameAlt: '',
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

  useEffect(() => {
    async function loadApp() {
      const res = await getApplicationDetails(applicationId)
      
      if (res.error) {
         setSubmitError(`Data Load Error: ${res.error}`)
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
        
        if (data.corrections) setCorrections(data.corrections)
        setStep(1)
      } else {
        setSubmitError('Application data could not be retrieved. Please check your connection.')
      }
      setLoading(false)
    }
    loadApp()
  }, [applicationId])

  const isCompany = selectedType === 'limited_by_shares' || selectedType === 'limited_by_guarantee'

  const progressSteps = isCompany
    ? [
        { label: 'Business Type' },
        { label: 'Company Info' },
        { label: 'Directors' },
        { label: 'Secretary & Shareholders' },
        { label: 'Review' },
      ]
    : [
        { label: 'Business Type' },
        { label: 'Business Info' },
        { label: 'Proprietor' },
        { label: 'Review' },
      ]

  const lastStep = progressSteps.length - 1

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

  const handleCompanyDetailChange = (field: string, value: string) => {
    setCompanyDetails((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveDraft = async () => {
    setSavingDraft(true)
    setSubmitError('')
    setDraftSavedMessage('')

    const fullFormData = {
      formData,
      businessType: selectedType,
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

    const result = await updateApplicationDraft(applicationId, fullFormData)

    if (result.error) {
      setSubmitError(result.error)
    } else {
      setDraftSavedMessage('Draft saved successfully!')
      setTimeout(() => setDraftSavedMessage(''), 3000)
    }
    setSavingDraft(false)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')

    const fullFormData = {
      formData,
      businessType: selectedType,
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

    const result = await resubmitApplication(applicationId, fullFormData)

    if (result.error) {
      setSubmitError(result.error)
      setSubmitting(false)
      return
    }

    router.push(`/dashboard/applications/${applicationId}`)
  }

  if (loading) return <div className={styles.newReg}><div className="card">Loading application details...</div></div>

  const renderCorrection = (path: string) => {
    const msg = corrections[path]
    if (!msg) return null
    return (
      <div style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--color-error)', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <AlertCircle size={16} /> <span>REVISION REQUIRED: {msg}</span>
      </div>
    )
  }

  const hasSectionCorrection = (stepIdx: number) => {
    const keys = Object.keys(corrections)
    if (stepIdx === 1) {
      // Step 1: Business info are keys at the top level that aren't other sections
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

  return (
    <div className={styles.newReg}>
      <div className={styles.newRegHeader}>
        <h1>{appStatus === 'draft' ? 'Edit Application Draft' : 'Fix & Resubmit'}</h1>
        <p>
          {appStatus === 'draft' 
            ? 'Complete and submit your application draft.' 
            : 'Your application was flagged for corrections. Please update the necessary fields below.'}
        </p>
      </div>

      {draftSavedMessage && (
        <div style={{ background: 'var(--color-success-light)', color: 'var(--color-success)', padding: '12px 16px', borderRadius: '10px', margin: '0 auto 24px auto', maxWidth: '800px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-success)', fontWeight: 600 }}>
          <Check size={18} />
          {draftSavedMessage}
        </div>
      )}
      {submitError && (
        <div style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', padding: '12px 16px', borderRadius: '10px', margin: '0 auto 24px auto', maxWidth: '800px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-error)', fontWeight: 600 }}>
          <AlertCircle size={18} />
          {submitError}
        </div>
      )}

      <div className={styles.progressBar}>
        {progressSteps.map((ps, i) => {
          const sectionNeedsCorrection = hasSectionCorrection(i)
          return (
            <div key={i} className={styles.progressStep}>
              <div 
                className={`${styles.progressDot} ${i < step ? styles.completed : i === step ? styles.active : ''}`}
                style={sectionNeedsCorrection ? { border: '2px solid var(--color-error)', color: 'var(--color-error)' } : {}}
              >
                {sectionNeedsCorrection ? (
                  <AlertCircle size={14} style={{ color: 'var(--color-error)' }} />
                ) : (
                  i < step ? <Check size={14} /> : i + 1
                )}
              </div>
              <span className={`${styles.progressLabel} ${i === step ? styles.active : ''}`} style={sectionNeedsCorrection ? { color: 'var(--color-error)' } : {}}>
                {ps.label}
              </span>
              {i < progressSteps.length - 1 && (
                <div className={`${styles.progressLine} ${i < step ? styles.completed : ''}`} />
              )}
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <div className={styles.stepCard}>
          {hasSectionCorrection(1) && (
            <div style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-error)' }}>
              <AlertCircle size={18} />
              <strong>This section contains fields requiring correction (see below).</strong>
            </div>
          )}
          <h2 className={styles.stepTitle}>
            {isCompany ? 'Company Information' : 'Business Information'}
          </h2>
          
          {/* Business / Company Name */}
          <div className={styles.formSectionTitle}>
            {isCompany ? 'Proposed Company Name' : 'Proposed Business Name'}
          </div>
          <div className={styles.formGrid}>
            <div className={`form-group ${styles.formFull}`}>
              {renderCorrection('businessName')}
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
            </div>
            <div className={`form-group ${styles.formFull}`}>
              {renderCorrection('businessNameAlt')}
              <label className="form-label" htmlFor="businessNameAlt">Alternative Name (optional)</label>
              <input id="businessNameAlt" type="text" className="form-input" placeholder="Backup name if first choice is unavailable" value={formData.businessNameAlt} onChange={(e) => handleInputChange('businessNameAlt', e.target.value)} />
            </div>
          </div>

          {/* Nature of Business */}
          <div className={styles.formSectionTitle}>Nature of Business</div>
          <div className={styles.formGrid}>
            <div className="form-group">
              {renderCorrection('businessSector')}
              <label className="form-label" htmlFor="businessSector">Business Sector *</label>
              <select id="businessSector" className="form-input" value={formData.businessSector} onChange={(e) => handleInputChange('businessSector', e.target.value)} required>
                <option value="">Select sector</option>
                {businessSectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {formData.businessSector === 'Other (specify below)' && (
              <div className="form-group">
                {renderCorrection('businessSectorOther')}
                <label className="form-label" htmlFor="businessSectorOther">Specify Sector</label>
                <input id="businessSectorOther" type="text" className="form-input" placeholder="Describe your sector" value={formData.businessSectorOther} onChange={(e) => handleInputChange('businessSectorOther', e.target.value)} />
              </div>
            )}
            <div className={`form-group ${formData.businessSector === 'Other (specify below)' ? '' : styles.formFull}`}>
              {renderCorrection('natureOfBusiness')}
              <label className="form-label" htmlFor="natureOfBusiness">
                {isCompany ? 'Objects of the Company / Description of Activities *' : 'Description of Business Activities *'}
              </label>
              <textarea id="natureOfBusiness" className="form-input" placeholder="Describe the specific activities and services..." rows={3} value={formData.natureOfBusiness} onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)} required style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              {renderCorrection('dateOfCommencement')}
              <label className="form-label" htmlFor="dateOfCommencement">Date of Commencement *</label>
              <input id="dateOfCommencement" type="date" className="form-input" value={formData.dateOfCommencement} onChange={(e) => handleInputChange('dateOfCommencement', e.target.value)} required />
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
              {renderCorrection('buildingName')}
              <label className="form-label" htmlFor="buildingName">House / Building / Flat *</label>
              <input id="buildingName" type="text" className="form-input" placeholder="e.g., Suite 5, Osu Ventures Building" value={formData.buildingName} onChange={(e) => handleInputChange('buildingName', e.target.value)} required />
            </div>
            <div className="form-group">
              {renderCorrection('streetName')}
              <label className="form-label" htmlFor="streetName">Street Name *</label>
              <input id="streetName" type="text" className="form-input" placeholder="e.g., Oxford Street" value={formData.streetName} onChange={(e) => handleInputChange('streetName', e.target.value)} required />
            </div>
            <div className="form-group">
              {renderCorrection('city')}
              <label className="form-label" htmlFor="city">City / Town *</label>
              <input id="city" type="text" className="form-input" placeholder="e.g., Accra" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} required />
            </div>
            <div className="form-group">
              {renderCorrection('district')}
              <label className="form-label" htmlFor="district">District *</label>
              <input id="district" type="text" className="form-input" placeholder="e.g., Accra Metropolitan" value={formData.district} onChange={(e) => handleInputChange('district', e.target.value)} required />
            </div>
            <div className="form-group">
              {renderCorrection('region')}
              <label className="form-label" htmlFor="region">Region *</label>
              <select id="region" className="form-input" value={formData.region} onChange={(e) => handleInputChange('region', e.target.value)} required>
                <option value="">Select region</option>
                {ghanaRegions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              {renderCorrection('digitalAddress')}
              <label className="form-label" htmlFor="digitalAddress">Digital Address *</label>
              <input id="digitalAddress" type="text" className="form-input" placeholder="e.g., GA-XXX-XXXX" value={formData.digitalAddress} onChange={(e) => handleInputChange('digitalAddress', e.target.value)} required />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              {renderCorrection('postalAddress')}
              <label className="form-label" htmlFor="postalAddress">Postal Address</label>
              <input id="postalAddress" type="text" className="form-input" placeholder="P.O. Box, PMB, or DTD" value={formData.postalAddress} onChange={(e) => handleInputChange('postalAddress', e.target.value)} />
            </div>
          </div>

          {/* Contact Information */}
          <div className={styles.formSectionTitle}>Contact Information</div>
          <div className={styles.formGrid}>
            <div className="form-group">
              {renderCorrection('mobilePhone')}
              <label className="form-label" htmlFor="mobilePhone">Mobile Phone *</label>
              <input id="mobilePhone" type="tel" className="form-input" placeholder="+233 XXX XXX XXX" value={formData.mobilePhone} onChange={(e) => handleInputChange('mobilePhone', e.target.value)} required />
            </div>
            <div className="form-group">
              {renderCorrection('alternatePhone')}
              <label className="form-label" htmlFor="alternatePhone">Alternate Phone</label>
              <input id="alternatePhone" type="tel" className="form-input" placeholder="+233 XXX XXX XXX" value={formData.alternatePhone} onChange={(e) => handleInputChange('alternatePhone', e.target.value)} />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              {renderCorrection('email')}
              <label className="form-label" htmlFor="contactEmail">Email *</label>
              <input id="contactEmail" type="email" className="form-input" placeholder="company@example.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
            </div>
          </div>

          <div className={styles.stepNav}>
            {appStatus === 'draft' && (
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && !isCompany && (
        <div className={styles.stepCard}>
          {hasSectionCorrection(2) && (
            <div style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-error)' }}>
              <AlertCircle size={18} />
              <strong>Requested corrections for the Proprietor are shown below.</strong>
            </div>
          )}
          <h2 className={styles.stepTitle}>Proprietor Details</h2>
          {renderCorrection('proprietor.ghanaCardNumber')}
          <PersonForm person={proprietor} onChange={handleProprietorChange} prefix="prop" title="Proprietor" />
          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
            {appStatus === 'draft' && (
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setStep(lastStep)}>
              {appStatus === 'draft' ? 'Review & Submit' : 'Review & Resubmit'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && isCompany && (
        <div className={styles.stepCard}>
          {hasSectionCorrection(2) && (
            <div style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-error)' }}>
              <AlertCircle size={18} />
              <strong>One or more Directors require corrections.</strong>
            </div>
          )}
          <h2 className={styles.stepTitle}>Directors</h2>
          {directors.map((director, i) => (
            <div key={i} style={{ marginBottom: 'var(--space-8)' }}>
              {renderCorrection(`directors.${i}.ghanaCardNumber`)}
              <PersonForm 
                person={director} 
                onChange={(f, v) => handleDirectorChange(i, f, v)} 
                prefix={`dir-${i}`} 
                title={`Director ${i + 1}`} 
              />
            </div>
          ))}
          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
            {appStatus === 'draft' && (
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setStep(3)}>Continue <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {step === 3 && isCompany && (
        <div className={styles.stepCard}>
          {hasSectionCorrection(3) && (
            <div style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-error)' }}>
              <AlertCircle size={18} />
              <strong>Corrections required for Secretary or Shareholders.</strong>
            </div>
          )}
          <h2 className={styles.stepTitle}>Secretary & Shareholders</h2>
          
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h3 className={styles.formSectionTitle}>Secretary</h3>
            {renderCorrection('secretary.ghanaCardNumber')}
            <PersonForm person={secretary} onChange={handleSecretaryChange} prefix="sec" title="Company Secretary" />
          </div>

          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h3 className={styles.formSectionTitle}>Shareholders</h3>
            {shareholders.map((sh, i) => (
              <div key={i} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-neutral-50)', borderRadius: '12px' }}>
                <div className="form-group">
                  {renderCorrection(`shareholders.${i}.name`)}
                  <label className="form-label">Shareholder Name</label>
                  <input className="form-input" value={sh.name} onChange={(e) => handleShareholderChange(i, 'name', e.target.value)} />
                </div>
                <div className="form-group">
                  {renderCorrection(`shareholders.${i}.numberOfShares`)}
                  <label className="form-label">Number of Shares</label>
                  <input className="form-input" type="number" value={sh.numberOfShares} onChange={(e) => handleShareholderChange(i, 'numberOfShares', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.stepNav}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
            {appStatus === 'draft' && (
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setStep(lastStep)}>
              {appStatus === 'draft' ? 'Review & Submit' : 'Review & Resubmit'}
            </button>
          </div>
        </div>
      )}

      {step === lastStep && (
        <div className={styles.stepCard}>
          <h2 className={styles.stepTitle}>Final Review</h2>
          <p>Check everything again before resubmitting. No additional payment is required for corrections.</p>
          
          <div className={styles.reviewSection}>
            <h3 className={styles.formSectionTitle}>Resubmission Summary</h3>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Business Name</span>
              <span className={styles.reviewValue}>{formData.businessName}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Type</span>
              <span className={styles.reviewValue}>{selectedType?.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>

          <div className={styles.stepNav}>
             <button className="btn btn-ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>
             {appStatus === 'draft' && (
               <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={savingDraft}>
                 {savingDraft ? 'Saving...' : 'Save Draft'}
               </button>
             )}
             <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
                {submitting 
                  ? (appStatus === 'draft' ? 'Submitting...' : 'Resubmitting...') 
                  : (appStatus === 'draft' ? 'Submit Application' : 'Submit Corrections')}
             </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .form-label { font-weight: 700; color: var(--color-neutral-700); }
        .form-input { margin-bottom: 20px; }
      `}</style>
    </div>
  )
}
