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
}) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'You must be logged in to submit an application.' }
  }

  const trackingId = generateTrackingId()

  // Insert the application
  const { data: application, error: appError } = await supabase
    .from('applications')
    .insert({
      user_id: user.id,
      business_type_id: data.businessTypeId,
      tracking_id: trackingId,
      business_name: data.businessName,
      status: 'submitted',
      form_data: data.formData,
      total_amount: data.totalAmount,
      payment_status: 'pending',
    })
    .select()
    .single()

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

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/applications')

  return { success: true, trackingId, applicationId: application.id }
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


async function checkIsAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
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

  return {
    appCount: appCount || 0,
    userCount: userCount || 0,
    completedCount: completedCount || 0,
    recentApps: recentApps || [],
    revenue: 0,
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

export async function getAdminUsers() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { users: [], error: 'Unauthorized' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return { users: data || [], error: error?.message || null }
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
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)

  revalidatePath('/admin/services')
  return { error: error?.message || null }
}

export async function updateBusinessType(id: string, updates: any) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('business_types')
    .update(updates)
    .eq('id', id)

  revalidatePath('/admin/pricing')
  return { error: error?.message || null }
}

export async function updateBankingPartner(id: string, updates: any) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('banking_partners')
    .update(updates)
    .eq('id', id)

  revalidatePath('/admin/banking')
  return { error: error?.message || null }
}

export async function updateApplicationStatus(id: string, status: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  // Log to history
  await supabase
    .from('application_status_history')
    .insert({
      application_id: id,
      previous_status: '...',
      new_status: status,
      notes: `Updated by Admin`
    })

  revalidatePath('/admin/applications')
  revalidatePath('/dashboard')
  return { error: null }
}

export async function updateUserRole(id: string, role: 'user' | 'admin') {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return { error: 'Unauthorized' }

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




