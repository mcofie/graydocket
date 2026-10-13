'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Check, ChevronDown, Clock, Info, RotateCcw, Sparkles, Minus, X,
  FileDown, Truck, Globe, Mail, MonitorSmartphone, CalendarCheck, RefreshCw, Hash, Landmark, Users, type LucideIcon,
} from 'lucide-react'
import Tabs from '@/components/ui/Tabs'
import { PRICE_LINE_NOTES, type PriceLine } from '@/app/dashboard/applications/new/pricing'
import { questions, firstQuestion, results, type QuizResult } from '@/app/dashboard/choose/quiz'
import styles from './pricing.module.css'

export type Plan = {
  id: QuizResult['typeId']
  name: string
  audience: string
  total: number
  lines: PriceLine[]
  timeline: string
  included: string[]
}

export type Extra = { id: string; name: string; desc: string; price: number }
export type ComplianceService = { id: string; name: string; desc: string; href: string; price: number | null }

/** "10 - 15 working days" and "10-15 working days" both read "10–15 working days" */
function formatTimeline(timeline: string) {
  return timeline.replace(/(\d)\s*-\s*(\d)/g, '$1–$2')
}

type Props = {
  plans: Plan[]
  extras: Extra[]
  courierFee: number
  compliance: ComplianceService[]
  /** Which tab opens first; the nav's "Agent" link opens the compliance view */
  initialView?: 'new' | 'existing'
}

const money = (n: number) => `GH₵ ${n.toLocaleString()}`

// Each business type gets one of the landing page's accent tints, the same way "How it works" does
const PLAN_ACCENT: Record<Plan['id'], string> = {
  sole_proprietorship: 'var(--accent-blue)',
  limited_by_shares: 'var(--accent-green)',
  limited_by_guarantee: 'var(--accent-gold)',
}
const PLAN_EYEBROW: Record<Plan['id'], string> = {
  sole_proprietorship: 'Going it alone',
  limited_by_shares: 'Teams and investors',
  limited_by_guarantee: 'Non-profits',
}

const EXTRA_ICON: Record<string, LucideIcon> = { domain: Globe, email: Mail, website: MonitorSmartphone }
const COMPLIANCE_ICON: Record<string, LucideIcon> = {
  'annual-returns': CalendarCheck,
  renewal: RefreshCw,
  tin: Hash,
  gra: Landmark,
  ssnit: Users,
}

/** Eyebrow + title + lead, styled like the landing page's section headers */
function SectionHeader({ eyebrow, title, lead, accent = 'var(--accent-green)' }: { eyebrow: string; title: string; lead?: string; accent?: string }) {
  return (
    <header className={styles.sectionHeader} style={{ '--accent': accent } as React.CSSProperties}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {lead && <p className={styles.sectionLead}>{lead}</p>}
    </header>
  )
}

/** One extra or service as a tile: icon, name and note, price on the right */
function Tile({ icon: Icon, name, desc, price, href, accent }: { icon: LucideIcon; name: string; desc: string; price: React.ReactNode; href?: string; accent: string }) {
  return (
    <div className={styles.tile} style={{ '--accent': accent } as React.CSSProperties}>
      <span className={styles.tileIcon}><Icon size={18} strokeWidth={2} /></span>
      <span className={styles.tileText}>
        {href ? (
          <Link href={href} className={styles.serviceLink}><strong>{name}</strong></Link>
        ) : (
          <strong>{name}</strong>
        )}
        <small>{desc}</small>
      </span>
      <span className={styles.tilePrice}>{price}</span>
    </div>
  )
}
const startHref = (typeId: string) =>
  `/auth/register?redirect=${encodeURIComponent(`/dashboard/applications/new?type=${typeId}`)}`

/** Small accessible tooltip: shows on hover and on keyboard focus */
function InfoTip({ text }: { text: string }) {
  return (
    <span className={styles.tip}>
      <button type="button" className={styles.tipButton} aria-label={text}>
        <Info size={13} />
      </button>
      <span className={styles.tipBubble} role="tooltip">{text}</span>
    </span>
  )
}

