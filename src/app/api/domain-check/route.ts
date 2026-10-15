import type { NextRequest } from 'next/server'
import { checkDomainsFor } from '@/lib/domain-check'

// Per-visitor limit, so the endpoint can't be used for bulk lookups against the registries
const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 15
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

/** GET /api/domain-check?name=Kente%20Studio%20Limited → whether its .com / .com.gh are registered */
export async function GET(request: NextRequest) {
  const name = (request.nextUrl.searchParams.get('name') ?? '').trim().slice(0, 120)
  if (name.length < 3) return Response.json({ domains: [], alternatives: [] })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  if (rateLimited(ip)) {
    return Response.json({ domains: [], alternatives: [], error: 'Too many checks in a short time. Please wait a moment.' }, { status: 429 })
  }

  const result = await checkDomainsFor(name)
  return Response.json(result, { headers: { 'Cache-Control': 'private, max-age=600' } })
}
