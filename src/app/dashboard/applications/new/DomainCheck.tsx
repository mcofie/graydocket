'use client'

import { useEffect, useState } from 'react'
import { Check, Globe, X } from 'lucide-react'
import styles from './new.module.css'

type Status = 'available' | 'taken' | 'unknown'
type Result = { domains: Array<{ domain: string; status: Status }>; alternatives: Array<{ domain: string; status: Status }>; error?: string }

// Answers for this tab, so going back and forth doesn't ask the registries again
const answers = new Map<string, Result>()
const DEBOUNCE_MS = 900

/**
 * Website addresses for the business name: whether the .com and .com.gh are registered, with a
 * button to add one to the order (the Domain Name add-on). Shown once the business name looks free.
 */
export default function DomainCheck({
  businessName,
  enabled,
  chosen,
  onChoose,
  price,
  canChoose = true,
}: {
  businessName: string
  enabled: boolean
  chosen: string
  onChoose: (domain: string | null) => void
  price: number
  /** False once the registration is paid: show availability, but adding a domain goes through us */
  canChoose?: boolean
}) {
  const key = businessName.trim().replace(/\s+/g, ' ').toLowerCase()
  const ready = enabled && key.length >= 3
  const [latest, setLatest] = useState<{ key: string; result: Result } | null>(null)

  useEffect(() => {
    if (!ready || answers.has(key)) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/domain-check?name=${encodeURIComponent(businessName.trim())}`, { signal: controller.signal })
        const result = (await res.json()) as Result
        if (!result.error) answers.set(key, result)
        setLatest({ key, result })
      } catch {
        if (!controller.signal.aborted) setLatest({ key, result: { domains: [], alternatives: [], error: 'We couldn’t check domain names right now.' } })
      }
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [ready, key, businessName])

  if (!ready) return null
  const result = answers.get(key) ?? (latest?.key === key ? latest.result : null)
  if (result && result.domains.length === 0 && !result.error) return null

  const row = (domain: string, status: Status) => {
    const isChosen = chosen === domain
    return (
      <li key={domain} className={`${styles.domainRow} ${isChosen ? styles.domainChosen : ''}`}>
        <span className={styles.domainName}>{domain}</span>
        <span className={`${styles.domainStatus} ${styles[`domain_${status}`]}`}>
          {status === 'available' ? 'Looks available' : status === 'taken' ? 'Taken' : 'Couldn’t check'}
        </span>
        {status === 'available' && canChoose &&
          (isChosen ? (
            <button type="button" className={styles.domainRemove} onClick={() => onChoose(null)} aria-label={`Don’t register ${domain}`}>
              <Check size={14} /> Chosen <X size={13} />
            </button>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChoose(domain)}>
              Use this
            </button>
          ))}
      </li>
    )
  }

  const anyFree = result?.domains.some((d) => d.status === 'available') || (result?.alternatives.length ?? 0) > 0

  return (
    <div className={styles.domains} aria-live="polite">
      <p className={styles.domainsTitle}>
        <Globe size={15} /> Website address
      </p>
      {!result ? (
        <div className={`${styles.nameStatus} ${styles.nameChecking}`}>
          <span className={styles.spinner} />
          <span>Checking domain names…</span>
        </div>
      ) : result.error ? (
        <p className={styles.domainNote}>{result.error}</p>
      ) : (
        <>
          <ul className={styles.domainList}>{result.domains.map((d) => row(d.domain, d.status))}</ul>
          {result.alternatives.length > 0 && (
            <>
              <p className={styles.domainNote}>Those are taken. These look free:</p>
              <ul className={styles.domainList}>{result.alternatives.map((d) => row(d.domain, d.status))}</ul>
            </>
          )}
          <p className={styles.domainNote}>
            {!canChoose
              ? chosen
                ? `You picked ${chosen}. To change it, message us and we’ll sort it out.`
                : 'Your registration is already paid. To add a website address, message us and we’ll add it for you.'
              : anyFree
              ? `Adds domain registration (GH₵ ${price.toLocaleString()}). We register it after you pay, and it isn’t held for you until then.`
              : 'These are already registered. You can still register the business, or ask us about other addresses.'}
          </p>
        </>
      )}
    </div>
  )
}
