// Rate limits and a small cache that hold across every server instance, kept in Supabase
// (supabase/shared_limits.sql). If that isn't set up yet, or Supabase is slow or down, everything
// falls back to this instance's memory, so a limit or cache can weaken but never break a request.

import { createAdminClient } from '@/lib/supabase/server'

const SHARED_TIMEOUT_MS = 800
// After a failure, stay on memory for a while instead of paying for a failing call every time
const BACKOFF_MS = 5 * 60_000
let sharedDownUntil = 0

const localCounters = new Map<string, { count: number; expires: number }>()
const localCache = new Map<string, { value: unknown; expires: number }>()

function trim<T>(map: Map<string, T>) {
  if (map.size > 5000) map.clear()
}

async function shared<T>(run: (db: Awaited<ReturnType<typeof createAdminClient>>) => PromiseLike<{ data: unknown; error: unknown }>) {
  if (Date.now() < sharedDownUntil || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false as const }
  try {
    const db = await createAdminClient()
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), SHARED_TIMEOUT_MS))
    const { data, error } = await Promise.race([run(db), timeout])
    if (error) throw error
    // Now and then, clear out expired rows
    if (Math.random() < 0.005) void db.rpc('prune_shared_limits').then(() => {}, () => {})
    return { ok: true as const, data: data as T }
  } catch (err) {
    sharedDownUntil = Date.now() + BACKOFF_MS
    console.warn('Shared limits unavailable, using memory:', err instanceof Error ? err.message : (err as { message?: string })?.message ?? err)
    return { ok: false as const }
  }
}

/** Count `amount` against `key` for a fixed window; returns the total so far in that window */
export async function hitCounter(key: string, windowSeconds: number, amount = 1): Promise<number> {
  const res = await shared<number>((db) => db.rpc('hit_counter', { p_key: key, p_window_seconds: windowSeconds, p_amount: amount }))
  if (res.ok && typeof res.data === 'number') return res.data

  const now = Date.now()
  const entry = localCounters.get(key)
  if (!entry || entry.expires <= now) {
    trim(localCounters)
    localCounters.set(key, { count: amount, expires: now + windowSeconds * 1000 })
    return amount
  }
  entry.count += amount
  return entry.count
}

/** True when this hit takes `key` over `max` for the window */
export async function overLimit(key: string, windowSeconds: number, max: number) {
  return (await hitCounter(key, windowSeconds)) > max
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const local = localCache.get(key)
  if (local && local.expires > Date.now()) return local.value as T

  const res = await shared<Array<{ value: T; expires_at: string }>>((db) =>
    db.from('shared_cache').select('value, expires_at').eq('key', key).gt('expires_at', new Date().toISOString()).limit(1)
  )
  const row = res.ok ? res.data?.[0] : undefined
  if (!row) return null
  trim(localCache)
  localCache.set(key, { value: row.value, expires: Math.min(new Date(row.expires_at).getTime(), Date.now() + 5 * 60_000) })
  return row.value
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  const expires = Date.now() + ttlSeconds * 1000
  trim(localCache)
  localCache.set(key, { value, expires })
  await shared((db) => db.from('shared_cache').upsert({ key, value, expires_at: new Date(expires).toISOString() }))
}

/** The visitor's IP. Vercel sets x-real-ip itself, so it can't be spoofed there. */
export function clientIp(request: Request) {
  return (
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'local'
  )
}
