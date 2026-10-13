'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Search, X } from 'lucide-react'
import { adminCreateApplication } from '@/lib/actions'
import { getAdminPricingData, searchAdminCustomers, type AdminUserRow } from '@/lib/admin-data'
import { businessTypes } from '@/app/dashboard/applications/new/constants'
import { addOnsWithPrices, courierFeeFrom, priceForType, quoteApplication, type DbBusinessType } from '@/app/dashboard/applications/new/pricing'
import { Skeleton, cedis, ui, useDebounced } from '../ui'
import styles from './new-application.module.css'

// Start an application for a customer (they called, emailed or walked in). The server prices it
// with the same helpers as checkout. The customer then pays online from their dashboard, or the
// team records a payment taken another way and it goes straight to the New queue.

type Customer = Pick<AdminUserRow, 'id' | 'full_name' | 'email' | 'phone'>
type Pricing = { types: DbBusinessType[]; services: Array<{ name: string; price: number; is_active?: boolean | null }> }

const PAID_BY = [
  { id: 'mobile_money', label: 'Mobile money' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank transfer' },
]

const shownEmail = (email: string | null) => (email && !email.endsWith('@graydocket.user') ? email : null)

function CustomerPicker({ value, onChange }: { value: Customer | null; onChange: (c: Customer | null) => void }) {
  const [term, setTerm] = useState('')
  const settled = useDebounced(term.trim(), 250)
  const [results, setResults] = useState<Customer[] | null>(null)

  useEffect(() => {
    if (!settled) return
    let live = true
    searchAdminCustomers(settled).then((rows) => live && setResults(rows))
    return () => {
      live = false
    }
  }, [settled])

  if (value) {
    return (
      <div className={styles.picked}>
        <span className={styles.avatar}>{(value.full_name || '?').slice(0, 1).toUpperCase()}</span>
        <span className={ui.cellMain}>
          <strong>{value.full_name || 'No name'}</strong>
          <small>{[value.phone, shownEmail(value.email)].filter(Boolean).join(' · ')}</small>
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>Change</button>
      </div>
    )
  }

  const showing = settled ? results : null
  return (
    <div className={styles.picker}>
      <label className={styles.searchBox}>
        <Search size={16} />
        <input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Name, phone or email"
          aria-label="Search customers"
        />
      </label>
      {showing && (
        <ul className={styles.results}>
          {showing.length === 0 ? (
            <li className={styles.noResults}>
              No customer matches. <Link href="/admin/users">Add them on Users</Link> first.
            </li>
          ) : (
            showing.map((c) => (
              <li key={c.id}>
                <button type="button" className={styles.result} onClick={() => onChange(c)}>
                  <span className={styles.avatar}>{(c.full_name || '?').slice(0, 1).toUpperCase()}</span>
                  <span className={ui.cellMain}>
                    <strong>{c.full_name || 'No name'}</strong>
                    <small>{[c.phone, shownEmail(c.email)].filter(Boolean).join(' · ')}</small>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default function NewApplication({ customer: initialCustomer, onClose }: { customer?: Customer | null; onClose: () => void }) {
  const router = useRouter()
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer || null)
  const [typeId, setTypeId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [addOnIds, setAddOnIds] = useState<string[]>([])
  const [delivery, setDelivery] = useState<'digital' | 'courier'>('digital')
  const [paidAlready, setPaidAlready] = useState(false)
  const [paidBy, setPaidBy] = useState('mobile_money')
  const [reference, setReference] = useState('')
  const [textCustomer, setTextCustomer] = useState(true)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminPricingData().then((res) =>
      setPricing({ types: res.businessTypes as unknown as DbBusinessType[], services: res.services as unknown as Pricing['services'] })
    )
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const extras = useMemo(() => (pricing ? addOnsWithPrices(pricing.services).filter((a) => a.price > 0) : []), [pricing])
  const quote = useMemo(
    () => (pricing && typeId ? quoteApplication({ typeId, addOnIds, delivery }, pricing.types, pricing.services) : null),
    [pricing, typeId, addOnIds, delivery]
  )

  const toggleAddOn = (id: string) => setAddOnIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return setError('Choose the customer.')
    if (!typeId) return setError('Choose a business type.')
    if (paidAlready && !window.confirm(`Record ${cedis(quote?.total)} as paid by ${PAID_BY.find((p) => p.id === paidBy)?.label.toLowerCase()}? The application goes straight to the New queue.`)) return
    setSaving(true)
    setError('')
    const res = await adminCreateApplication({
      userId: customer.id,
      typeId,
      businessName,
      addOnIds,
      delivery,
      payment: paidAlready ? { kind: 'offline', method: paidBy, reference } : { kind: 'online', textCustomer },
      note,
    })
    setSaving(false)
    if (res.error && !res.id) return setError(res.error)
    router.push(`/admin/applications/${res.id}`)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.dialog} role="dialog" aria-modal="true" aria-label="New application" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>New application</h2>
            <p className={ui.muted}>Start a registration for a customer. You can fill in the full details afterwards.</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Customer</h3>
            <CustomerPicker value={customer} onChange={setCustomer} />
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Business</h3>
            {pricing === null ? (
              <div className={styles.types} aria-hidden="true">
                {businessTypes.map((t) => <Skeleton key={t.id} height={64} radius={12} />)}
              </div>
            ) : (
              <div className={styles.types} role="radiogroup" aria-label="Business type">
                {businessTypes.map((t) => {
                  const price = priceForType(t.id, pricing.types).total
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={typeId === t.id}
                      className={`${styles.type} ${typeId === t.id ? styles.typeOn : ''}`}
                      onClick={() => setTypeId(t.id)}
                    >
                      <strong>{t.name}</strong>
                      <span>{cedis(price)}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <label className={ui.field}>
              <span className={ui.label}>Business name</span>
              <input className={ui.input} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Kente Studio" required />
            </label>
          </section>

          {extras.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Extras</h3>
              <div className={styles.checks}>
                {extras.map((a) => (
                  <label key={a.id} className={styles.check}>
                    <input type="checkbox" checked={addOnIds.includes(a.id)} onChange={() => toggleAddOn(a.id)} />
                    <span>{a.name}</span>
                    <span className={ui.muted}>{cedis(a.price)}</span>
                  </label>
                ))}
                <label className={styles.check}>
                  <input type="checkbox" checked={delivery === 'courier'} onChange={(e) => setDelivery(e.target.checked ? 'courier' : 'digital')} />
                  <span>Courier delivery</span>
                  <span className={ui.muted}>{pricing ? cedis(courierFeeFrom(pricing.services)) : ''}</span>
                </label>
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Payment</h3>
            <div className={styles.choices}>
              <button type="button" className={`${styles.choice} ${!paidAlready ? styles.choiceOn : ''}`} onClick={() => setPaidAlready(false)} aria-pressed={!paidAlready}>
                <span className={styles.radio}>{!paidAlready && <Check size={12} strokeWidth={3} />}</span>
                <span>
                  <strong>Customer pays online</strong>
                  <small>It waits in “Not paid yet”. They see “Complete payment” in their dashboard.</small>
                </span>
              </button>
              <button type="button" className={`${styles.choice} ${paidAlready ? styles.choiceOn : ''}`} onClick={() => setPaidAlready(true)} aria-pressed={paidAlready}>
                <span className={styles.radio}>{paidAlready && <Check size={12} strokeWidth={3} />}</span>
                <span>
                  <strong>Already paid</strong>
                  <small>Cash, mobile money or a transfer to us. Goes straight to “New”.</small>
                </span>
              </button>
            </div>
            {paidAlready ? (
              <div className={ui.formGrid}>
                <label className={ui.field}>
                  <span className={ui.label}>Paid by</span>
                  <select className={ui.input} value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                    {PAID_BY.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </label>
                <label className={ui.field}>
                  <span className={ui.label}>Reference</span>
                  <input className={ui.input} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID (optional)" />
                </label>
              </div>
            ) : (
              <label className={styles.check}>
                <input type="checkbox" checked={textCustomer} onChange={(e) => setTextCustomer(e.target.checked)} disabled={!customer?.phone} />
                <span>{customer && !customer.phone ? 'Customer has no phone number to text' : 'Text the customer a link to review and pay'}</span>
              </label>
            )}
          </section>

          <label className={ui.field}>
            <span className={ui.label}>Internal note</span>
            <input className={ui.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional, only the team sees this" />
          </label>

          {error && <p className={ui.error}>{error}</p>}
        </div>

        <div className={styles.foot}>
          <div className={styles.total}>
            <span className={ui.muted}>Total</span>
            <strong>{quote ? cedis(quote.total) : '—'}</strong>
          </div>
          <div className={ui.actions}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !customer || !typeId || !businessName.trim()}>
              {saving ? 'Creating…' : paidAlready ? 'Create and record payment' : 'Create application'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
