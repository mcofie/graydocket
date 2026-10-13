import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cronAuthorised } from '@/lib/cron-auth'
import { sendSms } from '@/lib/checkout-core'
import { notify } from '@/lib/discord'
import {
  FILING_SETTING_NAME,
  REGISTERED_STATUSES,
  deadlineFor,
  filingKind,
  formatDeadline,
  isFiledNote,
  isStageReminder,
  registeredYear,
  reminderNote,
  stageNow,
  type ReminderStage,
} from '@/lib/annual-filing'

// Texts registered businesses about this year's annual return (companies) or business name renewal
// (sole proprietorships, partnerships). Called daily by cron-job.org:
//
//   GET /api/cron/annual-filing-reminders?key=<CRON_SECRET>     (or Authorization: Bearer <CRON_SECRET>)
//   add &dry=1 to see what would be sent without texting anyone
//
// The ORC sets one deadline a year (default 30 April; change it on the admin Overview page when the
// ORC announces another). Texts go 30 days before, 7 days before, on the day, and 2 weeks after if
// it still isn't marked filed. Nothing is due in the year a business registered. The first filing is
// included in the registration price, so those customers are told we'll file it, and the team is told
// how many to do.

export const maxDuration = 60

const MAX_PER_RUN = 200

const firstName = (full: string | null | undefined) => (full || '').trim().split(/\s+/)[0] || ''

function message(input: {
  name: string | null
  business: string
  kind: 'renewal' | 'annual_return'
  year: number
  deadline: string
  stage: ReminderStage
  paid: boolean
  link: string
}) {
  const hi = input.name ? `Hi ${input.name}, ` : 'Hi, '
  const what = input.kind === 'renewal' ? `${input.business}'s ${input.year} business name renewal` : `${input.business}'s ${input.year} annual return`
  const date = formatDeadline(input.deadline)
  if (input.stage === 'overdue') {
    return `${hi}${what} was due on ${date} and isn't filed yet. The ORC charges penalties for late filing. We can sort it out for you: ${input.link}`
  }
  const when = input.stage === 'due' ? 'is due today' : `is due by ${date}`
  return input.paid
    ? `${hi}${what} ${when}. It's included in your GrayDocket plan, so we'll file it for you. Check your details are up to date: ${input.link}`
    : `${hi}${what} ${when}. We can file it with the ORC for you: ${input.link}`
}

export async function GET(request: NextRequest) {
  const ok = cronAuthorised(request)
  if (ok === null) return NextResponse.json({ ok: false, error: 'CRON_SECRET is not set on the server.' }, { status: 500 })
  if (!ok) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const dryRun = ['1', 'true'].includes(request.nextUrl.searchParams.get('dry') || '')
  const admin = await createAdminClient()

  const year = new Date().getUTCFullYear()
  const { data: setting } = await admin.from('services').select('description').eq('name', FILING_SETTING_NAME).maybeSingle()
  const deadline = deadlineFor(year, (setting?.description as string | undefined) || null)
  const stage = stageNow(deadline)
  const base = { ok: true, dryRun, year, deadline, stage }
  // Outside every reminder window: nothing to do today
  if (!stage) return NextResponse.json({ ...base, checked: 0, sent: 0 })

  // Registered businesses. Small columns only (form_data holds photos).
  const { data: apps, error } = await admin
    .from('applications')
    .select('id, user_id, business_name, status, created_at, updated_at, business_types:business_type_id(name, returns_portion)')
    .in('status', REGISTERED_STATUSES)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const rows = (apps || []) as unknown as Array<{
    id: string
    user_id: string
    business_name: string | null
    status: string
    created_at: string
    updated_at: string | null
    business_types: { name: string | null; returns_portion: number | string | null } | null
  }>
  const summary = {
    checked: rows.length,
    sent: 0,
    failed: 0,
    firstFilingsToDo: 0,
    skipped: { registeredThisYear: 0, alreadyFiled: 0, alreadyReminded: 0, noPhone: 0, overLimit: 0 },
  }
  if (rows.length === 0) return NextResponse.json({ ...base, ...summary })

  const [{ data: history }, { data: people }] = await Promise.all([
    admin.from('application_status_history').select('application_id, status, notes, created_at').in('application_id', rows.map((r) => r.id)),
    admin.from('profiles').select('id, full_name, phone').in('id', [...new Set(rows.map((r) => r.user_id))]),
  ])
  const historyFor = new Map<string, Array<{ status: string | null; notes: string | null; created_at: string }>>()
  for (const h of history || []) {
    const list = historyFor.get(h.application_id) || []
    list.push(h)
    historyFor.set(h.application_id, list)
  }
  const personFor = new Map((people || []).map((p) => [p.id as string, p as { full_name: string | null; phone: string | null }]))
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com').replace(/\/$/, '')
  const results: Array<{ application: string; outcome: 'sent' | 'failed' | 'would send'; firstFiling: boolean }> = []

  for (const app of rows) {
    const appHistory = historyFor.get(app.id) || []
    const regYear = registeredYear(app, appHistory)
    if (regYear === null || regYear >= year) { summary.skipped.registeredThisYear++; continue }
    if (appHistory.some((h) => isFiledNote(h.notes, year))) { summary.skipped.alreadyFiled++; continue }
    if (appHistory.some((h) => isStageReminder(h.notes, year, stage))) { summary.skipped.alreadyReminded++; continue }

    const kind = filingKind(app.business_types?.name)
    const paid = regYear === year - 1 && Number(app.business_types?.returns_portion) > 0
    if (paid) summary.firstFilingsToDo++

    const person = personFor.get(app.user_id)
    if (!person?.phone) { summary.skipped.noPhone++; continue }
    if (summary.sent + summary.failed >= MAX_PER_RUN) { summary.skipped.overLimit++; continue }

    const text = message({
      name: firstName(person.full_name),
      business: (app.business_name || '').trim() || 'Your business',
      kind,
      year,
      deadline,
      stage,
      paid,
      link: `${appUrl}/dashboard/applications/${app.id}`,
    })

    if (dryRun) { results.push({ application: app.id, outcome: 'would send', firstFiling: paid }); continue }

    const delivered = await sendSms(person.phone, text)
    if (!delivered) { summary.failed++; results.push({ application: app.id, outcome: 'failed', firstFiling: paid }); continue }
    summary.sent++
    results.push({ application: app.id, outcome: 'sent', firstFiling: paid })
    await admin.from('application_status_history').insert({
      application_id: app.id,
      status: app.status,
      notes: reminderNote(kind, year, stage),
      updated_by: null,
    })
  }

  if (!dryRun && (summary.sent > 0 || summary.failed > 0)) {
    notify({
      channel: 'team',
      title: `🗓️ ${year} filing reminders sent · ${summary.sent}`,
      summary:
        summary.firstFilingsToDo > 0
          ? `${summary.firstFilingsToDo} of these are first filings already paid for: the team needs to file them by ${formatDeadline(deadline)}.`
          : `Customers were reminded about annual returns and renewals due by ${formatDeadline(deadline)}.`,
      link: '/admin/applications?queue=done',
      fields: [
        ['Texted', summary.sent],
        ['Failed', summary.failed || null],
        ['First filings to do', summary.firstFilingsToDo || null],
        ['Stage', stage],
      ],
    })
  }

  // Application ids only: no names or phone numbers leave the server
  return NextResponse.json({ ...base, ...summary, results })
}
