'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, Pencil } from 'lucide-react'
import { updateBusinessType, updateService } from '@/lib/actions'
import { getAdminPricingData } from '@/lib/admin-data'
import { businessTypes } from '@/app/dashboard/applications/new/constants'
import { canonicalRow, duplicateRows, priceForType, type DbBusinessType } from '@/app/dashboard/applications/new/pricing'
import { PageHeader, Skeleton, cedis, ui } from '../ui'
import styles from './pricing.module.css'

// Every price customers see comes from this page, through the shared pricing helpers
// (src/app/dashboard/applications/new/pricing.ts). The server charges with the same helpers.

type Service = { id: string; name: string; price: number; category: string | null; is_active: boolean | null; description?: string | null }
type Row = DbBusinessType & { id: string }
type Parts = { orc: number; agent: number; returns: number; share: number }

const num = (v: unknown) => Number(v) || 0
const partsOf = (row: Row): Parts => ({
  orc: num(row.orc_fee),
  agent: num(row.agent_fee),
  returns: num(row.returns_portion),
  share: num(row.affiliate_share_percentage),
})
const totalOf = (p: Parts) => p.orc + p.agent + p.returns
// Mirrors the commission rule on the server: the share applies to the returns portion, or our fee when there isn't one
const commissionOf = (p: Parts) => ((p.returns > 0 ? p.returns : p.agent) * p.share) / 100
const returnsLabel = (typeId: string) => (typeId === 'sole_proprietorship' ? 'First-year renewal' : 'First annual return')

