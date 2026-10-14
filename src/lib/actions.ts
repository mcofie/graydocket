'use server'

import crypto from 'crypto'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatPhoneNumber } from '@/lib/sms'
import { notify, money, code, statusLabel, describeChanges, adminApplicationLink } from '@/lib/discord'
import { parseAvatarChoice, type AvatarChoice } from '@/lib/avatar'
import { canMove, isAppStatus, stageOf } from '@/lib/application-flow'
import { issuedDocuments, providedDocuments } from '@/lib/documents'
import { currentAdminId, isAdminRequest } from '@/lib/admin-auth'
import { applyInviteAnswers } from '@/lib/director-invites'
import { applicationIssues, describeIssues } from '@/app/dashboard/applications/new/validation'
import { signDocumentLinks, DOCUMENTS_BUCKET } from '@/lib/document-links'
import { FILING_SETTING_NAME, filedNote, filingKind, filingStatus, formatDeadline } from '@/lib/annual-filing'
import { finalizePaidApplication, sendSms } from '@/lib/checkout-core'
import { quoteApplication, type DbBusinessType } from '@/app/dashboard/applications/new/pricing'
import { businessTypes } from '@/app/dashboard/applications/new/constants'

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue | undefined }

type DeliveryAddress = Record<string, unknown> | null


type DraftPayload = {
  user_id: string
  business_type_id: string
  business_name: string
  status: string
  form_data: Record<string, unknown>
  total_amount: number
  updated_at: string
}

function extractPhoneFromApplication(application: any): string {
  if (!application) return ''
  
  const profiles = application.profiles
  let profilePhone = ''
  if (profiles) {
    if (Array.isArray(profiles)) {
      profilePhone = profiles[0]?.phone || ''
    } else if (typeof profiles === 'object') {
      profilePhone = profiles.phone || ''
    }
  }

  const formData = (application.form_data as Record<string, any> | null) || {}
  const nestedFormData = (formData.formData as Record<string, any> | null) || {}

  const rawPhone = profilePhone || 
                    formData.phone || 
                    formData.mobilePhone || 
                    nestedFormData.phone || 
                    nestedFormData.mobilePhone || 
                    ''
  return String(rawPhone).trim()
}

type AmountRow = {
  total_amount?: number | string | null
}

type ProfileApplicationsRow = {
  full_name?: string | null
  applications?: { id: string }[] | null
}



type ServiceMutation = {
  name?: string
  price?: number
  description?: string
  category?: string
  is_active?: boolean
}

type BusinessTypeMutation = {
  name?: string
  base_price?: number
  service_fee?: number
  orc_fee?: number
  agent_fee?: number
  returns_portion?: number
  affiliate_share_percentage?: number
  processing_timeline?: string
  description?: string
  is_active?: boolean
}

type ProfileAffiliateUpdate = {
  is_affiliate: boolean
  affiliate_code?: string | null
}

type ApplicationFormDocument = {
  url?: string
  file_url?: string
  name?: string
  title?: string
  verification_status?: string
  admin_notes?: string
  verifiedAt?: string
}

type ApplicationFormData = JsonObject & {
  mobilePhone?: string
  documents?: ApplicationFormDocument[]
  corrections?: Record<string, string>
}

async function generateUniqueAffiliateCode() {
  const adminClient = await createAdminClient()

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('affiliate_code', code)
      .maybeSingle()

    if (!existing) return code
  }

  throw new Error('Unable to generate a unique affiliate code')
}

type AffiliateCommissionContext = {
  referred_by_id: string | null
  payment_status: string | null
  business_types?: {
    agent_fee?: number | string | null
    returns_portion?: number | string | null
    affiliate_share_percentage?: number | string | null
  } | null
}

function calculateAffiliateCommissionAmount(app: AffiliateCommissionContext) {
  if (!app.referred_by_id || app.payment_status !== 'paid') return 0

  const returnsPortion = Number(app.business_types?.returns_portion || 0)
  const agentFee = Number(app.business_types?.agent_fee || 0)
  const affiliateRate = Number(app.business_types?.affiliate_share_percentage ?? 40) / 100

  if (returnsPortion > 0) {
    return returnsPortion * affiliateRate
  }

  // Types without a returns portion: the share applies to our service fee instead
  return agentFee * affiliateRate
}

