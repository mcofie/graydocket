import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Only routes that need the session: protected areas and the auth pages
  // (which redirect signed-in users). Public pages skip the Supabase round trip.
  matcher: ['/dashboard/:path*', '/admin/:path*', '/auth/:path*'],
}
