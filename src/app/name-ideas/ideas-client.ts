import type { NameIdea } from '@/lib/name-ideas'

// Talking to /api/name-ideas from the browser: the page picks up a short-lived signed pass first,
// and renews it once if it has expired. Shared by the name finder and the quiz's name step.

export type IdeasReply = { names?: NameIdea[]; error?: string; renew?: boolean; challenge?: boolean; source?: string }

let pass: string | null = null
let siteKey: string | null = null

/** Cloudflare Turnstile site key, once known (null when Turnstile isn't set up) */
export const turnstileKey = () => siteKey

async function getPass(renew = false) {
  if (!pass || renew) {
    const res = await fetch('/api/name-ideas', { cache: 'no-store' })
    const body = (await res.json()) as { pass: string; turnstileSiteKey: string | null }
    pass = body.pass
    siteKey = body.turnstileSiteKey
  }
  return pass
}

export async function postIdeas(payload: Record<string, unknown>, signal?: AbortSignal): Promise<IdeasReply> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('/api/name-ideas', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-name-pass': await getPass(attempt > 0) },
      body: JSON.stringify(payload),
      signal,
    })
    const body = (await res.json()) as IdeasReply
    if (body.renew && attempt === 0) continue
    return body
  }
  return { error: 'Couldn’t get ideas just now. Please try again.' }
}