export async function saveApplicationDraft(data: {
  businessTypeId: string
  businessName: string
  formData: Record<string, unknown>
  selectedAddOns: string[]
  totalAmount: number
  deliveryMethod: string
  deliveryAddress: DeliveryAddress
  step: number
}) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Debug: check if profile exists
  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profileCheck) {
    console.error(`Profile missing for user ${user.id}. Expect FK error in draft.`)
    return { error: `Profile missing. Did you register? (ID: ${user.id})` }
  }

  // Check for existing draft for this user and business type
  const { data: existingDraft } = await supabase
    .from('applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_type_id', data.businessTypeId)
    .eq('status', 'draft')
    .single()

  // Directors sent a link: fold in the details they've sent back
  const { directors: withAnswers } = await applyInviteAnswers(existingDraft?.id, data.formData.directors)

  const payload: DraftPayload = {
    user_id: user.id,
    business_type_id: data.businessTypeId,
    business_name: data.businessName || 'Untitled Business',
    status: 'draft',
    form_data: { 
      ...data.formData, 
      ...(Array.isArray(data.formData.directors) ? { directors: withAnswers } : {}),
      currentStep: data.step,
      delivery_method: data.deliveryMethod,
      delivery_address: data.deliveryAddress
    },
    total_amount: data.totalAmount,
    updated_at: new Date().toISOString()
  }

  // Fallback for direct columns if they exist
  // payload.delivery_method = data.deliveryMethod;
  // payload.delivery_address = data.deliveryAddress; // Confirmed missing in DB cache


  if (existingDraft) {
    const { error } = await supabase
      .from('applications')
      .update(payload)
      .eq('id', existingDraft.id)
    
    if (error) return { error: error.message }
    return { success: true, applicationId: existingDraft.id }
  } else {
    const trackingId = `DRAFT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    const { data: newDraft, error } = await supabase
      .from('applications')
      .insert({ ...payload, tracking_id: trackingId })
      .select()
      .single()

    if (error) return { error: error.message }
    
    // Notify on new draft
    notify({
      channel: 'activity',
      title: `📝 Registration started · ${payload.business_name || 'Unnamed business'}`,
      summary: 'A customer started a registration and saved a draft.',
      link: adminApplicationLink(newDraft.id),
      user: { id: user.id },
      fields: [
        ['Type', data.businessTypeId.replace(/_/g, ' ')],
        ['Reached step', data.step + 1],
        ['Estimated total', money(data.totalAmount)],
      ],
    })
    
    return { success: true, applicationId: newDraft.id }
  }
}

/** Delete one of the signed-in user's drafts (used by "Start over" in the registration form). */
export async function discardDraft(applicationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Only ever deletes the caller's own application, and only while it is still a draft
  const adminClient = await createAdminClient()
  const { data: removed, error } = await adminClient
    .from('applications')
    .delete()
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .select('business_name, tracking_id')

  if (error) return { error: error.message }

  if (removed && removed.length > 0) {
    notify({
      channel: 'activity',
      title: `↩️ Registration discarded · ${removed[0].business_name || 'Unnamed business'}`,
      summary: 'The customer chose “Start over” and deleted their draft.',
      user: { id: user.id },
      fields: [['Draft', code(removed[0].tracking_id)]],
    })
  }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function getLatestDraft(businessTypeId?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { draft: null }

  let query = supabase
    .from('applications')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (businessTypeId) {
    query = query.eq('business_type_id', businessTypeId)
  }

  const { data, error } = await query.single()
  return { draft: data || null, error: error?.message || null }
}

/** Every document for each of the signed-in customer's businesses (issued by us and provided by them) */
export async function getMyBusinessDocuments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { businesses: [], error: 'Not authenticated' }

  const { data: apps, error } = await supabase
    .from('applications')
    .select('id, business_name, status, tracking_id, form_data, updated_at, business_types:business_type_id (name)')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('updated_at', { ascending: false })
  if (error) return { businesses: [], error: error.message }

  const ids = (apps || []).map((a) => a.id)
  const { data: tableDocs } = ids.length
    ? await supabase.from('documents').select('id, application_id, name, file_url, document_type, uploaded_at').in('application_id', ids)
    : { data: [] }

  // The bucket is private: swap stored links for signed ones (only this customer's files, fetched above)
  const { formDatas, rows: signedRows } = await signDocumentLinks(
    await createAdminClient(),
    (apps || []).map((a) => (a.form_data || {}) as Record<string, unknown>),
    tableDocs || []
  )

  const businesses = (apps || []).map((a, i) => {
    const form = formDatas[i]
    return {
      id: a.id,
      name: a.business_name || 'Untitled business',
      status: a.status as string,
      type: (a.business_types as { name?: string } | null)?.name || 'Business registration',
      trackingId: a.tracking_id && !String(a.tracking_id).startsWith('DRAFT-') ? a.tracking_id : null,
      issued: issuedDocuments(form, signedRows.filter((d) => d.application_id === a.id)),
      provided: providedDocuments(form),
    }
  })
  return { businesses, error: null }
}

export async function getMyApplications() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { applications: [], error: 'Not authenticated' }

  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      *,
      business_types:business_type_id (name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch applications error:', error)
    return { applications: [], error: error.message }
  }

  return { applications: applications || [], error: null }
}

export async function getMyProfile() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .maybeSingle()

  // Uploaded photos are stored in auth metadata (the profiles table has no avatar column)
  const avatarUrl = typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null
  return { profile: data ? { ...data, avatar_url: avatarUrl } : { full_name: null, email: null, phone: null, avatar_url: avatarUrl }, user }
}

export async function getDashboardStats() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get application counts
  const { data: applications } = await supabase
    .from('applications')
    .select('id, status, created_at, business_name')
    .eq('user_id', user.id)

  const total = applications?.length || 0
  const completed = applications?.filter((a: { status: string }) => a.status === 'completed').length || 0
  const inProgress = applications?.filter((a: { status: string }) => ['submitted', 'name_search', 'under_review'].includes(a.status)).length || 0

  // Get document count
  const { count: documentsCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    total,
    completed,
    inProgress,
    documents: documentsCount || 0,
    hasApplications: total > 0,
    recentApplications: applications?.slice(0, 5) || [],
    profile,
    user,
  }
}

export async function getBusinessTypes() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('business_types')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Fetch business types error:', error)
    return []
  }

  return data || []
}

export async function getServices() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('category', { ascending: true })

  return { services: data || [], error: error?.message || null }
}


/**
 * GrayDocket has one staff role: admin. The role is read from the profile (or server-only
 * app_metadata), never from user_metadata, which users can change themselves.
 */
async function isAdminUser(user: { id: string; app_metadata?: Record<string, unknown> } | null | undefined) {
  if (!user) return false
  if (user.app_metadata?.role === 'admin') return true
  const adminClient = await createAdminClient()
  const { data } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return data?.role === 'admin'
}

/** Pages that show prices, refreshed whenever pricing changes */
function revalidatePricing() {
  for (const path of ['/admin/pricing', '/pricing', '/find-your-business-type', '/support', '/dashboard/choose']) revalidatePath(path)
}

async function checkIsAdmin() {
  return isAdminRequest()
}


// Affiliate partners: customers who opted in plus brands the team signs up. Profiles hold the code;
// brand details live in auth app_metadata and payout details in user_metadata (no extra columns needed).
type AffiliateMeta = { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null | undefined

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

function affiliateDetails(user: AffiliateMeta) {
  return {
    kind: user?.app_metadata?.affiliate_kind === 'brand' ? ('brand' as const) : ('customer' as const),
    contactName: str(user?.app_metadata?.affiliate_contact),
    payoutMethod: str(user?.user_metadata?.payout_method),
    payoutAddress: str(user?.user_metadata?.payout_address),
  }
}

const AFFILIATE_CODE = /^[A-Z0-9][A-Z0-9-]{2,19}$/

/** Codes are stored upper case; links and checkout normalise to match */
function cleanAffiliateCode(raw: string | null | undefined) {
  return (raw || '').trim().toUpperCase().replace(/\s+/g, '-')
}

export async function getAdminAffiliates() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { affiliates: [], error: 'Unauthorized' }

  const admin = await createAdminClient()

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, email, phone, affiliate_code, created_at')
    .eq('is_affiliate', true)
    .order('created_at', { ascending: false })

  if (error) return { affiliates: [], error: error.message }

  const ids = (profiles || []).map((p) => p.id)
  if (ids.length === 0) return { affiliates: [], error: null }

  const [{ data: commissionRows }, { data: referralRows }, users] = await Promise.all([
    admin.from('commissions').select('id, affiliate_id, application_id, amount, status, created_at').in('affiliate_id', ids),
    admin
      .from('applications')
      .select('id, referred_by_id, business_name, tracking_id, status, payment_status, total_amount, created_at')
      .in('referred_by_id', ids)
      .order('created_at', { ascending: false }),
    Promise.all(ids.map((id) => admin.auth.admin.getUserById(id).then((r) => r.data.user).catch(() => null))),
  ])

  const affiliates = (profiles || []).map((p, i) => {
    const referrals = (referralRows || [])
      .filter((r) => r.referred_by_id === p.id && r.status !== 'cancelled')
      .map((r) => ({
        id: r.id,
        businessName: r.business_name as string | null,
        trackingId: r.tracking_id as string | null,
        status: r.status as string,
        paid: r.payment_status === 'paid',
        total: Number(r.total_amount) || 0,
        createdAt: r.created_at as string,
      }))
    const commissions = (commissionRows || [])
      .filter((c) => c.affiliate_id === p.id)
      .map((c) => ({
        id: c.id as string,
        applicationId: c.application_id as string | null,
        amount: Number(c.amount) || 0,
        status: c.status as 'pending' | 'approved' | 'paid' | 'void',
        createdAt: c.created_at as string,
      }))
    return {
      id: p.id as string,
      name: (p.full_name as string | null) || 'No name',
      email: p.email as string | null,
      phone: p.phone as string | null,
      code: p.affiliate_code as string | null,
      joinedAt: p.created_at as string,
      ...affiliateDetails(users[i]),
      referrals,
      commissions,
    }
  })

  return { affiliates, error: null }
}

/** Sign up a brand (or anyone outside the app) as a partner and give them a referral code */
export async function createBrandAffiliate(input: {
  brandName: string
  contactName?: string
  email: string
  phone?: string
  code?: string
}) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const brandName = input.brandName?.trim()
  const email = input.email?.trim().toLowerCase()
  if (!brandName) return { error: 'Enter the brand’s name.' }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email for the brand.' }

  const admin = await createAdminClient()

  let affiliateCode = cleanAffiliateCode(input.code)
  if (affiliateCode) {
    if (!AFFILIATE_CODE.test(affiliateCode)) return { error: 'Codes are 3–20 letters, numbers or dashes.' }
    const { data: taken } = await admin.from('profiles').select('id').eq('affiliate_code', affiliateCode).maybeSingle()
    if (taken) return { error: `The code ${affiliateCode} is already in use.` }
  } else {
    affiliateCode = await generateUniqueAffiliateCode()
  }

  // Reuse the account if this email already has one in GrayDocket
  const { data: existingProfile } = await admin.from('profiles').select('id, is_affiliate').ilike('email', email).maybeSingle()
  let userId = existingProfile?.id as string | undefined
  if (existingProfile?.is_affiliate) return { error: 'That email already belongs to a partner.' }

  if (!userId) {
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: brandName, app_id: 'graydocket' },
      app_metadata: { affiliate_kind: 'brand', affiliate_contact: input.contactName?.trim() || null },
      password: crypto.randomBytes(24).toString('hex'),
    })
    if (authError || !created.user) return { error: authError?.message || 'Couldn’t create the partner account.' }
    userId = created.user.id
  } else {
    const { data: existing } = await admin.auth.admin.getUserById(userId)
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...(existing.user?.app_metadata || {}), affiliate_kind: 'brand', affiliate_contact: input.contactName?.trim() || null },
    })
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: brandName,
      phone: input.phone?.trim() || null,
      is_affiliate: true,
      affiliate_code: affiliateCode,
      ...(existingProfile ? {} : { role: 'user' }),
    },
    { onConflict: 'id' }
  )
  if (profileError) return { error: profileError.message }

  notify({
    channel: 'partners',
    title: `🤝 Brand partner added · ${brandName}`,
    summary: 'The team signed up a new brand partner.',
    link: '/admin/affiliates',
    user: { id: userId },
    userLabel: 'Partner',
    fields: [['Referral code', code(affiliateCode)]],
  })

  revalidatePath('/admin/affiliates')
  return { error: null, id: userId, code: affiliateCode }
}

/** Edit a partner's name, contact, code and payout details */
export async function updateAffiliatePartner(
  id: string,
  input: { name?: string; contactName?: string; phone?: string; code?: string; payoutMethod?: string; payoutAddress?: string }
) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const admin = await createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, affiliate_code').eq('id', id).eq('is_affiliate', true).maybeSingle()
  if (!profile) return { error: 'Partner not found.' }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) {
    if (!input.name.trim()) return { error: 'Name can’t be empty.' }
    updates.full_name = input.name.trim()
  }
  if (input.phone !== undefined) updates.phone = input.phone.trim() || null
  if (input.code !== undefined) {
    const next = cleanAffiliateCode(input.code)
    if (!AFFILIATE_CODE.test(next)) return { error: 'Codes are 3–20 letters, numbers or dashes.' }
    if (next !== profile.affiliate_code) {
      const { data: taken } = await admin.from('profiles').select('id').eq('affiliate_code', next).maybeSingle()
      if (taken) return { error: `The code ${next} is already in use.` }
      updates.affiliate_code = next
    }
  }
  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from('profiles').update(updates).eq('id', id)
    if (error) return { error: error.message }
  }

  if (input.contactName !== undefined || input.payoutMethod !== undefined || input.payoutAddress !== undefined) {
    const { data } = await admin.auth.admin.getUserById(id)
    const user = data.user
    const { error } = await admin.auth.admin.updateUserById(id, {
      ...(input.contactName !== undefined
        ? { app_metadata: { ...(user?.app_metadata || {}), affiliate_contact: input.contactName.trim() || null } }
        : {}),
      ...(input.payoutMethod !== undefined || input.payoutAddress !== undefined
        ? {
            user_metadata: {
              ...(user?.user_metadata || {}),
              ...(input.payoutMethod !== undefined ? { payout_method: input.payoutMethod.trim() || null } : {}),
              ...(input.payoutAddress !== undefined ? { payout_address: input.payoutAddress.trim() || null } : {}),
            },
          }
        : {}),
    })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/affiliates')
  return { error: null }
}

export async function getBankingPartners() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('banking_partners')
    .select('*')
    .order('name', { ascending: true })

  return { partners: data || [], error: error?.message || null }
}

// Update Actions
export async function updateService(id: string, updates: ServiceMutation) {
  if (!(await checkIsAdmin())) return { error: 'Unauthorized' }
  const adminClient = await createAdminClient()
  const { data: row, error } = await adminClient.from('services').update(updates).eq('id', id).select('name').maybeSingle()
  if (!error) {
    notify({
      channel: 'team',
      title: `🏷️ ${row?.name || 'Add-on'} updated`,
      link: '/admin/pricing',
      fields: [['Changes', describeChanges(updates as Record<string, unknown>), false]],
    })
  }
  revalidatePricing()
  return { error: error?.message || null }
}

export async function updateBusinessType(id: string, updates: BusinessTypeMutation) {
  if (!(await checkIsAdmin())) return { error: 'Unauthorized' }
  const adminClient = await createAdminClient()

  // The breakdown (orc_fee + agent_fee + returns_portion) is the price. Keep the legacy columns
  // in step so older readers and the duplicate-row rule agree with it.
  const next: BusinessTypeMutation = { ...updates }
  if (updates.orc_fee !== undefined || updates.agent_fee !== undefined || updates.returns_portion !== undefined) {
    const { data: current } = await adminClient.from('business_types').select('orc_fee, agent_fee, returns_portion').eq('id', id).maybeSingle()
    const orc = Number(updates.orc_fee ?? current?.orc_fee ?? 0)
    const agent = Number(updates.agent_fee ?? current?.agent_fee ?? 0)
    const returns = Number(updates.returns_portion ?? current?.returns_portion ?? 0)
    next.base_price = orc
    next.service_fee = agent + returns
  }

  const { data: row, error } = await adminClient.from('business_types').update(next).eq('id', id).select('name').maybeSingle()
  if (!error) {
    notify({
      channel: 'team',
      title: updates.is_active === false ? `🗂️ Retired a duplicate · ${row?.name || 'business type'}` : `🏷️ Pricing updated · ${row?.name || 'business type'}`,
      link: '/admin/pricing',
      fields: [['Changes', describeChanges(updates as Record<string, unknown>), false]],
    })
  }
  revalidatePricing()
  return { error: error?.message || null }
}

export async function deleteBusinessType(id: string) {
  const isAuthorized = await checkIsAdmin()
  if (!isAuthorized) return { error: 'Unauthorized: Pricing Manager access required' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('business_types')
    .delete()
    .eq('id', id)

  if (!error) {
    notify({
      channel: 'team',
      title: '🗑️ Business type removed',
      link: '/admin/pricing',
      fields: [['Business type', id.replace(/_/g, ' ')]],
    })
  }

  revalidatePath('/admin/pricing')
  return { error: error?.message || null }
}

export async function updateApplicationStatus(id: string, status: string, adminNotes?: string) {
  const isAuthorized = await checkIsAdmin()
  if (!isAuthorized) return { error: 'Unauthorized' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // 1. Only moves the workflow allows (src/lib/application-flow.ts)
  const { data: currentApp } = await adminClient
    .from('applications')
    .select('status, payment_status')
    .eq('id', id)
    .single()

  if (!currentApp) return { error: 'Application not found.' }
  if (!isAppStatus(status)) return { error: 'Unknown status.' }
  if (currentApp.payment_status !== 'paid' && status !== 'cancelled') {
    return { error: 'This application hasn’t been paid for yet, so it can’t move forward.' }
  }
  if (!canMove(currentApp.status, status)) {
    return { error: `An application that is “${stageOf(currentApp.status).admin}” can’t move to “${stageOf(status).admin}”.` }
  }

  // 2. Update Status
  const { error: updateErr } = await adminClient
    .from('applications')
    .update({ 
      status, 
      notes: adminNotes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updateErr) return { error: updateErr.message }

  // Notify on Status Change
  notify({
    channel: 'applications',
    title: `🔄 Status changed to ${statusLabel(status)}`,
    application: { id },
    fields: [
      ['From', statusLabel(currentApp?.status)],
      ['To', statusLabel(status)],
      ['Note', adminNotes, false],
    ],
  })

  // 2. Fetch full application for history, commission, and SMS (Using Admin Client to bypass RLS)
  const { data: application } = await adminClient
    .from('applications')
    .select('*, business_types(*), profiles:user_id(phone)')
    .eq('id', id)
    .single()

  // The admin making the change (the service-role client has no session of its own)
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()

  // 3. Log to history
  await adminClient
    .from('application_status_history')
    .insert({
      application_id: id,
      status: status,
      notes: adminNotes || `Moved to ${stageOf(status).admin}`,
      updated_by: user?.id
    })

  // 4. ---- Premium status-aware SMS Notification via Zend ----
  if (application && process.env.ZEND_API_KEY) {
    // Normalize phone number
    const rawPhone = extractPhoneFromApplication(application)
    const phoneNumber = formatPhoneNumber(rawPhone)

    if (phoneNumber && phoneNumber.startsWith('+') && phoneNumber.length > 8) {
      const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'}/track/${application.tracking_id}`
      let message = `GrayDocket: Your application for "${application.business_name}" is being processed. Track: ${trackingLink}`

      if (adminNotes) {
         message = `GrayDocket Update [${status.replace('_', ' ').toUpperCase()}]: ${adminNotes}. Track: ${trackingLink}`
      } else {
        switch (status) {
          case 'name_search':
            message = `Official Update: We've initiated the Name Search at ORC for "${application.business_name}". We'll alert you once reserved. Track: ${trackingLink}`
            break
          case 'under_review':
            message = `Progress Update: Your GrayDocket file for "${application.business_name}" is now undergoing specialist review. Track: ${trackingLink}`
            break
          case 'approved':
            message = `Great News! Your business name "${application.business_name}" has been approved. Finalizing your official certificate now. Track: ${trackingLink}`
            break
          case 'dispatched':
            message = `Your GrayDocket registration certificate has been dispatched! It is on its way to your delivery address. Track: ${trackingLink}`
            break
          case 'completed':
            message = `Congratulations! Your business registration for "${application.business_name}" is complete. Log in to download your certificates. Track: ${trackingLink}`
            break
          case 'rejected':
            message = `Urgent GrayDocket Alert: There is an issue with your application. Please log in or check status for details: ${trackingLink}`
            break
        }
      }
      
      try {
        const response = await fetch('https://api.tryzend.com/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ZEND_API_KEY as string,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: phoneNumber,
            body: message,
            preferred_channels: ['sms'],
            sender_id: 'GrayDocket'
          })
        })
        
        if (!response.ok) {
           const errData = await response.json().catch(() => ({}))
           console.error('Zend SMS failed:', response.status, errData)
        }
      } catch (err) {
        console.error('Failed to send progress SMS:', err)
      }
    } else {
       console.warn('Skipping SMS: No phone number found for application', id)
    }
  }

  // ---- Ensure commission ledger exists for referred paid applications ----
  if (status === 'completed' && application?.referred_by_id) {
    await processAffiliateCommission(id)
  }

  revalidatePath(`/admin/applications/${id}`)
  revalidatePath('/admin/applications')
  revalidatePath('/dashboard')
  return { error: null }
}