/** Where each cedi of the price goes */
function Breakdown({ parts, typeId }: { parts: Parts; typeId: string }) {
  const total = totalOf(parts) || 1
  const segments = [
    { key: 'orc', label: 'Government (ORC)', value: parts.orc, className: styles.segOrc },
    { key: 'agent', label: 'Our fee', value: parts.agent, className: styles.segAgent },
    { key: 'returns', label: returnsLabel(typeId), value: parts.returns, className: styles.segReturns },
  ]
  return (
    <div className={styles.breakdown}>
      <div className={styles.bar} aria-hidden="true">
        {segments.map((s) => s.value > 0 && <span key={s.key} className={s.className} style={{ flexGrow: s.value / total }} />)}
      </div>
      <ul className={styles.legend}>
        {segments.map((s) => (
          <li key={s.key}>
            <span className={`${styles.dot} ${s.className}`} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendValue}>{cedis(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TypeCard({ typeId, row, editing, onEdit }: { typeId: string; row: Row; editing: boolean; onEdit: () => void }) {
  const type = businessTypes.find((t) => t.id === typeId)!
  const parts = partsOf(row)
  return (
    <article className={`${styles.typeCard} ${editing ? styles.typeCardOn : ''}`}>
      <div className={styles.typeHead}>
        <div>
          <h2 className={styles.typeName}>{type.name}</h2>
          <p className={ui.muted}>{type.formRef}</p>
        </div>
        <button type="button" className={styles.editBtn} onClick={onEdit} aria-pressed={editing} aria-label={`Edit ${type.name} prices`}>
          <Pencil size={15} />
        </button>
      </div>
      <div>
        <span className={styles.priceLabel}>Customers pay</span>
        <span className={styles.price}>{cedis(totalOf(parts))}</span>
      </div>
      <Breakdown parts={parts} typeId={typeId} />
      <div className={styles.typeFoot}>
        <span><Clock size={14} /> {row.processing_timeline || type.timeline}</span>
        <span>Partner earns {cedis(commissionOf(parts))}</span>
      </div>
    </article>
  )
}

function TypeEditor({ typeId, row, onClose, onSaved }: { typeId: string; row: Row; onClose: () => void; onSaved: () => Promise<void> }) {
  const type = businessTypes.find((t) => t.id === typeId)!
  const initial = partsOf(row)
  const [form, setForm] = useState({
    orc: String(initial.orc),
    agent: String(initial.agent),
    returns: String(initial.returns),
    share: String(initial.share),
    timeline: row.processing_timeline || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLFormElement>(null)

  // The editor opens below all the cards; bring it into view (on phones it's well below the fold)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
  }, [typeId])

  const parts: Parts = { orc: num(form.orc), agent: num(form.agent), returns: num(form.returns), share: num(form.share) }
  const changed =
    parts.orc !== initial.orc ||
    parts.agent !== initial.agent ||
    parts.returns !== initial.returns ||
    parts.share !== initial.share ||
    form.timeline.trim() !== (row.processing_timeline || '')
  const diff = totalOf(parts) - totalOf(initial)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parts.share < 0 || parts.share > 100) return setError('Partner share must be between 0 and 100%.')
    setSaving(true)
    setError('')
    const res = await updateBusinessType(row.id, {
      orc_fee: parts.orc,
      agent_fee: parts.agent,
      returns_portion: parts.returns,
      affiliate_share_percentage: parts.share,
      processing_timeline: form.timeline.trim(),
    })
    setSaving(false)
    if (res.error) return setError(res.error)
    await onSaved()
    onClose()
  }

  const money = (key: 'orc' | 'agent' | 'returns', label: string, hint: string) => (
    <label className={ui.field}>
      <span className={ui.label}>{label}</span>
      <span className={styles.moneyInput}>
        <span>GH₵</span>
        <input inputMode="decimal" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      </span>
      <span className={ui.hint}>{hint}</span>
    </label>
  )

  return (
    <form ref={ref} className={`${ui.card} ${styles.editor}`} onSubmit={save}>
      <div className={ui.cardHead}>
        <div>
          <h2 className={ui.cardTitle}>Edit {type.name}</h2>
          <p className={ui.cardNote}>Changes go live on the pricing page, quiz, registration form and checkout as soon as you save.</p>
        </div>
      </div>
      <div className={styles.editorBody}>
        <div className={styles.editorFields}>
          <fieldset className={styles.group}>
            <legend>What the customer pays</legend>
            <div className={styles.fieldRow}>
              {money('orc', 'Government fee', 'Paid to the ORC')}
              {money('agent', 'Our service fee', 'What GrayDocket keeps')}
              {money('returns', returnsLabel(typeId), 'Collected upfront')}
            </div>
          </fieldset>
          <fieldset className={styles.group}>
            <legend>Other settings</legend>
            <div className={styles.fieldRow}>
              <label className={ui.field}>
                <span className={ui.label}>Partner share</span>
                <span className={styles.moneyInput}>
                  <input inputMode="decimal" value={form.share} onChange={(e) => setForm({ ...form, share: e.target.value })} />
                  <span>%</span>
                </span>
                <span className={ui.hint}>Of the {parts.returns > 0 ? returnsLabel(typeId).toLowerCase() : 'service fee'}</span>
              </label>
              <label className={`${ui.field} ${styles.span2}`}>
                <span className={ui.label}>Usual timeline</span>
                <input className={ui.input} value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} placeholder={type.timeline} />
                <span className={ui.hint}>Shown on pricing and in the quiz</span>
              </label>
            </div>
          </fieldset>
        </div>

        <aside className={styles.preview}>
          <span className={styles.priceLabel}>Customers will pay</span>
          <span className={styles.price}>{cedis(totalOf(parts))}</span>
          {diff !== 0 && (
            <span className={`${styles.diff} ${diff > 0 ? styles.up : styles.down}`}>
              {diff > 0 ? '+' : '−'}{cedis(Math.abs(diff))} from {cedis(totalOf(initial))}
            </span>
          )}
          <Breakdown parts={parts} typeId={typeId} />
          <p className={styles.previewNote}>A referring partner earns {cedis(commissionOf(parts))} per paid application.</p>
        </aside>
      </div>
      {error && <p className={`${ui.error} ${styles.editorError}`}>{error}</p>}
      <div className={styles.editorFoot}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!changed || saving}>{saving ? 'Saving…' : 'Save prices'}</button>
      </div>
    </form>
  )
}

function ServiceRow({ service, onSaved }: { service: Service; onSaved: () => Promise<void> }) {
  const [price, setPrice] = useState(String(service.price ?? 0))
  const [saving, setSaving] = useState(false)
  const active = service.is_active !== false
  const isCourier = service.name.trim().toLowerCase() === 'courier delivery'
  const dirty = num(price) !== num(service.price)

  const save = async (patch: { price?: number; is_active?: boolean }) => {
    setSaving(true)
    const res = await updateService(service.id, { price: num(price), is_active: active, ...patch })
    setSaving(false)
    if (res.error) alert(res.error)
    else await onSaved()
  }

  return (
    <li className={`${styles.service} ${active ? '' : styles.serviceOff}`}>
      <span className={ui.cellMain}>
        <strong>{service.name}</strong>
        <small>{isCourier ? 'Delivery option at checkout' : service.description || 'Optional add-on at checkout'}</small>
      </span>
      <span className={styles.serviceControls}>
        <span className={`${styles.moneyInput} ${styles.moneySmall}`}>
          <span>GH₵</span>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && dirty && save({})}
            aria-label={`${service.name} price`}
          />
        </span>
        {dirty ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => save({})} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        ) : isCourier ? (
          <span className={styles.switchSpacer} />
        ) : (
          <label className={styles.switch} title={active ? 'Offered at checkout' : 'Hidden from checkout'}>
            <input type="checkbox" checked={active} disabled={saving} onChange={(e) => save({ is_active: e.target.checked })} />
            <span aria-hidden="true" />
            <span className={styles.switchLabel}>{active ? 'On' : 'Off'}</span>
          </label>
        )}
      </span>
    </li>
  )
}

