import type { NextRequest } from 'next/server'
import { searchOrcName, warmOrcSession } from '@/lib/orc-name-search'
import { clientIp, overLimit } from '@/lib/shared-limits'

// A per-visitor limit, shared across instances, so the endpoint can't be used to hammer the ORC
// site. Results are cached, so normal typing stays well under it.
const WINDOW_S = 60
const MAX_REQUESTS = 40

/**
 * GET /api/name-check?name=Ama%20Kitchen            → ORC availability for a business name
 * GET /api/name-check?name=Ama%20Kitchen&from=ideas → same, at lower priority (name finder)
 * GET /api/name-check?warm=1                        → start an ORC session early (no search)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  if (params.get('warm')) {
    await warmOrcSession()
    return new Response(null, { status: 204 })
  }

  if (await overLimit(`name-check:${clientIp(request)}`, WINDOW_S, MAX_REQUESTS)) {
    return Response.json(
      { available: true, error: 'unreachable', message: 'Too many checks in a short time. Please wait a moment and try again.' },
      { status: 429 }
    )
  }

  const result = await searchOrcName(params.get('name') ?? '', { priority: params.get('from') === 'ideas' ? 'low' : 'high' })
  return Response.json(result, {
    // Let the browser reuse an answer briefly when someone retypes the same name
    headers: { 'Cache-Control': result.error ? 'no-store' : 'private, max-age=300' },
  })
}