export async function sendDirectSmsToApplicant(id: string, customMessage: string) {
  const isAuthorized = await checkIsAdmin()
  if (!isAuthorized) return { error: 'Unauthorized: Admin access required' }
  
  if (!customMessage || customMessage.trim() === '') {
     return { error: 'Message cannot be empty.' }
  }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  const { data: application } = await adminClient
    .from('applications')
    .select('*, profiles:user_id(phone)')
    .eq('id', id)
    .single()

  if (!application) return { error: 'Application not found' }

  if (process.env.ZEND_API_KEY) {
    const rawPhone = extractPhoneFromApplication(application)
    const phoneNumber = formatPhoneNumber(rawPhone)

    if (phoneNumber && phoneNumber.startsWith('+') && phoneNumber.length > 8) {
      try {
        const response = await fetch('https://api.tryzend.com/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ZEND_API_KEY as string,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: phoneNumber,
            body: `GrayDocket Support: ${customMessage.trim()}`,
            preferred_channels: ['sms'],
            sender_id: 'GrayDocket'
          })
        })
        
        if (!response.ok) {
           const errData = await response.json().catch(() => ({}))
           console.error('Zend SMS failed:', response.status, errData)
           return { error: 'Failed to send SMS via Zend API.' }
        }

        // Log this action
        const { data: { user } } = await adminClient.auth.getUser()
        await adminClient.from('application_status_history').insert({
          application_id: id,
          status: application.status,
          notes: `Sent manual SMS: ${customMessage}`,
          updated_by: user?.id
        })

      } catch (err) {
        console.error('Failed to send custom SMS:', err)
        return { error: 'Internal server error while sending SMS.' }
      }
    } else {
       return { error: 'No valid phone number found for this applicant.' }
    }
  } else {
    return { error: 'SMS service is not configured.' }
  }

  revalidatePath(`/admin/applications/${id}`)
  return { error: null }
}

