'use server'

// Director invite links. A director who isn't with the applicant can fill in their own details from a
// link that expires. Each invite is kept as its own small JSON file in storage (not in the application's
// form_data, which the applicant's browser overwrites on every save), and its answers are merged into
// the application's directors when the draft is saved or paid for.
//
// The invite id is a long random value and doubles as the secret in the link:
//   /invite/<applicationId>/<inviteId>

import crypto from 'crypto'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { DOCUMENTS_BUCKET } from '@/lib/document-links'
import { sendSms } from '@/lib/checkout-core'
import { notify } from '@/lib/discord'
import { emptyPerson, type PersonEntry } from '@/app/dashboard/applications/new/constants'
import { personDisplayName, personProblems } from '@/app/dashboard/applications/new/helpers'

type InviteRecord = {
  id: string
  applicationId: string
  role: 'director'
  index: number
  name: string
  phone: string | null
  createdAt: string
  expiresAt: string
  status: 'pending' | 'completed' | 'cancelled'
  completedAt?: string
  response?: PersonEntry
}

export type InviteSummary = Omit<InviteRecord, 'applicationId'> & { url: string; expired: boolean }

const MAX_INVITES = 10
const EXPIRY_DAYS = [1, 3, 7]
const pathFor = (applicationId: string, id: string) => `invites/${applicationId}/${id}.json`
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com').replace(/\/$/, '')
const linkFor = (applicationId: string, id: string) => `${appUrl()}/invite/${applicationId}/${id}`
const isExpired = (r: InviteRecord) => Date.now() > Date.parse(r.expiresAt)
/** Applications the applicant can still change: unpaid drafts, and ones our team sent back for corrections */
const EDITABLE = ['draft', 'on_hold', 'rejected']
const isEditable = (app: { status: string; payment_status: string | null }) =>
  (app.status === 'draft' && app.payment_status !== 'paid') || (app.status !== 'draft' && EDITABLE.includes(app.status))
const validId = (v: string) => /^[A-Za-z0-9_-]{20,64}$/.test(v)
const validUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v)

type Admin = Awaited<ReturnType<typeof createAdminClient>>

async function readInvite(admin: Admin, applicationId: string, id: string): Promise<InviteRecord | null> {
  if (!validUuid(applicationId) || !validId(id)) return null
  const { data } = await admin.storage.from(DOCUMENTS_BUCKET).download(pathFor(applicationId, id))
  if (!data) return null
  try {
    return JSON.parse(await data.text()) as InviteRecord
  } catch {
    return null
  }
}

