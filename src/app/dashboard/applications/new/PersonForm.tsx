import { useState } from 'react'
import { ScanFace, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
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
    <div className={styles.personFormContainer} style={{ background: 'var(--color-neutral-0)', border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{title}</h3>
        {!scanned ? (
          <button type="button" onClick={handleScan} className="btn btn-secondary btn-sm" disabled={isScanning}>
            {isScanning ? 'Scanning Card...' : <><ScanFace size={16} /> Scan Ghana Card to Auto-fill</>}
          </button>
        ) : (
          <span style={{ color: 'var(--color-success)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
            <CheckCircle2 size={16} /> Data Extracted Successfully
          </span>
        )}
      </div>

      {/* Accordion 1: Personal Info */}
      <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', overflow: 'hidden' }}>
        <button type="button" onClick={() => setOpenSection(openSection === 'personal' ? 'personal' : 'personal')} style={{ width: '100%', padding: 'var(--space-3) var(--space-4)', display: 'flex', justifyContent: 'space-between', background: openSection === 'personal' ? 'var(--color-neutral-100)' : 'var(--color-neutral-50)', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          <span>1. Personal Information</span> {openSection === 'personal' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSection === 'personal' && (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-neutral-0)' }}>
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
            <div style={{ marginTop: 'var(--space-4)', textAlign: 'right' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpenSection('id')}>Next Section</button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Identification */}
      <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', overflow: 'hidden' }}>
        <button type="button" onClick={() => setOpenSection(openSection === 'id' ? 'personal' : 'id')} style={{ width: '100%', padding: 'var(--space-3) var(--space-4)', display: 'flex', justifyContent: 'space-between', background: openSection === 'id' ? 'var(--color-neutral-100)' : 'var(--color-neutral-50)', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          <span>2. Identification</span> {openSection === 'id' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSection === 'id' && (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-neutral-0)' }}>
            <div className={styles.formGrid}>
               <div className="form-group">
                <label className="form-label">Ghana Card Number *</label>
                <input type="text" className="form-input" placeholder="GHA-XXXXXXXXX-X" value={person.ghanaCardNumber} onChange={(e) => onChange('ghanaCardNumber', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">TIN *</label>
                <input type="text" className="form-input" placeholder="e.g., CXXXXXXXX" value={person.tinNumber} onChange={(e) => onChange('tinNumber', e.target.value)} required />
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-4)', textAlign: 'right' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpenSection('address')}>Next Section</button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 3: Contact & Address */}
      <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <button type="button" onClick={() => setOpenSection(openSection === 'address' ? 'id' : 'address')} style={{ width: '100%', padding: 'var(--space-3) var(--space-4)', display: 'flex', justifyContent: 'space-between', background: openSection === 'address' ? 'var(--color-neutral-100)' : 'var(--color-neutral-50)', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          <span>3. Address & Contact</span> {openSection === 'address' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSection === 'address' && (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-neutral-0)' }}>
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
