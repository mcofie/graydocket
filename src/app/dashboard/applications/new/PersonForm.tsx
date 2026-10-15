import { useEffect, useState, useRef } from 'react'
import { ScanFace, ChevronDown, ChevronUp, CheckCircle2, UploadCloud, X, AlertCircle } from 'lucide-react'
import { PersonEntry, ghanaRegions } from './constants'
import styles from './new.module.css'
import { PERSON_REQUIRED, adultCutoffISO, personProblems, regionFromDigitalAddress } from './helpers'
import { MAX_ID_PHOTOS, PhotoError, compressImage, parseGhanaCardText } from './idcard'

// =====================================================
// Helpers
// =====================================================
const formatGhanaCard = (value: string): string => {
  let clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (clean.length > 0 && !clean.startsWith('G')) {
    clean = 'GHA' + clean
  } else if (clean.length > 1 && !clean.startsWith('GH')) {
    clean = 'GHA' + clean.slice(1)
  } else if (clean.length > 2 && !clean.startsWith('GHA')) {
    clean = 'GHA' + clean.slice(2)
  }

  let formatted = ''
  if (clean.length > 0) {
    formatted += 'GHA'
  }
  const digits = clean.slice(3, 13)
  if (digits.length > 0) {
    formatted += '-' + digits.slice(0, 9)
  }
  if (digits.length > 9) {
    formatted += '-' + digits.slice(9, 10)
  }
  return formatted
}

interface PersonFormProps {
  person: PersonEntry
  onChange: (field: string, value: any) => void
  /** Prefix for field ids (e.g. "dir-1" makes "dir-1-surname"), so errors can jump to a field */
  prefix: string
  title: string
  /** After Continue was pressed with problems: show "Required" on empty fields too */
  showErrors?: boolean
  /** Open the section holding this field id (the form then focuses it) */
  focusRequest?: { id: string; n: number } | null
}

// Required fields grouped by accordion section, for the completion indicators
const SECTION_FIELDS: Record<'personal' | 'id' | 'address', Array<keyof PersonEntry>> = {
  personal: ['surname', 'firstName', 'dateOfBirth', 'gender', 'nationality', 'occupation'],
  id: ['ghanaCardNumber', 'tinNumber'],
  address: ['residentialAddress', 'city', 'region', 'phone', 'email'],
}
const sectionOf = (key: string): keyof typeof SECTION_FIELDS =>
  key === 'title' || key === 'otherNames' ? 'personal'
  : key === 'digitalAddress' ? 'address'
  : key === 'idPhotos' ? 'id'
  : ((Object.keys(SECTION_FIELDS) as Array<keyof typeof SECTION_FIELDS>).find((s) => SECTION_FIELDS[s].includes(key as keyof PersonEntry)) ?? 'personal')

