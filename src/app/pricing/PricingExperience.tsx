'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Clock, Info, RotateCcw, Sparkles, Minus } from 'lucide-react'
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

type Props = {
  plans: Plan[]
  extras: Extra[]
  courierFee: number
  compliance: ComplianceService[]
  /** Which tab opens first; the nav's "Agent" link opens the compliance view */
  initialView?: 'new' | 'existing'
}

const money = (n: number) => `GH₵ ${n.toLocaleString()}`
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

function Recommender({ onResult, result }: { onResult: (id: Plan['id'] | null) => void; result: Plan['id'] | null }) {
  const [questionId, setQuestionId] = useState(firstQuestion)

  const reset = () => {
    setQuestionId(firstQuestion)
    onResult(null)
  }

  if (result) {
    const r = results[result]
    return (
      <div className={styles.recommender}>
        <span className={styles.recIcon}><Sparkles size={16} /></span>
        <div className={styles.recBody}>
          <p className={styles.recTitle}>We recommend the highlighted plan</p>
          <p className={styles.recText}>{r.why}</p>
        </div>
        <button type="button" className={styles.recReset} onClick={reset}>
          <RotateCcw size={14} /> Start over
        </button>
      </div>
    )
  }

  const q = questions[questionId]
  return (
    <div className={styles.recommender}>
      <span className={styles.recIcon}><Sparkles size={16} /></span>
      <div className={styles.recBody}>
        <p className={styles.recTitle}>{q.question}</p>
        <div className={styles.recOptions}>
          {q.options.map((o) => (
            <button
              key={o.label}
              type="button"
              className={styles.recOption}
              onClick={() =>
                o.next.startsWith('result:')
                  ? onResult(o.next.slice('result:'.length) as Plan['id'])
                  : setQuestionId(o.next)
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {questionId !== firstQuestion && (
        <button type="button" className={styles.recReset} onClick={reset}>
          <RotateCcw size={14} /> Start over
        </button>
      )}
    </div>
  )
}

export default function PricingExperience({ plans, extras, courierFee, compliance, initialView = 'new' }: Props) {
  const [view, setView] = useState<'new' | 'existing'>(initialView)
  const [recommended, setRecommended] = useState<Plan['id'] | null>(null)
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
          <Recommender result={recommended} onResult={showRecommendation} />

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
                >
                  {isRecommended && <span className={styles.recBadge}>Recommended for you</span>}
                  <h2 className={styles.planName}>{plan.name}</h2>
                  <p className={styles.audience}>{plan.audience}</p>

                  <p className={styles.price}>{money(plan.total)}</p>
                  <p className={styles.priceNote}>One-off payment. Includes government fees.</p>
                  {plan.timeline && (
                    <p className={styles.timeline}>
                      <Clock size={14} /> Usually {plan.timeline}
                    </p>
                  )}

                  <Link href={startHref(plan.id)} className={styles.cta}>
                    Start my business <ArrowRight size={15} />
                  </Link>

                  <div className={styles.breakdown}>
                    {plan.lines.map((l) => (
                      <div key={l.label} className={styles.breakdownRow}>
                        <span className={styles.lineLabel}>
                          {l.label}
                          {PRICE_LINE_NOTES[l.label] && <InfoTip text={PRICE_LINE_NOTES[l.label]} />}
                          {l.paidTo === 'government' && <span className={styles.paidTo}>To the ORC</span>}
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
                </article>
              )
            })}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Compare business types</h2>
            <p className={styles.sectionLead}>What each one needs, and what it gives you.</p>
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
                      <td key={p.id} className={colClass(p.id)}>{p.timeline || '—'}</td>
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
            <h2 className={styles.sectionTitle}>Optional extras</h2>
            <p className={styles.sectionLead}>Add these during registration if you need them.</p>
            <div className={styles.table}>
              <div className={styles.tableRow}>
                <span>
                  <strong>Digital delivery</strong>
                  <small>PDF certificates by email and in your Documents</small>
                </span>
                <span>Free</span>
              </div>
              <div className={styles.tableRow}>
                <span>
                  <strong>Courier delivery</strong>
                  <small>Printed documents delivered to your door</small>
                </span>
                <span>{money(courierFee)}</span>
              </div>
              {extras.map((a) => (
                <div key={a.id} className={styles.tableRow}>
                  <span>
                    <strong>{a.name}</strong>
                    <small>{a.desc}</small>
                  </span>
                  <span>{a.price === 0 ? 'Free' : money(a.price)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={styles.section} aria-label="Compliance services">
          <h2 className={styles.sectionTitle}>We&apos;ll keep you compliant</h2>
          <p className={styles.sectionLead}>
            Already registered? Hand us your yearly filings and get back to running your business.
          </p>
          <div className={styles.table}>
            {compliance.map((c) => (
              <div key={c.id} className={styles.tableRow}>
                <span>
                  <Link href={c.href} className={styles.serviceLink}>
                    <strong>{c.name}</strong>
                  </Link>
                  <small>{c.desc}</small>
                </span>
                {c.price !== null ? (
                  <span>{money(c.price)}</span>
                ) : (
                  <Link href="/support" className={styles.quoteBtn}>Get a quote</Link>
                )}
              </div>
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
