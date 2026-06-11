import { useState } from 'react'
import { ScanFace, ChevronDown, ChevronUp, CheckCircle2, UploadCloud, X } from 'lucide-react'
import { PersonEntry, ghanaRegions } from './constants'
import styles from './new.module.css'

interface PersonFormProps {
  person: PersonEntry
  onChange: (field: string, value: string) => void
  prefix: string
  title: string
}

export default function PersonForm({ person, onChange, prefix, title }: PersonFormProps) {
  const [openSection, setOpenSection] = useState<'personal' | 'id' | 'address'>('personal')
  const [isScanning, setIsScanning] = useState(false)
  const [scanned, setScanned] = useState(false)

  const handleScan = () => {
    setIsScanning(true)
    setTimeout(() => {
      onChange('title', 'Mr')
      onChange('firstName', 'Kwame')
      onChange('surname', 'Mensah')
      onChange('dateOfBirth', '1985-10-14')
      onChange('gender', 'Male')
      onChange('ghanaCardNumber', 'GHA-712345678-9')
      onChange('nationality', 'Ghanaian')
      
      // Additional extraction
      onChange('tinNumber', 'C0012345678')
      setIsScanning(false)
      setScanned(true)
      setOpenSection('address') // Move them to the next unfilled section
    }, 1500)
  }

  return (
    <div className={styles.personFormContainer}>
      <div className={styles.personFormHeader}>
        <h3 className={styles.personFormTitle}>{title}</h3>
        {!scanned ? (
          <button type="button" onClick={handleScan} className="btn btn-secondary btn-sm" disabled={isScanning} style={{ height: '40px' }}>
            {isScanning ? 'Scanning Card...' : <><ScanFace size={16} /> Scan Ghana Card to Auto-fill</>}
          </button>
        ) : (
          <span style={{ color: 'var(--color-success)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Data Extracted Successfully
          </span>
        )}
      </div>

      {/* Accordion 1: Personal Info */}
      <div className={styles.accordion}>
        <button 
          type="button" 
          onClick={() => setOpenSection(openSection === 'personal' ? 'personal' : 'personal')} 
          className={styles.accordionTrigger}
          style={{ background: openSection === 'personal' ? 'var(--color-neutral-50)' : 'var(--color-neutral-0)' }}
        >
          <span>1. Personal Information</span> {openSection === 'personal' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'personal' && (
          <div className={styles.accordionContent}>
            <div className={styles.formGrid}>
               <div className="form-group">
                <label className="form-label">Title</label>
                <select className="form-input" value={person.title} onChange={(e) => onChange('title', e.target.value)}>
                  <option value="">Select</option><option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Dr">Dr</option><option value="Prof">Prof</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Surname *</label>
                <input type="text" className="form-input" value={person.surname} onChange={(e) => onChange('surname', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input type="text" className="form-input" value={person.firstName} onChange={(e) => onChange('firstName', e.target.value)} required />
              </div>
               <div className="form-group">
                <label className="form-label">Other Names</label>
                <input type="text" className="form-input" value={person.otherNames} onChange={(e) => onChange('otherNames', e.target.value)} />
              </div>
               <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <input type="date" className="form-input" value={person.dateOfBirth} onChange={(e) => onChange('dateOfBirth', e.target.value)} required />
              </div>
               <div className="form-group">
                <label className="form-label">Gender *</label>
                <select className="form-input" value={person.gender} onChange={(e) => onChange('gender', e.target.value)} required>
                  <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
                </select>
              </div>
               <div className="form-group">
                <label className="form-label">Nationality *</label>
                <input type="text" className="form-input" value={person.nationality} onChange={(e) => onChange('nationality', e.target.value)} required />
              </div>
               <div className="form-group">
                <label className="form-label">Occupation *</label>
                <input type="text" className="form-input" value={person.occupation} onChange={(e) => onChange('occupation', e.target.value)} required />
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-6)', textAlign: 'right' }}>
              <button type="button" className="btn btn-secondary btn-sm" style={{ height: '40px', padding: '0 20px' }} onClick={() => setOpenSection('id')}>Next Section</button>
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
          style={{ background: openSection === 'id' ? 'var(--color-neutral-50)' : 'var(--color-neutral-0)' }}
        >
          <span>2. Identification</span> {openSection === 'id' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'id' && (
          <div className={styles.accordionContent}>
            <div className={styles.formGrid}>
               <div className="form-group">
                <label className="form-label">Ghana Card Number *</label>
                <input type="text" className="form-input" placeholder="GHA-XXXXXXXXX-X" value={person.ghanaCardNumber} onChange={(e) => onChange('ghanaCardNumber', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">TIN *</label>
                <input type="text" className="form-input" placeholder="e.g., CXXXXXXXX" value={person.tinNumber} onChange={(e) => onChange('tinNumber', e.target.value)} required />
              </div>
              <div className={`form-group ${styles.formFull}`}>
                <label className="form-label">Upload ID Photos (Front, Back, etc.)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <label 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      padding: '10px 16px', background: 'var(--color-neutral-100)', 
                      border: '1px solid var(--color-neutral-200)', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: 'var(--color-neutral-700)',
                      width: 'fit-content'
                    }}
                  >
                    <UploadCloud size={16} /> Add Photos
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        const promises = files.map(file => new Promise<string>((resolve) => {
                           const reader = new FileReader()
                           reader.onloadend = () => resolve(reader.result as string)
                           reader.readAsDataURL(file)
                        }))
                        Promise.all(promises).then(results => {
                           const existing = person.idPhotos || []
                           onChange('idPhotos', [...existing, ...results])
                        })
                      }}
                    />
                  </label>
                  
                  {((person.idPhotos && person.idPhotos.length > 0) || person.ghanaCardPhotoUrl) && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {person.ghanaCardPhotoUrl && (
                        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                          <img src={person.ghanaCardPhotoUrl} alt="ID" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-neutral-200)' }} />
                          <button type="button" onClick={() => onChange('ghanaCardPhotoUrl', '')} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'white', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      {person.idPhotos?.map((photo, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                          <img src={photo} alt="ID" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-neutral-200)' }} />
                          <button type="button" onClick={() => {
                             const newPhotos = [...(person.idPhotos || [])]
                             newPhotos.splice(idx, 1)
                             onChange('idPhotos', newPhotos)
                          }} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'white', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-6)', textAlign: 'right' }}>
              <button type="button" className="btn btn-secondary btn-sm" style={{ height: '40px', padding: '0 20px' }} onClick={() => setOpenSection('address')}>Next Section</button>
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
          style={{ background: openSection === 'address' ? 'var(--color-neutral-50)' : 'var(--color-neutral-0)' }}
        >
          <span>3. Address & Contact</span> {openSection === 'address' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'address' && (
          <div className={styles.accordionContent}>
            <div className={styles.formGrid}>
              <div className={`form-group ${styles.formFull}`}>
                <label className="form-label">Street / House Address *</label>
                <input type="text" className="form-input" value={person.residentialAddress} onChange={(e) => onChange('residentialAddress', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">City / Town *</label>
                <input type="text" className="form-input" value={person.city} onChange={(e) => onChange('city', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Region *</label>
                <select className="form-input" value={person.region} onChange={(e) => onChange('region', e.target.value)} required>
                  <option value="">Select region</option>
                  {ghanaRegions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Digital Address</label>
                <input type="text" className="form-input" value={person.digitalAddress} onChange={(e) => onChange('digitalAddress', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input type="tel" className="form-input" value={person.phone} onChange={(e) => onChange('phone', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={person.email} onChange={(e) => onChange('email', e.target.value)} required />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
