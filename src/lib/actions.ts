'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function generateTrackingId(): string {
  const prefix = 'GD'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export async function submitApplication(data: {
  businessTypeId: string
  businessTypeName: string
  businessName: string
  formData: Record<string, unknown>
  selectedAddOns: string[]
  totalAmount: number
  deliveryMethod: string
  deliveryAddress: any
  affiliateCode?: string
  paystackReference?: string
}) {
  const supabase = await createClient()

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

  const applicationPayload: any = {
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
      paystack_reference: data.paystackReference
    },
    total_amount: data.totalAmount,
    payment_status: data.paystackReference ? 'paid' : 'pending',
    referred_by_id: referredById,
    updated_at: new Date().toISOString()
  }

  // We add these conditionally because they might not exist in older app schemas
  // but if they do, we want them searchable. If they don't, Supabase might error 
  // unless we remove them if the schema cache is stale.
  // Given the error reported, we'll stick to form_data as the source of truth.
  // (Alternatively, we keep them but wrap in try/catch or suppress errors, 
  // but Supabase JS doesn't make that easy without a schema check.)
  
  // For now, we'll try to include them but the primary data is now in form_data.
  // If the user hasn't run the migration, this might still error, so we'll 
  // If the user hasn't run the migration, this might still error, so we'll 
  // actually remove them if we are certain they are missing.
  // Let's remove 'delivery_address' and 'delivery_method' since they are in form_data.
  // applicationPayload.delivery_method = data.deliveryMethod;
  // applicationPayload.delivery_address = data.deliveryAddress; // confirmed missing


  // Check for existing draft to promote
  const { data: existingDraft } = await supabase
    .from('applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_type_id', data.businessTypeId)
    .eq('status', 'draft')
    .single()

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

  // --- Send SMS Notification ---
  if (data.paystackReference && process.env.ZEND_API_KEY) {
    const phoneNumber = data.formData.mobilePhone as string
    if (phoneNumber) {
      const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'}/track/${trackingId}`
      const message = `Payment received! Your GrayDocket application for "${data.businessName}" is processing. Track your status here: ${trackingLink}`
      
      try {
        await fetch('https://api.tryzend.com/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ZEND_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone_number: phoneNumber,
            message: message,
            sender_id: 'GrayDocket'
          })
        })
      } catch (err) {
        console.error('Failed to send SMS via Zend:', err)
      }
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
  deliveryAddress: any
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

  const payload: any = {
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile && requiredRoles.includes(profile.role)
}

export async function getAdminStats() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return null

  const supabase = await createClient()

  // Get total applications
  const { count: appCount } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })

  // Get total users
  const { count: userCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  // Get completed applications
  const { count: completedCount } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')

  // Get recent applications
  const { data: recentApps } = await supabase
    .from('applications')
    .select(`
      *,
      profiles:user_id (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // Calculate revenue from completed applications
  const { data: apps } = await supabase
    .from('applications')
    .select('total_amount')
    .eq('status', 'completed')

  const revenue = apps?.reduce((sum, a) => sum + (Number(a.total_amount) || 0), 0) || 0

  return {
    appCount: appCount || 0,
    userCount: userCount || 0,
    completedCount: completedCount || 0,
    recentApps: recentApps || [],
    revenue,
  }
}

export async function getAdminApplications() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { applications: [], error: 'Unauthorized' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      profiles:user_id (full_name, email),
      business_types:business_type_id (name)
    `)
    .order('created_at', { ascending: false })

  return { applications: data || [], error: error?.message || null }
}

