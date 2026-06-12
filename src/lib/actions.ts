'use server'

import crypto from 'crypto'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatPhoneNumber } from '@/lib/sms'
import { sendDiscordNotification, DiscordColors } from '@/lib/discord'

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue | undefined }

type DeliveryAddress = Record<string, unknown> | null

type ApplicationPayload = {
  user_id: string
  business_type_id: string
  tracking_id: string
  business_name: string
  status: string
  form_data: Record<string, unknown>
  total_amount: number
  paystack_reference?: string
  payment_status: string
  referred_by_id: string | null
  updated_at: string
}

type DraftPayload = {
  user_id: string
  business_type_id: string
  business_name: string
  status: string
  form_data: Record<string, unknown>
  total_amount: number
  updated_at: string
}

type PhoneContact = {
  phone?: string | null
}

type AmountRow = {
  total_amount?: number | string | null
}

type ProfileApplicationsRow = {
  full_name?: string | null
  applications?: { id: string }[] | null
}

type UserIdRow = {
  user_id: string | null
}

type AdminApplicationRow = {
  assigned_to?: string | null
  status?: string
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

type BankingPartnerMutation = {
  name?: string
  description?: string
  logo_url?: string
  is_active?: boolean
}

type ProfileAffiliateUpdate = {
  is_affiliate: boolean
  affiliate_code?: string | null
}

type RoleMetadata = {
  role?: string
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

function generateTrackingId(): string {
  const prefix = 'GD'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

function normalizePaystackReference(reference?: string) {
  const normalized = reference?.trim()
  return normalized ? normalized : undefined
}

function hasValidPaystackSecretKey() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_'))
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

async function reservePaystackReference(reference: string, draftId?: string) {
  const adminClient = await createAdminClient()
  let query = adminClient
    .from('applications')
    .select('id, tracking_id')
    .eq('paystack_reference', reference)

  if (draftId) {
    query = query.neq('id', draftId)
  }

  const { data: existing } = await query.maybeSingle()
  if (existing) return existing

  let fallbackQuery = adminClient
    .from('applications')
    .select('id, tracking_id')
    .filter('form_data->>paystack_reference', 'eq', reference)

  if (draftId) {
    fallbackQuery = fallbackQuery.neq('id', draftId)
  }

  const { data: fallbackExisting } = await fallbackQuery.maybeSingle()
  if (fallbackExisting) return fallbackExisting

  let legacyFallbackQuery = adminClient
    .from('applications')
    .select('id, tracking_id')
    .filter('form_data->>paystackReference', 'eq', reference)

  if (draftId) {
    legacyFallbackQuery = legacyFallbackQuery.neq('id', draftId)
  }

  const { data: legacyFallbackExisting } = await legacyFallbackQuery.maybeSingle()
  return legacyFallbackExisting
}

async function reconcileStoredPaystackEvents(reference: string, applicationId: string) {
  const adminClient = await createAdminClient()

  await adminClient
    .from('paystack_webhook_events')
    .update({
      application_id: applicationId,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('reference', reference)
    .is('application_id', null)
}

type AffiliateCommissionContext = {
  referred_by_id: string | null
  payment_status: string | null
  business_types?: {
    service_fee?: number | string | null
    returns_portion?: number | string | null
    affiliate_share_percentage?: number | string | null
  } | null
}

function calculateAffiliateCommissionAmount(app: AffiliateCommissionContext) {
  if (!app.referred_by_id || app.payment_status !== 'paid') return 0

  const returnsPortion = Number(app.business_types?.returns_portion || 0)
  const serviceFee = Number(app.business_types?.service_fee || 0)
  const affiliateRate = Number(app.business_types?.affiliate_share_percentage ?? 40) / 100

  if (returnsPortion > 0) {
    return returnsPortion * affiliateRate
  }

  return serviceFee * 0.2
}

export async function submitApplication(data: {
  businessTypeId: string
  businessTypeName: string
  businessName: string
  formData: Record<string, unknown>
  selectedAddOns: string[]
  totalAmount: number
  deliveryMethod: string
  deliveryAddress: DeliveryAddress
  affiliateCode?: string
  paystackReference?: string
}) {
  const supabase = await createClient()
  const paystackReference = normalizePaystackReference(data.paystackReference)

  let referredById = null
  if (data.affiliateCode) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('affiliate_code', data.affiliateCode)
      .eq('is_affiliate', true)
      .single()
    if (profile) referredById = profile.id
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'You must be logged in to submit an application.' }
  }

  // Debug: check if profile exists
  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profileCheck) {
    console.error(`Profile missing for user ${user.id}. Expect FK error.`)
    // If Admin client is needed, we'd do it here, but let's just surface the error cleanly
    return { error: `Profile missing. Did you register? (ID: ${user.id})` }
  }

  const trackingId = generateTrackingId()

  // Check for existing draft to promote early so we can safely exclude it
  // from unique payment reference checks.
  const { data: existingDraft } = await supabase
    .from('applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_type_id', data.businessTypeId)
    .eq('status', 'draft')
    .single()

  if (paystackReference) {
    const existingPayment = await reservePaystackReference(paystackReference, existingDraft?.id)
    if (existingPayment) {
      return {
        error: `This payment reference has already been used on application ${existingPayment.tracking_id}. Please contact support if you need help.`
      }
    }
  }

  const applicationPayload: ApplicationPayload = {
    user_id: user.id,
    business_type_id: data.businessTypeId,
    tracking_id: trackingId,
    business_name: data.businessName,
    status: 'submitted',
    form_data: { 
      ...data.formData, 
      delivery_method: data.deliveryMethod,
      delivery_address: data.deliveryAddress,
      total_amount: data.totalAmount,
      paystack_reference: paystackReference
    },
    total_amount: data.totalAmount,
    paystack_reference: paystackReference,
    payment_status: 'pending', // Default to pending
    referred_by_id: referredById,
    updated_at: new Date().toISOString()
  }

  // --- Server-side Paystack Verification ---
  if (paystackReference) {
    if (!hasValidPaystackSecretKey()) {
      console.error('PAYSTACK_SECRET_KEY is not configured.')
      return { error: 'Payment verification failed (Configuration Error).' }
    }

    try {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${paystackReference}`, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      const verifyData = await verifyRes.json()

      if (verifyData.status && verifyData.data.status === 'success') {
        applicationPayload.payment_status = 'paid'
        // Ensure the amount matches (Paystack amount is in pesewas)
        const expectedAmountPesewas = Math.round(data.totalAmount * 100)
        const actualAmountPesewas = verifyData.data.amount
        const currencyMatch = verifyData.data.currency === 'GHS'

        if (actualAmountPesewas < expectedAmountPesewas || !currencyMatch) {
              console.warn(`Payment integrity violation: Expected ${expectedAmountPesewas} GHS, got ${actualAmountPesewas} ${verifyData.data.currency}`)
              await sendDiscordNotification({
                title: '🚨 PAYMENT INTEGRITY ALERT',
                color: DiscordColors.DANGER,
                description: 'A payment was detected that does not match the expected amount or currency.',
                fields: [
                  { name: 'Expected', value: `${data.totalAmount} GHS`, inline: true },
                  { name: 'Actual', value: `${actualAmountPesewas / 100} ${verifyData.data.currency}`, inline: true },
                  { name: 'Reference', value: `\`${paystackReference}\``, inline: false }
                ]
              })
              return { error: 'Payment integrity check failed. Amount or currency mismatch detected.' }
        }
      } else {
        return { error: 'Payment verification failed. Please contact support.' }
      }
    } catch (err) {
      console.error('Paystack verification error:', err)
      return { error: 'Technical error during payment verification.' }
    }
  }

  let application;
  let appError;

  if (existingDraft) {
    const { data: updated, error } = await supabase
      .from('applications')
      .update(applicationPayload)
      .eq('id', existingDraft.id)
      .select()
      .single()
    application = updated
    appError = error
  } else {
    const { data: inserted, error } = await supabase
      .from('applications')
      .insert(applicationPayload)
      .select()
      .single()
    application = inserted
    appError = error
  }

  if (application && !appError) {
    if (application.paystack_reference) {
      await reconcileStoredPaystackEvents(application.paystack_reference, application.id)
    }

    if (application.payment_status === 'paid') {
      await sendDiscordNotification({
        title: '💰 NEW PAID APPLICATION',
        color: DiscordColors.SUCCESS,
        fields: [
          { name: 'Business Name', value: application.business_name, inline: true },
          { name: 'Type', value: data.businessTypeName, inline: true },
          { name: 'Amount Paid', value: `GH₵ ${application.total_amount.toLocaleString()}`, inline: true },
          { name: 'Tracking ID', value: `\`${application.tracking_id}\``, inline: false },
          { name: 'Ref', value: application.paystack_reference || application.form_data?.paystack_reference || 'N/A', inline: true }
        ]
      })
    } else {
      await sendDiscordNotification({
        title: '📥 NEW APPLICATION SUBMITTED (Pending)',
        color: DiscordColors.WARNING,
        fields: [
          { name: 'Business Name', value: application.business_name, inline: true },
          { name: 'Type', value: data.businessTypeName, inline: true },
          { name: 'Tracking ID', value: `\`${application.tracking_id}\``, inline: false }
        ]
      })
    }
  }

  if (appError) {
    console.error('Application insert error:', appError)
    return { error: appError.message }
  }

  // Insert initial status history
  await supabase.from('application_status_history').insert({
    application_id: application.id,
    status: 'submitted',
    notes: `Application submitted for ${data.businessTypeName}`,
    updated_by: user.id,
  })

  // Insert selected add-on services
  if (data.selectedAddOns.length > 0) {
    // Get service IDs from the database
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price')

    if (services) {
      const serviceMap: Record<string, { id: string; price: number }> = {}
      services.forEach((s: { id: string; name: string; price: number }) => {
        const key = s.name.toLowerCase().replace(/\s+/g, '_')
        serviceMap[key] = { id: s.id, price: s.price }
      })

      const addOnMapping: Record<string, string> = {
        domain: 'domain_name_purchase',
        email: 'business_email_setup',
        website: 'business_website',
        bank: 'bank_account_setup',
      }

      const serviceInserts = data.selectedAddOns
        .map((addon) => {
          const serviceKey = addOnMapping[addon]
          const service = serviceKey ? serviceMap[serviceKey] : null
          if (service) {
            return {
              application_id: application.id,
              service_id: service.id,
              price: service.price,
            }
          }
          return null
        })
        .filter(Boolean)

      if (serviceInserts.length > 0) {
        await supabase.from('application_services').insert(serviceInserts)
      }
    }
  }

  // --- Calculate and Insert Affiliate Commission ---
  if (applicationPayload.payment_status === 'paid' && referredById) {
     await processAffiliateCommission(application.id)
  }

  // --- Send SMS Notification ---
  if (paystackReference && process.env.ZEND_API_KEY) {
    const phoneNumber = data.formData.mobilePhone as string
    if (phoneNumber) {
      const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'}/track/${trackingId}`
      const message = `Payment received! Your GrayDocket application for "${data.businessName}" is processing. Track your status here: ${trackingLink}`
      
      const normalizedPhone = formatPhoneNumber(phoneNumber)
      try {
        await fetch('https://api.tryzend.com/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ZEND_API_KEY as string,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: normalizedPhone,
            body: message,
            preferred_channels: ['sms'],
            sender_id: 'GrayDocket'
          })
        })
      } catch (err) {
        console.error('Failed to send SMS via Zend:', err)
      }
    }
  }

  // --- Alert All Registrars via SMS ---
  if (paystackReference && process.env.ZEND_API_KEY) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/server')
      const adminClient = await createAdminClient()
      
      // Fetch registrars from public schema first, then graydocket if needed
      let { data: registrars } = await adminClient.schema('graydocket').from('profiles').select('phone').eq('role', 'registrar')
      if (!registrars || registrars.length === 0) {
        const { data: pubRegistrars } = await adminClient.schema('public').from('profiles').select('phone').eq('role', 'registrar')
        registrars = pubRegistrars || []
      }

      if (registrars && registrars.length > 0) {
        const adminMsg = `New Case: ${data.businessName} has submitted an application. Log in to the dashboard to claim it.`
        const uniquePhones = [...new Set(
          (registrars as PhoneContact[])
            .map((r) => r.phone)
            .filter((phone): phone is string => Boolean(phone))
        )]

        await Promise.all(uniquePhones.map(async (phone) => {
          const normalizedAdminPhone = formatPhoneNumber(phone)
          await fetch('https://api.tryzend.com/messages', {
            method: 'POST',
            headers: {
              'x-api-key': process.env.ZEND_API_KEY as string,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: normalizedAdminPhone,
              body: adminMsg,
              preferred_channels: ['sms'],
              sender_id: 'GrayDocket'
            })
          })
        }))
      }
    } catch (e) {
      console.error('Failed to notify registrars:', e)
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/applications')

  return { success: true, trackingId, applicationId: application.id }
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

  const payload: DraftPayload = {
    user_id: user.id,
    business_type_id: data.businessTypeId,
    business_name: data.businessName || 'Untitled Business',
    status: 'draft',
    form_data: { 
      ...data.formData, 
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
    await sendDiscordNotification({
      title: '📝 NEW DRAFT STARTED',
      color: DiscordColors.INFO,
      fields: [
        { name: 'Business Name', value: payload.business_name, inline: true },
        { name: 'Tracking (Temp)', value: `\`${trackingId}\``, inline: true }
      ]
    })
    
    return { success: true, applicationId: newDraft.id }
  }
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
    .order('base_price', { ascending: true })

  if (error) {
    console.error('Fetch business types error:', error)
    return []
  }

  return data || []
}

export async function getAllBusinessTypes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('business_types')
    .select('*')
    .order('base_price', { ascending: true })

  return { business_types: data || [], error: error?.message || null }
}

