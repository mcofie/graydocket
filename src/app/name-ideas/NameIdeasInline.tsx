'use client'

import { useRef, useState } from 'react'
import { ArrowUpRight, RefreshCw, Sparkles } from 'lucide-react'
import { INDUSTRIES, withEnding, type Industry, type NameIdea, type NameKind } from '@/lib/name-ideas'
import { postIdeas } from './ideas-client'
import styles from './inline.module.css'

// The name finder, small: for the quiz's name step. Pick what the business does, tap a name to use it.
// The step's own name check then runs on it, so nobody leaves the quiz to find a name.

export const kindForType = (typeId: string): NameKind =>
  typeId === 'limited_by_shares' ? 'company' : typeId === 'limited_by_guarantee' ? 'nonprofit' : 'sole'

export default function NameIdeasInline({ kind, current, onPick }: { kind: NameKind; current: string; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [industry, setIndustry] = useState<Industry | null>(null)
  const [names, setNames] = useState<NameIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const shown = useRef<string[]>([])
  const request = useRef<AbortController | null>(null)

  const load = async (id: Industry, fresh: boolean) => {
    if (fresh) shown.current = []
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    try {
      const body = await postIdeas({ industry: id, vibe: 'modern', kind, exclude: shown.current }, controller.signal)
      if (controller.signal.aborted) return
      if (body.names?.length) {
        setNames(body.names.slice(0, 6))
        shown.current = [...shown.current, ...body.names.map((n) => n.name)]
      } else {
        setError(body.challenge ? 'Open the full name finder for more ideas.' : body.error || 'Couldn’t get ideas just now.')
      }
    } catch {
      if (!controller.signal.aborted) setError('Couldn’t get ideas just now.')
    } finally {
      if (request.current === controller) setLoading(false)
    }
  }

  const pickIndustry = (id: Industry) => {
    setIndustry(id)
    void load(id, true)
  }

  if (!open) {
    return (
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <Sparkles size={15} /> No name yet? Get ideas
      </button>
    )
  }

  const finderHref = `/name-ideas?kind=${kind}${industry ? `&industry=${industry}` : ''}`
  const chosen = current.trim().toLowerCase()

  return (
    <section className={styles.box} aria-label="Name ideas">
      <div className={styles.head}>
        <p className={styles.title}><Sparkles size={15} /> What does your business do?</p>
        <a href={finderHref} target="_blank" rel="noopener" className={styles.full}>
          Full name finder <ArrowUpRight size={14} />
        </a>
      </div>
      <div className={styles.chips}>
        {INDUSTRIES.map((i) => (
          <button key={i.id} type="button" className={`${styles.chip} ${industry === i.id ? styles.chipOn : ''}`} aria-pressed={industry === i.id} onClick={() => pickIndustry(i.id)}>
            {i.label}
          </button>
        ))}
      </div>

      {industry && (
        <>
          <p className={styles.hint}>Tap a name to use it. We’ll check it with the ORC.</p>
          {error ? (
            <p className={styles.error}>{error}</p>
          ) : (
            <div className={`${styles.names} ${loading ? styles.loading : ''}`} aria-busy={loading}>
              {(names.length ? names : Array.from({ length: 6 }, () => null)).map((n, i) =>
                n ? (
                  <button
                    key={n.name}
                    type="button"
                    className={`${styles.name} ${withEnding(n.name, kind).toLowerCase() === chosen ? styles.nameOn : ''}`}
                    onClick={() => onPick(withEnding(n.name, kind))}
                    title={n.meaning || n.why}
                  >
                    {n.name}
                  </button>
                ) : (
                  <span key={i} className={styles.placeholder} />
                )
              )}
            </div>
          )}
          <button type="button" className={styles.more} onClick={() => load(industry, false)} disabled={loading}>
            <RefreshCw size={14} /> More names
          </button>
        </>
      )}
    </section>
  )
}