// Rows for the comparison table; values follow the app's own requirements
const COMPARISON: Array<{ label: string; values: Record<Plan['id'], string | boolean>; note?: string }> = [
  { label: 'Best for', values: { sole_proprietorship: 'Going it alone', limited_by_shares: 'Teams and investors', limited_by_guarantee: 'Non-profits' } },
  { label: 'Owners', values: { sole_proprietorship: 'Just you', limited_by_shares: 'Shareholders', limited_by_guarantee: 'Members (guarantors)' } },
  { label: 'Personal assets protected', values: { sole_proprietorship: false, limited_by_shares: true, limited_by_guarantee: true }, note: 'With a company, the business’s debts are its own. As a sole proprietor, you are personally responsible.' },
  { label: 'Can issue shares', values: { sole_proprietorship: false, limited_by_shares: true, limited_by_guarantee: false } },
  { label: 'Directors', values: { sole_proprietorship: 'Not needed', limited_by_shares: 'At least 2, one in Ghana', limited_by_guarantee: 'Required' } },
  { label: 'Company secretary', values: { sole_proprietorship: false, limited_by_shares: true, limited_by_guarantee: true } },
  { label: 'Auditor', values: { sole_proprietorship: false, limited_by_shares: true, limited_by_guarantee: true }, note: 'You can add your auditor after submitting if you don’t have one yet.' },
  { label: 'ORC form we file', values: { sole_proprietorship: 'Form A', limited_by_shares: 'Form 3', limited_by_guarantee: 'Form 3' } },
  { label: 'Yearly filing', values: { sole_proprietorship: 'Name renewal', limited_by_shares: 'Annual return', limited_by_guarantee: 'Annual return' } },
]

/**
 * "Help me choose": a single quiet link until someone asks for help, then a couple of
 * quick questions inline, then a one-line answer that highlights the matching plan.
 */
