import { createClient } from '@/lib/supabase/client'
import type { NameIdea } from '@/lib/name-ideas'

// The name finder shortlist: kept in this browser, and on the account once someone signs in, so it
// follows them into the registration form and onto other devices. Browser only.

const LOCAL_KEY = 'gd_name_shortlist'
// Namespaced, because the Supabase project (and its user metadata) is shared with other apps
const ACCOUNT_KEY = 'graydocket_name_shortlist'
export const SHORTLIST_MAX = 12

/** Keep only well-formed entries, newest first, no duplicates */
export function cleanShortlist(list: unknown): NameIdea[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: NameIdea[] = []
  for (const item of list) {
    if (!item || typeof item.name !== 'string') continue
    const name = item.name.replace(/\s+/g, ' ').trim().slice(0, 60)
    const key = name.toLowerCase()
    if (name.length < 3 || seen.has(key)) continue
    seen.add(key)
    out.push({
      name,
      style: typeof item.style === 'string' ? item.style.slice(0, 20) : 'own',
      meaning: typeof item.meaning === 'string' ? item.meaning.slice(0, 80) : undefined,
      why: typeof item.why === 'string' ? item.why.slice(0, 80) : undefined,
    })
    if (out.length === SHORTLIST_MAX) break
  }
  return out
}

export function readLocalShortlist(): NameIdea[] {
  try {
    return cleanShortlist(JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'))
  } catch {
    return []
  }
}

export function writeLocalShortlist(list: NameIdea[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
  } catch {}
}

/** The signed-in account's shortlist, or null when nobody is signed in */
export async function readAccountShortlist(): Promise<NameIdea[] | null> {
  try {
    const { data } = await createClient().auth.getSession()
    const user = data.session?.user
    return user ? cleanShortlist(user.user_metadata?.[ACCOUNT_KEY]) : null
  } catch {
    return null
  }
}

export async function writeAccountShortlist(list: NameIdea[]) {
  try {
    await createClient().auth.updateUser({ data: { [ACCOUNT_KEY]: cleanShortlist(list) } })
  } catch {}
}

/** Both lists together: this browser's first */
export const mergeShortlists = (...lists: NameIdea[][]) => cleanShortlist(lists.flat())
