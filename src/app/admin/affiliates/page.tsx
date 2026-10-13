'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, Copy, Plus, X } from 'lucide-react'
import {
  createBrandAffiliate,
  getAdminAffiliates,
  markUserAsAffiliate,
  updateAffiliateCommissionStatus,
  updateAffiliatePartner,
} from '@/lib/actions'
import { PageHeader, StageChip, StatsSkeleton, TableSkeleton, cedis, shortDate, ui } from '../ui'
import styles from './affiliates.module.css'

// Affiliate program: brands and customers share a link with their code. Anyone who arrives through it
// is tagged for 30 days; when they pay, the partner earns a commission (the share is set per business
// type on the Pricing page). Approve commissions, then mark them paid once the money is sent.

type Partner = Awaited<ReturnType<typeof getAdminAffiliates>>['affiliates'][number]
type Filter = 'all' | 'brand' | 'customer'

const sum = (rows: Partner['commissions'], ...status: Partner['commissions'][number]['status'][]) =>
  rows.filter((c) => status.includes(c.status)).reduce((n, c) => n + c.amount, 0)

const PAYOUT_METHODS = [
  { id: 'momo', label: 'Mobile money' },
  { id: 'bank_transfer', label: 'Bank transfer' },
]

function origin() {
  return typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'
}

const linksFor = (code: string) => [
  { id: 'home', label: 'Home page', url: `${origin()}/?ref=${code}` },
  { id: 'start', label: 'Straight to registration', url: `${origin()}/dashboard/applications/new?ref=${code}` },
]

function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 2000)
      }}
    >
      {done ? <Check size={15} /> : <Copy size={15} />}
      {done ? 'Copied' : label}
    </button>
  )
}

