// Annual returns (companies) and business name renewals (sole proprietorships, partnerships).
//
// The ORC sets one deadline a year for everyone, usually 30 April, and often extends it (2026:
// moved to 30 June). Nothing is due in the year a business is registered, so the first filing
// falls in the following year. The admin can change this year's deadline on the Overview page.
//
// Filings and reminders are recorded in the application's status history, so they show in the
// admin's Activity tab. Reminder notes start with REMINDER_NOTE and stay out of the customer's timeline.

import { REMINDER_NOTE } from '@/lib/application-flow'

export const FILING_SETTING_NAME = 'ORC Filing Deadline'
const DEFAULT_MONTH_DAY = '04-30'

/** Statuses that mean the business is registered with the ORC */
export const REGISTERED_STATUSES = ['approved', 'dispatched', 'delivered', 'completed']

const DAY = 24 * 60 * 60 * 1000

export type FilingKind = 'renewal' | 'annual_return'

/** Sole proprietorships and partnerships renew their name; companies file an annual return */
export const filingKind = (typeName: string | null | undefined): FilingKind =>
  /sole|partnership|business name/i.test(typeName || '') ? 'renewal' : 'annual_return'

export const filingLabel = (kind: FilingKind) => (kind === 'renewal' ? 'business name renewal' : 'annual return')

/** The deadline for a year: the saved one if it's for that year, otherwise 30 April */
export function deadlineFor(year: number, saved: string | null | undefined): string {
  return saved && /^\d{4}-\d{2}-\d{2}$/.test(saved) && saved.startsWith(`${year}-`) ? saved : `${year}-${DEFAULT_MONTH_DAY}`
}

/** End of the deadline day in Ghana (UTC), as a timestamp */
export const deadlineEnd = (iso: string) => Date.parse(`${iso}T23:59:59Z`)

export const formatDeadline = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// History notes. Kept as plain text so they read well in Activity.
export const filedNote = (kind: FilingKind, year: number) =>
  kind === 'renewal' ? `Business name renewed for ${year}` : `Annual return filed for ${year}`
export const isFiledNote = (notes: unknown, year: number) =>
  typeof notes === 'string' && (notes === `Business name renewed for ${year}` || notes === `Annual return filed for ${year}`)

export type ReminderStage = 'month' | 'week' | 'due' | 'overdue'
const STAGE_TEXT: Record<ReminderStage, string> = {
  month: '30 days before',
  week: '7 days before',
  due: 'on the deadline',
  overdue: '2 weeks after',
}
export const reminderNote = (kind: FilingKind, year: number, stage: ReminderStage) =>
  `${REMINDER_NOTE}: ${filingLabel(kind)} ${year} (${STAGE_TEXT[stage]})`
export const isStageReminder = (notes: unknown, year: number, stage: ReminderStage) =>
  typeof notes === 'string' && notes.startsWith(REMINDER_NOTE) && notes.includes(` ${year} (${STAGE_TEXT[stage]})`)

/**
 * Which reminder, if any, is due now for a deadline. Only the latest stage reached is returned,
 * so a business added late doesn't get a burst of catch-up texts.
 */
export function stageNow(deadlineIso: string, now = Date.now()): ReminderStage | null {
  const end = deadlineEnd(deadlineIso)
  const startOfDay = end - DAY + 1000
  if (now >= end + 14 * DAY && now < end + 60 * DAY) return 'overdue'
  if (now >= startOfDay && now <= end) return 'due'
  if (now >= startOfDay - 7 * DAY && now < startOfDay) return 'week'
  if (now >= startOfDay - 30 * DAY && now < startOfDay - 7 * DAY) return 'month'
  return null
}

type HistoryRow = { status?: string | null; notes?: string | null; created_at: string }

/** The year the business was registered: when it was first marked approved/completed */
export function registeredYear(app: { status: string; updated_at?: string | null; created_at: string }, history: HistoryRow[]): number | null {
  if (!REGISTERED_STATUSES.includes(app.status)) return null
  const approvals = history
    .filter((h) => h.status && REGISTERED_STATUSES.includes(h.status))
    .map((h) => Date.parse(h.created_at))
    .filter((t) => !Number.isNaN(t))
  const when = approvals.length ? Math.min(...approvals) : Date.parse(app.updated_at || app.created_at)
  return new Date(when).getUTCFullYear()
}

/** Where a registered business stands for one filing year */
export function filingStatus(input: {
  app: { status: string; updated_at?: string | null; created_at: string }
  history: HistoryRow[]
  typeName: string | null | undefined
  savedDeadline: string | null | undefined
  year?: number
}) {
  const regYear = registeredYear(input.app, input.history)
  if (regYear === null) return null
  const kind = filingKind(input.typeName)
  // The year in question: this year, unless it was registered this year or this year is already filed
  const thisYear = input.year ?? new Date().getUTCFullYear()
  const filedThisYear = input.history.some((h) => isFiledNote(h.notes, thisYear))
  const year = regYear >= thisYear || filedThisYear ? thisYear + 1 : thisYear
  const deadline = deadlineFor(year, input.savedDeadline)
  const filed = input.history.some((h) => isFiledNote(h.notes, year))
  return {
    kind,
    label: filingLabel(kind),
    registeredYear: regYear,
    year,
    deadline,
    /** The first filing after registration, already paid for in the registration price */
    firstFiling: regYear === year - 1,
    filed,
    overdue: !filed && Date.now() > deadlineEnd(deadline),
  }
}
