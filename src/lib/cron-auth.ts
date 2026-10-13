import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

/**
 * Checks a scheduled job's key (cron-job.org): `?key=<CRON_SECRET>` or `Authorization: Bearer <CRON_SECRET>`.
 * null when CRON_SECRET isn't configured on the server.
 */
export function cronAuthorised(request: NextRequest): boolean | null {
  const secret = process.env.CRON_SECRET
  if (!secret) return null
  const header = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const given = Buffer.from(header || request.nextUrl.searchParams.get('key') || '')
  const expected = Buffer.from(secret)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
