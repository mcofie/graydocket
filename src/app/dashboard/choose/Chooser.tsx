'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Play, BookOpen, RotateCcw, Clock, Search } from 'lucide-react'
import { checkBusinessNameAvailability } from '@/lib/actions'
import NameCheck, { type NameAvailability } from '../applications/new/NameCheck'
import { businessTypes } from '../applications/new/constants'
import type { PriceLine } from '../applications/new/pricing'
import { videos, audios } from '../resources/content'
import AudioPlayer from '@/components/ui/AudioPlayer'
import { questions, firstQuestion, results, type QuizResult } from './quiz'
import styles from './choose.module.css'

export type TypePrice = { total: number; lines: PriceLine[]; timeline: string }

type TypeId = QuizResult['typeId']
type Stage =
  | { kind: 'question'; id: string }
  | { kind: 'requirements'; typeId: TypeId }
  | { kind: 'name'; typeId: TypeId }
  | { kind: 'price'; typeId: TypeId }

const overviewVideo = videos.find((v) => v.id === 'business-types')
const overviewAudio = audios.find((a) => a.id === 'business-types')

const money = (n: number) => `GH₵ ${n.toLocaleString()}`

type Props = {
  prices: Record<string, TypePrice>
  /** "public" is the logged-out version on the marketing site: guides open publicly and the
   *  last step asks people to create an account (or log in) before registering. */
  mode?: 'dashboard' | 'public'
}

