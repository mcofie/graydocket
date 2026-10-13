'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Flag, MessageSquare, Pencil, Phone, Printer, UploadCloud, X } from 'lucide-react'
import Tabs from '@/components/ui/Tabs'
import {
  adminUpdateApplicationData,
  requestFieldCorrection,
  sendDirectSmsToApplicant,
  updateApplicationNotes,
  uploadApplicationDocument,
} from '@/lib/actions'
import { getAdminApplicationView } from '@/lib/admin-data'
import { stageOf } from '@/lib/application-flow'
import { issuedDocuments, providedDocuments } from '@/lib/documents'
import { canonicalRow, priceForType, type DbBusinessType } from '@/app/dashboard/applications/new/pricing'
import { businessTypes as typeCatalog } from '@/app/dashboard/applications/new/constants'
import Modal from '../../components/Modal'
import WorkflowPanel from './WorkflowPanel'
import { CardSkeleton, PaymentChip, Skeleton, StageChip, shortDate, ui } from '../../ui'
import styles from './detail-admin.module.css'

// One application, everything an admin needs: the workflow on the right, the details, documents and
// activity on the left. Every field can be flagged (asks the customer to fix it) or edited in place.

type Json = Record<string, unknown>
type History = { id?: string; status: string; notes?: string | null; created_at: string; updater?: { full_name?: string | null } | null }
type App = Json & {
  id: string
  business_name: string
  status: string
  payment_status?: string | null
  tracking_id?: string | null
  created_at: string
  business_type_id?: string | null
  notes?: string | null
  form_data?: Json | null
  business_types?: { name?: string | null } | null
  profiles?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
  application_status_history?: History[]
  document_rows?: Array<{ id: string; name: string; file_url: string; document_type?: string | null; uploaded_at?: string | null }>
}

// Fields handled elsewhere on the page (or internal bookkeeping)
const HIDDEN = new Set([
  'documents', 'corrections', 'idPhotos', 'ghanaCardPhotoUrl', 'price_lines', 'paystack_reference', 'paystackReference',
  'selectedAddOns', 'ready_for_payment', 'total_amount', 'businessType', 'delivery_method', 'delivery_address',
  'proprietor', 'directors', 'secretary', 'shareholders', 'members', 'companyDetails', 'formData', 'affiliateCode',
])

const LABELS: Record<string, string> = {
  tinNumber: 'TIN',
  ghanaCardNumber: 'Ghana Card number',
  businessNameAlt: 'Backup name',
  dateOfCommencement: 'Commencement date',
  mobilePhone: 'Mobile phone',
  digitalAddress: 'Digital address (GPS)',
  auditorLater: 'Auditor to be added later',
  capitalAuto: 'Capital calculated automatically',
}

// Sentence case: "dateOfBirth" -> "Date of birth"
const humanize = (key: string) => {
  if (LABELS[key]) return LABELS[key]
  const words = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// The order fields are read in, for people and for the business. Anything else follows.
const ORDER = [
  'title', 'firstName', 'otherNames', 'surname', 'fullName', 'name', 'gender', 'dateOfBirth', 'nationality', 'occupation',
  'ghanaCardNumber', 'tinNumber', 'phone', 'mobilePhone', 'email', 'residentialAddress',
  'businessNameAlt', 'businessSector', 'businessSectorOther', 'natureOfBusiness', 'dateOfCommencement',
  'buildingName', 'streetName', 'city', 'district', 'region', 'digitalAddress', 'poBox',
  'numberOfShares', 'valuePerShare', 'statedCapital',
]
const byOrder = (a: string, b: string) => {
  const ia = ORDER.indexOf(a)
  const ib = ORDER.indexOf(b)
  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
}

const personLabel = (p: Json) =>
  (String(p.fullName || p.name || [p.firstName, p.otherNames, p.surname].filter(Boolean).join(' ')) || '').replace(/\s+/g, ' ').trim()

/** Has at least one filled-in simple field */
const hasContent = (p: Json) => Object.keys(p || {}).some((k) => !HIDDEN.has(k) && isPrimitive(p[k]) && p[k] !== '' && p[k] !== null)

const isPrimitive = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v)