function Recommender({
  onResult,
  result,
  planName,
}: {
  onResult: (id: Plan['id'] | null) => void
  result: Plan['id'] | null
  planName: (id: Plan['id']) => string
}) {
  const [open, setOpen] = useState(false)
  const [questionId, setQuestionId] = useState(firstQuestion)

  const reset = () => {
    setQuestionId(firstQuestion)
    onResult(null)
    setOpen(true)
  }

  const close = () => {
    setQuestionId(firstQuestion)
    setOpen(false)
  }

  if (result) {
    return (
      <div className={styles.recResult} role="status">
        <Sparkles size={15} className={styles.recSpark} />
        <p>
          <strong>We&apos;d go with {planName(result)}.</strong> {results[result].why}
        </p>
        <button type="button" className={styles.recReset} onClick={reset}>
          <RotateCcw size={13} /> Start over
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <div className={styles.recTriggerRow}>
        <button type="button" className={styles.recTrigger} onClick={() => setOpen(true)}>
          <Sparkles size={15} className={styles.recSpark} />
          Not sure which one? <span>Help me choose</span>
        </button>
      </div>
    )
  }

  const q = questions[questionId]
  return (
    <div className={styles.recommender}>
      <div className={styles.recHead}>
        <p className={styles.recTitle}>{q.question}</p>
        <button type="button" className={styles.recClose} onClick={close} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className={styles.recOptions}>
        {q.options.map((o) => (
          <button
            key={o.label}
            type="button"
            className={styles.recOption}
            onClick={() => {
              if (o.next.startsWith('result:')) {
                onResult(o.next.slice('result:'.length) as Plan['id'])
                setOpen(false)
              } else {
                setQuestionId(o.next)
              }
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PricingExperience({ plans, extras, courierFee, compliance, initialView = 'new' }: Props) {
  const [view, setView] = useState<'new' | 'existing'>(initialView)
  const [recommended, setRecommended] = useState<Plan['id'] | null>(null)
  // One toggle opens the details on every card, so they stay side by side for comparing
  const [showDetails, setShowDetails] = useState(false)
  // On phones the comparison table shows one plan at a time; this picks which
  const [comparePlan, setComparePlan] = useState<Plan['id']>(plans[0]?.id ?? 'sole_proprietorship')
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})

  const showRecommendation = (id: Plan['id'] | null) => {
    setRecommended(id)
    if (id) {
      setComparePlan(id)
      cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  const colClass = (id: Plan['id']) =>
    [id === recommended ? styles.colRecommended : '', id !== comparePlan ? styles.colMobileHidden : ''].join(' ')

  return (
    <>
      <Tabs
        className={styles.viewTabs}
        label="Pricing for"
        value={view}
        onChange={setView}
        items={[
          { id: 'new', label: 'Starting a business' },
          { id: 'existing', label: 'Already registered' },
        ]}
      />

      {view === 'new' ? (
        <>
          <Recommender
            result={recommended}
            onResult={showRecommendation}
            planName={(id) => plans.find((p) => p.id === id)?.name ?? ''}
          />

          <section className={styles.plans} aria-label="Registration plans">
            {plans.map((plan) => {
              const isRecommended = plan.id === recommended
              return (
                <article
                  key={plan.id}
                  ref={(el) => {
                    cardRefs.current[plan.id] = el
                  }}
                  className={`${styles.plan} ${isRecommended ? styles.planRecommended : ''}`}
                  style={{ '--accent': PLAN_ACCENT[plan.id] } as React.CSSProperties}
                >
                  {isRecommended && <span className={styles.recBadge}>Recommended for you</span>}
                  <p className={styles.planEyebrow}>{PLAN_EYEBROW[plan.id]}</p>
                  <h2 className={styles.planName}>{plan.name}</h2>
                  <p className={styles.audience}>{plan.audience}</p>

                  <p className={styles.price}>{money(plan.total)}</p>
                  <p className={styles.priceNote}>One-off · Government fees included</p>
                  {plan.timeline && (
                    <p className={styles.timeline}>
                      <Clock size={14} /> {formatTimeline(plan.timeline)}
                    </p>
                  )}

                  <Link href={startHref(plan.id)} className={styles.cta}>
                    Start my business <ArrowRight size={15} />
                  </Link>

                  <button
                    type="button"
                    className={styles.detailsToggle}
                    aria-expanded={showDetails}
                    aria-controls={`details-${plan.id}`}
                    onClick={() => setShowDetails((open) => !open)}
                  >
                    {showDetails ? 'Hide details' : 'What’s included'}
                    <ChevronDown size={16} className={styles.detailsChevron} />
                  </button>

                  <div
                    id={`details-${plan.id}`}
                    className={styles.details}
                    data-open={showDetails}
                    inert={!showDetails}
                  >
                    <div>
                      <div className={styles.breakdown}>
                        {plan.lines.map((l) => (
                          <div key={l.label} className={styles.breakdownRow}>
                            <span className={styles.lineLabel}>
                              {l.label}
                              {PRICE_LINE_NOTES[l.label] && <InfoTip text={PRICE_LINE_NOTES[l.label]} />}
                            </span>
                            <span>{money(l.amount)}</span>
                          </div>
                        ))}
                      </div>

                      <ul className={styles.included}>
                        {plan.included.map((item) => (
                          <li key={item}>
                            <Check size={16} strokeWidth={2.5} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

          <section className={styles.section}>
            <SectionHeader eyebrow="Compare" title="Which one fits you?" lead="What each one needs, and what it gives you." />
            <div className={styles.compareSwitch} role="group" aria-label="Plan to compare">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.compareChip} ${p.id === comparePlan ? styles.compareChipActive : ''}`}
                  aria-pressed={p.id === comparePlan}
                  onClick={() => setComparePlan(p.id)}
                >
                  {p.name.replace('Company Limited by ', 'Ltd by ')}
                </button>
              ))}
            </div>
            <div className={styles.compareWrap}>
              <table className={styles.compare}>
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">Feature</span></th>
                    {plans.map((p) => (
                      <th key={p.id} scope="col" className={colClass(p.id)}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Price</th>
                    {plans.map((p) => (
                      <td key={p.id} className={colClass(p.id)}>
                        <strong>{money(p.total)}</strong>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Usual timeline</th>
                    {plans.map((p) => (
                      <td key={p.id} className={colClass(p.id)}>{p.timeline ? formatTimeline(p.timeline) : '—'}</td>
                    ))}
                  </tr>
                  {COMPARISON.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">
                        <span className={styles.lineLabel}>
                          {row.label}
                          {row.note && <InfoTip text={row.note} />}
                        </span>
                      </th>
                      {plans.map((p) => {
                        const v = row.values[p.id]
                        return (
                          <td key={p.id} className={colClass(p.id)}>
                            {v === true ? (
                              <Check size={18} strokeWidth={2.5} className={styles.yes} aria-label="Yes" />
                            ) : v === false ? (
                              <Minus size={18} className={styles.no} aria-label="No" />
                            ) : (
                              v
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader
              eyebrow="Extras"
              accent="var(--accent-blue)"
              title="Add what you need"
              lead="Pick these during registration. Nothing is added unless you choose it."
            />
            <div className={styles.tiles}>
              <Tile icon={FileDown} accent="var(--accent-green)" name="Digital delivery" desc="PDF certificates by email and in your Documents" price="Free" />
              <Tile icon={Truck} accent="var(--accent-orange)" name="Courier delivery" desc="Printed documents delivered to your door" price={money(courierFee)} />
              {extras.map((a) => (
                <Tile
                  key={a.id}
                  icon={EXTRA_ICON[a.id] || Sparkles}
                  accent="var(--accent-blue)"
                  name={a.name}
                  desc={a.desc}
                  price={a.price === 0 ? 'Free' : money(a.price)}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={styles.section} aria-label="Compliance services">
          <SectionHeader
            eyebrow="Compliance, handled"
            title="We’ll keep you compliant"
            lead="Already registered? Hand us your yearly filings and get back to running your business."
          />
          <div className={styles.tiles}>
            {compliance.map((c) => (
              <Tile
                key={c.id}
                icon={COMPLIANCE_ICON[c.id] || CalendarCheck}
                accent="var(--accent-green)"
                name={c.name}
                desc={c.desc}
                href={c.href}
                price={c.price !== null ? money(c.price) : <Link href="/support" className={styles.quoteBtn}>Get a quote</Link>}
              />
            ))}
          </div>
          <p className={styles.contact}>
            Have an account? <Link href="/auth/login">Log in</Link> and we&apos;ll track your deadlines for you.
          </p>
        </section>
      )}
    </>
  )
}