export default function Chooser({ prices, mode = 'dashboard' }: Props) {
  const isPublic = mode === 'public'
  const guideHref = (slug: string) => (isPublic ? `/guides/${slug}` : `/dashboard/resources/${slug}`)
  const [history, setHistory] = useState<Stage[]>([{ kind: 'question', id: firstQuestion }])
  const [confirmed, setConfirmed] = useState(false)
  const [proposedName, setProposedName] = useState('')
  const [checking, setChecking] = useState(false)
  const [nameResult, setNameResult] = useState<NameAvailability | null>(null)
  const [retry, setRetry] = useState(0)
  const stage = history[history.length - 1]

  // Typing resets the result straight away; the effect below only runs the debounced lookup
  const updateName = (value: string) => {
    setProposedName(value)
    const long = value.trim().length >= 3
    setChecking(long)
    if (!long) setNameResult(null)
  }

  // Debounced ORC name lookup, same check the registration form runs
  useEffect(() => {
    const name = proposedName.trim()
    if (name.length < 3) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await checkBusinessNameAvailability(name)
        if (!cancelled) setNameResult(res)
      } catch {
        if (!cancelled) setNameResult({ available: false, error: 'unreachable' })
      } finally {
        if (!cancelled) setChecking(false)
      }
    }, 700)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [proposedName, retry])

  const go = (next: Stage) => setHistory((h) => [...h, next])
  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
  const restart = () => {
    setHistory([{ kind: 'question', id: firstQuestion }])
    setConfirmed(false)
    updateName('')
  }

  const answer = (next: string) => {
    if (next.startsWith('result:')) {
      setConfirmed(false)
      go({ kind: 'requirements', typeId: next.slice('result:'.length) as QuizResult['typeId'] })
    } else {
      go({ kind: 'question', id: next })
    }
  }

  const phases = ['Questions', 'Requirements', 'Name', 'Price']
  const phase = { question: 0, requirements: 1, name: 2, price: 3 }[stage.kind]

  return (
    <div className={styles.page}>
      <div className={styles.phases} aria-label="Progress">
        {phases.map((p, i) => (
          <div key={p} className={`${styles.phase} ${i < phase ? styles.phaseDone : i === phase ? styles.phaseActive : ''}`}>
            <span className={styles.phaseDot}>{i < phase ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
            <span>{p}</span>
          </div>
        ))}
      </div>

      {history.length > 1 && (
        <button type="button" className={styles.back} onClick={back}>
          <ArrowLeft size={16} /> Back
        </button>
      )}

      {stage.kind === 'question' && (() => {
        const q = questions[stage.id]
        return (
          <div className={styles.stage} key={stage.id}>
            <h1 className={styles.title}>{q.question}</h1>
            {q.help && <p className={styles.help}>{q.help}</p>}
            <div className={styles.options}>
              {q.options.map((o) => (
                <button key={o.label} type="button" className={styles.option} onClick={() => answer(o.next)}>
                  <span className={styles.optionText}>
                    <span>{o.label}</span>
                    {o.hint && <span className={styles.optionHint}>{o.hint}</span>}
                  </span>
                  <ArrowRight size={18} className={styles.optionArrow} />
                </button>
              ))}
            </div>

            <aside className={styles.learn}>
              <p className={styles.learnTitle}>Not sure? Watch, listen or read first</p>
              <div className={styles.learnItems}>
                {overviewVideo && (
                  overviewVideo.src ? (
                    <video
                      className={styles.video}
                      src={overviewVideo.src}
                      poster={overviewVideo.poster}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={overviewVideo.title}
                    />
                  ) : (
                    <div className={styles.videoPlaceholder}>
                      <span className={styles.play}><Play size={16} fill="currentColor" /></span>
                      <span>
                        <strong>{overviewVideo.title}</strong>
                        <small>Video coming soon · {overviewVideo.duration}</small>
                      </span>
                    </div>
                  )
                )}
                {overviewAudio && (
                  <AudioPlayer title={overviewAudio.title} duration={overviewAudio.duration} src={overviewAudio.src} />
                )}
                <Link href={guideHref('choosing-a-business-type')} className={styles.article}>
                  <BookOpen size={18} strokeWidth={1.75} />
                  <span>
                    <strong>Choosing a business type in Ghana</strong>
                    <small>4 min read</small>
                  </span>
                  <ArrowRight size={16} className={styles.articleArrow} />
                </Link>
              </div>
            </aside>
          </div>
        )
      })()}

      {stage.kind === 'requirements' && (() => {
        const result = results[stage.typeId]
        const type = businessTypes.find((t) => t.id === stage.typeId)
        return (
          <div className={styles.stage} key="requirements">
            <p className={styles.eyebrow}>We recommend</p>
            <h1 className={styles.title}>{type?.name}</h1>
            <p className={styles.help}>{result.why}</p>

            {(() => {
              const audio = audios.find((a) => a.id === stage.typeId)
              return audio ? (
                <div className={styles.listen}>
                  <AudioPlayer title={audio.title} duration={audio.duration} src={audio.src} />
                </div>
              ) : null
            })()}

            <h2 className={styles.sectionTitle}>What you&apos;ll need</h2>
            <ul className={styles.checklist}>
              {result.requirements.map((r) => (
                <li key={r}>
                  <Check size={16} strokeWidth={2.5} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <Link href={guideHref(result.articleSlug)} className={styles.inlineLink}>
              Read the full checklist <ArrowRight size={14} />
            </Link>

            <label className={styles.confirm}>
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>I have, or can get, everything on this list</span>
            </label>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                disabled={!confirmed}
                onClick={() => go({ kind: 'name', typeId: stage.typeId })}
              >
                Continue <ArrowRight size={16} />
              </button>
              <Link href="/support" className={styles.secondary}>Talk to us first</Link>
            </div>
          </div>
        )
      })()}

      {stage.kind === 'name' && (() => {
        const type = businessTypes.find((t) => t.id === stage.typeId)
        const isCompany = stage.typeId !== 'sole_proprietorship'
        const trimmed = proposedName.trim()
        const conflict = !checking && nameResult && !nameResult.available && nameResult.error !== 'unreachable'
        return (
          <div className={styles.stage} key="name">
            <p className={styles.eyebrow}>{type?.name}</p>
            <h1 className={styles.title}>Check your business name</h1>
            <p className={styles.help}>
              We&apos;ll search the ORC register for exact matches and look-alikes. The ORC makes the final decision when
              it reviews your application.
            </p>

            <label className={styles.nameField}>
              <span className={styles.nameLabel}>Proposed name</span>
              <span className={styles.nameInputWrap}>
                <Search size={18} className={styles.nameIcon} aria-hidden="true" />
                <input
                  className={styles.nameInput}
                  value={proposedName}
                  onChange={(e) => updateName(e.target.value)}
                  placeholder={isCompany ? 'e.g. Asante Tech Solutions Limited' : 'e.g. Asante Tech Solutions'}
                  autoComplete="off"
                  autoFocus
                  maxLength={120}
                />
              </span>
              {isCompany && (
                <span className={styles.nameHint}>Private companies must end with “Limited” or “LTD”.</span>
              )}
            </label>

            <NameCheck
              checking={checking}
              result={trimmed.length >= 3 ? nameResult : null}
              onRetry={() => {
                setChecking(true)
                setRetry((r) => r + 1)
              }}
            />

            {conflict && (
              <p className={styles.small}>
                Try adding a distinctive word, or use a name that doesn&apos;t resemble an existing business. You can also
                add a backup name in the registration form.
              </p>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                disabled={trimmed.length < 3 || checking}
                onClick={() => go({ kind: 'price', typeId: stage.typeId })}
              >
                See the price <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  updateName('')
                  go({ kind: 'price', typeId: stage.typeId })
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )
      })()}

      {stage.kind === 'price' && (() => {
        const type = businessTypes.find((t) => t.id === stage.typeId)
        const price = prices[stage.typeId]
        const name = proposedName.trim()
        const startHref = `/dashboard/applications/new?type=${stage.typeId}${name ? `&name=${encodeURIComponent(name)}` : ''}`
        return (
          <div className={styles.stage} key="price">
            <p className={styles.eyebrow}>{type?.name}</p>
            <h1 className={styles.title}>What it costs</h1>
            {name && <p className={styles.help}>For <strong className={styles.strong}>{name}</strong></p>}

            <div className={styles.priceCard}>
              {price.lines.map((l) => (
                <div key={l.label} className={styles.priceRow}>
                  <span>{l.label}</span>
                  <span>{money(l.amount)}</span>
                </div>
              ))}
              <div className={`${styles.priceRow} ${styles.priceTotal}`}>
                <span>Total</span>
                <span>{money(price.total)}</span>
              </div>
            </div>

            {price.timeline && (
              <p className={styles.timeline}>
                <Clock size={15} /> Usually {price.timeline} once submitted
              </p>
            )}
            <p className={styles.small}>
              Optional extras, such as a domain or courier delivery of your documents, are added at checkout if you choose them.
            </p>

            {isPublic ? (
              <>
                <div className={styles.accountNote}>
                  <strong>Create a free account to continue.</strong>{' '}
                  We&apos;ll take you straight to your registration with
                  {name ? ` ${name} and` : ''} your business type already filled in, and save your progress as you go.
                </div>
                <div className={styles.actions}>
                  <Link href={`/auth/register?redirect=${encodeURIComponent(startHref)}`} className={styles.primary}>
                    Create an account to continue <ArrowRight size={16} />
                  </Link>
                  <Link href={`/auth/login?redirect=${encodeURIComponent(startHref)}`} className={styles.secondary}>
                    I already have an account
                  </Link>
                </div>
                <button type="button" className={styles.textBtn} onClick={restart}>
                  <RotateCcw size={14} /> Retake quiz
                </button>
              </>
            ) : (
              <div className={styles.actions}>
                <Link href={startHref} className={styles.primary}>
                  Start my registration <ArrowRight size={16} />
                </Link>
                <button type="button" className={styles.secondary} onClick={restart}>
                  <RotateCcw size={15} /> Retake quiz
                </button>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
