'use client'

import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { emptyShareholder, type PersonEntry, type ShareholderEntry } from './constants'
import { personDisplayName, type Issue } from './helpers'
import { toNumber } from './validation'
import type { StepErrors } from './StepErrors'
import styles from './new.module.css'

/** "Fill from" shortcuts that copy someone already entered */
export function CopyChips({ label, options }: { label: string; options: Array<{ key: string; text: string; onClick: () => void }> }) {
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

const CAPITAL_FIELDS = ['issuedShares', 'statedCapital', 'authorizedShares']

/**
 * Shareholders (members for a company limited by guarantee), stated capital, auditor and beneficial
 * owner. Shared by the registration form and the edit form so both ask for, and check, the same things.
 */
export default function OwnershipSection({
  shareholders,
  setShareholders,
  details,
  setDetail,
  setDetails,
  auditorLater,
  setAuditorLater,
  capitalAuto,
  setCapitalAuto,
  isShares,
  people,
  issues,
  errors,
  note,
}: {
  shareholders: ShareholderEntry[]
  setShareholders: React.Dispatch<React.SetStateAction<ShareholderEntry[]>>
  details: Record<string, string>
  setDetail: (field: string, value: string) => void
  /** Several fields at once (capital totals, "same as" for the beneficial owner) */
  setDetails: (patch: Record<string, string>) => void
  auditorLater: boolean
  setAuditorLater: (v: boolean) => void
  capitalAuto: boolean
  setCapitalAuto: (v: boolean) => void
  isShares: boolean
  /** Directors already entered, for the "add as shareholder" and "same as" shortcuts */
  people: Array<{ d: PersonEntry; i: number; name: string }>
  issues: Issue[]
  errors: StepErrors
  /** Our team's correction note for a saved field path (edit form), shown under the field */
  note?: (path: string) => React.ReactNode
}) {
  const handleShareholderChange = (index: number, field: string, value: string) => {
    setShareholders((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addShareholder = () => setShareholders((prev) => [...prev, { ...emptyShareholder }])

  const removeShareholder = (index: number) => {
    if (shareholders.length <= 1) return
    setShareholders((prev) => prev.filter((_, i) => i !== index))
  }

  /** Give everyone the same number of shares (1,000 in total unless they've set a total) at GH₵ 1 unless set */
  const splitSharesEqually = () => {
    setShareholders((prev) => {
      const current = prev.reduce((sum, sh) => sum + toNumber(sh.numberOfShares), 0)
      const total = current >= prev.length ? current : 1000
      const each = Math.floor(total / prev.length)
      const extra = total - each * prev.length
      return prev.map((sh, i) => ({ ...sh, numberOfShares: String(each + (i === 0 ? extra : 0)), valuePerShare: sh.valuePerShare || '1' }))
    })
    setCapitalAuto(true)
  }

  // Editing a capital figure by hand stops it following the shareholder table
  const setDetailField = (field: string, value: string) => {
    if (CAPITAL_FIELDS.includes(field)) setCapitalAuto(false)
    setDetail(field, value)
  }

  // Keep share totals in step with the shareholder table until the user overrides them
  const totalShares = shareholders.reduce((sum, sh) => sum + toNumber(sh.numberOfShares), 0)
  const totalCapital = shareholders.reduce((sum, sh) => sum + toNumber(sh.numberOfShares) * toNumber(sh.valuePerShare), 0)
  useEffect(() => {
    if (!isShares || !capitalAuto || totalShares === 0) return
    const next = {
      issuedShares: String(totalShares),
      authorizedShares: details.authorizedShares && toNumber(details.authorizedShares) >= totalShares ? details.authorizedShares : String(totalShares),
      statedCapital: totalCapital ? String(Math.round(totalCapital * 100) / 100) : details.statedCapital,
    }
    if (next.issuedShares !== details.issuedShares || next.authorizedShares !== details.authorizedShares || next.statedCapital !== details.statedCapital) {
      setDetails(next)
    }
  }, [isShares, capitalAuto, totalShares, totalCapital, details.authorizedShares, details.issuedShares, details.statedCapital, setDetails])

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
    setDetails({
      beneficialOwnerName: personDisplayName(person),
      beneficialOwnerNationality: person.nationality || details.beneficialOwnerNationality,
      beneficialOwnerDOB: person.dateOfBirth || details.beneficialOwnerDOB,
      beneficialOwnerAddress: [person.residentialAddress, person.city, person.region].filter(Boolean).join(', ') || details.beneficialOwnerAddress,
    })

  return (
    <>
          {/* Shareholders (members for a company limited by guarantee) */}
          <div className={styles.formSectionTitle}>{isShares ? 'Shareholders' : 'Members (guarantors)'}</div>
          {isShares ? (
            <div className={styles.shareIntro}>
              <p>
                <strong>Shareholders own the company.</strong> Ownership is split into shares, and whoever holds more
                shares owns more of the company and gets a bigger say in big decisions.
              </p>
              <ul>
                <li>Most small companies issue <strong>1,000 shares at GH₵ 1 each</strong>, so the stated capital is GH₵ 1,000.</li>
                <li>Shareholders can be people or other companies. Directors are often shareholders too.</li>
                <li>Ghanaian-owned companies have no minimum capital. If a shareholder isn’t Ghanaian, GIPC minimums may apply, and we’ll check this with you.</li>
              </ul>
            </div>
          ) : (
            <div className={styles.shareIntro}>
              <p>
                <strong>A company limited by guarantee has members instead of shareholders.</strong> Members don’t own
                shares. Each one promises to pay a set amount towards the company’s debts if it ever closes, and
                profits go back into the organisation’s purpose.
              </p>
            </div>
          )}

          {isShares && totalShares > 0 && (
            <div className={styles.ownership} aria-label="Who owns what">
              <div className={styles.ownershipBar}>
                {shareholders.map((sh, i) => {
                  const pct = (toNumber(sh.numberOfShares) / totalShares) * 100
                  return pct > 0 ? <span key={i} style={{ flexGrow: pct, background: `var(${['--accent-blue', '--accent-green', '--accent-gold', '--accent-orange'][i % 4]})` }} title={`${sh.name || `Shareholder ${i + 1}`}: ${pct.toFixed(1)}%`} /> : null
                })}
              </div>
              <ul className={styles.ownershipLegend}>
                {shareholders.map((sh, i) => {
                  const pct = (toNumber(sh.numberOfShares) / totalShares) * 100
                  return (
                    <li key={i}>
                      <span className={styles.ownershipDot} style={{ background: `var(${['--accent-blue', '--accent-green', '--accent-gold', '--accent-orange'][i % 4]})` }} />
                      {sh.name || `Shareholder ${i + 1}`} <strong>{Number.isFinite(pct) ? `${Math.round(pct * 10) / 10}%` : '—'}</strong>
                    </li>
                  )
                })}
              </ul>
              <p className={styles.ownershipTotal}>
                {totalShares.toLocaleString()} shares{totalCapital > 0 && <> · stated capital GH₵ {(Math.round(totalCapital * 100) / 100).toLocaleString()}</>}
              </p>
            </div>
          )}

          <CopyChips
            label="Add as shareholder"
            options={people
              .filter(({ name }) => !shareholders.some((sh) => sh.name.trim().toLowerCase() === name.toLowerCase()))
              .map(({ d, i, name }) => ({ key: `sh-${i}`, text: `+ ${name}`, onClick: () => addPersonAsShareholder(d) }))}
          />
          {shareholders.map((sh, index) => (
            <div key={index} className={styles.shareholderBlock}>
              <div className={styles.personBlockHeader}>
                <h3 className={styles.personBlockTitle}>
                  {isShares ? 'Shareholder' : 'Member'} {index + 1}
                  {isShares && totalShares > 0 && toNumber(sh.numberOfShares) > 0 && (
                    <span className={styles.ownsPct}>owns {Math.round((toNumber(sh.numberOfShares) / totalShares) * 1000) / 10}%</span>
                  )}
                </h3>
                {shareholders.length > 1 && (
                  <button className={`btn btn-ghost btn-sm ${styles.removeBtn}`} onClick={() => removeShareholder(index)} type="button">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-type`}>A person or a company? *</label>
                  <select id={`sh-${index}-type`} className="form-input" value={sh.type} onChange={(e) => handleShareholderChange(index, 'type', e.target.value)}>
                    <option value="individual">A person</option>
                    <option value="corporate">A company or organisation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-name`}>
                    {sh.type === 'individual' ? 'Full Name *' : 'Entity Name *'}
                  </label>
                  <input id={`sh-${index}-name`} type="text" className="form-input" {...errors.fieldState(issues, `sh-${index}-name`)} placeholder={sh.type === 'individual' ? 'As on their Ghana Card' : 'Registered company name'} value={sh.name} onChange={(e) => handleShareholderChange(index, 'name', e.target.value)} required />
                  {errors.fieldMessage(issues, `sh-${index}-name`)}
                  {note?.(`shareholders.${index}.name`)}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-tin`}>TIN *</label>
                  <input id={`sh-${index}-tin`} type="text" className="form-input" {...errors.fieldState(issues, `sh-${index}-tin`)} placeholder={sh.type === 'individual' ? 'Their TIN or Ghana Card number' : 'The company’s TIN'} value={sh.tinNumber} onChange={(e) => handleShareholderChange(index, 'tinNumber', e.target.value)} required />
                  {errors.fieldMessage(issues, `sh-${index}-tin`)}
                  {note?.(`shareholders.${index}.tinNumber`)}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor={`sh-${index}-nationality`}>
                    {sh.type === 'individual' ? 'Nationality *' : 'Country of Registration *'}
                  </label>
                  <input id={`sh-${index}-nationality`} type="text" className="form-input" {...errors.fieldState(issues, `sh-${index}-nationality`)} placeholder="e.g., Ghanaian" value={sh.nationality} onChange={(e) => handleShareholderChange(index, 'nationality', e.target.value)} required />
                  {errors.fieldMessage(issues, `sh-${index}-nationality`)}
                  {note?.(`shareholders.${index}.nationality`)}
                </div>
                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label" htmlFor={`sh-${index}-address`}>Address *</label>
                  <input id={`sh-${index}-address`} type="text" className="form-input" {...errors.fieldState(issues, `sh-${index}-address`)} placeholder="Full residential or registered address" value={sh.address} onChange={(e) => handleShareholderChange(index, 'address', e.target.value)} required />
                  {errors.fieldMessage(issues, `sh-${index}-address`)}
                  {note?.(`shareholders.${index}.address`)}
                </div>
                {isShares && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`sh-${index}-shares`}>Number of shares *</label>
                      <input id={`sh-${index}-shares`} type="text" inputMode="numeric" className="form-input" {...errors.fieldState(issues, `sh-${index}-shares`)} placeholder="e.g. 500" value={sh.numberOfShares} onChange={(e) => handleShareholderChange(index, 'numberOfShares', e.target.value)} required />
                      {errors.fieldMessage(issues, `sh-${index}-shares`)}
                  {note?.(`shareholders.${index}.numberOfShares`)}
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`sh-${index}-value`}>Price per share (GH₵) *</label>
                      <input id={`sh-${index}-value`} type="text" inputMode="decimal" className="form-input" {...errors.fieldState(issues, `sh-${index}-value`)} placeholder="e.g. 1" value={sh.valuePerShare} onChange={(e) => handleShareholderChange(index, 'valuePerShare', e.target.value)} required />
                      {errors.fieldMessage(issues, `sh-${index}-value`) || <span className="form-hint">What they pay for each share. GH₵ 1 is common.</span>}
                      {note?.(`shareholders.${index}.valuePerShare`)}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          <div className={styles.shareActions}>
            <button className={`btn btn-secondary ${styles.addPersonBtn}`} onClick={addShareholder} type="button">
              <Plus size={16} /> Add another {isShares ? 'shareholder' : 'member'}
            </button>
            {isShares && shareholders.length > 1 && (
              <button className="btn btn-ghost" onClick={splitSharesEqually} type="button">Split shares equally</button>
            )}
          </div>

          {/* Stated Capital */}
          {isShares && (
            <>
              <div className={styles.formSectionTitle}>Stated Capital</div>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label" htmlFor="authorizedShares">Total Authorized Shares *</label>
                  <input id="authorizedShares" type="text" className="form-input" {...errors.fieldState(issues, 'authorizedShares')} placeholder="e.g., 10,000" value={details.authorizedShares} onChange={(e) => setDetailField('authorizedShares', e.target.value)} required />
                  {errors.fieldMessage(issues, 'authorizedShares')}
                  {note?.('companyDetails.authorizedShares')}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="issuedShares">Issued Shares *</label>
                  <input id="issuedShares" type="text" className="form-input" {...errors.fieldState(issues, 'issuedShares')} placeholder="e.g., 1,000" value={details.issuedShares} onChange={(e) => setDetailField('issuedShares', e.target.value)} required />
                  {errors.fieldMessage(issues, 'issuedShares')}
                  {note?.('companyDetails.issuedShares')}
                </div>
                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label" htmlFor="statedCapital">Stated Capital (GH₵) *</label>
                  <input id="statedCapital" type="text" className="form-input" {...errors.fieldState(issues, 'statedCapital')} placeholder="Total paid-up value of issued shares" value={details.statedCapital} onChange={(e) => setDetailField('statedCapital', e.target.value)} required />
                  {errors.fieldMessage(issues, 'statedCapital')}
                  {note?.('companyDetails.statedCapital')}
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
              <input id="auditorName" type="text" className="form-input" {...errors.fieldState(issues, 'auditorName')} placeholder="Full name of licensed auditor" value={details.auditorName} onChange={(e) => setDetailField('auditorName', e.target.value)} required />
                  {errors.fieldMessage(issues, 'auditorName')}
                  {note?.('companyDetails.auditorName')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auditorFirm">Audit Firm (optional)</label>
              <input id="auditorFirm" type="text" className="form-input" placeholder="Name of audit firm" value={details.auditorFirm} onChange={(e) => setDetailField('auditorFirm', e.target.value)} />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label className="form-label" htmlFor="auditorLicense">ICAG License Number *</label>
              <input id="auditorLicense" type="text" className="form-input" {...errors.fieldState(issues, 'auditorLicense')} placeholder="Auditor's ICAG license number" value={details.auditorLicense} onChange={(e) => setDetailField('auditorLicense', e.target.value)} required />
                  {errors.fieldMessage(issues, 'auditorLicense')}
                  {note?.('companyDetails.auditorLicense')}
              <span className="form-hint">A consent letter from the auditor will be required</span>
            </div>
          </div>
          )}

          {/* Beneficial Ownership */}
          <div className={styles.formSectionTitle}>Beneficial Ownership</div>
          <CopyChips
            label="Same as"
            options={people.map(({ d, i, name }) => ({ key: `bo-${i}`, text: name, onClick: () => fillBeneficialOwner(d) }))}
          />
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="beneficialOwnerName">Beneficial Owner Name *</label>
              <input id="beneficialOwnerName" type="text" className="form-input" {...errors.fieldState(issues, 'beneficialOwnerName')} placeholder="Full legal name" value={details.beneficialOwnerName} onChange={(e) => setDetailField('beneficialOwnerName', e.target.value)} required />
                  {errors.fieldMessage(issues, 'beneficialOwnerName')}
                  {note?.('companyDetails.beneficialOwnerName')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="beneficialOwnerNationality">Nationality *</label>
              <input id="beneficialOwnerNationality" type="text" className="form-input" {...errors.fieldState(issues, 'beneficialOwnerNationality')} placeholder="e.g., Ghanaian" value={details.beneficialOwnerNationality} onChange={(e) => setDetailField('beneficialOwnerNationality', e.target.value)} required />
                  {errors.fieldMessage(issues, 'beneficialOwnerNationality')}
                  {note?.('companyDetails.beneficialOwnerNationality')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="beneficialOwnerDOB">Date of Birth *</label>
              <input id="beneficialOwnerDOB" type="date" className="form-input" {...errors.fieldState(issues, 'beneficialOwnerDOB')} value={details.beneficialOwnerDOB} onChange={(e) => setDetailField('beneficialOwnerDOB', e.target.value)} required />
                  {errors.fieldMessage(issues, 'beneficialOwnerDOB')}
                  {note?.('companyDetails.beneficialOwnerDOB')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="beneficialOwnerAddress">Residential Address *</label>
              <input id="beneficialOwnerAddress" type="text" className="form-input" {...errors.fieldState(issues, 'beneficialOwnerAddress')} placeholder="Full residential address" value={details.beneficialOwnerAddress} onChange={(e) => setDetailField('beneficialOwnerAddress', e.target.value)} required />
                  {errors.fieldMessage(issues, 'beneficialOwnerAddress')}
                  {note?.('companyDetails.beneficialOwnerAddress')}
            </div>
          </div>
    </>
  )
}
