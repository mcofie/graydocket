// Server-only: imported by server actions

import { cache } from 'react'
import { createAdminClient, createClient } from '@/lib/supabase/server'

/**
 * Is the signed-in user an admin? Cached for the rest of the request, so pages that make
 * several admin calls only check once.
 *
 * getClaims verifies the session token locally when the project uses signing keys (no round trip
 * to the auth server). The role comes from server-only app_metadata or the profile row, never
 * user_metadata, which users can edit themselves.
 */
export const currentAdminId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims as { sub?: string; app_metadata?: { role?: string } } | undefined
  if (!claims?.sub) return null
  if (claims.app_metadata?.role === 'admin') return claims.sub

  const admin = await createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', claims.sub).maybeSingle()
  return profile?.role === 'admin' ? claims.sub : null
})

export const isAdminRequest = async () => (await currentAdminId()) !== null