const display = (v: unknown) => {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  if (v === null || v === undefined || v === '') return null
  if (Array.isArray(v)) return v.filter(isPrimitive).join(', ') || null
  return String(v)
}

/** Read and write nested values by "directors.0.tinNumber" style paths */
const getAt = (obj: Json, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o as Json | undefined)?.[k], obj)
function setAt(obj: Json, path: string, value: unknown): Json {
  const [head, ...rest] = path.split('.')
  const clone: Json = Array.isArray(obj) ? ([...(obj as unknown[])] as unknown as Json) : { ...obj }
  clone[head] = rest.length ? setAt((obj[head] as Json) || {}, rest.join('.'), value) : value
  return clone
}

type FieldProps = {
  data: Json
  path: string
  corrections: Record<string, string>
  editing: boolean
  draft: Json
  onDraft: (path: string, value: unknown) => void
  onFlag: (path: string, label: string) => void
}

/** The primitive fields of one object as a label/value grid */
function Fields({ data, path, corrections, editing, draft, onDraft, onFlag, skip = HIDDEN }: FieldProps & { skip?: Set<string> }) {
  const keys = Object.keys(data || {}).filter((k) => !skip.has(k) && isPrimitive(data[k])).sort(byOrder)
  if (keys.length === 0) return <p className={ui.muted}>Nothing recorded.</p>
  return (
    <dl className={styles.fields}>
      {keys.map((k) => {
        const full = path ? `${path}.${k}` : k
        const value = display(editing ? getAt(draft, full) : data[k])
        const correction = corrections[full]
        return (
          <div key={full} className={`${styles.field} ${correction ? styles.fieldFlagged : ''}`}>
            <dt>{humanize(k)}</dt>
            <dd>
              {editing && typeof data[k] !== 'boolean' ? (
                <input className={ui.input} value={String(getAt(draft, full) ?? '')} onChange={(e) => onDraft(full, e.target.value)} />
              ) : (
                value ?? <span className={ui.muted}>—</span>
              )}
              {!editing && (
                <button type="button" className={styles.flag} onClick={() => onFlag(full, humanize(k))} aria-label={`Ask the customer to fix ${humanize(k)}`} title="Ask the customer to fix this">
                  <Flag size={13} />
                </button>
              )}
            </dd>
            {correction && <p className={styles.correction}>Asked to fix: {correction}</p>}
          </div>
        )
      })}
    </dl>
  )
}

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [app, setApp] = useState<App | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'details' | 'documents' | 'activity'>('details')
  const [types, setTypes] = useState<Array<DbBusinessType & { id: string }>>([])

  // Editing
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Json>({})
  const [draftName, setDraftName] = useState('')
  const [draftType, setDraftType] = useState('')
  const [saving, setSaving] = useState(false)

  // Dialogs
  const [flagging, setFlagging] = useState<{ path: string; label: string } | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [smsOpen, setSmsOpen] = useState(false)
  const [sms, setSms] = useState('')
  const [viewing, setViewing] = useState<{ src: string; title: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Notes and uploads
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(true)
  const [docTitle, setDocTitle] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [team, setTeam] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([])

  const load = useCallback(async () => {
    // One call: application, price rows and the team (server actions run one at a time)
    const res = await getAdminApplicationView(id)
    if (res.error || !res.application) {
      setError(res.error || 'Application not found.')
      return
    }
    const a = res.application as unknown as App
    setApp(a)
    setNotes(a.notes || '')
    setNotesSaved(true)
    setTeam(res.team)
    const rows = (res.businessTypes || []) as Array<DbBusinessType & { id: string }>
    const canonical = typeCatalog.map((t) => canonicalRow(t.name, rows)).filter(Boolean) as Array<DbBusinessType & { id: string }>
    if (a.business_type_id && !canonical.some((r) => r.id === a.business_type_id)) {
      const current = rows.find((r) => r.id === a.business_type_id)
      if (current) canonical.push(current)
    }
    setTypes(canonical)
  }, [id])

  useEffect(() => {
    // Loads the application once on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const form = useMemo(() => (app?.form_data || {}) as Json, [app])
  // Applications saved through the edit page keep business fields under form_data.formData
  const businessPath = form.formData && typeof form.formData === 'object' ? 'formData' : ''
  const businessData = (businessPath ? form.formData : form) as Json
  const corrections = (form.corrections || {}) as Record<string, string>
  // Files in the documents table as well as ones attached to the form
  const issued = useMemo(() => issuedDocuments(form, app?.document_rows || []), [form, app])
  const provided = useMemo(() => providedDocuments(form), [form])
  const history = app?.application_status_history || []

  if (error) {
    return (
      <div className={ui.page}>
        <Link href="/admin/applications" className={styles.back}><ArrowLeft size={16} /> Applications</Link>
        <p className={ui.error}>{error}</p>
      </div>
    )
  }
  if (!app) {
    // Same shape as the loaded page: header, tabs and main column, workflow and customer on the side
    return (
      <div className={ui.page} aria-busy="true" aria-label="Loading application">
        <Link href="/admin/applications" className={styles.back}><ArrowLeft size={16} /> Applications</Link>
        <div style={{ display: 'grid', gap: 10 }}>
          <Skeleton width="min(360px, 70%)" height={32} radius={8} />
          <Skeleton width="min(420px, 85%)" height={18} />
        </div>
        <div className={ui.split}>
          <div className={ui.stack}>
            <div style={{ display: 'flex', gap: 24 }}>
              <Skeleton width={60} height={18} /><Skeleton width={90} height={18} /><Skeleton width={70} height={18} />
            </div>
            <CardSkeleton lines={6} />
            <CardSkeleton lines={3} />
          </div>
          <div className={ui.stack}>
            <CardSkeleton lines={5} />
            <CardSkeleton lines={3} />
          </div>
        </div>
      </div>
    )
  }

  const customer = app.profiles || {}
  const phone = customer.phone || (form.mobilePhone as string) || ''
  const waNumber = phone.replace(/\D/g, '')
  const people: Array<[string, Json[], string]> = [
    ['Owner', form.proprietor ? [form.proprietor as Json] : [], 'proprietor'],
    ['Directors', Array.isArray(form.directors) ? (form.directors as Json[]) : [], 'directors'],
    ['Company secretary', form.secretary ? [form.secretary as Json] : [], 'secretary'],
    ['Shareholders', Array.isArray(form.shareholders) ? (form.shareholders as Json[]) : [], 'shareholders'],
    ['Members', Array.isArray(form.members) ? (form.members as Json[]) : [], 'members'],
  ]
  // Skip empty entries (e.g. a secretary section never filled in)
  const filledPeople = people.filter(([, list]) => list.some(hasContent))

  const startEdit = () => {
    setDraft(form)
    setDraftName(app.business_name)
    setDraftType(app.business_type_id || '')
    setEditing(true)
  }

  const saveEdit = async () => {
    setSaving(true)
    const res = await adminUpdateApplicationData(app.id, { businessTypeId: draftType, businessName: draftName.trim(), formData: { ...draft, businessName: draftName.trim() } })
    setSaving(false)
    if (res?.error) return alert(res.error)
    setEditing(false)
    load()
  }

  const sendFlag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flagging || !flagReason.trim()) return
    setBusy(true)
    const res = await requestFieldCorrection(app.id, flagging.path, flagReason.trim())
    setBusy(false)
    if (res?.error) return alert(res.error)
    setFlagging(null)
    setFlagReason('')
    load()
  }

  const sendSms = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sms.trim()) return
    setBusy(true)
    const res = await sendDirectSmsToApplicant(app.id, sms.trim())
    setBusy(false)
    if (res?.error) return alert(res.error)
    setSmsOpen(false)
    setSms('')
    load()
  }

  const saveNotes = async () => {
    const res = await updateApplicationNotes(app.id, notes)
    if (res?.error) alert(res.error)
    else setNotesSaved(true)
  }

  const upload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docFile || !docTitle.trim()) return
    setBusy(true)
    const fd = new FormData()
    fd.append('file', docFile)
    fd.append('title', docTitle.trim())
    const res = await uploadApplicationDocument(app.id, fd)
    setBusy(false)
    if (res?.error) return alert(res.error)
    setDocTitle('')
    setDocFile(null)
    load()
  }

  const copySummary = async () => {
    const lines = [`${app.business_name} (${app.business_types?.name || ''})`, `Tracking: ${app.tracking_id || '—'}`, '']
    const add = (title: string, obj: Json) => {
      lines.push(title)
      Object.keys(obj).filter((k) => !HIDDEN.has(k) && isPrimitive(obj[k])).forEach((k) => lines.push(`  ${humanize(k)}: ${display(obj[k]) ?? '—'}`))
      lines.push('')
    }
    add('Business', businessData)
    people.forEach(([title, list]) => list.forEach((p, i) => add(list.length > 1 ? `${title} ${i + 1}` : title, p)))
    if (form.companyDetails) add('Company details', form.companyDetails as Json)
    await navigator.clipboard.writeText(lines.join('\n'))
    alert('Details copied.')
  }

  const fieldProps = { corrections, editing, draft, onDraft: (p: string, v: unknown) => setDraft((d) => setAt(d, p, v)), onFlag: (p: string, label: string) => setFlagging({ path: p, label }) }
  const deliveryAddress = (form.delivery_address || (app as Json).delivery_address) as Json | null
  const addOns = Array.isArray(form.selectedAddOns) ? (form.selectedAddOns as string[]) : []

  return (
    <div className={ui.page}>
      <Link href="/admin/applications" className={styles.back}><ArrowLeft size={16} /> Applications</Link>

      <header className={styles.header}>
        <div>
          <h1 className={ui.pageTitle}>{app.business_name}</h1>
          <div className={styles.meta}>
            <StageChip status={app.status} />
            <PaymentChip status={app.payment_status} />
            <span>{app.business_types?.name}</span>
            {app.tracking_id && <span className={ui.mono}>{app.tracking_id}</span>}
            <span>Created {shortDate(app.created_at)}</span>
          </div>
        </div>
        <div className={ui.actions}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copySummary}><Copy size={15} /> Copy</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={15} /> Print</button>
        </div>
      </header>

      <div className={ui.split}>
        {/* Main column */}
        <div className={ui.stack}>
          <Tabs
            label="Application"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'details', label: 'Details' },
              { id: 'documents', label: 'Documents', count: issued.length + provided.length },
              { id: 'activity', label: 'Activity', count: history.length },
            ]}
          />

          {tab === 'details' && (
            <>
              <div className={styles.editBar}>
                {editing ? (
                  <>
                    <span className={ui.hint}>Editing. Changes are saved to the application; the customer isn’t notified.</span>
                    <span className={ui.actions}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                    </span>
                  </>
                ) : (
                  <>
                    <span className={ui.hint}>Use <Flag size={12} /> on any field to ask the customer to fix it.</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={startEdit}><Pencil size={14} /> Edit details</button>
                  </>
                )}
              </div>

              <section className={ui.card}>
                <div className={ui.cardHead}><h2 className={ui.cardTitle}>Business</h2></div>
                <div className={ui.cardBody}>
                  {editing && (
                    <div className={ui.formGrid} style={{ marginBottom: 14 }}>
                      <label className={ui.field}>
                        <span className={ui.label}>Business name</span>
                        <input className={ui.input} value={draftName} onChange={(e) => setDraftName(e.target.value)} />
                      </label>
                      <label className={ui.field}>
                        <span className={ui.label}>Business type</span>
                        <select className={ui.input} value={draftType} onChange={(e) => setDraftType(e.target.value)}>
                          {types.map((t) => {
                            const typeId = typeCatalog.find((c) => c.name === t.name)?.id || ''
                            return <option key={t.id} value={t.id}>{t.name} (GH₵ {priceForType(typeId, [t]).total.toLocaleString()})</option>
                          })}
                        </select>
                      </label>
                    </div>
                  )}
                  <Fields data={businessData} path={businessPath} {...fieldProps} skip={new Set([...HIDDEN, 'businessName'])} />
                </div>
              </section>

              {filledPeople.map(([title, list, key]) =>
                list.length === 0 ? null : (
                  <section key={key} className={ui.card}>
                    <div className={ui.cardHead}><h2 className={ui.cardTitle}>{title}</h2><span className={ui.cardNote}>{list.length}</span></div>
                    <div className={ui.cardBody} style={{ display: 'grid', gap: 16 }}>
                      {list.map((person, i) => {
                        const path = Array.isArray(form[key]) ? `${key}.${i}` : key
                        const photos = providedDocuments({ proprietor: person }).length
                        return (
                          <div key={path} className={styles.person}>
                            <p className={styles.personTitle}>
                              {list.length > 1 ? `${title.replace(/s$/, '')} ${i + 1}` : title}
                              {personLabel(person) && <span> · {personLabel(person)}</span>}
                            </p>
                            <Fields data={person} path={path} {...fieldProps} />
                            {photos > 0 && (
                              <button type="button" className={styles.linkBtn} onClick={() => setTab('documents')}>
                                {photos} ID photo{photos === 1 ? '' : 's'} attached →
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              )}

              {form.companyDetails ? (
                <section className={ui.card}>
                  <div className={ui.cardHead}><h2 className={ui.cardTitle}>Company details</h2></div>
                  <div className={ui.cardBody}><Fields data={form.companyDetails as Json} path="companyDetails" {...fieldProps} /></div>
                </section>
              ) : null}

              <section className={ui.card}>
                <div className={ui.cardHead}><h2 className={ui.cardTitle}>Delivery and extras</h2></div>
                <div className={ui.cardBody} style={{ display: 'grid', gap: 12 }}>
                  <dl className={ui.kv}>
                    <div><dt>Delivery</dt><dd>{(app as Json).delivery_method === 'courier' ? 'Courier' : 'Digital (documents in their account)'}</dd></div>
                    <div><dt>Add-ons</dt><dd>{addOns.length ? addOns.join(', ') : 'None'}</dd></div>
                  </dl>
                  {deliveryAddress && <Fields data={deliveryAddress} path="delivery_address" {...fieldProps} />}
                </div>
              </section>
            </>
          )}

          {tab === 'documents' && (
            <>
              <section className={ui.card}>
                <div className={ui.cardHead}>
                  <div>
                    <h2 className={ui.cardTitle}>From GrayDocket</h2>
                    <p className={ui.cardNote}>Certificates and filings. The customer sees these in their Documents.</p>
                  </div>
                </div>
                <div className={ui.cardBody} style={{ display: 'grid', gap: 12 }}>
                  {issued.length === 0 ? (
                    <p className={ui.muted}>Nothing issued yet.</p>
                  ) : (
                    <ul className={styles.docList}>
                      {issued.map((d) => (
                        <li key={d.id}>
                          <a href={d.url} target="_blank" rel="noopener noreferrer">{d.title}</a>
                          <span className={ui.muted}>{shortDate(d.addedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form onSubmit={upload} className={styles.upload}>
                    <span className={ui.label}>Add a document</span>
                    <input className={ui.input} placeholder="Name, e.g. Certificate of Registration" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required />
                    <div className={styles.uploadRow}>
                      <label className={styles.filePick}>
                        <input type="file" hidden onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                        <span className="btn btn-secondary btn-sm">Choose file</span>
                        <span className={styles.fileName}>{docFile ? docFile.name : 'No file chosen'}</span>
                      </label>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !docFile || !docTitle.trim()}>
                        <UploadCloud size={15} /> {busy ? 'Uploading…' : 'Upload'}
                      </button>
                    </div>
                  </form>
                </div>
              </section>

              <section className={ui.card}>
                <div className={ui.cardHead}>
                  <div>
                    <h2 className={ui.cardTitle}>From the customer</h2>
                    <p className={ui.cardNote}>ID photos attached in the application.</p>
                  </div>
                </div>
                <div className={ui.cardBody}>
                  {provided.length === 0 ? (
                    <p className={ui.muted}>No photos attached.</p>
                  ) : (
                    <ul className={styles.photos}>
                      {provided.map((d) => (
                        <li key={d.id}>
                          <button type="button" onClick={() => setViewing({ src: d.src, title: `${d.title} · ${d.person}` })}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- inline data URLs from the form */}
                            <img src={d.src} alt={`${d.title} for ${d.person}`} loading="lazy" />
                            <span><strong>{d.person}</strong><small>{d.role}</small></span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}

          {tab === 'activity' && (
            <section className={ui.card}>
              <div className={ui.cardBody}>
                {history.length === 0 ? (
                  <p className={ui.muted}>No activity yet.</p>
                ) : (
                  <ol className={styles.timeline}>
                    {history.map((h, i) => (
                      <li key={h.id || i}>
                        <span className={styles.dot} />
                        <div>
                          <p className={styles.timelineTitle}>{stageOf(h.status).admin}</p>
                          {h.notes && <p className={styles.timelineNote}>{h.notes}</p>}
                          <p className={ui.muted}>
                            {new Date(h.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {' · '}
                            {h.updater?.full_name || 'Customer or system'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Side column */}
        <div className={ui.stack}>
          <WorkflowPanel
            app={app as unknown as Parameters<typeof WorkflowPanel>[0]['app']}
            team={team}
            onRequestChanges={() => setFlagging({ path: 'general', label: 'the application' })}
            onChanged={load}
          />

          <section className={ui.card}>
            <div className={ui.cardHead}><h2 className={ui.cardTitle}>Customer</h2></div>
            <div className={ui.cardBody} style={{ display: 'grid', gap: 12 }}>
              <dl className={ui.kv}>
                <div><dt>Name</dt><dd>{customer.full_name || '—'}</dd></div>
                <div><dt>Phone</dt><dd>{phone || '—'}</dd></div>
                {customer.email && !customer.email.endsWith('@graydocket.user') && <div><dt>Email</dt><dd>{customer.email}</dd></div>}
              </dl>
              <div className={ui.actions}>
                {phone && <a className="btn btn-secondary btn-sm" href={`tel:${phone}`}><Phone size={14} /> Call</a>}
                {waNumber && <a className="btn btn-secondary btn-sm" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSmsOpen(true)}><MessageSquare size={14} /> Text</button>
              </div>
            </div>
          </section>

          <section className={ui.card}>
            <div className={ui.cardHead}>
              <h2 className={ui.cardTitle}>Internal notes</h2>
              <span className={ui.cardNote}>Only admins see these</span>
            </div>
            <div className={ui.cardBody} style={{ display: 'grid', gap: 10 }}>
              <textarea
                className={ui.input}
                style={{ height: 110, padding: 10, resize: 'vertical' }}
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setNotesSaved(false) }}
                placeholder="Anything the team should know about this application"
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={saveNotes} disabled={notesSaved}>{notesSaved ? 'Saved' : 'Save notes'}</button>
            </div>
          </section>
        </div>
      </div>

      <Modal isOpen={Boolean(flagging)} onClose={() => setFlagging(null)} title="Ask the customer to fix something">
        <form onSubmit={sendFlag} style={{ display: 'grid', gap: 12 }}>
          <p className={ui.hint}>
            About <strong>{flagging?.label}</strong>. The application moves to <strong>Waiting on customer</strong> and they’re sent a text with your note.
          </p>
          <textarea className={ui.input} style={{ height: 96, padding: 10 }} required value={flagReason} onChange={(e) => setFlagReason(e.target.value)} placeholder="e.g. The TIN doesn’t match the Ghana Card. Please check and update it." />
          <div className={ui.actions}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !flagReason.trim()}>{busy ? 'Sending…' : 'Send request'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFlagging(null)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={smsOpen} onClose={() => setSmsOpen(false)} title={`Text ${customer.full_name || 'the customer'}`}>
        <form onSubmit={sendSms} style={{ display: 'grid', gap: 12 }}>
          <textarea className={ui.input} style={{ height: 96, padding: 10 }} required maxLength={300} value={sms} onChange={(e) => setSms(e.target.value)} placeholder="Your message" />
          <span className={ui.hint}>{sms.length}/300 · Sent to {phone || 'their phone'}</span>
          <div className={ui.actions}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !sms.trim()}>{busy ? 'Sending…' : 'Send text'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSmsOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {viewing && (
        <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={viewing.title} onClick={() => setViewing(null)}>
          <div className={styles.viewerBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.viewerHead}>
              <strong>{viewing.title}</strong>
              <button type="button" onClick={() => setViewing(null)} aria-label="Close"><X size={20} /></button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- inline data URLs from the form */}
            <img src={viewing.src} alt={viewing.title} />
          </div>
        </div>
      )}
    </div>
  )
}