export default function PersonForm({ person, onChange, prefix, title, showErrors = false, focusRequest }: PersonFormProps) {
  const isFilled = (key: keyof PersonEntry) => Boolean(String(person[key] ?? '').trim())
  const problems = personProblems(person)
  // Wrong formats show as soon as they're typed; empty required fields only after Continue
  const errorFor = (key: keyof PersonEntry) => {
    const msg = problems[key]
    if (!msg || (msg === 'Required' && !showErrors)) return null
    return msg
  }
  const remaining = PERSON_REQUIRED.filter(([key]) => !isFilled(key)).length
  const sectionDone = (section: keyof typeof SECTION_FIELDS) => SECTION_FIELDS[section].every((k) => isFilled(k) && !problems[k])
  const sectionErrors = (section: keyof typeof SECTION_FIELDS) => SECTION_FIELDS[section].filter((k) => errorFor(k)).length

  /** id, aria-invalid and aria-describedby for one field */
  const field = (key: keyof PersonEntry) => {
    const err = errorFor(key)
    return {
      id: `${prefix}-${key}`,
      'aria-invalid': err ? true : undefined,
      'aria-describedby': err ? `${prefix}-${key}-err` : undefined,
    } as const
  }
  /** The message under a field, when it has one */
  const errText = (k: keyof PersonEntry) => {
    const err = errorFor(k)
    return err ? <span id={`${prefix}-${k}-err`} className={styles.fieldError}><AlertCircle size={13} /> {err}</span> : null
  }

  const [openSection, setOpenSection] = useState<'personal' | 'id' | 'address'>('personal')

  // Asked to show a field (from the error list or Continue): open its section
  useEffect(() => {
    if (!focusRequest || !focusRequest.id.startsWith(`${prefix}-`)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the section the parent asked for
    setOpenSection(sectionOf(focusRequest.id.slice(prefix.length + 1)))
  }, [focusRequest, prefix])
  const [isScanning, setIsScanning] = useState(false)
  const [scanNote, setScanNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photos = person.idPhotos || []
  const roomFor = MAX_ID_PHOTOS - photos.length - (person.ghanaCardPhotoUrl ? 1 : 0)

  const handleGhanaCardChange = (val: string) => {
    const formatted = formatGhanaCard(val)
    onChange('ghanaCardNumber', formatted)
  }

  const handleScanClick = () => {
    setScanNote(null)
    fileInputRef.current?.click()
  }

  /** Read the card, fill what we could read, and keep the photo as one of their ID photos */
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsScanning(true)
    setScanNote(null)
    try {
      const image = await compressImage(file)
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng')
      const { data: { text } } = await worker.recognize(image)
      await worker.terminate()

      const reading = parseGhanaCardText(text)
      const LABELS: Record<string, string> = {
        ghanaCardNumber: 'card number', surname: 'surname', firstName: 'first name', otherNames: 'other names',
        dateOfBirth: 'date of birth', gender: 'gender', nationality: 'nationality',
      }
      const filled = Object.entries(reading).filter(([, v]) => v)
      for (const [key, value] of filled) onChange(key, value)
      if (roomFor > 0) onChange('idPhotos', [...photos, image])

      setScanNote(
        filled.length > 0
          ? { ok: true, text: `Filled in your ${filled.map(([k]) => LABELS[k]).join(', ')}. Check they’re right.` }
          : { ok: false, text: 'We couldn’t read the card clearly, so please type the details. Its photo has been added below.' }
      )
      setOpenSection(filled.some(([k]) => k !== 'ghanaCardNumber') ? 'personal' : 'id')
    } catch (err) {
      setScanNote({
        ok: false,
        text: err instanceof PhotoError ? err.message : 'We couldn’t read that photo. Make sure it’s clear and well lit, or type the details.',
      })
    } finally {
      setIsScanning(false)
    }
  }

  /** Add ID photos, shrunk so they save quickly */
  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setPhotoError('')
    if (roomFor <= 0) return setPhotoError(`You can add up to ${MAX_ID_PHOTOS} photos. Remove one first.`)
    setPhotoBusy(true)
    const added: string[] = []
    let problem = ''
    for (const file of files.slice(0, roomFor)) {
      try {
        added.push(await compressImage(file))
      } catch (err) {
        problem = err instanceof PhotoError ? err.message : 'One of those photos couldn’t be added.'
      }
    }
    if (files.length > roomFor) problem = `Only ${MAX_ID_PHOTOS} photos per person, so we added the first ${roomFor}.`
    if (added.length) onChange('idPhotos', [...photos, ...added])
    setPhotoError(problem)
    setPhotoBusy(false)
  }

  return (
    <div className={styles.personFormContainer}>
      <div className={styles.personFormHeader}>
        <div className={styles.personFormTitleRow}>
          <h3 className={styles.personFormTitle}>{title}</h3>
          {/* Wrong details count as unfinished, not just empty ones */}
          {(() => {
            const wrong = Object.values(problems).filter((m) => m !== 'Required').length
            if (remaining === 0 && wrong === 0) return <span className={`${styles.completion} ${styles.completionDone}`}><CheckCircle2 size={13} /> Complete</span>
            if (wrong > 0) return <span className={`${styles.completion} ${styles.completionBad}`}>{wrong} to fix{remaining > 0 ? ` · ${remaining} left` : ''}</span>
            return <span className={styles.completion}>{remaining} detail{remaining > 1 ? 's' : ''} left</span>
          })()}
        </div>
        <input type="file" accept="image/*" ref={fileInputRef} hidden onChange={handleScanFile} />
        <div className={styles.scanWrap}>
          <button type="button" onClick={handleScanClick} className="btn btn-secondary btn-sm" disabled={isScanning}>
            {isScanning ? 'Reading card…' : <><ScanFace size={16} /> {scanNote?.ok ? 'Scan again' : 'Scan Ghana Card to fill in'}</>}
          </button>
        </div>
      </div>
      {scanNote && (
        <p className={scanNote.ok ? styles.scanOk : styles.scanError} role="status">
          {scanNote.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {scanNote.text}
        </p>
      )}

      {/* Accordion 1: Personal Info */}
      <div className={styles.accordion}>
        <button 
          type="button" 
          onClick={() => setOpenSection(openSection === 'personal' ? 'personal' : 'personal')} 
          className={styles.accordionTrigger}
        >
          <span className={styles.sectionLabel}>{sectionDone('personal') && <CheckCircle2 size={15} className={styles.sectionTick} />}1. Personal information{sectionErrors('personal') > 0 && <span className={styles.sectionErrors}>{sectionErrors('personal')} to fix</span>}</span> {openSection === 'personal' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'personal' && (
          <div className={styles.accordionContent}>
            <div className={styles.formGrid}>
               <div className="form-group">
                <label className="form-label">Title</label>
                <select className="form-input" {...field('title')} value={person.title} onChange={(e) => onChange('title', e.target.value)}>
                  <option value="">Select</option><option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Dr">Dr</option><option value="Prof">Prof</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Surname *</label>
                <input type="text" className="form-input" {...field('surname')} value={person.surname} onChange={(e) => onChange('surname', e.target.value)} required />
                {errText('surname')}
              </div>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input type="text" className="form-input" {...field('firstName')} value={person.firstName} onChange={(e) => onChange('firstName', e.target.value)} required />
                {errText('firstName')}
              </div>
               <div className="form-group">
                <label className="form-label">Other Names (optional)</label>
                <input type="text" className="form-input" {...field('otherNames')} value={person.otherNames} onChange={(e) => onChange('otherNames', e.target.value)} />
              </div>
               <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <input type="date" className="form-input" {...field('dateOfBirth')} max={adultCutoffISO()} value={person.dateOfBirth} onChange={(e) => onChange('dateOfBirth', e.target.value)} required />
                {errorFor('dateOfBirth') ? errText('dateOfBirth') : <span className="form-hint">Must be 18 or older</span>}
              </div>
               <div className="form-group">
                <label className="form-label">Gender *</label>
                <select className="form-input" {...field('gender')} value={person.gender} onChange={(e) => onChange('gender', e.target.value)} required>
                  <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
                </select>
                {errText('gender')}
              </div>
               <div className="form-group">
                <label className="form-label">Nationality *</label>
                <input type="text" className="form-input" {...field('nationality')} value={person.nationality} onChange={(e) => onChange('nationality', e.target.value)} required />
                {errText('nationality')}
              </div>
               <div className="form-group">
                <label className="form-label">Occupation *</label>
                <input type="text" className="form-input" {...field('occupation')} value={person.occupation} onChange={(e) => onChange('occupation', e.target.value)} required />
                {errText('occupation')}
              </div>
            </div>
            <div className={styles.sectionNext}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpenSection('id')}>Next section</button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Identification */}
      <div className={styles.accordion}>
        <button 
          type="button" 
          onClick={() => setOpenSection(openSection === 'id' ? 'personal' : 'id')} 
          className={styles.accordionTrigger}
        >
          <span className={styles.sectionLabel}>{sectionDone('id') && <CheckCircle2 size={15} className={styles.sectionTick} />}2. Identification{sectionErrors('id') > 0 && <span className={styles.sectionErrors}>{sectionErrors('id')} to fix</span>}</span> {openSection === 'id' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'id' && (
          <div className={styles.accordionContent}>
            <div className={styles.formGrid}>
               <div className="form-group">
                <label className="form-label">Ghana Card Number *</label>
                <input
                  type="text"
                  className="form-input"
                  {...field('ghanaCardNumber')}
                  placeholder="GHA-XXXXXXXXX-X"
                  value={person.ghanaCardNumber}
                  onChange={(e) => handleGhanaCardChange(e.target.value)}
                  required
                />
                {errText('ghanaCardNumber')}
              </div>
              <div className="form-group">
                <label className="form-label">TIN *</label>
                <input type="text" className="form-input" {...field('tinNumber')} placeholder="e.g., CXXXXXXXX" value={person.tinNumber} onChange={(e) => onChange('tinNumber', e.target.value)} required />
                {errText('tinNumber')}
              </div>
              <div className={`form-group ${styles.formFull}`}>
                <label className="form-label">Upload ID Photos (Front, Back, etc.)</label>
                <div>
                  <label className={`${styles.uploadBtn} ${roomFor <= 0 || photoBusy ? styles.uploadBtnOff : ''}`}>
                    <UploadCloud size={16} /> {photoBusy ? 'Adding…' : 'Add photos'}
                    <input type="file" accept="image/*" multiple hidden disabled={roomFor <= 0 || photoBusy} onChange={handleAddPhotos} />
                  </label>
                  <span className={`form-hint ${styles.uploadHint}`}>Front and back of the Ghana Card, clear and readable. Up to {MAX_ID_PHOTOS}.</span>
                  {photoError && <span className={styles.fieldError}><AlertCircle size={13} /> {photoError}</span>}
                  
                  {((person.idPhotos && person.idPhotos.length > 0) || person.ghanaCardPhotoUrl) && (
                    <div className={styles.photoList}>
                      {person.ghanaCardPhotoUrl && (
                        <div className={styles.photoThumb}>
                          <img src={person.ghanaCardPhotoUrl} alt="ID" />
                          <button type="button" onClick={() => onChange('ghanaCardPhotoUrl', '')} className={styles.photoRemove} aria-label="Remove photo">
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      {person.idPhotos?.map((photo, idx) => (
                        <div key={idx} className={styles.photoThumb}>
                          <img src={photo} alt="ID" />
                          <button type="button" onClick={() => {
                             const newPhotos = [...(person.idPhotos || [])]
                             newPhotos.splice(idx, 1)
                             onChange('idPhotos', newPhotos)
                          }} className={styles.photoRemove} aria-label="Remove photo">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.sectionNext}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpenSection('address')}>Next section</button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 3: Contact & Address */}
      <div className={styles.accordion}>
        <button 
          type="button" 
          onClick={() => setOpenSection(openSection === 'address' ? 'id' : 'address')} 
          className={styles.accordionTrigger}
        >
          <span className={styles.sectionLabel}>{sectionDone('address') && <CheckCircle2 size={15} className={styles.sectionTick} />}3. Address and contact{sectionErrors('address') > 0 && <span className={styles.sectionErrors}>{sectionErrors('address')} to fix</span>}</span> {openSection === 'address' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'address' && (
          <div className={styles.accordionContent}>
            <div className={styles.formGrid}>
              <div className={`form-group ${styles.formFull}`}>
                <label className="form-label">Street / House Address *</label>
                <input type="text" className="form-input" {...field('residentialAddress')} value={person.residentialAddress} onChange={(e) => onChange('residentialAddress', e.target.value)} required />
                {errText('residentialAddress')}
              </div>
              <div className="form-group">
                <label className="form-label">City / Town *</label>
                <input type="text" className="form-input" {...field('city')} value={person.city} onChange={(e) => onChange('city', e.target.value)} required />
                {errText('city')}
              </div>
              <div className="form-group">
                <label className="form-label">Region *</label>
                <select className="form-input" {...field('region')} value={person.region} onChange={(e) => onChange('region', e.target.value)} required>
                  <option value="">Select region</option>
                  {ghanaRegions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {errText('region')}
              </div>
              <div className="form-group">
                <label className="form-label">Digital Address (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  id={`${prefix}-digitalAddress`}
                  placeholder="e.g. GA-123-4567"
                  value={person.digitalAddress}
                  onChange={(e) => {
                    onChange('digitalAddress', e.target.value)
                    const region = !person.region && regionFromDigitalAddress(e.target.value)
                    if (region) onChange('region', region)
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input type="tel" className="form-input" {...field('phone')} value={person.phone} onChange={(e) => onChange('phone', e.target.value)} required />
                {errText('phone')}
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" {...field('email')} value={person.email} onChange={(e) => onChange('email', e.target.value)} required />
                {errText('email')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
