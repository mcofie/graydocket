import type { NextRequest } from 'next/server'
import { notify, money } from '@/lib/discord'
import { createClient } from '@/lib/supabase/server'
import { businessTypes } from '@/app/dashboard/applications/new/constants'

// Browser-reported activity (things that happen without a server action, like finishing the quiz).
// Only known events with validated fields get through, and each visitor is rate limited.

const WINDOW_MS = 60 * 1000
const MAX_EVENTS = 10
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
  return entry.count > MAX_EVENTS
}

type QuizCompleted = {
  event: 'quiz_completed'
  typeId: string
  price?: number
  /** The name they checked, if any */
  name?: string
  nameAvailable?: boolean | null
  /** Logged-out marketing page or inside the dashboard */
  where?: 'public' | 'dashboard'
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  if (rateLimited(ip)) return new Response(null, { status: 429 })

  let body: QuizCompleted
  try {
    body = await request.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  if (body?.event === 'quiz_completed') {
    const type = businessTypes.find((t) => t.id === body.typeId)
    if (!type) return new Response(null, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''

    notify({
      channel: 'activity',
      title: `🧭 Quiz finished · ${type.name}`,
      summary: user ? 'A customer used the quiz to choose a business type.' : 'A visitor (not logged in) used the quiz to choose a business type.',
      user: user ? { id: user.id } : undefined,
      userLabel: 'Customer',
      fields: [
        ['Recommended', type.name],
        ['Price shown', typeof body.price === 'number' ? money(body.price) : null],
        ['Name checked', name || 'Skipped'],
        ['Name result', name ? (body.nameAvailable === true ? 'Looks available' : body.nameAvailable === false ? 'Possible conflict' : 'Not verified') : null],
        ['Where', body.where === 'dashboard' ? 'Dashboard' : 'Website'],
      ],
    })
    return new Response(null, { status: 204 })
  }

  return new Response(null, { status: 400 })
}