export async function getServices() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('category', { ascending: true })

  return { services: data || [], error: error?.message || null }
}


async function checkIsAdmin(requiredRoles: string[] = ['admin', 'registrar', 'bank_manager', 'service_manager']) {
  const { createClient, createAdminClient } = await import('@/lib/supabase/server')
  
  // Try to get the current user session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const adminClient = await createAdminClient()

  // 1. Check Graydocket Schema
  const { data } = await adminClient
    .schema('graydocket')
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .limit(1)
  
  let profile = data?.[0] || null

  if (!profile) {
    // 2. Fallback to public
    const { data: pubProf } = await adminClient
      .schema('public')
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .limit(1)
    
    profile = pubProf?.[0] || null
  }

  const role = profile?.role || user.app_metadata?.role || user.user_metadata?.role
  return role && requiredRoles.includes(role)
}


export async function getAdminStats() {
  const isAuthorized = await checkIsAdmin()
  if (!isAuthorized) return null

  // Use regular client for session, admin client for data
  const { createClient, createAdminClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const client = await createAdminClient()

  // Resolve role
  const { data: profData } = await client.schema('graydocket').from('profiles').select('role').eq('id', user.id).limit(1)
  const profile = profData?.[0] || null
  const role = profile?.role || 'registrar'

  // 1. Core Counts (Role-aware)
  let appQuery = client.schema('graydocket').from('applications').select('id', { count: 'exact', head: true })
  let completedQuery = client.schema('graydocket').from('applications').select('id', { count: 'exact', head: true }).eq('status', 'completed')
  
  if (role === 'registrar') {
    appQuery = appQuery.or(`assigned_to.eq.${user.id},and(assigned_to.is.null,status.neq.draft)`)
    completedQuery = completedQuery.eq('assigned_to', user.id)
  }

  const { count: appCount } = await appQuery
  const { count: completedCount } = await completedQuery

  // 2. Pulse: Stale/Urgent (Unassigned > 6 hours) - Registrars only see unassigned urgent (excluding drafts)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { count: urgentCount } = await client
    .schema('graydocket')
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .is('assigned_to', null)
    .neq('status', 'draft')
    .lt('created_at', sixHoursAgo)

  // 3. Pulse: Revenue This Month (Admins only see global revenue)
  let monthlyRevenue = 0
  if (role === 'admin') {
     const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
     const { data: revenueData } = await client.schema('graydocket').from('applications').select('total_amount').eq('payment_status', 'paid').gt('created_at', firstOfMonth)
     monthlyRevenue = (revenueData as AmountRow[] | null)?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0
  }

  // 4. Pulse: Registrar Performance (Admins see global, Registrars only see themselves?)
  // Actually, keeping the "Radar" might be good for transparency, but let's make it admin-only info
  const { data: performance } = await client.schema('graydocket').from('profiles').select('id, full_name, applications!assigned_to(id)').eq('role', 'registrar')
  const registrarStats = role === 'admin' ? (performance as ProfileApplicationsRow[] | null)?.map(r => ({
    name: r.full_name,
    activeCases: r.applications?.length || 0
  })) || [] : []

  // 5. User Data (Synchronized with getAdminUsers logic)
  let userCount = 0
  if (role === 'admin') {
     const { users } = await getAdminUsers()
     userCount = users.length
  }

  // 6. Recent Apps (Filtered for Registrars)
  let recentQuery = client
    .schema('graydocket')
    .from('applications')
    .select('*, profiles:user_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(8)
  
  if (role === 'registrar') {
     recentQuery = recentQuery.or(`assigned_to.eq.${user.id},and(assigned_to.is.null,status.neq.draft)`)
  }

  const { data: recentApps } = await recentQuery

  return {
    role,
    totalApplications: appCount || 0,
    totalUsers: userCount || 0,
    completedApplications: completedCount || 0,
    urgentCount: urgentCount || 0,
    monthlyRevenue,
    registrarStats,
    recentApplications: recentApps || []
  }
}

export async function getAdminApplications() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { applications: [], error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { applications: [], error: 'Session expired' }

  // Check the precise role of the logged in admin staff to apply filtering logic
  const { data: profile } = await supabase.schema('graydocket').from('profiles').select('role').eq('id', user.id).maybeSingle()
  let role = profile?.role || user.app_metadata?.role;
  
  // Apply fallback dual fetch just in case
  if (!role) {
    const { data: pubProf } = await supabase.schema('public').from('profiles').select('role').eq('id', user.id).maybeSingle()
    role = pubProf?.role || 'registrar' // Default to least privilege if they made it here
  }
  
  // Build the query
  const query = supabase
    .from('applications')
    .select(`
      *,
      profiles:user_id (full_name, email),
      business_types:business_type_id (name)
    `)
    .order('created_at', { ascending: false })

  const { data, error } = await query

  // Client-side array filtering ensures deterministic evaluation based on the resolved role context
  // This circumvents RLS/Schema quirks while maintaining strictly secure constraints within this trusted server action
  const finalApps = ((data as AdminApplicationRow[] | null) || []).filter((app) => {
    if (role === 'admin') return true; // Admins view global unconstrained
    
    // If it is assigned to this specific registrar, they see it
    if (app.assigned_to === user.id) return true;
    
    // If it is unassigned, registrars only see it if it has been submitted (i.e., not a draft)
    if (!app.assigned_to && app.status !== 'draft') return true;
    
    // Otherwise, they do not see it (e.g. assigned to someone else, or is a draft)
    return false;
  })

  return { applications: finalApps, role, error: error?.message || null }
}

export async function getAdminPayments(status: string = 'paid') {
  const isAdmin = await checkIsAdmin(['admin', 'registrar'])
  if (!isAdmin) return { payments: [], error: 'Unauthorized' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  const selectQuery = 'id, tracking_id, business_name, total_amount, payment_status, form_data, created_at, updated_at, referred_by_id, profiles:user_id(full_name, email), business_types:business_type_id(name, orc_fee, agent_fee, returns_portion, service_fee, affiliate_share_percentage)'

  let query = adminClient
    .schema('graydocket')
    .from('applications')
    .select(selectQuery)
    .order('updated_at', { ascending: false })

  if (status) {
    query = query.eq('payment_status', status)
  }

  const { data, error } = await query

  if (error) {
     // Fallback to public schema if graydocket doesn't have it yet
     let fallbackQuery = adminClient
       .from('applications')
       .select(selectQuery)
       .order('updated_at', { ascending: false })
     
     if (status) {
       fallbackQuery = fallbackQuery.eq('payment_status', status)
     }

     const { data: publicData, error: publicErr } = await fallbackQuery
     
     if (publicErr) return { payments: [], error: publicErr.message }
     return { payments: publicData || [], error: null }
  }

  return { payments: data || [], error: null }
}

export async function getAdminAffiliates() {
  const isAdmin = await checkIsAdmin(['admin', 'registrar'])
  if (!isAdmin) return { affiliates: [], error: 'Unauthorized' }

  const supabase = await createClient()

  // Use a direct edge-join. This avoids manual mapping and speeds up the response natively.
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id, 
      full_name, 
      email, 
      phone, 
      affiliate_code, 
      created_at, 
      payout_method, 
      payout_address, 
      commissions(id, amount, status, created_at)
    `)
    .eq('is_affiliate', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Affiliate fetch error:', error)
    return { affiliates: [], error: error.message }
  }

  const { data: referralRows, error: referralError } = await supabase
    .from('applications')
    .select('referred_by_id')
    .not('referred_by_id', 'is', null)

  if (referralError) {
    return { affiliates: [], error: referralError.message }
  }

  const referralCounts = (referralRows || []).reduce<Record<string, number>>((acc, row: { referred_by_id: string | null }) => {
    if (row.referred_by_id) {
      acc[row.referred_by_id] = (acc[row.referred_by_id] || 0) + 1
    }
    return acc
  }, {})

  const affiliates = (profiles || []).map((profile) => ({
    ...profile,
    referral_count: referralCounts[profile.id] || 0,
  }))

  return { affiliates, error: null }
}

export async function getAdminUsers() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { users: [], error: 'Unauthorized' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()

  // 1. Get all profiles from graydocket schema
  const { data: profiles, error } = await adminSupabase
    .schema('graydocket')
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { users: [], error: error.message }

  // 2. Get auth users to check app_id metadata and phone verification status
  const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 })
  const authMap = new Map((authUsers || []).map(u => [u.id, u]))
  
  // GrayDocket users are identified by:
  // - Explicit app_id tag in metadata, OR
  // - Having a confirmed phone (GrayDocket is the only app that sets phone_confirm:true)
  const gdAuthIds = new Set(
    (authUsers || [])
      .filter(u => 
        u.user_metadata?.app_id === 'graydocket' ||
        u.phone_confirmed_at
      )
      .map(u => u.id)
  )

  // 3. Get user IDs with GrayDocket applications or drafts
  const [{ data: appRows }, { data: draftRows }] = await Promise.all([
    adminSupabase.schema('graydocket').from('applications').select('user_id'),
    adminSupabase.schema('graydocket').from('application_drafts').select('user_id'),
  ])
  const activityIds = new Set([
    ...((appRows as UserIdRow[] | null) || []).map((r) => r.user_id),
    ...((draftRows as UserIdRow[] | null) || []).map((r) => r.user_id),
  ])

  // 4. A user belongs to GrayDocket if ANY of these are true:
  //    - They registered via GrayDocket phone OTP (app_id or phone_confirmed_at)
  //    - They have a GrayDocket application or draft
  //    - They have a non-default role (admin, registrar, etc.)
  //    - They are a GrayDocket affiliate partner
  const appUsers = (profiles || []).filter((u: { id: string; role?: string | null; is_affiliate?: boolean | null }) =>
    gdAuthIds.has(u.id) ||
    activityIds.has(u.id) ||
    (u.role && u.role !== 'user') ||
    u.is_affiliate
  )

  // 5. Self-healing: retroactively tag any identified GrayDocket users
  //    who are missing the app_id in their auth metadata. Fire-and-forget.
  for (const user of appUsers) {
    if (!gdAuthIds.has(user.id)) {
      const authUser = authMap.get(user.id)
      if (authUser) {
        adminSupabase.auth.admin.updateUserById(user.id, {
          user_metadata: { ...authUser.user_metadata, app_id: 'graydocket' }
        }).catch(() => {}) // silent — best effort
      }
    }
  }

  return { users: appUsers, error: null }
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
  const isAuthorized = await checkIsAdmin(['admin', 'registrar', 'service_manager'])
  if (!isAuthorized) return { error: 'Unauthorized: Service Manager access required' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('services')
    .update(updates)
    .eq('id', id)

  revalidatePath('/admin/services')
  return { error: error?.message || null }
}

export async function updateBusinessType(id: string, updates: BusinessTypeMutation) {
  const isAuthorized = await checkIsAdmin(['admin', 'registrar', 'service_manager'])
  if (!isAuthorized) return { error: 'Unauthorized: Pricing Manager access required' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('business_types')
    .update(updates)
    .eq('id', id)

  if (!error) {
    await sendDiscordNotification({
      title: '🏷️ PRICING STRATEGY UPDATED',
      color: DiscordColors.WARNING,
      description: `Business type \`${id}\` updated.`,
      fields: [
        { name: 'Updates', value: `\`\`\`json\n${JSON.stringify(updates, null, 2)}\n\`\`\``, inline: false }
      ]
    })
  }

  revalidatePath('/admin/pricing')
  return { error: error?.message || null }
}