async function writeInvite(admin: Admin, record: InviteRecord) {
  const { error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(pathFor(record.applicationId, record.id), Buffer.from(JSON.stringify(record)), { contentType: 'application/json', upsert: true })
  return error?.message || null
}

/** The signed-in applicant's own application, if they can still change it */
async function ownDraft(applicationId: string) {
  if (!validUuid(applicationId)) return null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = await createAdminClient()
  const { data: app } = await admin
    .from('applications')
    .select('id, user_id, business_name, status, payment_status')
    .eq('id', applicationId)
    .maybeSingle()
  if (!app || app.user_id !== user.id || !isEditable(app)) return null
  return { admin, app, user }
}

/**
 * Mark (or unmark) a director as waiting on a link in the saved application, so the link is
 * remembered even when the form can't save (applications sent back for corrections).
 */
async function setDirectorInvite(admin: Admin, applicationId: string, index: number, patch: Partial<PersonEntry>) {
  const { data } = await admin.from('applications').select('form_data').eq('id', applicationId).maybeSingle()
  const form = (data?.form_data || {}) as Record<string, unknown>
  const nested = !Array.isArray(form.directors) && Array.isArray((form.formData as Record<string, unknown> | undefined)?.directors)
  const list = ((nested ? (form.formData as Record<string, unknown>).directors : form.directors) || []) as PersonEntry[]
  const directors = [...list]
  while (directors.length <= index) directors.push({ ...emptyPerson })
  directors[index] = { ...directors[index], ...patch }
  const next = nested ? { ...form, formData: { ...(form.formData as Record<string, unknown>), directors } } : { ...form, directors }
  await admin.from('applications').update({ form_data: next }).eq('id', applicationId)
}

const summarise = (r: InviteRecord): InviteSummary => {
  const { applicationId, ...rest } = r
  return { ...rest, url: linkFor(applicationId, r.id), expired: r.status === 'pending' && isExpired(r) }
}

/** Create a link for one director to fill in their own details */
export async function createDirectorInvite(input: {
  applicationId: string
  index: number
  firstName: string
  surname: string
  phone?: string
  expiresInDays: number
}) {
  const owner = await ownDraft(input.applicationId)
  if (!owner) return { error: 'Save your application first, then try again.' }
  const name = `${input.firstName || ''} ${input.surname || ''}`.trim()
  if (!input.firstName?.trim()) return { error: 'Enter the director’s first name.' }
  if (!Number.isInteger(input.index) || input.index < 0 || input.index > 20) return { error: 'Invalid director.' }
  const days = EXPIRY_DAYS.includes(input.expiresInDays) ? input.expiresInDays : 3
  const phone = input.phone?.trim() || null
  if (phone && phone.replace(/\D/g, '').length < 9) return { error: 'Enter a valid phone number, or leave it blank.' }

  const { data: existing } = await owner.admin.storage.from(DOCUMENTS_BUCKET).list(`invites/${owner.app.id}`, { limit: 100 })
  if ((existing?.length || 0) >= MAX_INVITES) return { error: `You can send up to ${MAX_INVITES} links per application.` }

  const record: InviteRecord = {
    id: crypto.randomBytes(24).toString('base64url'),
    applicationId: owner.app.id,
    role: 'director',
    index: input.index,
    name,
    phone,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  }
  const error = await writeInvite(owner.admin, record)
  if (error) return { error: 'Couldn’t create the link. Please try again.' }
  const [firstName, ...rest] = name.split(' ')
  await setDirectorInvite(owner.admin, owner.app.id, input.index, {
    firstName,
    surname: rest.join(' '),
    ...(phone ? { phone } : {}),
    inviteId: record.id,
    inviteMerged: false,
  })

  let texted = false
  if (phone) {
    const inviter = (owner.user.user_metadata?.full_name as string | undefined)?.split(' ')[0] || 'Someone'
    const until = new Date(record.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    texted = await sendSms(
      phone,
      `${inviter} has asked you to add your details as a director of "${owner.app.business_name}" on GrayDocket. It takes about 5 minutes: ${linkFor(owner.app.id, record.id)} (expires ${until})`
    )
  }

  return { error: null, invite: summarise(record), texted }
}

/** Every invite on the applicant's draft, with any answers (it's their own application) */
export async function getDirectorInvites(applicationId: string) {
  const owner = await ownDraft(applicationId)
  if (!owner) return { invites: [] as InviteSummary[] }
  const { data: files } = await owner.admin.storage.from(DOCUMENTS_BUCKET).list(`invites/${owner.app.id}`, { limit: 100 })
  const records = await Promise.all(
    (files || []).filter((f) => f.name.endsWith('.json')).map((f) => readInvite(owner.admin, owner.app.id, f.name.replace(/\.json$/, '')))
  )
  return { invites: records.filter((r): r is InviteRecord => Boolean(r)).map(summarise) }
}

export async function cancelDirectorInvite(applicationId: string, inviteId: string) {
  const owner = await ownDraft(applicationId)
  if (!owner) return { error: 'Not allowed.' }
  const record = await readInvite(owner.admin, owner.app.id, inviteId)
  if (!record) return { error: 'Link not found.' }
  if (record.status === 'completed') return { error: 'They’ve already filled it in.' }
  const error = await writeInvite(owner.admin, { ...record, status: 'cancelled' })
  if (!error) await setDirectorInvite(owner.admin, owner.app.id, record.index, { inviteId: undefined, inviteMerged: undefined })
  return { error }
}

/** What the invite page shows. Public: reveals only the business name and first names. */
export async function getInviteForPage(applicationId: string, inviteId: string) {
  const admin = await createAdminClient()
  const record = await readInvite(admin, applicationId, inviteId)
  if (!record) return { state: 'not_found' as const }
  const { data: app } = await admin
    .from('applications')
    .select('business_name, status, payment_status, user_id, business_types:business_type_id(name)')
    .eq('id', applicationId)
    .maybeSingle()
  if (!app) return { state: 'not_found' as const }
  const { data: owner } = await admin.from('profiles').select('full_name').eq('id', app.user_id).maybeSingle()
  const base = {
    businessName: app.business_name as string,
    typeName: (app.business_types as { name?: string } | null)?.name || 'company',
    inviter: ((owner?.full_name as string | null) || '').split(' ')[0] || 'The applicant',
    name: record.name,
    expiresAt: record.expiresAt,
  }
  if (record.status === 'completed') return { state: 'completed' as const, ...base }
  if (record.status === 'cancelled' || !isEditable(app)) return { state: 'closed' as const, ...base }
  if (isExpired(record)) return { state: 'expired' as const, ...base }
  return { state: 'open' as const, ...base }
}

/** The director sends their details back */
export async function submitDirectorInvite(applicationId: string, inviteId: string, person: PersonEntry) {
  const admin = await createAdminClient()
  const record = await readInvite(admin, applicationId, inviteId)
  if (!record) return { error: 'This link isn’t valid.' }
  if (record.status === 'completed') return { error: 'These details have already been sent.' }
  if (record.status === 'cancelled') return { error: 'This link has been cancelled. Ask the applicant for a new one.' }
  if (isExpired(record)) return { error: 'This link has expired. Ask the applicant for a new one.' }

  // Keep only known fields, then check them with the same rules as the main form (age included)
  const clean: PersonEntry = { ...emptyPerson }
  for (const key of Object.keys(emptyPerson) as Array<keyof PersonEntry>) {
    const v = (person as unknown as Record<string, unknown>)?.[key]
    if (key === 'idPhotos') clean.idPhotos = Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string' && x.startsWith('data:image/')).slice(0, 4) : []
    else if (typeof v === 'string') (clean as unknown as Record<string, unknown>)[key] = v.slice(0, 300)
  }
  const problems = personProblems(clean)
  if (Object.keys(problems).length > 0) return { error: 'Some details are missing or need checking.', problems }

  const error = await writeInvite(admin, { ...record, status: 'completed', completedAt: new Date().toISOString(), response: clean })
  if (error) return { error: 'Couldn’t save your details. Please try again.' }

  // Let the applicant know
  const { data: app } = await admin.from('applications').select('user_id, business_name').eq('id', applicationId).maybeSingle()
  if (app) {
    const { data: owner } = await admin.from('profiles').select('phone').eq('id', app.user_id).maybeSingle()
    const who = personDisplayName(clean) || record.name
    if (owner?.phone) {
      await sendSms(owner.phone, `${who} has added their director details to "${app.business_name}". Open GrayDocket to finish your application: ${appUrl()}/dashboard/applications/${applicationId}`)
    }
    notify({
      channel: 'activity',
      title: `🧾 Director details added from a link · ${app.business_name}`,
      application: { id: applicationId, businessName: app.business_name },
      user: { id: app.user_id },
    })
  }
  return { error: null }
}

/**
 * Fill directors that were sent a link with the answers that came back. Used by draft saves and
 * checkout; `pending` names anyone who hasn't filled theirs in yet.
 */
export async function applyInviteAnswers(applicationId: string | null | undefined, directors: unknown) {
  const list = Array.isArray(directors) ? (directors as PersonEntry[]) : []
  if (!applicationId || !list.some((d) => d?.inviteId && !d.inviteMerged)) return { directors: list, pending: [] as string[] }
  const admin = await createAdminClient()
  const pending: string[] = []
  const merged = await Promise.all(
    list.map(async (d) => {
      if (!d?.inviteId || d.inviteMerged) return d
      const record = await readInvite(admin, applicationId, d.inviteId)
      if (record?.status === 'completed' && record.response) return { ...record.response, inviteId: d.inviteId, inviteMerged: true }
      if (record?.status === 'pending') pending.push(record.name || 'a director')
      return d
    })
  )
  return { directors: merged, pending }
}
