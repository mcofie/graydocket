'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Dices, Heart, Search, Share2, Shuffle, Sparkles, X } from 'lucide-react'
import { INDUSTRIES, VIBES, withEnding, type Industry, type NameIdea, type NameKind, type Vibe } from '@/lib/name-ideas'
import {
  SHORTLIST_MAX,
  cleanShortlist,
  mergeShortlists,
  readAccountShortlist,
  readLocalShortlist,
  writeAccountShortlist,
  writeLocalShortlist,
} from '@/lib/name-shortlist'
import Turnstile from './Turnstile'
import { postIdeas, turnstileKey } from './ideas-client'
import styles from './name-ideas.module.css'

// Name finder, laid out like a small studio: choices on the left, names on the right that update as
// you change them. Names are checked against the ORC register as they come on screen; kept names
// also get a web-address check, can be shared, and follow a signed-in account into registration.

type OrcState = { state: 'free' } | { state: 'similar'; matches: string[] } | { state: 'unknown' }
type DomainState = { checking: true } | { checking: false; free: string[]; taken: string[] }
type FetchOpts = { like?: NameIdea | null; fresh?: boolean; turnstile?: string }

const KINDS: Array<{ id: NameKind; label: string; typeId: string }> = [
  { id: 'sole', label: 'Just me', typeId: 'sole_proprietorship' },
  { id: 'company', label: 'Company', typeId: 'limited_by_shares' },
  { id: 'nonprofit', label: 'Non-profit', typeId: 'limited_by_guarantee' },
]

// A taste of what comes out, for the empty state
const EXAMPLES = ['Nhyira Pantry', 'House of Serwaa', 'Bloom Logic', 'Asase Farms', 'Kwan Express', 'Jolly Bites']

const orcCache = new Map<string, OrcState>()