export async function createService(service: ServiceMutation) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('services')
    .insert(service)

  revalidatePath('/admin/services')
  return { error: error?.message || null }
}

export async function deleteService(id: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)

  if (!error) {
    notify({
      channel: 'team',
      title: '🗑️ Service removed',
      link: '/admin/services',
      fields: [['Service', code(id)]],
    })
  }

  revalidatePath('/admin/services')
  return { error: error?.message || null }
}

export async function getApplicationHistory(applicationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('application_status_history')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })

  return { history: data || [], error: error?.message || null }
}






export async function getSystemFee(feeName: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('services')
    .select('price')
    .eq('name', feeName)
    .single()
  return data?.price !== undefined ? data.price : 50
}

export async function setSystemFee(feeName: string, price: number) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  
  const { data: existing } = await supabase
    .from('services')
    .select('id')
    .eq('name', feeName)
    .single()

  if (existing) {
    const { error } = await supabase.from('services').update({ price }).eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('services').insert({ 
      name: feeName, 
      price, 
      description: 'System-managed fee', 
      category: 'system' 
    })
    if (error) return { error: error.message }
    notify({
      channel: 'team',
      title: `🏷️ ${feeName} fee updated`,
      link: '/admin/pricing',
      fields: [['New price', money(price)]],
    })
  }

  revalidatePath('/admin/pricing')
  revalidatePath('/dashboard/applications/new')
  return { success: true }
}
export async function getAffiliateStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: commissions } = await supabase
    .from('commissions')
    .select(`
      id, 
      amount, 
      status, 
      created_at,
      applications:application_id (
         business_name,
         tracking_id
      )
    `)
    .eq('affiliate_id', user.id)
    .order('created_at', { ascending: false })

  const pending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0) || 0
  const approved = commissions?.filter(c => c.status === 'approved').reduce((sum, c) => sum + Number(c.amount), 0) || 0
  const earned = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0) || 0
  
  const { count: referrals } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by_id', user.id)

  return {
    pendingEarnings: pending,
    approvedEarnings: approved,
    totalEarned: earned,
    referralCount: referrals || 0,
    commissions: commissions || []
  }
}

/**
 * High-fidelity commission engine.
 * Calculates and records earnings for affiliates based on the SERVICE FEE component of a successful application.
 */
export async function processAffiliateCommission(applicationId: string) {
  const adminClient = await createAdminClient()

  // 1. Fetch application with business type context (Service Fee info)
  const { data: app, error: fetchErr } = await adminClient
    .from('applications')
    .select('id, referred_by_id, payment_status, business_types(agent_fee, returns_portion, affiliate_share_percentage)')
    .eq('id', applicationId)
    .single()

  if (fetchErr || !app || !app.referred_by_id || app.payment_status !== 'paid') {
     return { success: false, reason: 'Ineligible for commission tracking' }
  }

  // 2. Prevent duplicate accounting
  const { data: existing } = await adminClient
    .from('commissions')
    .select('id')
    .eq('application_id', applicationId)
    .maybeSingle()

  if (existing) return { success: true, reason: 'Commission already recorded' }

  // 3. Calculation Logic 
  // Institutional Standard: Dynamic % of the Net Returns Portion
  // Fallback: 20% of the Service Fee (for legacy categories)
  const commissionAmount = calculateAffiliateCommissionAmount(app as AffiliateCommissionContext)

  if (commissionAmount <= 0) return { success: false, reason: 'Zero value yield' }

  // 4. Record Ledger Entry
  const { error: insertErr } = await adminClient
    .from('commissions')
    .insert({
      affiliate_id: app.referred_by_id,
      application_id: applicationId,
      amount: commissionAmount,
      status: 'pending' // Pending administrative reconciliation
    })

  if (insertErr) {
    console.error(`Ledger failure for app ${applicationId}:`, insertErr.message)
    return { error: insertErr.message }
  }

  notify({
    channel: 'partners',
    title: `💸 Commission earned · ${money(commissionAmount)}`,
    summary: 'A referred customer paid, so their partner earned a commission.',
    application: { id: applicationId },
    fields: [['Partner', null], ['Amount', money(commissionAmount)]],
  })

  return { success: true }
}

export async function updateAffiliateCommissionStatus(
  affiliateId: string,
  fromStatus: 'pending' | 'approved',
  toStatus: 'approved' | 'paid'
) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const adminClient = await createAdminClient()

  const { data: commissions, error: fetchError } = await adminClient
    .from('commissions')
    .select('id, amount')
    .eq('affiliate_id', affiliateId)
    .eq('status', fromStatus)

  if (fetchError) return { error: fetchError.message }
  if (!commissions || commissions.length === 0) {
    return { error: `No ${fromStatus} commissions found.` }
  }

  const ids = commissions.map((commission) => commission.id)
  const totalAmount = commissions.reduce((sum, commission) => sum + Number(commission.amount), 0)

  const { error: updateError } = await adminClient
    .from('commissions')
    .update({
      status: toStatus,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (updateError) return { error: updateError.message }

  notify({
    channel: 'partners',
    title: toStatus === 'paid' ? `🏦 Partner payout sent · ${money(totalAmount)}` : `🧾 Partner payout approved · ${money(totalAmount)}`,
    link: '/admin/affiliates',
    user: { id: affiliateId },
    userLabel: 'Partner',
    fields: [
      ['Commissions', ids.length],
      ['Total', money(totalAmount)],
    ],
  })

  revalidatePath('/admin/affiliates')
  revalidatePath('/dashboard/affiliate')
  return { success: true, count: ids.length, totalAmount }
}

export async function markUserAsAffiliate(userId: string, isAffiliate: boolean) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  // Admin client: the team edits other people's profiles
  const supabase = await createAdminClient()
  
  // Generate random 6 char code if enabling
  const updates: ProfileAffiliateUpdate = { is_affiliate: isAffiliate }
  if (isAffiliate) {
    const code = await generateUniqueAffiliateCode()
    updates.affiliate_code = code
  } else {
    updates.affiliate_code = null
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  revalidatePath('/admin/users')
  revalidatePath('/admin/affiliates')
  return { error: error?.message || null }
}
export async function applyToBeAffiliate() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const code = await generateUniqueAffiliateCode()
  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_affiliate: true, 
      affiliate_code: code 
    })
    .eq('id', user.id)

  if (!error) {
    notify({
      channel: 'partners',
      title: '🤝 New partner joined',
      summary: 'A customer signed up to refer others.',
      link: '/admin/affiliates',
      user: { id: user.id },
      userLabel: 'Partner',
      fields: [['Referral code', `\`${code}\``]],
    })
  }

  revalidatePath('/dashboard/affiliate')
  return { error: error?.message || null, code }
}

