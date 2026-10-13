import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cronAuthorised } from '@/lib/cron-auth'
import { sendSms } from '@/lib/checkout-core'
import { REMINDER_NOTE, isReminderNote } from '@/lib/application-flow'
import { notify, money } from '@/lib/discord'

// Texts customers whose application has sat unfinished in draft. Called by an external scheduler
// (cron-job.org), ideally once a day in the morning:
//
//   GET /api/cron/draft-reminders?key=<CRON_SECRET>            (or header  Authorization: Bearer <CRON_SECRET>)
//   add &dry=1 to see what would be sent without texting anyone
//
// Each draft gets at most three reminders: a day, three days and a week after the customer last
// touched it. Any edit by the customer starts the count again. Reminders are logged in the
// application's status history, so the team sees them in Activity (customers don't).

export const maxDuration = 60

const DAY = 24 * 60 * 60 * 1000
/** Wait before reminder 1, 2 and 3: counted from the last edit, then from the previous reminder */
const GAPS = [1 * DAY, 2 * DAY, 4 * DAY]
/** Never text the same draft twice inside this window, however often the scheduler calls */
const MIN_SPACING = 20 * 60 * 60 * 1000
/** Drafts untouched for longer than this are left alone */
const GIVE_UP_AFTER = 30 * DAY
/** Texts per run, so a backlog can't flood customers or the SMS budget in one go */
const MAX_PER_RUN = 100
/** A history entry this close after updated_at was probably what bumped it, not the customer */
const SAME_MOMENT = 5 * 60 * 1000


const firstName = (full: string | null | undefined) => (full || '').trim().split(/\s+/)[0] || ''

export async function GET(request: NextRequest) {
  const ok = cronAuthorised(request)
  if (ok === null) return NextResponse.json({ ok: false, error: 'CRON_SECRET is not set on the server.' }, { status: 500 })
  if (!ok) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const dryRun = ['1', 'true'].includes(request.nextUrl.searchParams.get('dry') || '')
  const now = Date.now()
  const admin = await createAdminClient()

  // Unpaid drafts last touched between a day and a month ago. Small columns only (form_data holds photos).
  const { data: drafts, error } = await admin
    .from('applications')
    .select('id, user_id, business_name, total_amount, updated_at, created_at, ready:form_data->>ready_for_payment, business_types:business_type_id(name)')
    .eq('status', 'draft')
    .neq('payment_status', 'paid')
    .lt('updated_at', new Date(now - GAPS[0]).toISOString())
    .gt('updated_at', new Date(now - GIVE_UP_AFTER).toISOString())
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const rows = (drafts || []) as unknown as Array<{
    id: string
    user_id: string
    business_name: string | null
    total_amount: number | null
    updated_at: string | null
    created_at: string
    ready: string | null
    business_types: { name: string | null } | null
  }>
  const summary = { checked: rows.length, due: 0, sent: 0, failed: 0, skipped: { notDueYet: 0, doneReminding: 0, noPhone: 0, alreadySubmitted: 0, overLimit: 0 } }
  if (rows.length === 0) return NextResponse.json({ ok: true, dryRun, ...summary })

  const ids = rows.map((r) => r.id)
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const [{ data: history }, { data: people }, { data: submitted }] = await Promise.all([
    admin.from('application_status_history').select('application_id, notes, created_at').in('application_id', ids).like('notes', `${REMINDER_NOTE}%`),
    admin.from('profiles').select('id, full_name, phone').in('id', userIds),
    // The same business already submitted under another application: no need to chase this draft
    admin.from('applications').select('user_id, business_name').in('user_id', userIds).neq('status', 'draft'),
  ])

  const remindersFor = new Map<string, number[]>()
  for (const h of history || []) {
    if (!isReminderNote(h.notes)) continue
    const list = remindersFor.get(h.application_id) || []
    list.push(Date.parse(h.created_at))
    remindersFor.set(h.application_id, list)
  }
  const personFor = new Map((people || []).map((p) => [p.id as string, p as { id: string; full_name: string | null; phone: string | null }]))
  const submittedNames = new Set((submitted || []).map((s) => `${s.user_id}|${(s.business_name || '').trim().toLowerCase()}`))
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com').replace(/\/$/, '')

  const results: Array<{ application: string; reminder: number; outcome: 'sent' | 'failed' | 'would send' }> = []

  for (const draft of rows) {
    const lastEdit = Date.parse(draft.updated_at || draft.created_at)
    // Reminders since the customer last edited; an edit starts the count again
    const sent = (remindersFor.get(draft.id) || []).filter((t) => t > lastEdit - SAME_MOMENT).sort((a, b) => a - b)
    const n = sent.length
    if (n >= GAPS.length) { summary.skipped.doneReminding++; continue }

    const from = n === 0 ? lastEdit : sent[n - 1]
    const lastAny = Math.max(0, ...(remindersFor.get(draft.id) || []))
    if (now < from + GAPS[n] || now - lastAny < MIN_SPACING) { summary.skipped.notDueYet++; continue }

    const name = (draft.business_name || '').trim()
    if (name && submittedNames.has(`${draft.user_id}|${name.toLowerCase()}`)) { summary.skipped.alreadySubmitted++; continue }

    const person = personFor.get(draft.user_id)
    if (!person?.phone) { summary.skipped.noPhone++; continue }

    summary.due++
    if (summary.sent + summary.failed >= MAX_PER_RUN) { summary.skipped.overLimit++; continue }

    const hi = firstName(person.full_name) ? `Hi ${firstName(person.full_name)}, ` : 'Hi, '
    const what = name && name !== 'Untitled Business' ? `"${name}"` : `your ${draft.business_types?.name || 'business'} registration`
    const link = `${appUrl}/dashboard/applications/${draft.id}`
    const message =
      draft.ready === 'true'
        ? `${hi}${what} is ready to send to our team. Complete payment${draft.total_amount ? ` of ${money(draft.total_amount)}` : ''} here: ${link}`
        : `${hi}${what} is saved on GrayDocket but not finished yet. Pick up where you left off: ${link}`

    if (dryRun) {
      results.push({ application: draft.id, reminder: n + 1, outcome: 'would send' })
      continue
    }

    const delivered = await sendSms(person.phone, message)
    if (!delivered) {
      summary.failed++
      results.push({ application: draft.id, reminder: n + 1, outcome: 'failed' })
      continue
    }
    summary.sent++
    results.push({ application: draft.id, reminder: n + 1, outcome: 'sent' })
    await admin.from('application_status_history').insert({
      application_id: draft.id,
      status: 'draft',
      notes: `${REMINDER_NOTE} to finish the application (${n + 1} of ${GAPS.length})`,
      updated_by: null,
    })
  }

  if (!dryRun && (summary.sent > 0 || summary.failed > 0)) {
    notify({
      channel: 'activity',
      title: `⏰ Draft reminders sent · ${summary.sent}`,
      summary: 'Customers with unfinished applications were texted a link to pick up where they left off.',
      link: '/admin/applications?queue=unpaid',
      fields: [
        ['Texted', summary.sent],
        ['Failed', summary.failed || null],
        ['Held back (limit)', summary.skipped.overLimit || null],
      ],
    })
  }

  // Application ids only: no names or phone numbers leave the server
  return NextResponse.json({ ok: true, dryRun, ...summary, results })
}
