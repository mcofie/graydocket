'use server'

// Read-only data for the back office. Every list is paginated and filtered in the database and selects
// only the columns it shows: form_data holds the customer's ID photos (hundreds of KB per application),
// so lists never load it. Each page gets everything it needs from one call, because server actions
// from the browser run one after another.

import { createAdminClient } from '@/lib/supabase/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { ADMIN_QUEUES } from '@/lib/application-flow'
import { signDocumentLinks } from '@/lib/document-links'
import { parseAvatarChoice, type AvatarChoice } from '@/lib/avatar'
import { FILING_SETTING_NAME, deadlineFor, filingStatus } from '@/lib/annual-filing'

export type PriceLine = { label: string; amount: number; paidTo?: 'government' | 'graydocket' }

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

/**
 * Run a read with the service client while the admin check happens alongside it, instead of first.
 * Every query here is a network round trip, so this saves one per page. Nothing is returned unless
 * the check passes. Reads only: writes must check first.
 */
async function adminRead<T>(fallback: T, read: (admin: AdminClient) => Promise<T>): Promise<T> {
  const admin = await createAdminClient()
  const [ok, result] = await Promise.all([isAdminRequest(), read(admin).catch(() => fallback)])
  return ok ? result : fallback
}

const PAGE_SIZE = 25
const clampPage = (page: unknown) => Math.max(1, Math.floor(Number(page) || 1))
const rangeFor = (page: number, size = PAGE_SIZE) => [(page - 1) * size, page * size - 1] as const