export async function deleteBusinessType(id: string) {
  const isAuthorized = await checkIsAdmin(['admin', 'registrar', 'service_manager'])
  if (!isAuthorized) return { error: 'Unauthorized: Pricing Manager access required' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('business_types')
    .delete()
    .eq('id', id)

  if (!error) {
    await sendDiscordNotification({
      title: '🗑️ BUSINESS TYPE REMOVED',
      color: DiscordColors.DANGER,
      fields: [{ name: 'ID', value: id, inline: true }]
    })
  }

  revalidatePath('/admin/pricing')
  return { error: error?.message || null }
}

export async function updateBankingPartner(id: string, updates: BankingPartnerMutation) {
  const isAuthorized = await checkIsAdmin(['admin', 'bank_manager'])
  if (!isAuthorized) return { error: 'Unauthorized: Bank Manager access required' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('banking_partners')
    .update(updates)
    .eq('id', id)

  if (!error) {
    await sendDiscordNotification({
      title: '🏦 BANKING PARTNER UPDATED',
      color: DiscordColors.INFO,
      fields: [
        { name: 'Partner', value: updates.name || id, inline: true },
        { name: 'Status', value: updates.is_active ? 'Active' : 'Inactive', inline: true }
      ]
    })
  }

  revalidatePath('/admin/banking')
  return { error: error?.message || null }
}

export async function updateApplicationStatus(id: string, status: string, adminNotes?: string) {
  const isAuthorized = await checkIsAdmin(['admin', 'registrar'])
  if (!isAuthorized) return { error: 'Unauthorized: Registrar access required' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // 1. State Transition Validation
  const { data: currentApp } = await adminClient
    .from('applications')
    .select('status')
    .eq('id', id)
    .single()

  if (currentApp) {
    // Rule: Terminal states cannot be changed
    if (['completed', 'cancelled'].includes(currentApp.status)) {
      return { error: `Restricted: Application is already in a terminal state (${currentApp.status})` }
    }

    // Rule: Logical Logistics (delivered can only go to completed)
    if (currentApp.status === 'delivered' && !['completed', 'cancelled'].includes(status)) {
      return { error: 'Logistics violation: Delivered applications can only move to Completed' }
    }

    // Rule: Dispatch protection (once it's in the real world, it stays there)
    const processingStates = ['submitted', 'name_search', 'under_review', 'approved']
    if (currentApp.status === 'dispatched' && processingStates.includes(status)) {
      return { error: 'Logistics violation: Dispatched applications cannot move back to internal processing' }
    }
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
  await sendDiscordNotification({
    title: '🔄 STATUS SHIFT',
    color: DiscordColors.PURPLE,
    fields: [
      { name: 'Track ID', value: `\`${id.substring(0, 8)}...\``, inline: true },
      { name: 'New Status', value: status.toUpperCase(), inline: true },
      { name: 'Note', value: adminNotes || 'No specific note', inline: false }
    ]
  })

  // 2. Fetch full application for history, commission, and SMS (Using Admin Client to bypass RLS)
  const { data: application } = await adminClient
    .from('applications')
    .select('*, business_types(*), profiles:user_id(phone)')
    .eq('id', id)
    .single()

  const { data: { user } } = await adminClient.auth.getUser()

  // 3. Log to history
  await adminClient
    .from('application_status_history')
    .insert({
      application_id: id,
      status: status,
      notes: adminNotes || `Status updated to ${status.replace('_', ' ').toUpperCase()}`,
      updated_by: user?.id
    })

  // 4. ---- Premium status-aware SMS Notification via Zend ----
  if (application && process.env.ZEND_API_KEY) {
    // Normalize phone number
    const formData = (application.form_data as ApplicationFormData | null) || {}
    const profile = (application.profiles as PhoneContact | null) || null
    const phoneNumber = formatPhoneNumber(formData.mobilePhone || profile?.phone || '')

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
  const isAuthorized = await checkIsAdmin(['admin', 'registrar'])
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
    const formData = (application.form_data as any) || {}
    const profile = (application.profiles as any) || null
    const phoneNumber = formatPhoneNumber(formData.mobilePhone || profile?.phone || '')

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

export async function updateUserRole(id: string, role: 'user' | 'admin' | 'registrar' | 'bank_manager' | 'service_manager') {
  // Only SUPER ADMINS can update roles
  const isSuperAdmin = await checkIsAdmin(['admin'])
  if (!isSuperAdmin) return { error: 'Unauthorized: Super-admin access required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)

  if (!error) {
    await sendDiscordNotification({
      title: '🛡️ ROLE ESCALATION',
      color: DiscordColors.PURPLE,
      description: `User role modified.`,
      fields: [
        { name: 'User ID', value: id, inline: true },
        { name: 'New Role', value: role.toUpperCase(), inline: true }
      ]
    })
  }

  revalidatePath('/admin/users')
  return { error: error?.message || null }
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

export async function createBankingPartner(partner: BankingPartnerMutation) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('banking_partners')
    .insert(partner)

  revalidatePath('/admin/banking')
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
    await sendDiscordNotification({
      title: '🗑️ SERVICE REMOVED',
      color: DiscordColors.DANGER,
      fields: [{ name: 'Service ID', value: id, inline: true }]
    })
  }

  revalidatePath('/admin/services')
  return { error: error?.message || null }
}

export async function deleteBankingPartner(id: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('banking_partners')
    .delete()
    .eq('id', id)

  if (!error) {
    await sendDiscordNotification({
      title: '🗑️ BANKING PARTNER REMOVED',
      color: DiscordColors.DANGER,
      fields: [{ name: 'Partner ID', value: id, inline: true }]
    })
  }

  revalidatePath('/admin/banking')
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
    await sendDiscordNotification({
      title: '🏷️ SYSTEM FEE UPDATED',
      color: DiscordColors.WARNING,
      fields: [
        { name: 'Fee', value: feeName, inline: true },
        { name: 'New Price', value: `GH₵ ${price}`, inline: true }
      ]
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
    .select('id, referred_by_id, payment_status, business_types(service_fee, returns_portion, affiliate_share_percentage)')
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

  await sendDiscordNotification({
    title: '💸 COMMISSION LOGGED',
    color: DiscordColors.GOLD,
    fields: [
      { name: 'Affiliate ID', value: `\`${app.referred_by_id}\``, inline: true },
      { name: 'Amount', value: `GH₵ ${commissionAmount.toFixed(2)}`, inline: true },
      { name: 'Application', value: `\`${applicationId.substring(0, 8)}...\``, inline: false }
    ]
  })

  return { success: true }
}

export async function updateAffiliateCommissionStatus(
  affiliateId: string,
  fromStatus: 'pending' | 'approved',
  toStatus: 'approved' | 'paid'
) {
  const isAdmin = await checkIsAdmin(['admin', 'registrar'])
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

  await sendDiscordNotification({
    title: toStatus === 'paid' ? '🏦 AFFILIATE PAYOUT SETTLED' : '🧾 AFFILIATE PAYOUT APPROVED',
    color: toStatus === 'paid' ? DiscordColors.SUCCESS : DiscordColors.INFO,
    fields: [
      { name: 'Affiliate ID', value: `\`${affiliateId}\``, inline: true },
      { name: 'Entries', value: ids.length.toString(), inline: true },
      { name: 'Amount', value: `GH₵ ${totalAmount.toFixed(2)}`, inline: true },
    ]
  })

  revalidatePath('/admin/affiliates')
  revalidatePath('/dashboard/affiliate')
  return { success: true, count: ids.length, totalAmount }
}

export async function markUserAsAffiliate(userId: string, isAffiliate: boolean) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  
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
    await sendDiscordNotification({
      title: '🤝 NEW PARTNER ONBOARDED',
      color: DiscordColors.GOLD,
      description: `New affiliate created for user \`${user.id}\``,
      fields: [
        { name: 'Affiliate Code', value: `\`${code}\``, inline: true }
      ]
    })
  }

  revalidatePath('/dashboard/affiliate')
  return { error: error?.message || null, code }
}

export async function updatePayoutInfo(method: string, address: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      payout_method: method, 
      payout_address: address 
    })
    .eq('id', user.id)

  if (!error) {
    await sendDiscordNotification({
      title: '💳 PAYOUT INFO UPDATED',
      color: DiscordColors.INFO,
      fields: [
        { name: 'Method', value: method, inline: true },
        { name: 'User', value: user.id, inline: true }
      ]
    })
  }

  revalidatePath('/dashboard/affiliate')
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
  
  // Logic Branching
  const isOwner = rawApp.user_id === user.id
  
  let isAuthorized = isOwner

  if (!isAuthorized) {
    // Check official roles in the graydocket schema
    const { data: staffProf } = await adminClient
      .schema('graydocket')
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    
    const metadataRole = (user.user_metadata as RoleMetadata | undefined)?.role
    const role = staffProf?.role || user.app_metadata?.role || metadataRole
    
    if (role === 'admin') {
      isAuthorized = true
    } else if (role === 'registrar') {
      // Registrars can only view if it's assigned to them, or unassigned (and not draft)
      if (rawApp.assigned_to === user.id) {
        isAuthorized = true
      } else if (!rawApp.assigned_to && rawApp.status !== 'draft') {
        isAuthorized = true
      } else {
        isAuthorized = false
      }
    } else if (['bank_manager', 'service_manager'].includes(role)) {
      isAuthorized = true
    } else {
      isAuthorized = false
    }
  }

  if (!isAuthorized) {
    return { application: null, error: 'Unauthorized' }
  }

  const appData = { ...rawApp }

  // 3. Hydration (Pinned to graydocket schema based on provided SQL)
  try {
    const [
      { data: creator },
      { data: reg },
      { data: bType },
      { data: history },
      { data: dbDocs }
    ] = await Promise.all([
      adminClient.schema('graydocket').from('profiles').select('full_name, email, phone').eq('id', appData.user_id).maybeSingle(),
      appData.assigned_to 
        ? adminClient.schema('graydocket').from('profiles').select('id, full_name').eq('id', appData.assigned_to).maybeSingle() 
        : Promise.resolve({ data: null }),
      adminClient.schema('graydocket').from('business_types').select('name').eq('id', appData.business_type_id).maybeSingle(),
      adminClient.schema('graydocket').from('application_status_history').select('*').eq('application_id', appData.id).order('created_at', { ascending: false }),
      adminClient.schema('graydocket').from('documents').select('*').eq('application_id', appData.id)
    ])

    appData.profiles = creator
    appData.assigned_registrar = reg
    appData.business_types = bType

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
  const isAuthorized = await checkIsAdmin(['admin', 'registrar'])
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
  const isAuthorized = await checkIsAdmin(['admin', 'registrar'])
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
    .from('documents')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true
    })

  if (uploadError) return { error: uploadError.message }

  const { data } = adminSupabase.storage.from('documents').getPublicUrl(filePath)
  
  // Append to form_data.documents
  const { data: appData } = await adminSupabase.from('applications').select('form_data').eq('id', id).single()
  const currentFormData = appData?.form_data || {}
  const currentDocs = currentFormData.documents || []
  
  currentDocs.push({
    title,
    url: data.publicUrl,
    uploadedAt: new Date().toISOString()
  })

  currentFormData.documents = currentDocs

  const { error: updateError } = await adminSupabase
    .from('applications')
    .update({ form_data: currentFormData })
    .eq('id', id)

  if (!updateError) {
    await sendDiscordNotification({
      title: '📁 NEW DOCUMENT UPLOADED',
      color: DiscordColors.WARNING,
      fields: [
        { name: 'Document', value: title, inline: true },
        { name: 'Application', value: `\`${id.substring(0, 8)}...\``, inline: true }
      ]
    })
  }

  revalidatePath(`/admin/applications/${id}`)
  revalidatePath(`/dashboard/applications/${id}`)
  return { error: updateError?.message || null, url: data.publicUrl }
}

export async function createAdminUser(userData: { 
  email: string; 
  full_name: string; 
  phone: string;
  role: 'user' | 'admin' | 'registrar' | 'bank_manager' | 'service_manager' 
}) {
  const isSuper = await checkIsAdmin(['admin'])
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
  const isSuper = await checkIsAdmin(['admin'])
  if (!isSuper) return { error: 'Unauthorized' }

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

export async function updateAdminUserProfile(id: string, updates: { full_name: string, phone: string, role?: string }) {
  const isSuper = await checkIsAdmin(['admin'])
  if (!isSuper) return { error: 'Unauthorized' }

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

export async function updateAdminAvatar(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Upload to Supabase Storage (reusing the existing 'documents' bucket for reliability)
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
  const filePath = `avatars/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file)

  if (uploadError) return { error: uploadError.message }

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath)

  // 3. Update Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  revalidatePath('/admin/settings')
  return { error: null, avatarUrl: publicUrl }
}

export async function forceFetchProfile(userId: string) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  let { data: profile } = await adminClient
    .schema('graydocket')
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    // Fallback: Check the public schema in case the user was created before strict schema enforcement
    const { data: publicProfile } = await adminClient
      .schema('public')
      .from('profiles')
      .select('role, full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle()
    
    if (publicProfile) profile = publicProfile
  }

  // Final emergency fallback if they genuinely log in without a profile but shouldn't be locked out
  // This allows them to see the admin dashboard to at least fix their own profile
  if (!profile) profile = { role: 'registrar', full_name: 'Authorized Agent', avatar_url: null }

  return profile
}

export async function assignApplication(applicationId: string, registrarId: string) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // 1. Direct assignment in the 'graydocket' schema
  const { error } = await adminClient
    .from('applications') // Admin client is already locked to 'graydocket' in server.ts
    .update({ assigned_to: registrarId })
    .eq('id', applicationId)

  if (!error) {
    await sendDiscordNotification({
      title: '👤 CASE ASSIGNED',
      color: DiscordColors.INFO,
      fields: [
        { name: 'Application', value: `\`${applicationId.substring(0, 8)}...\``, inline: true },
        { name: 'Registrar ID', value: registrarId, inline: true }
      ]
    })
  }

  if (error) {
    console.error('Assignment error in graydocket schema:', error)
    return { error: error.message }
  }

  // 2. Log History
  await adminClient
    .from('application_status_history')
    .insert({
      application_id: applicationId,
      status: 'under_review',
      notes: 'Application claimed by registrar.',
      updated_by: registrarId
    })

  revalidatePath('/admin/applications')
  revalidatePath(`/admin/applications/${applicationId}`)
  return { error: null }
}