export async function updatePayoutInfo(method: string, address: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (!method.trim() || !address.trim()) return { error: 'Enter where we should send your payouts.' }

  // Kept on the account (profiles has no payout columns); the admin Affiliates page reads it from here
  const { error } = await supabase.auth.updateUser({
    data: { payout_method: method.trim(), payout_address: address.trim() },
  })

  if (!error) {
    notify({
      channel: 'partners',
      title: '💳 Partner payout details updated',
      user: { id: user.id },
      userLabel: 'Partner',
      fields: [['Method', method.replace(/_/g, ' ')]],
    })
  }

  revalidatePath('/dashboard/affiliate')
  revalidatePath('/admin/affiliates')
  return { error: error?.message || null }
}

export async function getApplicationDetails(id: string) {
  const { createAdminClient, createClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()
  
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  const baseQuery = isUuid ? { id: id.trim() } : { tracking_id: id.trim() }
  
  // 1. Fetch core application (Strictly pinned to 'graydocket' schema)
  const { data: rawApp, error } = await adminClient
    .schema('graydocket')
    .from('applications')
    .select('*')
    .match(baseQuery)
    .maybeSingle()
  
  if (error) return { application: null, error: error.message }
  if (!rawApp) return { application: null, error: 'Application record not found in the graydocket registry.' }

  // 2. Authorization Check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { application: null, error: 'Unauthorized' }
  
  // Customers see their own applications; admins see all
  const isAuthorized = rawApp.user_id === user.id || (await isAdminUser(user))

  if (!isAuthorized) {
    return { application: null, error: 'Unauthorized' }
  }

  const appData = { ...rawApp }
  // Delivery is kept in form_data (there are no delivery columns); expose it where the pages expect it
  const fd = (rawApp.form_data || {}) as Record<string, unknown>
  appData.delivery_method = fd.delivery_method ?? null
  appData.delivery_address = fd.delivery_address ?? null

  // 3. Hydration (Pinned to graydocket schema based on provided SQL)
  try {
    const [
      { data: creator },
      { data: reg },
      { data: bType },
      { data: history },
      { data: dbDocs },
      savedDeadline,
    ] = await Promise.all([
      adminClient.schema('graydocket').from('profiles').select('full_name, email, phone').eq('id', appData.user_id).maybeSingle(),
      appData.assigned_to 
        ? adminClient.schema('graydocket').from('profiles').select('id, full_name').eq('id', appData.assigned_to).maybeSingle() 
        : Promise.resolve({ data: null }),
      adminClient.schema('graydocket').from('business_types').select('*').eq('id', appData.business_type_id).maybeSingle(),
      adminClient.schema('graydocket').from('application_status_history').select('*').eq('application_id', appData.id).order('created_at', { ascending: false }),
      adminClient.schema('graydocket').from('documents').select('*').eq('application_id', appData.id),
      getSavedFilingDeadline(),
    ])

    appData.profiles = creator
    appData.assigned_admin = reg
    appData.document_rows = dbDocs || []
    appData.business_types = bType
    // Annual return / renewal due for registered businesses (null until it's registered)
    appData.filing = filingStatus({
      app: { status: appData.status, updated_at: appData.updated_at, created_at: appData.created_at },
      history: history || [],
      typeName: bType?.name,
      savedDeadline,
    })

    // Timeline Updaters (Secondary Parallel Phase)
    if (history && history.length > 0) {
      const updaterIds = [...new Set(history.map(h => h.updated_by).filter(Boolean))]
      const { data: updaters } = await adminClient.schema('graydocket').from('profiles').select('id, full_name').in('id', updaterIds)
      
      const updaterMap = Object.fromEntries(updaters?.map(u => [u.id, u]) || [])
      appData.application_status_history = history.map(h => ({
        ...h,
        updater: h.updated_by ? (updaterMap[h.updated_by] || null) : null
      }))
    } else {
      appData.application_status_history = []
    }

    // Docs (Mapping SQL name/file_url to UI title/url)
    const mappedDbDocs = (dbDocs || []).map(d => ({
       id: d.id,
       title: d.name,
       url: d.file_url,
       status: d.verification_status
    }))
    
    const formDocs = ((appData.form_data as ApplicationFormData | null)?.documents) || []
    appData.documents = [
       ...mappedDbDocs,
       ...formDocs.map((d, i) => ({ 
         id: `fd-${i}`, 
         title: d.name || d.title || 'Document', 
         url: d.file_url || d.url 
       }))
    ]
  } catch (e) {
    console.error('Hydration failed:', e)
  }
    
  return { application: appData, error: null }
}

export async function updateApplicationNotes(id: string, notes: string) {
  const isAuthorized = await checkIsAdmin()
  if (!isAuthorized) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('applications')
    .update({ notes })
    .eq('id', id)

  revalidatePath(`/admin/applications/${id}`)
  return { error: error?.message || null }
}

export async function uploadApplicationDocument(id: string, formData: FormData) {
  const isAuthorized = await checkIsAdmin()
  if (!isAuthorized) return { error: 'Unauthorized' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()

  const file = formData.get('file') as File
  const title = formData.get('title') as string
  
  if (!file || !title) return { error: 'Missing file or title' }

  // Upload to 'documents' bucket
  const fileExt = file.name.split('.').pop()
  const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const filePath = `app_${id}/${safeTitle}_${Date.now()}.${fileExt}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadError } = await adminSupabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true
    })

  if (uploadError) return { error: uploadError.message }

  // Append to form_data.documents
  const { data: appData } = await adminSupabase.from('applications').select('form_data').eq('id', id).single()
  const currentFormData = appData?.form_data || {}
  const currentDocs = currentFormData.documents || []
  
  // The bucket is private: keep the path and hand out signed links when the file is shown
  currentDocs.push({
    title,
    path: filePath,
    uploadedAt: new Date().toISOString()
  })

  currentFormData.documents = currentDocs

  const { error: updateError } = await adminSupabase
    .from('applications')
    .update({ form_data: currentFormData })
    .eq('id', id)

  if (!updateError) {
    notify({
      channel: 'applications',
      title: `📁 Document added · ${title}`,
      summary: 'A document was added to the customer’s application.',
      application: { id },
    })
  }

  revalidatePath(`/admin/applications/${id}`)
  revalidatePath(`/dashboard/applications/${id}`)
  return { error: updateError?.message || null, path: filePath }
}

export async function createAdminUser(userData: { 
  email: string; 
  full_name: string; 
  phone: string;
  role: 'user' | 'admin'
}) {
  const isSuper = await checkIsAdmin()
  if (!isSuper) return { error: 'Unauthorized: Only Super Admins can create accounts manually' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // 1. Check if user already exists in Auth to decide whether to Create or Sync
  let userId: string | null = null
  const { data: { users } } = await adminClient.auth.admin.listUsers()
  const existingAuthUser = users?.find(u => u.email?.toLowerCase() === userData.email.toLowerCase())

  if (existingAuthUser) {
    userId = existingAuthUser.id
  } else {
    // 2. Create the Auth User if they don't exist
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email: userData.email,
      phone: userData.phone,
      email_confirm: true,
      user_metadata: { full_name: userData.full_name, phone: userData.phone, app_id: 'graydocket' },
      password: crypto.randomBytes(24).toString('hex')
    })

    if (authError) return { error: authError.message }
    userId = newUser.user?.id || null
  }

  if (!userId) return { error: 'Failed to retrieve or create user ID' }

  // 3. Ensure the Profile exists and has the correct role
  // We use an "upsert" approach to handle cases where the trigger might have failed or lagged
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({ 
      id: userId,
      full_name: userData.full_name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role 
    }, { onConflict: 'id' })

  if (profileError) return { error: `Profile update failed: ${profileError.message}` }

  revalidatePath('/admin/users')
  return { error: null, onboarding: 'phone_otp' }
}

export async function deleteAdminUser(id: string) {
  const sessionClient = await createClient()
  const { data: { user: me } } = await sessionClient.auth.getUser()
  if (!(await isAdminUser(me))) return { error: 'Unauthorized' }
  if (me!.id === id) return { error: 'You can’t delete your own account here.' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // 1. Delete Auth User
  const { error: authError } = await adminClient.auth.admin.deleteUser(id)
  if (authError) return { error: authError.message }

  // 2. Profile should be deleted by CASCADE if configured, but we can do it manually to be safe
  await adminClient.from('profiles').delete().eq('id', id)

  revalidatePath('/admin/users')
  return { error: null }
}

export async function updateAdminUserProfile(id: string, updates: { full_name: string, phone: string, role?: 'user' | 'admin' }) {
  const sessionClient = await createClient()
  const { data: { user: me } } = await sessionClient.auth.getUser()
  if (!(await isAdminUser(me))) return { error: 'Unauthorized' }
  // Two roles only, and nobody can remove their own admin access by accident
  if (updates.role && !['user', 'admin'].includes(updates.role)) return { error: 'Unknown role.' }
  if (me!.id === id && updates.role === 'user') return { error: 'You can’t remove your own admin access.' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  const normalizedUpdates = {
    ...updates,
    phone: formatPhoneNumber(updates.phone)
  }

  const { error } = await adminClient
    .from('profiles')
    .update(normalizedUpdates)
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/admin/users')
  return { error: null }
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

/** Upload a profile photo for the signed-in user (customers and admins alike). */
export async function uploadMyAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please log in again.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Please choose a photo.' }
  const ext = AVATAR_TYPES[file.type]
  if (!ext) return { error: 'Please use a JPG, PNG, WebP or GIF image.' }
  if (file.size > AVATAR_MAX_BYTES) return { error: 'Please choose an image under 2 MB.' }

  // Uploaded with the service role after the checks above, so storage policies can't block it.
  // Kept apart from customer documents, in the public avatars bucket under a GrayDocket folder.
  const adminClient = await createAdminClient()
  const filePath = `graydocket/${user.id}/${Date.now()}.${ext}`
  const { error: uploadError } = await adminClient.storage
    .from('avatars')
    .upload(filePath, file, { contentType: file.type, upsert: false })
  if (uploadError) return { error: 'We couldn’t upload that photo. Please try again.' }

  const { data: { publicUrl } } = adminClient.storage.from('avatars').getPublicUrl(filePath)

  // A photo replaces any emoji or icon
  const { error: metaError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl, avatar_choice: null } })
  if (metaError) return { error: metaError.message }

  revalidatePath('/dashboard/settings')
  return { error: null, avatarUrl: publicUrl }
}

export async function updateMyProfile(updates: {
  full_name?: string
  avatar_url?: null
  avatar_choice?: AvatarChoice | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const profileUpdates: { full_name?: string } = {}
  const metadataUpdates: { full_name?: string; avatar_choice?: AvatarChoice | null; avatar_url?: null } = {}

  if (updates.full_name !== undefined) {
    const fullName = updates.full_name.trim()
    if (!fullName) return { error: 'Please enter your full name.' }
    profileUpdates.full_name = fullName
    // Keep auth metadata in sync, since parts of the app read the name from there
    metadataUpdates.full_name = fullName
  }

  // Only clearing the photo is allowed here; uploads go through uploadMyAvatar
  if (updates.avatar_url === null) metadataUpdates.avatar_url = null

  if (updates.avatar_choice !== undefined) {
    if (updates.avatar_choice === null) {
      metadataUpdates.avatar_choice = null
    } else {
      const choice = parseAvatarChoice(updates.avatar_choice)
      if (!choice) return { error: 'That avatar option is not available.' }
      metadataUpdates.avatar_choice = choice
      // An emoji or icon replaces any uploaded photo
      metadataUpdates.avatar_url = null
    }
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id)
    if (profileError) return { error: profileError.message }
  }

  if (Object.keys(metadataUpdates).length > 0) {
    const { error: metaError } = await supabase.auth.updateUser({ data: metadataUpdates })
    if (metaError) return { error: metaError.message }
  }

  // Name changes are worth knowing about (they appear on filings); avatar changes aren't
  if (profileUpdates.full_name) {
    notify({
      channel: 'accounts',
      title: '✏️ Customer changed their name',
      user: { id: user.id, name: profileUpdates.full_name, phone: user.phone ? `+${user.phone.replace(/^\+/, '')}` : null },
      fields: [['Previous name', (user.user_metadata?.full_name as string | undefined) || null]],
    })
  }

  revalidatePath('/dashboard/settings')
  return { error: null }
}

export async function forceFetchProfile(userId: string) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  let { data: profile } = await adminClient
    .schema('graydocket')
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    // Fallback: Check the public schema in case the user was created before strict schema enforcement
    const { data: publicProfile } = await adminClient
      .schema('public')
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .maybeSingle()
    
    if (publicProfile) profile = publicProfile
  }

  // No profile means no staff access; never assume a role
  if (!profile) profile = { role: 'user', full_name: null }

  return profile
}

/** Give an application an owner from the admin team */
export async function assignApplication(applicationId: string, adminId: string) {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!(await isAdminUser(user))) return { error: 'Unauthorized' }

  const adminClient = await createAdminClient()
  const { data: owner } = await adminClient.from('profiles').select('id, full_name, role').eq('id', adminId).maybeSingle()
  if (!owner || owner.role !== 'admin') return { error: 'Applications can only be assigned to admins.' }

  const { data: app, error } = await adminClient
    .from('applications')
    .update({ assigned_to: adminId })
    .eq('id', applicationId)
    .select('status')
    .single()
  if (error) return { error: error.message }

  await adminClient.from('application_status_history').insert({
    application_id: applicationId,
    status: app.status,
    notes: `Assigned to ${owner.full_name || 'an admin'}`,
    updated_by: user!.id,
  })

  notify({ channel: 'applications', title: '👤 Application assigned', application: { id: applicationId }, user: { id: adminId }, userLabel: 'Assigned to' })
  revalidatePath('/admin/applications')
  revalidatePath(`/admin/applications/${applicationId}`)
  return { error: null }
}
export async function verifyDocument(applicationId: string, documentUrl: string, status: 'approved' | 'rejected', notes?: string) {
  const isAuthorized = await checkIsAdmin()
  if (!isAuthorized) return { error: 'Unauthorized' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // 1. Fetch current form data
  const { data: application, error: fetchErr } = await adminClient
    .from('applications')
    .select('form_data, business_name, tracking_id, profiles:user_id(phone)')
    .eq('id', applicationId)
    .single()

  if (fetchErr || !application) return { error: fetchErr?.message || 'Application not found' }

  const currentFormData = (application.form_data as ApplicationFormData | null) || {}
  const currentDocs = currentFormData.documents || []
  const updatedDocs = currentDocs.map((doc) => {
    if (doc.url === documentUrl) {
      return { 
        ...doc, 
        verification_status: status,
        admin_notes: notes || '',
        verifiedAt: new Date().toISOString()
      }
    }
    return doc
  })

  // 2. Save back to form_data
  const { error: updateErr } = await adminClient
    .from('applications')
    .update({ 
      form_data: { 
        ...currentFormData,
        documents: updatedDocs 
      } 
    })
    .eq('id', applicationId)

  if (updateErr) return { error: updateErr.message }

  // 3. If rejected, send an urgent SMS to the user
  if (status === 'rejected' && process.env.ZEND_API_KEY) {
    const rawPhone = extractPhoneFromApplication(application)
    const phoneNumber = formatPhoneNumber(rawPhone)

    if (phoneNumber && phoneNumber.startsWith('+')) {
      const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'}/track/${application.tracking_id}`
      const message = `GrayDocket Alert: A document in your "${application.business_name}" registration was rejected (${notes || 'Check details'}). Please log in to re-upload. Track: ${trackingLink}`
      
      try {
        const response = await fetch('https://api.tryzend.com/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ZEND_API_KEY as string,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: phoneNumber,
            body: message,
            preferred_channels: ['sms'],
            sender_id: 'GrayDocket'
          })
        })

        if (!response.ok) {
           const errData = await response.json().catch(() => ({}))
           console.error('Zend Rejection SMS failed:', response.status, errData)
        }
      } catch (err) {
        console.error('Failed to send rejection SMS:', err)
      }
    }
  }

  revalidatePath(`/admin/applications/${applicationId}`)
  return { success: true }
}