/** Make a search term safe for a PostgREST or() filter (commas and brackets are syntax) */
const cleanTerm = (term: unknown) =>
  String(term || '')
    .trim()
    .replace(/[,()*%\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80)

const LIST_COLUMNS =
  'id, business_name, tracking_id, status, payment_status, total_amount, created_at, updated_at, delivery:form_data->>delivery_method, profiles:user_id(full_name, email, phone), business_types:business_type_id(name)'

export type AdminListRow = {
  id: string
  business_name: string
  tracking_id: string | null
  status: string
  payment_status: string | null
  total_amount: number | null
  created_at: string
  updated_at: string | null
  delivery: string | null
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null
  business_types: { name: string | null } | null
}

/** Customers whose name, email or phone matches, so a search can find their applications */
async function matchingCustomerIds(admin: AdminClient, term: string) {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
    .limit(50)
  return (data || []).map((r) => r.id as string)
}

/** Applications page: one queue (or a search across all of them), a page at a time, plus queue counts */
export async function getAdminApplicationsPage(input: { queue?: string; search?: string; page?: number }) {
  const fallback = { rows: [] as AdminListRow[], total: 0, counts: {} as Record<string, number>, pageSize: PAGE_SIZE, error: 'Unauthorized' as string | null }
  return adminRead(fallback, (admin) => applicationsPage(admin, input))
}

async function applicationsPage(admin: AdminClient, input: { queue?: string; search?: string; page?: number }) {
  const page = clampPage(input.page)
  const term = cleanTerm(input.search)
  const queue = ADMIN_QUEUES.find((q) => q.id === input.queue) || ADMIN_QUEUES[0]

  let list = admin.from('applications').select(LIST_COLUMNS, { count: 'exact' })
  if (term) {
    // Searching looks across every queue
    const ids = await matchingCustomerIds(admin, term)
    const clauses = [`business_name.ilike.%${term}%`, `tracking_id.ilike.%${term}%`]
    if (ids.length) clauses.push(`user_id.in.(${ids.join(',')})`)
    list = list.or(clauses.join(','))
  } else {
    list = list.in('status', queue.statuses)
  }
  const [from, to] = rangeFor(page)

  // Queue counts from one small query (just the status column) rather than a count per queue
  const [listRes, statusRes] = await Promise.all([
    list.order('updated_at', { ascending: false, nullsFirst: false }).range(from, to),
    admin.from('applications').select('status'),
  ])
  const statuses = (statusRes.data || []).map((r) => r.status as string)

  return {
    rows: (listRes.data || []) as unknown as AdminListRow[],
    total: listRes.count || 0,
    counts: Object.fromEntries(ADMIN_QUEUES.map((q) => [q.id, statuses.filter((st) => (q.statuses as string[]).includes(st)).length])),
    pageSize: PAGE_SIZE,
    error: listRes.error?.message || null,
  }
}

export type PaymentRow = AdminListRow & { paystack_reference: string | null; price_lines: PriceLine[] | null; government: number }

const governmentPart = (lines: PriceLine[] | null | undefined) =>
  (lines || []).filter((l) => l.paidTo === 'government').reduce((n, l) => n + (Number(l.amount) || 0), 0)

/** Payments page: summary figures plus one page of paid (or awaiting) applications */
export async function getAdminPaymentsPage(input: { tab?: 'paid' | 'awaiting'; page?: number }) {
  const fallback = { rows: [] as PaymentRow[], total: 0, pageSize: PAGE_SIZE, summary: null, error: 'Unauthorized' as string | null }
  return adminRead<Awaited<ReturnType<typeof paymentsPage>> | typeof fallback>(fallback, (admin) => paymentsPage(admin, input))
}

async function paymentsPage(admin: AdminClient, input: { tab?: 'paid' | 'awaiting'; page?: number }) {
  const page = clampPage(input.page)
  const tab = input.tab === 'awaiting' ? 'awaiting' : 'paid'
  const [from, to] = rangeFor(page)

  // "Awaiting" = checkout started (reviewed and priced) but not paid
  const list = admin
    .from('applications')
    .select(`${LIST_COLUMNS}, paystack_reference, price_lines:form_data->price_lines`, { count: 'exact' })
  const filtered =
    tab === 'paid'
      ? list.eq('payment_status', 'paid')
      : list.neq('payment_status', 'paid').eq('status', 'draft').eq('form_data->>ready_for_payment', 'true')

  const [listRes, paidRes, awaitingRes] = await Promise.all([
    filtered.order('updated_at', { ascending: false, nullsFirst: false }).range(from, to),
    // Small columns only: enough for the totals
    admin.from('applications').select('total_amount, created_at, updated_at, price_lines:form_data->price_lines').eq('payment_status', 'paid'),
    admin
      .from('applications')
      .select('total_amount')
      .neq('payment_status', 'paid')
      .eq('status', 'draft')
      .eq('form_data->>ready_for_payment', 'true'),
  ])

  const paid = (paidRes.data || []) as Array<{ total_amount: number | null; created_at: string; updated_at: string | null; price_lines: PriceLine[] | null }>
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const thisMonth = paid.filter((p) => Date.parse(p.updated_at || p.created_at) >= monthStart)
  const sum = (rows: Array<{ total_amount: number | null }>) => rows.reduce((n, r) => n + (Number(r.total_amount) || 0), 0)

  return {
    rows: ((listRes.data || []) as unknown as Omit<PaymentRow, 'government'>[]).map((r) => ({ ...r, government: governmentPart(r.price_lines) })),
    total: listRes.count || 0,
    pageSize: PAGE_SIZE,
    summary: {
      monthTotal: sum(thisMonth),
      monthCount: thisMonth.length,
      monthOrc: thisMonth.reduce((n, p) => n + governmentPart(p.price_lines), 0),
      allTotal: sum(paid),
      allCount: paid.length,
      awaitingTotal: sum(awaitingRes.data || []),
      awaitingCount: (awaitingRes.data || []).length,
    },
    error: listRes.error?.message || null,
  }
}

/* ---------- Overview ---------- */

/** Overview page: queue sizes, this month's revenue and the latest activity */
export async function getAdminStats() {
  return adminRead<Awaited<ReturnType<typeof overviewStats>> | null>(null, overviewStats)
}

async function overviewStats(client: AdminClient) {
  // Counts come from small columns only; the recent list is the one query with joins
  const [{ data: apps }, { data: recent }, { count: customers }] = await Promise.all([
    client.from('applications').select('status, payment_status, total_amount, created_at, updated_at'),
    client
      .from('applications')
      .select('id, status, payment_status, total_amount, created_at, updated_at, business_name, tracking_id, profiles:user_id(full_name), business_types:business_type_id(name)')
      .neq('status', 'draft')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(8),
    // Same rule as the Users page, so the two numbers match (the Supabase project is shared)
    usersPage(client, { tab: 'customers' }).then((r) => ({ count: r.counts.customers })),
  ])

  const rows = (apps || []) as Array<{ status: string; payment_status: string; total_amount: number | null; created_at: string; updated_at: string | null }>
  const countBy = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).length

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const paidThisMonth = rows.filter((r) => r.payment_status === 'paid' && Date.parse(r.updated_at || r.created_at) >= monthStart)
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000

  return {
    queues: {
      new: countBy(['submitted']),
      inProgress: countBy(['name_search', 'under_review']),
      waiting: countBy(['on_hold']),
      finishing: countBy(['approved', 'dispatched', 'delivered']),
      completed: countBy(['completed']),
      unpaid: rows.filter((r) => r.status === 'draft' && r.payment_status !== 'paid').length,
    },
    // New paid applications nobody has started for over a day
    overdue: rows.filter((r) => r.status === 'submitted' && Date.parse(r.updated_at || r.created_at) < dayAgo).length,
    revenueThisMonth: paidThisMonth.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0),
    paidThisMonth: paidThisMonth.length,
    customers: customers || 0,
    recent: recent || [],
  }
}