export async function getAdminPayments() {
  const isAdmin = await checkIsAdmin(['admin'])
  if (!isAdmin) return { payments: [], error: 'Unauthorized' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('applications')
    .select('id, tracking_id, business_name, total_amount, payment_status, created_at, updated_at, profiles:user_id(full_name, email)')
    .eq('payment_status', 'paid')
    .order('updated_at', { ascending: false })

  return { payments: data || [], error: error?.message || null }
}

export async function getAdminAffiliates() {
  const isAdmin = await checkIsAdmin(['admin'])
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

  return { affiliates: profiles || [], error: null }
}

export async function getAdminUsers() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { users: [], error: 'Unauthorized' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*, applications(id)')
    .order('created_at', { ascending: false })

  if (error) return { users: [], error: error.message }

  // Supabase Auth stores all users across the project. 
  // We filter to only show users who have actually interacted with GrayDocket.
  const appUsers = data.filter((u: any) => 
    (u.applications && u.applications.length > 0) || 
    u.role !== 'user' || 
    u.is_affiliate
  )

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
export async function updateService(id: string, updates: any) {
  const isAuthorized = await checkIsAdmin(['admin', 'service_manager'])
  if (!isAuthorized) return { error: 'Unauthorized: Service Manager access required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)

  revalidatePath('/admin/services')
  return { error: error?.message || null }
}

export async function updateBusinessType(id: string, updates: any) {
  const isAuthorized = await checkIsAdmin(['admin', 'service_manager'])
  if (!isAuthorized) return { error: 'Unauthorized: Pricing Manager access required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('business_types')
    .update(updates)
    .eq('id', id)

  revalidatePath('/admin/pricing')
  return { error: error?.message || null }
}

export async function updateBankingPartner(id: string, updates: any) {
  const isAuthorized = await checkIsAdmin(['admin', 'bank_manager'])
  if (!isAuthorized) return { error: 'Unauthorized: Bank Manager access required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('banking_partners')
    .update(updates)
    .eq('id', id)

  revalidatePath('/admin/banking')
  return { error: error?.message || null }
}

export async function updateApplicationStatus(id: string, status: string) {
  const isAuthorized = await checkIsAdmin(['admin', 'registrar'])
  if (!isAuthorized) return { error: 'Unauthorized: Registrar access required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  // Fetch full application for history, commission, and SMS
  const { data: application } = await supabase
    .from('applications')
    .select('*, business_types(*), profiles(phone)')
    .eq('id', id)
    .single()

  // Fetch current user
  const { data: { user } } = await supabase.auth.getUser()

  // Log to history
  await supabase
    .from('application_status_history')
    .insert({
      application_id: id,
      status: status,
      notes: `Status changed to ${status.toUpperCase().replace('_', ' ')}`,
      updated_by: user?.id
    })

  // ---- SMS Notification via Zend ----
  if (application && process.env.ZEND_API_KEY) {
    const phoneNumber = application.form_data?.mobilePhone || application.profiles?.phone
    if (phoneNumber) {
      const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'}/track/${application.tracking_id}`
      const statusFormatted = status.toUpperCase().replace('_', ' ')
      const message = `GrayDocket: Your application "${application.business_name}" is now ${statusFormatted}. Track here: ${trackingLink}`
      
      try {
        await fetch('https://api.tryzend.com/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ZEND_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone_number: phoneNumber,
            message: message,
            sender_id: 'GrayDocket'
          })
        }).catch(() => null)
      } catch (err) {
        console.error('Failed to send SMS via Zend:', err)
      }
    }
  }

  // ---- Handle Commissions on completion ----
  if (status === 'completed' && application && application.referred_by_id) {
     // Logic: Commission = 20% of GrayDocket Service Fee (or flat rate)
     const serviceFee = application.business_types?.service_fee || 0
     const commissionAmount = serviceFee * 0.2 // Example 20% commission

     if (commissionAmount > 0) {
       // Check if commission already exists
       const { data: existing } = await supabase
         .from('commissions')
         .select('id')
         .eq('application_id', id)
         .single()
         
       if (!existing) {
         await supabase.from('commissions').insert({
           affiliate_id: application.referred_by_id,
           application_id: id,
           amount: commissionAmount,
           status: 'pending'
         })
       }
     }
  }

  revalidatePath(`/admin/applications/${id}`)
  revalidatePath('/admin/applications')
  revalidatePath('/dashboard')
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

  revalidatePath('/admin/users')
  return { error: error?.message || null }
}

export async function createService(service: any) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('services')
    .insert(service)

  revalidatePath('/admin/services')
  return { error: error?.message || null }
}

export async function createBankingPartner(partner: any) {
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
    .select('*')
    .eq('affiliate_id', user.id)

  const pending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0) || 0
  const earned = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0) || 0
  
  const { count: referrals } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by_id', user.id)

  return {
    pendingEarnings: pending,
    totalEarned: earned,
    referralCount: referrals || 0,
    commissions: commissions || []
  }
}

export async function markUserAsAffiliate(userId: string, isAffiliate: boolean) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  
  // Generate random 6 char code if enabling
  let updates: any = { is_affiliate: isAffiliate }
  if (isAffiliate) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    updates.affiliate_code = code
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

  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_affiliate: true, 
      affiliate_code: code 
    })
    .eq('id', user.id)

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

  revalidatePath('/dashboard/affiliate')
  return { error: error?.message || null }
}

export async function getApplicationDetails(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      profiles:user_id(full_name, email, phone),
      business_types:business_type_id(name),
      application_status_history(id, status, notes, created_at, updater:profiles!updated_by(full_name))
    `)
    .eq('id', id)
    .single()
    
  // Sort history newest first
  if (data && data.application_status_history) {
    data.application_status_history.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
    
  return { application: data, error: error?.message || null }
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return { error: 'Server misconfiguration' }

  // We use service_role here to bypass any non-existent RLS policies for storage we haven't written yet
  const { createClient: createJSClient } = await import('@supabase/supabase-js')
  const adminSupabase = createJSClient(supabaseUrl, supabaseKey)

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

  revalidatePath(`/admin/applications/${id}`)
  return { error: updateError?.message || null, url: data.publicUrl }
}
