import type { NextRequest } from 'next/server'
import { searchOrcName, warmOrcSession } from '@/lib/orc-name-search'

// A light per-visitor limit so the endpoint can't be used to hammer the ORC site.
// Results are cached, so normal typing stays well under it.
const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 40
const hits = new Map<string, { count: number; start: number }>()

function rateLimited(ip: string) {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(ip, { count: 1, start: now })
    if (hits.size > 5000) hits.clear()
    return false
  }
  entry.count += 1
  return entry.count > MAX_REQUESTS
}

/**
 * GET /api/name-check?name=Ama%20Kitchen  → ORC availability for a business name
 * GET /api/name-check?warm=1              → start an ORC session early (no search)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  if (params.get('warm')) {
    await warmOrcSession()
    return new Response(null, { status: 204 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  if (rateLimited(ip)) {
    return Response.json(
      { available: true, error: 'unreachable', message: 'Too many checks in a short time. Please wait a moment and try again.' },
      { status: 429 }
    )
  }

  const result = await searchOrcName(params.get('name') ?? '')
  return Response.json(result, {
    // Let the browser reuse an answer briefly when someone retypes the same name
    headers: { 'Cache-Control': result.error ? 'no-store' : 'private, max-age=300' },
  })
}