export default function AdminPricingPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await getAdminPricingData()
    if (res.error) setError(res.error)
    setRows(res.businessTypes as Row[])
    // Banking and hidden system settings (like the ORC deadline) aren't checkout extras
    setServices((res.services as Service[]).filter((s) => s.category !== 'banking' && (s.category !== 'system' || s.name.trim().toLowerCase() === 'courier delivery')))
  }, [])

  useEffect(() => {
    // Loads data from the server once on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const retire = async (row: Row) => {
    if (!window.confirm(`Retire this duplicate “${row.name}” row? Customers never see it; existing applications that point at it are unaffected.`)) return
    const res = await updateBusinessType(row.id, { is_active: false })
    if (res.error) alert(res.error)
    load()
  }

  const duplicates = rows ? (duplicateRows(rows) as Row[]) : []
  const editingRow = editing && rows ? (canonicalRow(businessTypes.find((t) => t.id === editing)!.name, rows) as Row | undefined) : undefined
  const delivery = services.filter((s) => s.name.trim().toLowerCase() === 'courier delivery')
  const addOns = services.filter((s) => s.name.trim().toLowerCase() !== 'courier delivery')

  return (
    <div className={ui.page}>
      <PageHeader title="Pricing" sub="One place for every price. Changes apply to the pricing page, the quiz, the registration form and checkout straight away." />

      {error && <p className={ui.error}>{error}</p>}

      {duplicates.length > 0 && (
        <div className={`${ui.notice} ${styles.dupes}`}>
          <p>
            <strong>{duplicates.length} old price row{duplicates.length === 1 ? '' : 's'} to tidy up.</strong> They aren’t used anywhere;
            retiring them stops anyone editing the wrong one.
          </p>
          <ul>
            {duplicates.map((d) => (
              <li key={d.id}>
                <span>{d.name} · {cedis(priceForType(businessTypes.find((t) => t.name === d.name)?.id || '', [d]).total)}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => retire(d)}>Retire</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Registration</h2>
        {rows === null ? (
          <div className={styles.types}>{businessTypes.map((t) => <div key={t.id} className={styles.skeleton} />)}</div>
        ) : (
          <div className={styles.types}>
            {businessTypes.map((t) => {
              const row = canonicalRow(t.name, rows) as Row | undefined
              return row ? (
                <TypeCard key={t.id} typeId={t.id} row={row} editing={editing === t.id} onEdit={() => setEditing(editing === t.id ? null : t.id)} />
              ) : (
                <p key={t.id} className={ui.error}>No active price for {t.name}. Customers can’t check out for this type.</p>
              )
            })}
          </div>
        )}
        {editing && editingRow && (
          <TypeEditor
            key={`${editingRow.id}-${editingRow.orc_fee}-${editingRow.agent_fee}-${editingRow.returns_portion}-${editingRow.affiliate_share_percentage}`}
            typeId={editing}
            row={editingRow}
            onClose={() => setEditing(null)}
            onSaved={load}
          />
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Extras at checkout</h2>
        <div className={ui.card}>
          {rows === null ? (
            <ul className={styles.services} aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className={styles.service}>
                  <span style={{ display: 'grid', gap: 6, flex: 1 }}>
                    <Skeleton width="30%" height={15} />
                    <Skeleton width="45%" height={12} />
                  </span>
                  <Skeleton width={210} height={36} radius={10} />
                </li>
              ))}
            </ul>
          ) : services.length === 0 ? (
            <p className={ui.empty}>No add-ons set up.</p>
          ) : (
            <ul className={styles.services}>
              {addOns.map((s) => <ServiceRow key={`${s.id}-${s.price}-${s.is_active}`} service={s} onSaved={load} />)}
              {delivery.map((s) => <ServiceRow key={`${s.id}-${s.price}-${s.is_active}`} service={s} onSaved={load} />)}
            </ul>
          )}
        </div>
        <p className={styles.footnote}>Switched-off add-ons are hidden from checkout. Digital delivery is always free.</p>
      </section>
    </div>
  )
}