export async function getRegistrarsForAssignment() {
  const isAdmin = await checkIsAdmin(['admin']) // Only Super Admin does forced assignments
  if (!isAdmin) return []

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  const { data } = await adminClient
    .schema('graydocket')
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'registrar')

  return data || []
}

export async function verifyDocument(applicationId: string, documentUrl: string, status: 'approved' | 'rejected', notes?: string) {
  const isAuthorized = await checkIsAdmin(['admin', 'registrar'])
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
    const profile = (application.profiles as PhoneContact | null) || null
    let phoneNumber = (currentFormData.mobilePhone || profile?.phone || '').toString().trim()
    
    // Normalize Ghana numbers (+233)
    if (phoneNumber) {
       phoneNumber = phoneNumber.replace(/\s+/g, '') // Remove spaces
       if (phoneNumber.startsWith('0')) {
          phoneNumber = '+233' + phoneNumber.substring(1)
       } else if (phoneNumber.startsWith('2') && phoneNumber.length === 9) {
          phoneNumber = '+233' + phoneNumber
       } else if (!phoneNumber.startsWith('+')) {
          if (phoneNumber.startsWith('233') && phoneNumber.length === 12) {
             phoneNumber = '+' + phoneNumber
          }
       }
    }

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

export async function getPulseAnalytics() {
  const isAuthorized = await checkIsAdmin(['admin'])
  if (!isAuthorized) return null

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // 1. Stale / Urgent Applications (Unassigned for > 6 hours)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { count: urgentCount } = await adminClient
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .is('assigned_to', null)
    .gt('created_at', sixHoursAgo)

  // 2. Total Revenue this month
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data: revenueData } = await adminClient
    .from('applications')
    .select('total_amount')
    .eq('payment_status', 'paid')
    .gt('created_at', firstOfMonth)
  
  const monthlyRevenue = revenueData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0

  // 3. Registrar Performance (Cases this month)
  const { data: performance } = await adminClient
    .schema('graydocket')
    .from('profiles')
    .select('id, full_name, role, applications!assigned_to(id)')
    .eq('role', 'registrar')

  const registrarStats = (performance as ProfileApplicationsRow[] | null)?.map(r => ({
    name: r.full_name,
    activeCases: r.applications?.length || 0
  }))

  return {
    urgentCount: urgentCount || 0,
    monthlyRevenue,
    registrarStats: registrarStats || []
  }
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
  const isAuthorized = await checkIsAdmin(['admin', 'registrar'])
  if (!isAuthorized) return { error: 'Unauthorized: Access restricted to registrars.' }

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

  // 3. Update application status to 'rejected'
  const { error: updateErr } = await adminClient
    .from('applications')
    .update({ 
      form_data: formData,
      status: 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('id', applicationId)

  if (updateErr) return { error: updateErr.message }

  // Notify on correction request
  await sendDiscordNotification({
    title: '🚩 CORRECTION REQUESTED',
    color: DiscordColors.DANGER,
    fields: [
      { name: 'Field', value: `\`${fieldKey}\``, inline: true },
      { name: 'Reason', value: reason, inline: false },
      { name: 'Application', value: `\`${applicationId.substring(0, 8)}...\``, inline: true }
    ]
  })

  // 4. Log to history
  const { data: { user: adminUser } } = await adminClient.auth.getUser()
  await adminClient
    .from('application_status_history')
    .insert({
      application_id: applicationId,
      status: 'rejected',
      notes: `CORRECTION REQUIRED on field: ${fieldKey}. Reason: ${reason}`,
      updated_by: adminUser?.id
    })

  // 5. Send SMS Notification
  if (process.env.ZEND_API_KEY) {
    const profile = (application.profiles as PhoneContact | null) || null
    const phoneNumber = formatPhoneNumber(profile?.phone || '')
    if (phoneNumber) {
      const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'}/dashboard/applications/${applicationId}`
      const message = `Urgent GrayDocket Alert: A correction is required for your application "${application.business_name}". Please log in to your dashboard to resolve: ${trackingLink}`
      
      try {
        await fetch('https://api.tryzend.com/messages', {
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
      } catch (err) {
        console.error('Failed to send correction SMS:', err)
      }
    }
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
    .select('user_id, status, form_data')
    .eq('id', applicationId)
    .single()

  if (!app || app.user_id !== user.id) return { error: 'Unauthorized: You do not have permission to edit this record.' }

  // 2. Prepare new form data (clearing old corrections)
  const newFormData = { ...formData }
  if (newFormData.corrections) {
      delete newFormData.corrections
  }

  // 3. Update application
  const { error: updateErr } = await supabase
    .from('applications')
    .update({
      form_data: newFormData,
      status: 'submitted', 
      updated_at: new Date().toISOString()
    })
    .eq('id', applicationId)

  if (updateErr) return { error: updateErr.message }

  await sendDiscordNotification({
    title: '🔁 APPLICATION RESUBMITTED',
    color: DiscordColors.INFO,
    fields: [
      { name: 'Tracking ID', value: `\`${applicationId.substring(0, 8)}...\``, inline: true },
      { name: 'Business', value: ('business_name' in app && typeof app.business_name === 'string' ? app.business_name : 'N/A'), inline: true }
    ]
  })

  // 4. Log to history
  await supabase.from('application_status_history').insert({
    application_id: applicationId,
    status: 'submitted',
    notes: 'Application resubmitted after requested institutional corrections.',
    updated_by: user.id
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/applications')
  revalidatePath(`/dashboard/applications/${applicationId}`)
  
  return { success: true }
}

export async function adminCreateApplication(data: {
  userId: string
  businessTypeId: string
  businessName: string
  status: string
  totalAmount: number
  paymentStatus: string
}) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  const trackingId = generateTrackingId()

  const payload: ApplicationPayload = {
    user_id: data.userId,
    business_type_id: data.businessTypeId,
    tracking_id: trackingId,
    business_name: data.businessName,
    status: data.status,
    form_data: { 
      total_amount: data.totalAmount,
      admin_created: true
    },
    total_amount: data.totalAmount,
    payment_status: data.paymentStatus,
    referred_by_id: null,
    updated_at: new Date().toISOString()
  }

  const { data: inserted, error } = await adminClient
    .schema('graydocket')
    .from('applications')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Admin Application insert error:', error)
    return { error: error.message }
  }

  await adminClient.schema('graydocket').from('application_status_history').insert({
    application_id: inserted.id,
    status: data.status,
    notes: `Application manually created by admin.`,
    updated_by: null // we don't strictly have the admin ID easily here, but could pull from session
  })

  revalidatePath('/admin/applications')

  return { success: true, trackingId, applicationId: inserted.id }
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
