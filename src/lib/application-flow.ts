// How an application moves from payment to certificate. One place for the stages, what each is
// called (for our team and for the customer), which moves are allowed, and the obvious next step.
// Used by the admin screens, the server's status checks and the customer's dashboard.
//
//   draft → (paid) → submitted → name_search → under_review → approved → completed
//                                                                  ↘ dispatched → delivered → completed
//   Any active stage can go to on_hold (waiting on the customer), rejected or cancelled.
//   When the customer fixes what we asked for, on_hold returns to submitted.

export type AppStatus =
  | 'draft'
  | 'submitted'
  | 'name_search'
  | 'under_review'
  | 'on_hold'
  | 'approved'
  | 'dispatched'
  | 'delivered'
  | 'completed'
  | 'rejected'
  | 'cancelled'

type Tone = 'neutral' | 'blue' | 'amber' | 'green' | 'red'

type Stage = {
  /** What our team calls it */
  admin: string
  /** What the customer sees */
  customer: string
  /** One line for the customer about what's happening */
  customerNote: string
  tone: Tone
  /** The usual next move and its button label in admin */
  next?: { to: AppStatus; label: string }
  /** Every move admins may make from here */
  allowed: AppStatus[]
}

const ACTIVE_EXITS: AppStatus[] = ['on_hold', 'rejected', 'cancelled']

export const STAGES: Record<AppStatus, Stage> = {
  draft: {
    admin: 'Not paid yet',
    customer: 'Not submitted',
    customerNote: 'Finish your details and pay to send it to our team.',
    tone: 'neutral',
    allowed: ['cancelled'],
  },
  submitted: {
    admin: 'New',
    customer: 'Received',
    customerNote: 'We’ve got everything and will start shortly.',
    tone: 'blue',
    next: { to: 'name_search', label: 'Start name search' },
    allowed: ['name_search', 'under_review', ...ACTIVE_EXITS],
  },
  name_search: {
    admin: 'Name search',
    customer: 'Checking your name',
    customerNote: 'We’re confirming your business name with the ORC.',
    tone: 'blue',
    next: { to: 'under_review', label: 'Name cleared, file with ORC' },
    allowed: ['under_review', ...ACTIVE_EXITS],
  },
  under_review: {
    admin: 'Filing with ORC',
    customer: 'Filed with the ORC',
    customerNote: 'Your application is with the Registrar. We’ll update you as soon as it’s approved.',
    tone: 'blue',
    next: { to: 'approved', label: 'Mark approved' },
    allowed: ['approved', ...ACTIVE_EXITS],
  },
  on_hold: {
    admin: 'Waiting on customer',
    customer: 'Action needed',
    customerNote: 'We need something from you before we can continue.',
    tone: 'amber',
    allowed: ['submitted', 'name_search', 'under_review', 'rejected', 'cancelled'],
  },
  approved: {
    admin: 'Approved',
    customer: 'Approved',
    customerNote: 'Your business is registered. We’re preparing your documents.',
    tone: 'green',
    next: { to: 'completed', label: 'Mark completed' },
    allowed: ['completed', 'dispatched', 'cancelled'],
  },
  dispatched: {
    admin: 'Out for delivery',
    customer: 'On its way',
    customerNote: 'Your printed documents are with our courier.',
    tone: 'green',
    next: { to: 'delivered', label: 'Mark delivered' },
    allowed: ['delivered'],
  },
  delivered: {
    admin: 'Delivered',
    customer: 'Delivered',
    customerNote: 'Your documents have been delivered.',
    tone: 'green',
    next: { to: 'completed', label: 'Close application' },
    allowed: ['completed'],
  },
  completed: {
    admin: 'Completed',
    customer: 'Completed',
    customerNote: 'All done. Your documents are in your Documents tab.',
    tone: 'green',
    allowed: [],
  },
  rejected: {
    admin: 'Rejected',
    customer: 'Not approved',
    customerNote: 'The Registrar didn’t approve this application. We’ll be in touch about next steps.',
    tone: 'red',
    allowed: ['submitted'],
  },
  cancelled: {
    admin: 'Cancelled',
    customer: 'Cancelled',
    customerNote: 'This application was cancelled.',
    tone: 'neutral',
    allowed: [],
  },
}

export const isAppStatus = (s: unknown): s is AppStatus => typeof s === 'string' && s in STAGES

export const stageOf = (status: string | null | undefined) => STAGES[isAppStatus(status) ? status : 'draft']

/** Courier orders go approved → dispatched; digital ones go straight to completed */
export function nextStep(status: string | null | undefined, deliveryMethod?: string | null) {
  if (status === 'approved' && deliveryMethod === 'courier') return { to: 'dispatched' as AppStatus, label: 'Mark dispatched' }
  return stageOf(status).next
}

export function canMove(from: string | null | undefined, to: AppStatus) {
  return stageOf(from).allowed.includes(to)
}

/** The admin list's tabs: each groups the stages that need the same kind of attention */
export const ADMIN_QUEUES: Array<{ id: string; label: string; statuses: AppStatus[] }> = [
  { id: 'new', label: 'New', statuses: ['submitted'] },
  { id: 'in_progress', label: 'In progress', statuses: ['name_search', 'under_review'] },
  { id: 'waiting', label: 'Waiting on customer', statuses: ['on_hold'] },
  { id: 'finishing', label: 'Approved & delivery', statuses: ['approved', 'dispatched', 'delivered'] },
  { id: 'done', label: 'Done', statuses: ['completed', 'rejected', 'cancelled'] },
  { id: 'unpaid', label: 'Not paid yet', statuses: ['draft'] },
]

/** The customer-facing progress steps (for timelines and trackers) */
export const CUSTOMER_STEPS: Array<{ status: AppStatus; label: string }> = [
  { status: 'submitted', label: 'Received' },
  { status: 'name_search', label: 'Name checked' },
  { status: 'under_review', label: 'Filed with the ORC' },
  { status: 'approved', label: 'Approved' },
  { status: 'completed', label: 'Documents ready' },
]

/**
 * Draft reminders are logged in the status history so the team sees them in Activity. Their note
 * starts with this text; the customer's own timeline leaves them out.
 */
export const REMINDER_NOTE = 'Reminder texted'
export const isReminderNote = (notes: unknown) => typeof notes === 'string' && notes.startsWith(REMINDER_NOTE)
