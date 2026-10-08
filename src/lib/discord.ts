// Team notifications in Discord.
//
// Every message follows one layout so the channel is easy to scan:
//   [Channel label]          ← coloured bar + small label (Accounts, Applications, Payments…)
//   Emoji + short title      ← links to the admin page when there is one
//   One-line summary
//   Key facts as fields      ← empty values are dropped
//   Footer: environment      + timestamp
//
// Sends run after the response (next/server `after`), so a slow Discord never slows a user down.

import { after } from 'next/server'

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com').replace(/\/$/, '')
const ENV_LABEL = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production' ? 'Production' : 'Development'

export type Channel = 'accounts' | 'activity' | 'applications' | 'payments' | 'partners' | 'team' | 'alerts'

const CHANNELS: Record<Channel, { label: string; color: number }> = {
  accounts: { label: 'Accounts', color: 0x4dafff },
  activity: { label: 'Activity', color: 0x94a3b8 },
  applications: { label: 'Applications', color: 0x44c67f },
  payments: { label: 'Payments', color: 0xf5b442 },
  partners: { label: 'Partners', color: 0x8b5cf6 },
  team: { label: 'Team & settings', color: 0x64748b },
  alerts: { label: 'Needs attention', color: 0xef4444 },
}

/** [label, value, inline?]. Fields with an empty value are left out. */
export type Field = [string, string | number | null | undefined | false, boolean?]

/** Who did it. Pass what you have; a bare id is looked up for a name and phone before sending. */
export type Actor = { id?: string | null; name?: string | null; phone?: string | null; email?: string | null }

type Notice = {
  channel: Channel
  title: string
  summary?: string
  fields?: Field[]
  /** Admin page (path or full URL) the title links to */
  link?: string
  user?: Actor
  /** How to label `user` (default "Customer"), e.g. "Partner" or "Team member" */
  userLabel?: string
  /** Adds the business name and tracking ID (looked up if needed) and links to the admin page */
  application?: { id: string; businessName?: string | null; trackingId?: string | null }
}

// ---------- Formatting helpers ----------

export const money = (amount: number | string | null | undefined) =>
  amount === null || amount === undefined || amount === '' ? null : `GH₵ ${Number(amount).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`

export const code = (value: string | null | undefined) => (value ? `\`${value}\`` : null)

/** +233 24 ••• 4567: enough to recognise someone without putting full numbers in chat */
export function maskPhone(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return phone
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ••• ${digits.slice(-4)}`
}

export const adminApplicationLink = (id: string | null | undefined) => (id ? `/admin/applications/${id}` : undefined)

/** "Status: review → approved" style lines for settings changes, instead of raw JSON */
export function describeChanges(changes: Record<string, unknown>) {
  const lines = Object.entries(changes)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const label = k
        .replace(/^is_/, '')
        .replace(/_/g, ' ')
        .replace(/\b(orc|tin|ssnit|gra|id)\b/gi, (w) => w.toUpperCase())
        .replace(/^\w/, (c) => c.toUpperCase())
      const value =
        typeof v === 'boolean' ? (v ? 'Yes' : 'No')
        : typeof v === 'number' && /fee|price|amount|portion/i.test(k) ? money(v)
        : typeof v === 'object' ? JSON.stringify(v)
        : String(v)
      return `• ${label}: ${value}`
    })
  return lines.join('\n') || null
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending: 'Pending',
  in_review: 'In review',
  review: 'In review',
  correction_requested: 'Correction requested',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  delivered: 'Delivered',
}

export const statusLabel = (status: string | null | undefined) =>
  status ? (STATUS_LABELS[status] ?? status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())) : null

// ---------- Sending ----------

async function resolveActor(actor: Actor | undefined) {
  if (!actor) return null
  let { name, phone, email } = actor
  if (actor.id && !name && !phone) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/server')
      const admin = await createAdminClient()
      const { data } = await admin.from('profiles').select('full_name, phone, email').eq('id', actor.id).maybeSingle()
      name = data?.full_name ?? null
      phone = data?.phone ?? null
      email = email ?? data?.email ?? null
    } catch {
      // Fall back to whatever we were given
    }
  }
  const who = name || email || (actor.id ? `User ${actor.id.slice(0, 8)}` : null)
  const contact = maskPhone(phone)
  return who ? (contact ? `${who} · ${contact}` : who) : contact
}

async function resolveApplication(app: Notice['application']) {
  if (!app) return null
  let { businessName, trackingId } = app
  let userId: string | null = null
  if (!businessName || !trackingId) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/server')
      const admin = await createAdminClient()
      const { data } = await admin.from('applications').select('business_name, tracking_id, user_id').eq('id', app.id).maybeSingle()
      businessName = businessName ?? data?.business_name ?? null
      trackingId = trackingId ?? data?.tracking_id ?? null
      userId = data?.user_id ?? null
    } catch {
      // Send with what we have
    }
  }
  return { businessName, trackingId, userId }
}

async function post(notice: Notice) {
  if (!WEBHOOK_URL) return
  const { label, color } = CHANNELS[notice.channel]
  const app = await resolveApplication(notice.application)
  // If no customer was given, the application's owner is the customer
  const who = await resolveActor(notice.user ?? (app?.userId ? { id: app.userId } : undefined))

  const appFields: Field[] = app
    ? [
        ['Business', app.businessName],
        ['Tracking ID', code(app.trackingId)],
      ]
    : []

  const fields = [...(who ? ([[notice.userLabel ?? 'Customer', who, false]] as Field[]) : []), ...appFields, ...(notice.fields ?? [])]
    .filter(([, value]) => value !== null && value !== undefined && value !== false && value !== '')
    .slice(0, 25)
    .map(([name, value, inline = true]) => ({ name, value: String(value).slice(0, 1024), inline }))

  const body = JSON.stringify({
    embeds: [
      {
        author: { name: label },
        title: notice.title.slice(0, 256),
        url: (() => {
          const link = notice.link ?? adminApplicationLink(notice.application?.id)
          return link ? (link.startsWith('http') ? link : `${APP_URL}${link}`) : undefined
        })(),
        description: notice.summary?.slice(0, 2000),
        color,
        fields,
        footer: { text: `GrayDocket · ${ENV_LABEL}` },
        timestamp: new Date().toISOString(),
      },
    ],
  })

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(5000),
      })
      if (res.status === 429 && attempt === 0) {
        // Rate limited: wait as long as Discord asks (capped), then try once more
        const retry = Number((await res.json().catch(() => ({})))?.retry_after ?? 1)
        await new Promise((r) => setTimeout(r, Math.min(retry, 5) * 1000))
        continue
      }
      if (!res.ok) console.error('Discord notification failed:', res.status, await res.text())
      return
    } catch (err) {
      console.error('Discord notification error:', err instanceof Error ? err.message : err)
      return
    }
  }
}

/** Send a team notification without holding up the request that triggered it */
export function notify(notice: Notice) {
  if (!WEBHOOK_URL) return
  try {
    after(() => post(notice))
  } catch {
    // Outside a request (scripts, tests): send directly
    void post(notice)
  }
}