export async function getTrackingStatus(trackingId: string) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const client = await createAdminClient()

  // 1. Fetch application info
  const { data: application, error } = await client
    .from('applications')
    .select(`
      id,
      business_name,
      status,
      created_at,
      business_types ( name )
    `)
    .eq('tracking_id', trackingId)
    .single()

  if (error || !application) return { error: 'Application not found' }

  // 2. Fetch history
  const { data: history } = await client
    .from('application_status_history')
    .select('status, notes, created_at')
    .eq('application_id', application.id)
    .order('created_at', { ascending: false })

  return {
    application,
    history: history || []
  }
}

export async function requestFieldCorrection(applicationId: string, fieldKey: string, reason: string) {
  const isAuthorized = await checkIsAdmin()
  if (!isAuthorized) return { error: 'Unauthorized' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // 1. Fetch current application
  const { data: application } = await adminClient
    .from('applications')
    .select('*, profiles:user_id(phone)')
    .eq('id', applicationId)
    .single()

  if (!application) return { error: 'Application not found' }

  // 2. Update form_data with correction
  const formData = ((application.form_data as ApplicationFormData | null) || {}) as ApplicationFormData
  const corrections = formData.corrections || {}
  corrections[fieldKey] = reason
  formData.corrections = corrections

  // 3. Waiting on the customer to fix it
  const { error: updateErr } = await adminClient
    .from('applications')
    .update({ 
      form_data: formData,
      status: 'on_hold',
      updated_at: new Date().toISOString()
    })
    .eq('id', applicationId)

  if (updateErr) return { error: updateErr.message }

  // Notify on correction request
  notify({
    channel: 'applications',
    title: `🚩 Correction requested · ${fieldKey.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
    summary: 'The customer has been asked to fix something on their application.',
    application: { id: applicationId, businessName: application?.business_name, trackingId: application?.tracking_id },
    fields: [['Reason', reason, false]],
  })

  // 4. Log to history
  const { data: { user: adminUser } } = await adminClient.auth.getUser()
  await adminClient
    .from('application_status_history')
    .insert({
      application_id: applicationId,
      status: 'on_hold',
      notes: `CORRECTION REQUIRED on field: ${fieldKey}. Reason: ${reason}`,
      updated_by: adminUser?.id
    })

  // 5. Send SMS Notification
  if (process.env.ZEND_API_KEY) {
    const rawPhone = extractPhoneFromApplication(application)
    const phoneNumber = formatPhoneNumber(rawPhone)
    if (phoneNumber) {
      const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'}/dashboard/applications/${applicationId}`
      const message = `Urgent GrayDocket Alert: A correction is required for your application "${application.business_name}". Please log in to your dashboard to resolve: ${trackingLink}`
      
      try {
        console.log(`[SMS DEBUG] Requesting correction SMS to: ${phoneNumber}`)
        const response = await fetch('https://api.tryzend.com/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ZEND_API_KEY as string,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: phoneNumber,
            body: message,
            preferred_channels: ['sms'],
            sender_id: 'GrayDocket'
          })
        })
        const text = await response.text()
        console.log(`[SMS DEBUG] Response status: ${response.status}, body: ${text}`)
        if (!response.ok) {
          console.error(`[SMS DEBUG] Zend API error (Status ${response.status}):`, text)
        }
      } catch (err) {
        console.error('[SMS DEBUG] Failed to send correction SMS:', err)
      }
    } else {
      console.warn(`[SMS DEBUG] Cannot send correction SMS: No phone number found in profiles or form_data.`)
    }
  } else {
    console.warn("[SMS DEBUG] ZEND_API_KEY is not defined in environment variables. SMS will not be sent.")
  }

  revalidatePath('/dashboard')
  revalidatePath('/admin/applications')
  return { success: true }
}