/* ---------- Annual filing deadline ---------- */

/** The deadline reminders count down to this year, and whether the team set it or it's the default */
export async function getAdminFilingDeadline() {
  return adminRead({ year: new Date().getUTCFullYear(), deadline: '', saved: null as string | null }, async (admin) => {
    const { data } = await admin.from('services').select('description').eq('name', FILING_SETTING_NAME).maybeSingle()
    const saved = /^\d{4}-\d{2}-\d{2}$/.test(data?.description || '') ? (data!.description as string) : null
    const year = new Date().getUTCFullYear()
    const deadline = deadlineFor(year, saved)
    return { year, deadline, saved: saved === deadline ? saved : null }
  })
}

/* ---------- Users ---------- */

// The Supabase project is shared with other apps. Users belong to GrayDocket when their account is
// tagged app_id=graydocket, they verified a phone (only GrayDocket does that), they have an application,
// or they're an admin or partner. Reading every auth account is the slow part, so the set of tagged
// accounts is kept for a few minutes.
type AccountInfo = { avatarUrl: string | null; avatarChoice: AvatarChoice | null }
let taggedCache: { ids: Set<string>; accounts: Map<string, AccountInfo>; at: number } | null = null
const TAGGED_TTL = 5 * 60 * 1000

async function graydocketAuthIds(admin: AdminClient) {
  if (taggedCache && Date.now() - taggedCache.at < TAGGED_TTL) return taggedCache
  const ids = new Set<string>()
  // Profile photos and emoji/icon avatars are kept on the account, so collect them on the same pass
  const accounts = new Map<string, AccountInfo>()
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break
    for (const u of data.users) {
      if (u.user_metadata?.app_id === 'graydocket' || u.phone_confirmed_at) ids.add(u.id)
      // An uploaded photo, or the picture from a Google sign-in
      const url = u.user_metadata?.avatar_url || u.user_metadata?.picture
      accounts.set(u.id, {
        avatarUrl: typeof url === 'string' && /^https:\/\//.test(url) ? url : null,
        avatarChoice: parseAvatarChoice(u.user_metadata?.avatar_choice),
      })
    }
    if (data.users.length < 1000) break
  }
  taggedCache = { ids, accounts, at: Date.now() }
  return taggedCache
}