const initials = (name: string) =>
  name
    .replace(/[’']s\b/g, '')
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('') || name.slice(0, 2).toUpperCase()

const registerHref = (name: string, kind: NameKind) => {
  const typeId = KINDS.find((k) => k.id === kind)?.typeId || 'sole_proprietorship'
  const target = `/dashboard/applications/new?type=${typeId}&name=${encodeURIComponent(withEnding(name, kind))}`
  return `/auth/register?redirect=${encodeURIComponent(target)}`
}

async function checkOrc(name: string): Promise<OrcState> {
  const key = name.toLowerCase()
  const hit = orcCache.get(key)
  if (hit) return hit
  try {
    // Lower priority than the registration form's checks
    const res = await fetch(`/api/name-check?from=ideas&name=${encodeURIComponent(name)}`)
    const body = (await res.json()) as { available: boolean; error?: string | null; matches?: Array<string | { name: string }> }
    const state: OrcState = body.error
      ? { state: 'unknown' }
      : body.available
        ? { state: 'free' }
        : { state: 'similar', matches: (body.matches || []).map((m) => (typeof m === 'string' ? m : m.name)).slice(0, 3) }
    if (state.state !== 'unknown') orcCache.set(key, state)
    return state
  } catch {
    return { state: 'unknown' }
  }
}

/** Names from a shared link: /name-ideas?list=Name%20One|Name%20Two */
function sharedFromUrl(): NameIdea[] {
  const raw = new URLSearchParams(window.location.search).get('list')
  if (!raw) return []
  return cleanShortlist(
    raw
      .split('|')
      .filter((n) => /^[\p{L}\p{N} '’&.-]+$/u.test(n.trim()))
      .map((name) => ({ name, style: 'shared' }))
  )
}

function useDebounced<T>(value: T, ms: number) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return settled
}

export default function NameFinder() {
  const [industry, setIndustry] = useState<Industry | null>(null)
  const [vibe, setVibe] = useState<Vibe>('modern')
  const [kind, setKind] = useState<NameKind>('sole')
  const [word, setWord] = useState('')
  const [about, setAbout] = useState('')
  const settledWord = useDebounced(word.trim(), 500)
  const settledAbout = useDebounced(about.trim(), 800)
  // Quick taps through the options settle into one request
  const choices = useDebounced(`${industry}|${vibe}|${kind}`, 250)
  const queryKey = `${choices}|${settledWord}|${settledAbout}`

  const [ideas, setIdeas] = useState<NameIdea[]>([])
  const [batch, setBatch] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [challenge, setChallenge] = useState<FetchOpts | null>(null)
  const [orc, setOrc] = useState<Record<string, OrcState>>({})
  const [onScreen, setOnScreen] = useState<Set<string>>(() => new Set())
  const [shortlist, setShortlist] = useState<NameIdea[]>([])
  const [shared, setShared] = useState<NameIdea[]>([])
  const [domains, setDomains] = useState<Record<string, DomainState>>({})
  const [own, setOwn] = useState('')
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const [onAccount, setOnAccount] = useState(false)
  // Nothing is saved until the stored shortlist has been read, so an empty first render can't wipe it
  const [restored, setRestored] = useState(false)

  const shownRef = useRef<string[]>([])
  const requestRef = useRef<AbortController | null>(null)
  const requestsRef = useRef(0)
  const prefetchRef = useRef<{ key: string; names: NameIdea[] } | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Shortlist: this browser, plus the account when signed in; and any names from a shared link
  useEffect(() => {
    const local = readLocalShortlist()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from browser storage once
    setShortlist(local)
    setShared(sharedFromUrl())
    setRestored(true)
    // Arriving from the quiz (or a link) with the business type and trade already known
    const params = new URLSearchParams(window.location.search)
    const linkedKind = params.get('kind')
    if (linkedKind === 'sole' || linkedKind === 'company' || linkedKind === 'nonprofit') setKind(linkedKind)
    const linkedIndustry = INDUSTRIES.find((i) => i.id === params.get('industry'))
    if (linkedIndustry) setIndustry(linkedIndustry.id)
    void readAccountShortlist().then((account) => {
      if (!account) return
      setOnAccount(true)
      setShortlist((current) => mergeShortlists(current, account))
    })
  }, [])
  useEffect(() => {
    if (!restored) return
    writeLocalShortlist(shortlist)
    if (!onAccount) return
    const t = window.setTimeout(() => void writeAccountShortlist(shortlist), 1000)
    return () => window.clearTimeout(t)
  }, [shortlist, restored, onAccount])

  const payload = (opts: FetchOpts, exclude: string[]) => ({
    industry,
    vibe,
    kind,
    word: settledWord,
    about: settledAbout,
    exclude,
    like: opts.like ?? null,
    turnstile: opts.turnstile,
  })

  const announce = (names: NameIdea[]) => setStatus(`${names.length} new names${industry ? ` for ${INDUSTRIES.find((i) => i.id === industry)?.label}` : ''}.`)

  const showBatch = (names: NameIdea[]) => {
    setIdeas(names)
    setBatch((b) => b + 1)
    shownRef.current = [...shownRef.current, ...names.map((n) => n.name)].slice(-200)
    announce(names)
  }

  /** Get the next "New batch" ready in the background, once someone is clearly browsing */
  const prefetch = async (key: string) => {
    if (requestsRef.current < 2) return
    try {
      const body = await postIdeas(payload({}, shownRef.current))
      if (body.names?.length && !body.challenge) prefetchRef.current = { key, names: body.names }
    } catch {}
  }

  const fetchIdeas = async (opts: FetchOpts = {}) => {
    if (!industry) return
    if (opts.fresh) {
      shownRef.current = []
      prefetchRef.current = null
    }
    setChallenge(null)

    // "New batch" with one ready: show it straight away
    const ready = prefetchRef.current
    if (!opts.fresh && !opts.like && ready?.key === queryKey) {
      prefetchRef.current = null
      setError('')
      showBatch(ready.names)
      requestsRef.current += 1
      void prefetch(queryKey)
      return
    }

    // Only the latest request counts; an older, slower reply must not replace newer names
    requestRef.current?.abort()
    const request = new AbortController()
    requestRef.current = request
    setLoading(true)
    setError('')
    try {
      const body = await postIdeas(payload(opts, shownRef.current), request.signal)
      if (request.signal.aborted) return
      if (body.challenge && turnstileKey()) {
        setChallenge({ ...opts, turnstile: undefined })
        return
      }
      if (body.error) setError(body.error)
      if (body.names?.length) {
        showBatch(body.names)
        requestsRef.current += 1
        if (!opts.like) void prefetch(queryKey)
      } else if (!body.error) {
        setError('That’s every idea we have for these choices. Try a different feel, or add a word of your own.')
      }
    } catch {
      if (request.signal.aborted) return
      setError('Couldn’t get ideas just now. Please try again.')
    } finally {
      if (requestRef.current === request) setLoading(false)
    }
  }

  // On phones the choices sit above the names, so the first pick scrolls down to them
  const pickIndustry = (id: Industry) => {
    const first = !industry
    setIndustry(id)
    if (first && window.matchMedia('(max-width: 1000px)').matches) {
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    }
  }

  const surprise = () => {
    const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
    setVibe(pick(VIBES).id)
    pickIndustry(pick(INDUSTRIES).id)
  }

  // Live: a fresh batch whenever the choices change
  useEffect(() => {
    if (!industry) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches a fresh batch for the new choices
    void fetchIdeas({ fresh: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey])

  // Cards report when they come on screen, so the ORC is only asked about names people can see
  const watchCard = (el: HTMLElement | null) => {
    if (!el) return
    observerRef.current ??= new IntersectionObserver(
      (entries) => {
        const names = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.name!)
        if (names.length) setOnScreen((prev) => (names.every((n) => prev.has(n)) ? prev : new Set([...prev, ...names])))
      },
      { rootMargin: '160px 0px' }
    )
    const observer = observerRef.current
    observer.observe(el)
    return () => observer.unobserve(el)
  }

  // Check names on screen, shortlisted and shared against the ORC register, two at a time
  useEffect(() => {
    const names = [...new Set([...shortlist, ...shared, ...ideas.filter((i) => onScreen.has(i.name))].map((i) => i.name))].filter(
      (n) => !orc[n] && !orcCache.has(n.toLowerCase())
    )
    if (names.length === 0) return
    let live = true
    const queue = [...names]
    const worker = async () => {
      while (live && queue.length) {
        const name = queue.shift()!
        const state = await checkOrc(name)
        if (live) setOrc((prev) => ({ ...prev, [name]: state }))
      }
    }
    void Promise.all([worker(), worker()])
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideas, shortlist, shared, onScreen])

  // Web addresses for shortlisted names
  useEffect(() => {
    const todo = shortlist.filter((s) => !domains[s.name])
    if (todo.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the lookups as started
    setDomains((prev) => ({ ...prev, ...Object.fromEntries(todo.map((s) => [s.name, { checking: true as const }])) }))
    todo.forEach(async (s) => {
      try {
        const res = await fetch(`/api/domain-check?name=${encodeURIComponent(s.name)}`)
        const body = (await res.json()) as { domains?: Array<{ domain: string; status: string }>; alternatives?: Array<{ domain: string; status: string }> }
        const all = [...(body.domains || []), ...(body.alternatives || [])]
        setDomains((prev) => ({
          ...prev,
          [s.name]: { checking: false, free: all.filter((d) => d.status === 'available').map((d) => d.domain), taken: all.filter((d) => d.status === 'taken').map((d) => d.domain) },
        }))
      } catch {
        setDomains((prev) => ({ ...prev, [s.name]: { checking: false, free: [], taken: [] } }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortlist])

  const kept = (name: string) => shortlist.some((s) => s.name.toLowerCase() === name.toLowerCase())
  const toggleKeep = (idea: NameIdea) =>
    setShortlist((prev) => (kept(idea.name) ? prev.filter((s) => s.name.toLowerCase() !== idea.name.toLowerCase()) : [idea, ...prev].slice(0, SHORTLIST_MAX)))

  /** "Already have a name?": check it and keep it */
  const checkOwn = (e: React.FormEvent) => {
    e.preventDefault()
    const name = own.trim().replace(/\s+/g, ' ')
    if (name.length < 3) return
    if (!kept(name)) setShortlist((prev) => [{ name, style: 'own' }, ...prev].slice(0, SHORTLIST_MAX))
    void fetch('/api/name-ideas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ own: name }) }).catch(() => {})
    setOwn('')
    window.setTimeout(() => document.getElementById('shortlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  /** Share the shortlist (WhatsApp or the phone's share sheet) so friends and family can weigh in */
  const shareShortlist = async () => {
    const url = `${window.location.origin}/name-ideas?list=${encodeURIComponent(shortlist.map((s) => s.name).join('|'))}`
    const text = `Help me pick a name for my business. Which one do you like?\n\n${shortlist.map((s) => `• ${withEnding(s.name, kind)}`).join('\n')}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Which name do you like?', text, url })
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`, '_blank', 'noopener')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  const closeShared = () => {
    setShared([])
    const url = new URL(window.location.href)
    url.searchParams.delete('list')
    window.history.replaceState(null, '', url)
  }

  const orcBadge = (name: string) => {
    const s = orc[name] || orcCache.get(name.toLowerCase())
    if (!s) return <span className={`${styles.badge} ${styles.badgeChecking}`}><span className={styles.dot} /> Checking ORC…</span>
    if (s.state === 'free') return <span className={`${styles.badge} ${styles.badgeFree}`}><Check size={12} strokeWidth={3} /> Looks free at ORC</span>
    if (s.state === 'similar') return <span className={`${styles.badge} ${styles.badgeSimilar}`} title={s.matches.join(', ')}>Similar names registered</span>
    return <span className={`${styles.badge} ${styles.badgeUnknown}`}>We’ll check this one</span>
  }

  // The ending the ORC needs, shown faintly after each name ("Limited", "LBG")
  const ending = withEnding('x', kind).slice(1)
  const industryLabel = INDUSTRIES.find((i) => i.id === industry)?.label.toLowerCase()
  const vibeLabel = VIBES.find((v) => v.id === vibe)?.label.toLowerCase()

  return (
    <div className={styles.finder}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}><Sparkles size={15} /> Name finder</p>
        <h1 className={styles.title}>Find a name that feels like yours.</h1>
        <p className={styles.lead}>Pick a few things and watch names appear, each checked against the ORC register. Keep the ones you love.</p>
      </header>

      <p className={styles.srOnly} role="status" aria-live="polite">{status}</p>

      <div className={styles.studio}>
        {/* Choices */}
        <aside className={styles.panel} aria-label="About your business">
          <div className={styles.question}>
            <h2 className={styles.qTitle}>What do you do?</h2>
            <div className={styles.chips}>
              {INDUSTRIES.map((i) => (
                <button key={i.id} type="button" className={`${styles.chip} ${industry === i.id ? styles.chipOn : ''}`} aria-pressed={industry === i.id} onClick={() => pickIndustry(i.id)}>
                  {i.label}
                </button>
              ))}
            </div>
            <label className={styles.subLabel} htmlFor="name-about">Tell us more <em>optional</em></label>
            <textarea
              id="name-about"
              className={`${styles.input} ${styles.textarea}`}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="e.g. Wedding cakes and small chops in Kumasi"
              maxLength={160}
              rows={2}
            />
          </div>

          <div className={styles.question}>
            <h2 className={styles.qTitle}>The feel</h2>
            <div className={styles.vibes}>
              {VIBES.map((v) => (
                <button key={v.id} type="button" className={`${styles.vibe} ${vibe === v.id ? styles.vibeOn : ''}`} aria-pressed={vibe === v.id} onClick={() => setVibe(v.id)}>
                  <strong>{v.label}</strong>
                  <span>{v.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.question}>
            <h2 className={styles.qTitle}>It’s for</h2>
            <div className={styles.segment} role="radiogroup" aria-label="Kind of business">
              {KINDS.map((k) => (
                <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={`${styles.segBtn} ${kind === k.id ? styles.segOn : ''}`} onClick={() => setKind(k.id)}>
                  {k.label}
                </button>
              ))}
            </div>
            <Link href="/find-your-business-type" className={styles.quizLink}>Not sure which? Take the 1-minute quiz</Link>
          </div>

          <div className={styles.question}>
            <label className={styles.qTitle} htmlFor="name-word">Include a word <em>optional</em></label>
            <input id="name-word" className={styles.input} value={word} onChange={(e) => setWord(e.target.value)} placeholder="Your name, a place…" maxLength={24} />
          </div>

          <form className={styles.own} onSubmit={checkOwn}>
            <label className={styles.qTitle} htmlFor="own-name">Already have a name?</label>
            <div className={styles.ownRow}>
              <input id="own-name" className={styles.input} value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Type it to check" maxLength={60} />
              <button type="submit" className={styles.ownBtn} disabled={own.trim().length < 3} aria-label="Check this name">
                <Search size={17} />
              </button>
            </div>
          </form>
        </aside>

        {/* Names */}
        <div ref={resultsRef} className={styles.results}>
          {shared.length > 0 && (
            <section className={styles.sharedBox} aria-label="Names shared with you">
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.sectionTitle}>Which one do you like?</h2>
                  <p className={styles.muted}>Someone shared these names with you. Tap the heart on your favourite.</p>
                </div>
                <button type="button" className={styles.iconBtn} onClick={closeShared} aria-label="Close shared names">
                  <X size={16} />
                </button>
              </div>
              <ul className={styles.shortList}>
                {shared.map((s) => (
                  <li key={s.name} className={styles.shortItem}>
                    <span className={styles.monoSmall}>{initials(s.name)}</span>
                    <div className={styles.shortText}>
                      <strong>{s.name}</strong>
                      <div className={styles.shortMeta}>{orcBadge(s.name)}</div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.heart} ${kept(s.name) ? styles.heartOn : ''}`}
                      onClick={() => toggleKeep(s)}
                      aria-pressed={kept(s.name)}
                      aria-label={kept(s.name) ? `Remove ${s.name} from shortlist` : `Keep ${s.name}`}
                    >
                      <Heart size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {shortlist.length > 0 && (
            <section id="shortlist" className={styles.shortlist} aria-label="Your shortlist">
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.sectionTitle}><Heart size={17} /> Your shortlist</h2>
                  <p className={styles.muted}>{onAccount ? 'Saved to your account' : 'Saved on this device'}</p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={shareShortlist}>
                  <Share2 size={15} /> {copied ? 'Link copied' : 'Ask a friend'}
                </button>
              </div>
              <ul className={styles.shortList}>
                {shortlist.map((s) => {
                  const d = domains[s.name]
                  return (
                    <li key={s.name} className={styles.shortItem}>
                      <span className={styles.monoSmall}>{initials(s.name)}</span>
                      <div className={styles.shortText}>
                        <strong>{withEnding(s.name, kind)}</strong>
                        <div className={styles.shortMeta}>
                          {orcBadge(s.name)}
                          {!d || d.checking ? (
                            <span className={`${styles.badge} ${styles.badgeChecking}`}><span className={styles.dot} /> Web addresses…</span>
                          ) : d.free.length ? (
                            <span className={`${styles.badge} ${styles.badgeFree}`}><Check size={12} strokeWidth={3} /> {d.free[0]}{d.free.length > 1 ? ` +${d.free.length - 1}` : ''}</span>
                          ) : d.taken.length ? (
                            <span className={`${styles.badge} ${styles.badgeUnknown}`}>Web addresses taken</span>
                          ) : null}
                        </div>
                      </div>
                      <div className={styles.shortActions}>
                        <Link href={registerHref(s.name, kind)} className="btn btn-primary btn-sm">
                          Register <ArrowRight size={14} />
                        </Link>
                        <button type="button" className={styles.iconBtn} onClick={() => toggleKeep(s)} aria-label={`Remove ${s.name} from shortlist`}>
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {!industry ? (
            <section className={styles.empty} aria-label="How it works">
              <div className={styles.emptyCloud} aria-hidden="true">
                {EXAMPLES.map((n, i) => (
                  <span key={n} className={styles.sample} style={{ animationDelay: `${i * 120}ms` }}>
                    <span className={styles.monoSmall}>{initials(n)}</span> {n}
                  </span>
                ))}
              </div>
              <h2 className={styles.emptyTitle}>Start with what your business does</h2>
              <p className={styles.emptyText}>
                Pick one <span className={styles.onLeft}>on the left</span><span className={styles.above}>above</span> and names appear here straight away, each checked against the ORC register.
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={surprise}>
                <Dices size={15} /> Surprise me
              </button>
            </section>
          ) : (
            <section aria-label="Name ideas" aria-busy={loading}>
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.sectionTitle}>Ideas for you</h2>
                  <p className={styles.muted}>
                    {industryLabel}, {vibeLabel}
                    {settledWord ? `, with “${settledWord}”` : ''}
                    {settledAbout ? ', from your description' : ''}
                  </p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fetchIdeas()} disabled={loading || Boolean(challenge)}>
                  <Shuffle size={15} /> New batch
                </button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              {challenge && turnstileKey() && (
                <div className={styles.challenge}>
                  <p>You’ve looked at a lot of names. A quick check that you’re a person, then we’ll carry on.</p>
                  <Turnstile siteKey={turnstileKey()!} onToken={(token) => void fetchIdeas({ ...challenge, turnstile: token })} />
                </div>
              )}
              {loading && ideas.length === 0 && (
                <ul className={styles.grid} aria-hidden="true">
                  {Array.from({ length: 4 }, (_, i) => (
                    <li key={i} className={`${styles.card} ${styles.skeleton}`}>
                      <span className={styles.mono} />
                      <span className={styles.skelLine} />
                      <span className={`${styles.skelLine} ${styles.skelShort}`} />
                    </li>
                  ))}
                </ul>
              )}
              <ul key={batch} className={`${styles.grid} ${loading ? styles.gridLoading : ''}`}>
                {ideas.map((idea, i) => (
                  <li
                    key={idea.name}
                    ref={watchCard}
                    data-name={idea.name}
                    className={`${styles.card} ${kept(idea.name) ? styles.cardKept : ''}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.mono} aria-hidden="true">{initials(idea.name)}</span>
                      <button
                        type="button"
                        className={`${styles.heart} ${kept(idea.name) ? styles.heartOn : ''}`}
                        onClick={() => toggleKeep(idea)}
                        aria-pressed={kept(idea.name)}
                        aria-label={kept(idea.name) ? `Remove ${idea.name} from shortlist` : `Keep ${idea.name}`}
                      >
                        <Heart size={18} />
                      </button>
                    </div>
                    <h3 className={styles.name}>
                      {idea.name}
                      {ending && <span className={styles.ending}>{ending}</span>}
                    </h3>
                    {idea.meaning || idea.why ? (
                      <p className={styles.meaning}>{idea.meaning || idea.why}</p>
                    ) : (
                      <p className={`${styles.meaning} ${styles.meaningBlank}`} aria-hidden="true">&nbsp;</p>
                    )}
                    <div className={styles.cardFoot}>
                      {orcBadge(idea.name)}
                      <button type="button" className={styles.more} onClick={() => fetchIdeas({ like: idea })} disabled={loading}>
                        More like this
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className={styles.fine}>
                “Looks free at ORC” means no close match came up in the registrar’s search. The ORC makes the final decision when you register.
              </p>
            </section>
          )}
        </div>
      </div>

      {shortlist.length > 0 && (
        <a href="#shortlist" className={styles.dock}>
          <Heart size={16} /> {shortlist.length} saved <ArrowRight size={15} />
        </a>
      )}
    </div>
  )
}