export default function AdminAffiliatesPage() {
  const [partners, setPartners] = useState<Partner[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [justCreated, setJustCreated] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await getAdminAffiliates()
    setError(res.error)
    setPartners(res.affiliates || [])
  }, [])

  useEffect(() => {
    // Loads data from the server once on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (partners || [])
      .filter((p) => filter === 'all' || p.kind === filter)
      .filter((p) => !q || [p.name, p.email, p.code, p.contactName].some((v) => v?.toLowerCase().includes(q)))
  }, [partners, filter, query])

  const totals = useMemo(() => {
    const all = partners || []
    const referrals = all.flatMap((p) => p.referrals)
    const paid = referrals.filter((r) => r.paid)
    const commissions = all.flatMap((p) => p.commissions)
    return {
      brands: all.filter((p) => p.kind === 'brand').length,
      partners: all.length,
      referred: referrals.length,
      paid: paid.length,
      revenue: paid.reduce((n, r) => n + r.total, 0),
      owed: sum(commissions, 'pending', 'approved'),
      paidOut: sum(commissions, 'paid'),
    }
  }, [partners])

  const open = partners?.find((p) => p.id === openId) || null

  return (
    <div className={ui.page}>
      <PageHeader
        title="Affiliates"
        sub="Create referral links for brands and partners, and see who they bring in. Commissions are earned when a referred customer pays."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> New brand partner
          </button>
        }
      />

      {partners === null ? <StatsSkeleton /> : (
      <section className={ui.stats}>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Partners</span>
          <span className={ui.statValue}>{totals.partners}</span>
          <span className={ui.statHint}>{totals.brands} brand{totals.brands === 1 ? '' : 's'}</span>
        </div>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Referred applications</span>
          <span className={ui.statValue}>{totals.referred}</span>
          <span className={ui.statHint}>{totals.paid} paid</span>
        </div>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Revenue from referrals</span>
          <span className={ui.statValue}>{cedis(totals.revenue)}</span>
        </div>
        <div className={`${ui.stat} ${totals.owed > 0 ? ui.statAlert : ''}`}>
          <span className={ui.statLabel}>Commission owed</span>
          <span className={ui.statValue}>{cedis(totals.owed)}</span>
          <span className={ui.statHint}>{cedis(totals.paidOut)} paid out so far</span>
        </div>
      </section>
      )}

      {error && <p className={ui.error}>Couldn’t load partners: {error}</p>}

      <section className={ui.card}>
        <div className={`${ui.cardHead} ${styles.toolbar}`}>
          <div className={styles.filters} role="tablist" aria-label="Partner type">
            {(['all', 'brand', 'customer'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={`${styles.filter} ${filter === f ? styles.filterOn : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'brand' ? 'Brands' : 'Customers'}
              </button>
            ))}
          </div>
          <input
            className={`${ui.search} ${styles.search}`}
            placeholder="Search name, email or code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search partners"
          />
        </div>

        {partners === null ? (
          <TableSkeleton rows={4} cols={6} />
        ) : list.length === 0 ? (
          <div className={ui.empty}>
            {partners.length === 0 ? (
              <>
                <p>No partners yet.</p>
                <p className={styles.emptyHint}>
                  Add a brand to get them a referral link, or make a customer a partner from{' '}
                  <Link href="/admin/users">Users</Link>.
                </p>
              </>
            ) : (
              'No partners match.'
            )}
          </div>
        ) : (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${styles.table}`}>
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Code</th>
                  <th className={ui.right}>Referred</th>
                  <th className={`${ui.right} ${styles.wide}`}>Paid</th>
                  <th className={`${ui.right} ${styles.wide}`}>Revenue</th>
                  <th className={ui.right}>Owed</th>
                  <th className={styles.wide} />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const paid = p.referrals.filter((r) => r.paid)
                  const owed = sum(p.commissions, 'pending', 'approved')
                  return (
                    <tr key={p.id} className={`${ui.rowLink} ${justCreated === p.id ? styles.fresh : ''}`} onClick={() => setOpenId(p.id)}>
                      <td>
                        <span className={styles.who}>
                          <span className={`${styles.avatar} ${p.kind === 'brand' ? styles.avatarBrand : ''}`}>
                            {p.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className={ui.cellMain}>
                            <strong>{p.name}</strong>
                            <small>{p.kind === 'brand' ? `Brand${p.contactName ? ` · ${p.contactName}` : ''}` : 'Customer'}</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={styles.code}>{p.code || '—'}</span>
                      </td>
                      <td className={ui.right}>{p.referrals.length}</td>
                      <td className={`${ui.right} ${styles.wide}`}>{paid.length}</td>
                      <td className={`${ui.right} ${styles.wide}`}>{cedis(paid.reduce((n, r) => n + r.total, 0))}</td>
                      <td className={ui.right}>{owed > 0 ? <strong>{cedis(owed)}</strong> : <span className={ui.muted}>—</span>}</td>
                      <td className={`${ui.right} ${styles.wide}`}>
                        <ChevronRight size={16} className={ui.muted} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={styles.footnote}>
        How it works: a link tags the visitor for 30 days. If they register and pay, the application shows up under that
        partner and a commission is added for you to approve. Commission rates are set per business type on{' '}
        <Link href="/admin/pricing">Pricing</Link>.
      </p>

      {creating && (
        <CreatePartner
          onClose={() => setCreating(false)}
          onCreated={async (id) => {
            setCreating(false)
            await load()
            setJustCreated(id)
            setOpenId(id)
          }}
        />
      )}

      {open && <PartnerPanel partner={open} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  )
}

/* ---------- New brand partner ---------- */

function CreatePartner({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({ brandName: '', contactName: '', email: '', phone: '', code: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const preview = form.code.trim().toUpperCase().replace(/\s+/g, '-')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await createBrandAffiliate(form)
    setSaving(false)
    if (res.error || !res.id) return setError(res.error || 'Something went wrong.')
    onCreated(res.id)
  }

  return (
    <Modal title="New brand partner" onClose={onClose}>
      <form onSubmit={submit} className={styles.form}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="brandName">Brand name</label>
          <input id="brandName" className={ui.input} value={form.brandName} onChange={set('brandName')} placeholder="e.g. Hub Accra" required autoFocus />
        </div>
        <div className={ui.formGrid}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="contactName">Contact person</label>
            <input id="contactName" className={ui.input} value={form.contactName} onChange={set('contactName')} placeholder="Optional" />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="phone">Phone</label>
            <input id="phone" className={ui.input} value={form.phone} onChange={set('phone')} placeholder="Optional" inputMode="tel" />
          </div>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="email">Email</label>
          <input id="email" type="email" className={ui.input} value={form.email} onChange={set('email')} placeholder="partners@brand.com" required />
          <span className={ui.hint}>Their partner account. They can sign in with it to see their referrals.</span>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="code">Referral code</label>
          <input id="code" className={`${ui.input} ${styles.codeInput}`} value={form.code} onChange={set('code')} placeholder="Leave blank to generate one" maxLength={20} />
          <span className={ui.hint}>
            {preview ? <>Their link: <span className={ui.mono}>{origin().replace(/^https?:\/\//, '')}/?ref={preview}</span></> : 'Short and memorable works best, like HUBACCRA.'}
          </span>
        </div>
        {error && <p className={ui.error}>{error}</p>}
        <div className={styles.formActions}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create partner'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------- Partner detail ---------- */

function PartnerPanel({ partner: p, onClose, onChanged }: { partner: Partner; onClose: () => void; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: p.name,
    contactName: p.contactName || '',
    phone: p.phone || '',
    code: p.code || '',
    payoutMethod: p.payoutMethod || 'momo',
    payoutAddress: p.payoutAddress || '',
  })
  const [error, setError] = useState<string | null>(null)

  const pending = sum(p.commissions, 'pending')
  const approved = sum(p.commissions, 'approved')
  const commissionFor = (appId: string) => p.commissions.find((c) => c.applicationId === appId)
  const payoutLabel = PAYOUT_METHODS.find((m) => m.id === p.payoutMethod)?.label || p.payoutMethod

  const move = async (from: 'pending' | 'approved', to: 'approved' | 'paid') => {
    if (to === 'paid' && !window.confirm(`Mark ${cedis(approved)} as paid to ${p.name}? Do this after sending the money.`)) return
    setBusy(to)
    const res = await updateAffiliateCommissionStatus(p.id, from, to)
    setBusy(null)
    if (res.error) return alert(res.error)
    await onChanged()
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy('save')
    setError(null)
    const res = await updateAffiliatePartner(p.id, form)
    setBusy(null)
    if (res.error) return setError(res.error)
    await onChanged()
    setEditing(false)
  }

  const remove = async () => {
    if (!window.confirm(`Remove ${p.name} from the affiliate program? Their link will stop working. Past referrals and commissions stay on record.`)) return
    setBusy('remove')
    const res = await markUserAsAffiliate(p.id, false)
    setBusy(null)
    if (res.error) return alert(res.error)
    onClose()
    await onChanged()
  }

  return (
    <Modal title={p.name} sub={p.kind === 'brand' ? 'Brand partner' : 'Customer partner'} onClose={onClose} wide>
      <div className={styles.panel}>
        {p.code ? (
          <section className={styles.links}>
            {linksFor(p.code).map((l) => (
              <div key={l.id} className={styles.link}>
                <div className={styles.linkText}>
                  <span className={styles.linkLabel}>{l.label}</span>
                  <span className={styles.linkUrl}>{l.url}</span>
                </div>
                <CopyButton text={l.url} />
              </div>
            ))}
          </section>
        ) : (
          <p className={ui.notice}>This partner has no code yet. Add one under Edit details.</p>
        )}

        <section className={styles.panelStats}>
          <div><span>Referred</span><strong>{p.referrals.length}</strong></div>
          <div><span>Paid</span><strong>{p.referrals.filter((r) => r.paid).length}</strong></div>
          <div><span>To approve</span><strong>{cedis(pending)}</strong></div>
          <div><span>To pay</span><strong>{cedis(approved)}</strong></div>
        </section>

        {(pending > 0 || approved > 0) && (
          <div className={styles.payBar}>
            <span>
              {approved > 0
                ? p.payoutMethod
                  ? <>Send {cedis(approved)} by {payoutLabel?.toLowerCase()} to <strong>{p.payoutAddress}</strong>.</>
                  : <>Add payout details before marking {cedis(approved)} as paid.</>
                : <>{cedis(pending)} in new commissions waiting for review.</>}
            </span>
            <span className={ui.actions}>
              {pending > 0 && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => move('pending', 'approved')} disabled={busy !== null}>
                  {busy === 'approved' ? 'Approving…' : `Approve ${cedis(pending)}`}
                </button>
              )}
              {approved > 0 && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => move('approved', 'paid')} disabled={busy !== null || !p.payoutMethod}>
                  {busy === 'paid' ? 'Saving…' : 'Mark paid'}
                </button>
              )}
            </span>
          </div>
        )}

        <section>
          <h3 className={styles.sectionTitle}>Referred applications</h3>
          {p.referrals.length === 0 ? (
            <p className={styles.none}>Nobody has registered through this partner yet. Share the link above to get started.</p>
          ) : (
            <ul className={styles.referrals}>
              {p.referrals.map((r) => {
                const c = commissionFor(r.id)
                return (
                  <li key={r.id}>
                    <Link href={`/admin/applications/${r.id}`} className={styles.referral}>
                      <span className={ui.cellMain}>
                        <strong>{r.businessName || 'Untitled business'}</strong>
                        <small>{shortDate(r.createdAt)}{r.paid ? ` · ${cedis(r.total)}` : ' · not paid yet'}</small>
                      </span>
                      <span className={styles.referralSide}>
                        {c && <span className={styles.commission}>{cedis(c.amount)} · {c.status}</span>}
                        <StageChip status={r.status} />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Details</h3>
            {!editing && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit details</button>}
          </div>
          {editing ? (
            <form onSubmit={save} className={styles.form}>
              <div className={ui.formGrid}>
                <div className={ui.field}>
                  <label className={ui.label} htmlFor="p-name">Name</label>
                  <input id="p-name" className={ui.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className={ui.field}>
                  <label className={ui.label} htmlFor="p-code">Referral code</label>
                  <input id="p-code" className={`${ui.input} ${styles.codeInput}`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} maxLength={20} />
                </div>
                {p.kind === 'brand' && (
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="p-contact">Contact person</label>
                    <input id="p-contact" className={ui.input} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                  </div>
                )}
                <div className={ui.field}>
                  <label className={ui.label} htmlFor="p-phone">Phone</label>
                  <input id="p-phone" className={ui.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className={ui.field}>
                  <label className={ui.label} htmlFor="p-method">Payout by</label>
                  <select id="p-method" className={ui.input} value={form.payoutMethod} onChange={(e) => setForm({ ...form, payoutMethod: e.target.value })}>
                    {PAYOUT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div className={ui.field}>
                  <label className={ui.label} htmlFor="p-address">{form.payoutMethod === 'momo' ? 'Mobile money number' : 'Account details'}</label>
                  <input id="p-address" className={ui.input} value={form.payoutAddress} onChange={(e) => setForm({ ...form, payoutAddress: e.target.value })} />
                </div>
              </div>
              {p.code && form.code.trim().toUpperCase() !== p.code && (
                <p className={ui.notice}>Changing the code stops the old link working, and people who arrived through it won’t be credited.</p>
              )}
              {error && <p className={ui.error}>{error}</p>}
              <div className={styles.formActions}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy !== null}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          ) : (
            <dl className={ui.kv}>
              {p.kind === 'brand' && <div><dt>Contact</dt><dd>{p.contactName || '—'}</dd></div>}
              <div><dt>Email</dt><dd>{p.email || '—'}</dd></div>
              <div><dt>Phone</dt><dd>{p.phone || '—'}</dd></div>
              <div><dt>Payout</dt><dd>{p.payoutMethod ? `${payoutLabel} · ${p.payoutAddress}` : 'Not set'}</dd></div>
              <div><dt>Partner since</dt><dd>{shortDate(p.joinedAt)}</dd></div>
            </dl>
          )}
        </section>

        <div className={styles.danger}>
          <button type="button" className={styles.removeBtn} onClick={remove} disabled={busy !== null}>
            {busy === 'remove' ? 'Removing…' : 'Remove from affiliate program'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------- Modal ---------- */

function Modal({ title, sub, onClose, wide, children }: { title: string; sub?: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${wide ? styles.modalWide : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div>
            <h2 className={styles.modalTitle}>{title}</h2>
            {sub && <p className={ui.muted}>{sub}</p>}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  )
}