export type AdminUserRow = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  role: string | null
  is_affiliate: boolean | null
  affiliate_code: string | null
  created_at: string
  avatar_url?: string | null
  avatar_choice?: AvatarChoice | null
  /** Applications they have, drafts included */
  applications?: number
}

/** Users page: customers or admins, searched and paginated */
type UsersInput = { tab?: 'customers' | 'admins'; search?: string; page?: number; fresh?: boolean }
const noUsers = { rows: [] as AdminUserRow[], total: 0, counts: { customers: 0, admins: 0 }, pageSize: PAGE_SIZE }

export async function getAdminUsersPage(input: UsersInput) {
  return adminRead({ ...noUsers, error: 'Unauthorized' as string | null }, (admin) => usersPage(admin, input))
}

async function usersPage(admin: AdminClient, input: UsersInput) {
  const empty = noUsers
  if (input.fresh) taggedCache = null
  const page = clampPage(input.page)
  const term = cleanTerm(input.search).toLowerCase()

  const [{ data: profiles, error }, { ids: tagged, accounts }, { data: appUsers }] = await Promise.all([
    admin.from('profiles').select('id, email, full_name, phone, role, is_affiliate, affiliate_code, created_at').order('created_at', { ascending: false }),
    graydocketAuthIds(admin),
    admin.from('applications').select('user_id'),
  ])
  if (error) return { ...empty, error: error.message }

  const appCounts = new Map<string, number>()
  for (const r of appUsers || []) appCounts.set(r.user_id as string, (appCounts.get(r.user_id as string) || 0) + 1)
  const withApps = new Set(appCounts.keys())
  const ours = ((profiles || []) as AdminUserRow[]).filter(
    (u) => tagged.has(u.id) || withApps.has(u.id) || u.role === 'admin' || u.is_affiliate
  )
  const admins = ours.filter((u) => u.role === 'admin')
  const customers = ours.filter((u) => u.role !== 'admin')
  const pool = (input.tab === 'admins' ? admins : customers).filter(
    (u) => !term || [u.full_name, u.email, u.phone].some((v) => v?.toLowerCase().includes(term))
  )
  const [from] = rangeFor(page)

  return {
    rows: pool.slice(from, from + PAGE_SIZE).map((u) => ({
      ...u,
      avatar_url: accounts?.get(u.id)?.avatarUrl ?? null,
      avatar_choice: accounts?.get(u.id)?.avatarChoice ?? null,
      applications: appCounts.get(u.id) || 0,
    })),
    total: pool.length,
    counts: { customers: customers.length, admins: admins.length },
    pageSize: PAGE_SIZE,
    error: null,
  }
}

/** Customer picker for "New application": GrayDocket customers matching a name, email or phone */
export async function searchAdminCustomers(term: string) {
  return adminRead([] as AdminUserRow[], async (admin) => {
    if (!cleanTerm(term)) return []
    const res = await usersPage(admin, { tab: 'customers', search: term })
    return res.rows.slice(0, 8)
  })
}

/* ---------- One application ---------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Profile = { id: string; full_name: string | null; email: string | null; phone: string | null }

/**
 * Everything the admin application page needs, in one call and two rounds of queries:
 * the application with its history, files, price rows and team, then the people named in them.
 */
export async function getAdminApplicationView(idOrTracking: string) {
  const fallback = { application: null, businessTypes: [], team: [], error: 'Unauthorized' as string | null }
  return adminRead<Awaited<ReturnType<typeof applicationView>> | typeof fallback>(fallback, (admin) => applicationView(admin, idOrTracking.trim()))
}

