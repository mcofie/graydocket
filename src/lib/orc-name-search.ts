// Server-side ORC business name search, tuned for speed.
//
// The ORC site needs a CSRF token and session cookie before it answers a search. Fetching
// those costs a full page load, so we keep one session and reuse it for every search,
// refreshing only when it expires or the ORC rejects it. Results are cached briefly, and
// identical searches already in flight share one request.

const ORC_BASE = 'https://rgdonline.gegov.gov.gh/orc-app/'
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const SESSION_TTL_MS = 10 * 60 * 1000
const RESULT_TTL_MS = 10 * 60 * 1000
const MAX_CACHED_RESULTS = 500
const PAGE_TIMEOUT_MS = 5000
const SEARCH_TIMEOUT_MS = 6000

export type OrcNameResult = {
  available: boolean
  matches?: Array<{ name: string; type: string }>
  error?: string | null
  message?: string
}

type OrcSession = { csrf: string; cookie: string; expires: number }

let session: OrcSession | null = null
let sessionInFlight: Promise<OrcSession> | null = null
const results = new Map<string, { result: OrcNameResult; at: number }>()
const searchesInFlight = new Map<string, Promise<OrcNameResult>>()

const UNREACHABLE: OrcNameResult = {
  available: true,
  error: 'unreachable',
  message:
    'Unable to verify name availability via ORC database at this time. We will verify this manually during processing.',
}

/** Same name, regardless of case or extra spaces, hits the same cache entry */
function normalise(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

async function loadSession(): Promise<OrcSession> {
  const res = await fetchWithTimeout(ORC_BASE, { headers: { 'User-Agent': USER_AGENT } }, PAGE_TIMEOUT_MS)
  if (!res.ok) throw new Error(`ORC page load failed: ${res.status}`)
  const html = await res.text()
  const csrf = (html.match(/name="_csrf"\s+value="([^"]+)"/) || html.match(/value="([^"]+)"\s+name="_csrf"/))?.[1]
  if (!csrf) throw new Error('CSRF token not found in ORC page')
  const setCookie = res.headers.get('set-cookie') ?? ''
  const cookie = setCookie
    .split(',')
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
  return { csrf, cookie, expires: Date.now() + SESSION_TTL_MS }
}

/** A valid ORC session, reusing the current one and sharing a single refresh between callers */
async function getSession(forceRefresh = false): Promise<OrcSession> {
  if (!forceRefresh && session && session.expires > Date.now()) return session
  if (!sessionInFlight) {
    sessionInFlight = loadSession()
      .then((s) => (session = s))
      .finally(() => {
        sessionInFlight = null
      })
  }
  return sessionInFlight
}

/** Start an ORC session early (e.g. when the name field is focused) so the first search skips it */
export async function warmOrcSession() {
  try {
    await getSession()
  } catch {
    // Warming is best-effort; the search itself will retry
  }
}

function parseResults(html: string): OrcNameResult {
  const matches: Array<{ name: string; type: string }> = []
  const rowRegex = /<tr[^>]*data-bizname="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/gi
  let row
  while ((row = rowRegex.exec(html)) !== null) {
    const name = row[1]
    const type = row[2].match(/<span>([\s\S]*?)<\/span>/i)?.[1].trim() || 'Unknown Type'
    if (!matches.some((m) => m.name === name)) matches.push({ name, type })
  }
  return { available: html.includes('No data found'), matches: matches.slice(0, 5), error: null }
}

async function postSearch(name: string, s: OrcSession) {
  const body = new URLSearchParams({ _csrf: s.csrf, bizName: name, searchType: 'cn' })
  return fetchWithTimeout(
    `${ORC_BASE}search-for-name`,
    {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: s.cookie,
        'HX-Request': 'true',
        'HX-Trigger': 'saveRequest',
        'HX-Target': 'search-results',
        'HX-Current-URL': ORC_BASE,
      },
      body: body.toString(),
    },
    SEARCH_TIMEOUT_MS
  )
}

/** A real ORC answer either says "No data found" or lists matching rows */
function looksLikeResults(html: string) {
  return html.includes('No data found') || html.includes('data-bizname')
}

async function runSearch(name: string): Promise<OrcNameResult> {
  try {
    let res = await postSearch(name, await getSession())
    let html = res.ok ? await res.text() : ''

    // Expired or rejected session: refresh once and try again
    if (!res.ok || !looksLikeResults(html)) {
      res = await postSearch(name, await getSession(true))
      html = res.ok ? await res.text() : ''
      if (!res.ok || !looksLikeResults(html)) throw new Error(`ORC search failed: ${res.status}`)
    }

    return parseResults(html)
  } catch (err) {
    console.error('[ORC Name Search Error]', err instanceof Error ? err.message : err)
    return UNREACHABLE
  }
}

/** Check a business name against the ORC register, using the cache when we can */
export async function searchOrcName(rawName: string): Promise<OrcNameResult> {
  const name = rawName.trim().replace(/\s+/g, ' ')
  if (name.length < 3) return { available: true, message: 'Name too short' }

  const key = normalise(name)
  const cached = results.get(key)
  if (cached && Date.now() - cached.at < RESULT_TTL_MS) return cached.result

  const pending = searchesInFlight.get(key)
  if (pending) return pending

  const search = runSearch(name).then((result) => {
    // Only cache real answers, so a temporary outage doesn't stick
    if (!result.error) {
      results.set(key, { result, at: Date.now() })
      if (results.size > MAX_CACHED_RESULTS) results.delete(results.keys().next().value as string)
    }
    return result
  })
  searchesInFlight.set(key, search)
  try {
    return await search
  } finally {
    searchesInFlight.delete(key)
  }
}
