'use client'

import { useEffect, useState } from 'react'
import type { NameAvailability } from './NameCheck'

// Short pause after typing before we ask the ORC
const DEBOUNCE_MS = 350

// Answers for this tab, so a name checked in the quiz is instant in the form (and on retyping)
const answers = new Map<string, NameAvailability>()
let warmed = false

const normalise = (name: string) => name.trim().replace(/\s+/g, ' ')
const keyFor = (name: string) => normalise(name).toLowerCase()

/** Open an ORC session in the background (call on focus) so the first check skips that step */
export function warmNameCheck() {
  if (warmed) return
  warmed = true
  fetch('/api/name-check?warm=1').catch(() => {
    warmed = false
  })
}

/**
 * Live ORC availability for a business name. Lookups run through /api/name-check, which
 * unlike a server action doesn't queue behind other requests; typing past a name cancels
 * its lookup.
 */
export function useNameCheck(name: string) {
  const query = normalise(name)
  const key = query.toLowerCase()
  const ready = key.length >= 3
  const [latest, setLatest] = useState<{ key: string; result: NameAvailability } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!ready || answers.has(key)) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/name-check?name=${encodeURIComponent(query)}`, { signal: controller.signal })
        const result = (await res.json()) as NameAvailability
        if (!result.error) answers.set(key, result)
        setLatest({ key, result })
      } catch {
        if (controller.signal.aborted) return
        setLatest({ key, result: { available: true, error: 'unreachable' } })
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, key, ready, attempt])

  const result = !ready ? null : (answers.get(key) ?? (latest?.key === key ? latest.result : null))

  return {
    checking: ready && !result,
    result,
    retry: () => {
      answers.delete(keyFor(name))
      setLatest(null)
      setAttempt((a) => a + 1)
    },
  }
}