export async function resubmitApplication(applicationId: string, formData: Record<string, unknown>) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required for resubmission.' }

  // 1. Fetch current application to verify ownership
  const { data: app } = await supabase
    .from('applications')
    .select('user_id, status, form_data, payment_status')
    .eq('id', applicationId)
    .single()

  if (!app || app.user_id !== user.id) return { error: 'Unauthorized: You do not have permission to edit this record.' }

  const isDraft = app.status === 'draft'

  // 2. Prepare new form data (clearing old corrections)
  const newFormData = { ...formData }
  if (newFormData.corrections) {
      delete newFormData.corrections
  }

  // Directors sent a link: use their answers, and wait for anyone who hasn't replied
  if (Array.isArray(newFormData.directors)) {
    const { directors, pending } = await applyInviteAnswers(applicationId, newFormData.directors)
    if (pending.length > 0) return { error: `Waiting for ${pending.join(' and ')} to add their details from the link you sent.` }
    newFormData.directors = directors
  }

  // The same checks as the forms (required details, formats, everyone 18 or older)
  const typeId = String(newFormData.businessType || (app.form_data as Record<string, unknown> | null)?.businessType || '')
  const issues = applicationIssues(newFormData, typeId)
  if (issues.length > 0) return { error: describeIssues(issues) }

  // 3. Update application
  const businessName = (newFormData.formData as any)?.businessName || (newFormData as any).businessName || 'Untitled Business'

  // Unpaid applications are saved but only submitted through checkout, which takes payment first
  if (app.payment_status !== 'paid') {
    const { error: saveErr } = await supabase
      .from('applications')
      .update({ business_name: businessName, form_data: { ...(app.form_data as Record<string, unknown>), ...newFormData, ready_for_payment: true }, updated_at: new Date().toISOString() })
      .eq('id', applicationId)
    if (saveErr) return { error: saveErr.message }
    revalidatePath(`/dashboard/applications/${applicationId}`)
    return { success: true, needsPayment: true }
  }
  const { error: updateErr } = await supabase
    .from('applications')
    .update({
      business_name: businessName,
      form_data: newFormData,
      status: 'submitted', 
      updated_at: new Date().toISOString()
    })
    .eq('id', applicationId)

  if (updateErr) return { error: updateErr.message }

  notify({
    channel: 'applications',
    title: isDraft ? `📨 Application submitted · ${businessName}` : `🔁 Corrections sent back · ${businessName}`,
    summary: isDraft ? 'A saved draft was submitted for review.' : 'The customer fixed the requested details and resubmitted.',
    application: { id: applicationId, businessName },
    user: { id: user.id },
  })

  // 4. Log to history
  await supabase.from('application_status_history').insert({
    application_id: applicationId,
    status: 'submitted',
    notes: isDraft ? 'Application submitted from draft portfolio.' : 'Application resubmitted after requested institutional corrections.',
    updated_by: user.id
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/applications')
  revalidatePath(`/dashboard/applications/${applicationId}`)
  
  return { success: true }
}

export async function updateApplicationDraft(applicationId: string, formData: Record<string, unknown>) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required for saving draft.' }

  // 1. Fetch current application to verify ownership and draft status
  const { data: app } = await supabase
    .from('applications')
    .select('user_id, status')
    .eq('id', applicationId)
    .single()

  if (!app || app.user_id !== user.id) return { error: 'Unauthorized: You do not have permission to edit this record.' }
  if (app.status !== 'draft') return { error: 'Unauthorized: This application is not in draft status.' }

  // 2. Prepare new form data (clearing old corrections if any)
  const newFormData = { ...formData }
  if (newFormData.corrections) {
      delete newFormData.corrections
  }

  // Directors sent a link: fold in the details they've sent back
  if (Array.isArray(newFormData.directors)) {
    newFormData.directors = (await applyInviteAnswers(applicationId, newFormData.directors)).directors
  }

  // 3. Update application
  const businessName = (newFormData.formData as any)?.businessName || (newFormData as any).businessName || 'Untitled Business'
  const { error: updateErr } = await supabase
    .from('applications')
    .update({
      business_name: businessName,
      form_data: newFormData,
      updated_at: new Date().toISOString()
    })
    .eq('id', applicationId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/applications')
  revalidatePath(`/dashboard/applications/${applicationId}`)
  
  return { success: true }
}

/** ORC name check. Pages call /api/name-check directly (faster, cancellable); this stays for other callers. */
export async function checkBusinessNameAvailability(name: string) {
  const { searchOrcName } = await import('@/lib/orc-name-search')
  return searchOrcName(name)
}

export async function adminUpdateApplicationData(
  applicationId: string, 
  payload: { businessTypeId: string, businessName: string, formData: any }
) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const { createAdminClient, createClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await adminClient
    .schema('graydocket')
    .from('applications')
    .update({
      business_type_id: payload.businessTypeId,
      business_name: payload.businessName,
      form_data: payload.formData,
      updated_at: new Date().toISOString()
    })
    .eq('id', applicationId)

  if (error) {
    console.error('Admin application update error:', error)
    return { error: error.message }
  }

  await adminClient.schema('graydocket').from('application_status_history').insert({
    application_id: applicationId,
    status: 'under_review', // Optional fallback or current status
    notes: 'Application data and/or business type updated manually by admin.',
    updated_by: user?.id
  })

  revalidatePath(`/admin/applications/${applicationId}`)
  revalidatePath('/admin/applications')

  return { success: true }
}

export async function adminDeleteApplication(applicationId: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // Foreign keys (like application_status_history, documents, etc.) should either have ON DELETE CASCADE
  // or we need to delete them first. Let's try deleting the application directly.
  // The schema for `application_status_history` has ON DELETE CASCADE on application_id.
  
  const { error } = await adminClient
    .schema('graydocket')
    .from('applications')
    .delete()
    .eq('id', applicationId)

  if (error) {
    console.error('Admin application delete error:', error)
    return { error: error.message }
  }

  revalidatePath('/admin/applications')

  return { success: true }
}

/**
 * Start an application on a customer's behalf (e.g. they called or walked in). Priced on the server
 * with the same helpers as checkout. Either the customer pays online from their dashboard, or the team
 * records a payment taken another way, which submits it straight to the New queue.
 */
export async function adminCreateApplication(input: {
  userId: string
  typeId: string
  businessName: string
  addOnIds?: string[]
  delivery?: 'digital' | 'courier'
  payment: { kind: 'online'; textCustomer?: boolean } | { kind: 'offline'; method: string; reference?: string }
  note?: string
}) {
  const adminId = await currentAdminId()
  if (!adminId) return { error: 'Unauthorized' }

  const businessName = input.businessName?.trim()
  if (!businessName) return { error: 'Enter the business name.' }
  const type = businessTypes.find((t) => t.id === input.typeId)
  if (!type) return { error: 'Choose a business type.' }

  const admin = await createAdminClient()
  const [{ data: customer }, { data: dbTypes }, { data: services }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, phone').eq('id', input.userId).maybeSingle(),
    admin.from('business_types').select('*').eq('is_active', true),
    admin.from('services').select('name, price, is_active'),
  ])
  if (!customer) return { error: 'Customer not found.' }

  const addOnIds = (input.addOnIds || []).filter((a) => typeof a === 'string')
  const delivery = input.delivery === 'courier' ? 'courier' : 'digital'
  const quote = quoteApplication({ typeId: type.id, addOnIds, delivery }, (dbTypes || []) as DbBusinessType[], services || [])
  if (!quote.dbTypeId || quote.total <= 0) return { error: `There’s no active price for ${type.name}. Set one on the Pricing page.` }

  const offline = input.payment.kind === 'offline' ? input.payment : null
  if (offline && !offline.method?.trim()) return { error: 'Choose how the customer paid.' }

  const { data: created, error } = await admin
    .from('applications')
    .insert({
      user_id: customer.id,
      business_type_id: quote.dbTypeId,
      business_name: businessName,
      status: 'draft',
      payment_status: 'pending',
      total_amount: quote.total,
      tracking_id: `DRAFT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      notes: input.note?.trim() || null,
      form_data: {
        businessName,
        businessType: type.id,
        mobilePhone: customer.phone || '',
        email: customer.email || '',
        selectedAddOns: addOnIds,
        delivery_method: delivery,
        delivery_address: null,
        total_amount: quote.total,
        price_lines: quote.lines,
        // Priced and ready: the customer's dashboard offers "Complete payment"
        ready_for_payment: true,
        created_by_admin: adminId,
      },
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error || !created) return { error: error?.message || 'Couldn’t create the application.' }

  await admin.from('application_status_history').insert({
    application_id: created.id,
    status: 'draft',
    notes: 'Started by the GrayDocket team on the customer’s behalf',
    updated_by: adminId,
  })

  if (offline) {
    const reference = (offline.reference?.trim() || `${offline.method}-${created.id.slice(0, 8)}`).toUpperCase().replace(/\s+/g, '-')
    const res = await finalizePaidApplication(created.id, reference, quote.total, 'GHS', 'admin', { by: adminId, method: offline.method.replace(/_/g, ' ') })
    if (!res.ok) return { error: res.error, id: created.id }
  } else {
    notify({
      channel: 'applications',
      title: `📝 Application started for a customer · ${businessName}`,
      summary: 'Created by the team. Waiting for the customer to pay online.',
      application: { id: created.id, businessName },
      user: { id: customer.id },
      fields: [
        ['Type', type.name],
        ['Total', money(quote.total)],
      ],
    })
    if (input.payment.kind === 'online' && input.payment.textCustomer && customer.phone) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'
      await sendSms(
        customer.phone,
        `GrayDocket has started your ${type.name} registration for "${businessName}". Review it and pay ${money(quote.total)} here: ${appUrl}/dashboard/applications/${created.id}`
      )
    }
  }

  revalidatePath('/admin/applications')
  revalidatePath('/dashboard')
  return { error: null, id: created.id as string }
}

/* ---------- Annual filings (annual returns and business name renewals) ---------- */

/** This year's ORC filing deadline as saved by the team (YYYY-MM-DD), or null for the 30 April default */
export async function getSavedFilingDeadline() {
  const admin = await createAdminClient()
  const { data } = await admin.from('services').select('description').eq('name', FILING_SETTING_NAME).maybeSingle()
  const value = (data?.description || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

/**
 * Save this year's ORC deadline (the ORC announces it, and often extends it). Kept as a hidden
 * system row in services, like the courier fee, since there is no settings table.
 */
export async function setFilingDeadline(date: string) {
  if (!(await checkIsAdmin())) return { error: 'Unauthorized' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: 'Choose a valid date.' }

  const admin = await createAdminClient()
  const { data: existing } = await admin.from('services').select('id').eq('name', FILING_SETTING_NAME).maybeSingle()
  const { error } = existing
    ? await admin.from('services').update({ description: date }).eq('id', existing.id)
    : await admin.from('services').insert({ name: FILING_SETTING_NAME, category: 'system', price: 0, is_active: false, description: date })
  if (error) return { error: error.message }

  notify({
    channel: 'team',
    title: `📅 ORC filing deadline set · ${formatDeadline(date)}`,
    summary: 'Annual return and renewal reminders now count down to this date.',
    link: '/admin',
  })
  revalidatePath('/admin')
  return { error: null }
}

/** Record that this year's annual return or renewal has been filed, which stops the reminders */
export async function markAnnualFilingDone(applicationId: string, year: number) {
  const adminId = await currentAdminId()
  if (!adminId) return { error: 'Unauthorized' }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: 'Invalid year.' }

  const admin = await createAdminClient()
  const { data: app } = await admin
    .from('applications')
    .select('id, status, business_name, business_types:business_type_id(name)')
    .eq('id', applicationId)
    .maybeSingle()
  if (!app) return { error: 'Application not found.' }
  const kind = filingKind((app.business_types as { name?: string } | null)?.name)

  const { error } = await admin.from('application_status_history').insert({
    application_id: app.id,
    status: app.status,
    notes: filedNote(kind, year),
    updated_by: adminId,
  })
  if (error) return { error: error.message }

  notify({
    channel: 'applications',
    title: `🗂️ ${kind === 'renewal' ? 'Business name renewed' : 'Annual return filed'} for ${year} · ${app.business_name}`,
    application: { id: app.id, businessName: app.business_name },
  })
  revalidatePath(`/admin/applications/${app.id}`)
  revalidatePath(`/dashboard/applications/${app.id}`)
  return { error: null }
}