async function applicationView(admin: AdminClient, key: string) {
  // Links use the id; a tracking ID needs one lookup first
  let id = key
  if (!UUID.test(key)) {
    const { data } = await admin.from('applications').select('id').eq('tracking_id', key).maybeSingle()
    if (!data) return { application: null, businessTypes: [], team: [], error: 'Application not found.' }
    id = data.id as string
  }

  const [appRes, historyRes, docsRes, typesRes, teamRes, deadlineRes] = await Promise.all([
    admin.from('applications').select('*').eq('id', id).maybeSingle(),
    admin.from('application_status_history').select('*').eq('application_id', id).order('created_at', { ascending: false }),
    admin.from('documents').select('*').eq('application_id', id),
    admin.from('business_types').select('*').order('name'),
    admin.from('profiles').select('id, full_name, email').eq('role', 'admin').order('full_name'),
    admin.from('services').select('description').eq('name', FILING_SETTING_NAME).maybeSingle(),
  ])
  const raw = appRes.data as Record<string, unknown> | null
  if (!raw) return { application: null, businessTypes: [], team: [], error: appRes.error?.message || 'Application not found.' }

  const history = (historyRes.data || []) as Array<Record<string, unknown> & { updated_by?: string | null }>
  const peopleIds = [...new Set([raw.user_id as string, ...history.map((h) => h.updated_by)].filter(Boolean))] as string[]
  // People named on it, and signed links for its files (the bucket is private), at the same time
  const [{ data: people }, signed] = await Promise.all([
    peopleIds.length
      ? admin.from('profiles').select('id, full_name, email, phone').in('id', peopleIds)
      : Promise.resolve({ data: [] as Profile[] }),
    signDocumentLinks(admin, [raw.form_data as Record<string, unknown> | null], (docsRes.data || []) as Array<{ file_url: string }>),
  ])
  const byId = new Map(((people || []) as Profile[]).map((p) => [p.id, p]))

  const team = (teamRes.data || []) as Array<{ id: string; full_name: string | null; email: string | null }>
  const businessTypes = typesRes.data || []
  const form = (raw.form_data || {}) as Record<string, unknown>
  const creator = byId.get(raw.user_id as string)

  const application = {
    ...raw,
    form_data: signed.formDatas[0],
    // Delivery is kept in form_data (there are no delivery columns)
    delivery_method: form.delivery_method ?? null,
    delivery_address: form.delivery_address ?? null,
    profiles: creator ? { full_name: creator.full_name, email: creator.email, phone: creator.phone } : null,
    assigned_admin: team.find((t) => t.id === raw.assigned_to) || null,
    business_types: businessTypes.find((t: { id: string }) => t.id === raw.business_type_id) || null,
    application_status_history: history.map((h) => {
      const who = h.updated_by ? byId.get(h.updated_by) : undefined
      return { ...h, updater: who ? { id: who.id, full_name: who.full_name } : null }
    }),
    document_rows: signed.rows,
    // Annual return / renewal for registered businesses (null until registered)
    filing: filingStatus({
      app: { status: raw.status as string, updated_at: raw.updated_at as string | null, created_at: raw.created_at as string },
      history: history as Array<{ status?: string | null; notes?: string | null; created_at: string }>,
      typeName: (businessTypes.find((t: { id: string }) => t.id === raw.business_type_id) as { name?: string } | undefined)?.name,
      savedDeadline: (deadlineRes.data?.description as string | undefined) || null,
    }),
  }

  return { application, businessTypes, team, error: null as string | null }
}

/** Pricing page: every business type row and every add-on, in one call */
export async function getAdminPricingData() {
  return adminRead({ businessTypes: [] as Record<string, unknown>[], services: [] as Record<string, unknown>[], error: 'Unauthorized' as string | null }, async (admin) => {
    const [types, services] = await Promise.all([
      admin.from('business_types').select('*').order('name'),
      admin.from('services').select('*').order('category'),
    ])
    return {
      businessTypes: (types.data || []) as Record<string, unknown>[],
      services: (services.data || []) as Record<string, unknown>[],
      error: types.error?.message || services.error?.message || null,
    }
  })
}
