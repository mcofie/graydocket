'use server'

// Checkout: save the application, price it on the server, take payment, then submit.
//
//   1. startCheckout   saves (or updates) the customer's draft with the server-calculated total
//                      and a fresh payment reference, and returns what Paystack needs
//   2. Paystack        the customer pays that exact amount against that reference
//   3. confirmPayment  verifies with Paystack and submits the application to our team
//
// If the browser closes after paying, the Paystack webhook finds the draft by its reference and
// finishes step 3, so nobody pays without an application.

import { createClient } from '@/lib/supabase/server'
import { quoteApplication, type DbBusinessType } from '@/app/dashboard/applications/new/pricing'
import { applicationIssues, describeIssues } from '@/app/dashboard/applications/new/validation'
import { applyInviteAnswers } from '@/lib/director-invites'
import { businessTypes } from '@/app/dashboard/applications/new/constants'
import { finalizePaidApplication, verifyPaystackTransaction } from '@/lib/checkout-core'

type CheckoutInput = {
  typeId: string
  businessName: string
  formData: Record<string, unknown>
  selectedAddOns: string[]
  deliveryMethod: 'digital' | 'courier'
  deliveryAddress: Record<string, unknown> | null
  affiliateCode?: string
  /** The saved draft this checkout is for; without it a new application is created */
  applicationId?: string | null
}

type CheckoutStart =
  | { error: string }
  | { error: null; applicationId: string; reference: string; amount: number; email: string }

const newReference = (applicationId: string) => `GD-${applicationId.slice(0, 8)}-${Date.now().toString(36)}`.toUpperCase()

async function priceOnServer(typeId: string, addOnIds: string[], delivery: 'digital' | 'courier') {
  const supabase = await createClient()
  const [{ data: types }, { data: services }] = await Promise.all([
    supabase.from('business_types').select('*').eq('is_active', true),
    supabase.from('services').select('name, price, is_active'),
  ])
  return quoteApplication({ typeId, addOnIds, delivery }, (types || []) as DbBusinessType[], services || [])
}

/** Step 1: save the application as a priced draft and get a payment reference for it */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutStart> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please log in again to continue.' }

  if (!businessTypes.some((t) => t.id === input.typeId)) return { error: 'Please choose a business type.' }
  if (!input.businessName?.trim()) return { error: 'Please enter a business name.' }

  const addOnIds = Array.isArray(input.selectedAddOns) ? input.selectedAddOns.filter((a) => typeof a === 'string') : []
  const delivery = input.deliveryMethod === 'courier' ? 'courier' : 'digital'
  const quote = await priceOnServer(input.typeId, addOnIds, delivery)
  if (!quote.dbTypeId || quote.total <= 0) return { error: 'Pricing for this business type isn’t available right now. Please try again shortly.' }

  let referredById: string | null = null
  if (input.affiliateCode) {
    const { data: partner } = await supabase
      .from('profiles')
      .select('id')
      .eq('affiliate_code', input.affiliateCode.trim().toUpperCase())
      .eq('is_affiliate', true)
      .maybeSingle()
    if (partner && partner.id !== user.id) referredById = partner.id
  }

  // The draft being paid for, if it's still the customer's own unpaid draft. Matched by id only, so a
  // second registration of the same type never overwrites the first.
  const { data: existing } = input.applicationId
    ? await supabase
        .from('applications')
        .select('id, tracking_id')
        .eq('id', input.applicationId)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .neq('payment_status', 'paid')
        .maybeSingle()
    : { data: null }

  // Directors sent a link: use their answers, and wait for anyone who hasn't replied
  const { directors, pending } = await applyInviteAnswers(existing?.id, input.formData.directors)
  if (pending.length > 0) {
    return { error: `Waiting for ${pending.join(' and ')} to add their details. You can pay once they have.` }
  }

  // The same checks as the forms (required details, formats, everyone 18 or older)
  const issues = applicationIssues({ ...input.formData, directors }, input.typeId)
  if (issues.length > 0) return { error: describeIssues(issues) }

  const record = {
    user_id: user.id,
    business_type_id: quote.dbTypeId,
    business_name: input.businessName.trim(),
    status: 'draft',
    payment_status: 'pending',
    total_amount: quote.total,
    referred_by_id: referredById,
    form_data: {
      ...input.formData,
      ...(Array.isArray(input.formData.directors) ? { directors } : {}),
      // Delivery lives in form_data: the applications table has no delivery columns
      businessType: input.typeId,
      selectedAddOns: addOnIds,
      delivery_method: delivery,
      delivery_address: delivery === 'courier' ? input.deliveryAddress : null,
      total_amount: quote.total,
      price_lines: quote.lines,
      // Reviewed and priced: the dashboard offers "Complete payment" instead of "Continue"
      ready_for_payment: true,
    },
    updated_at: new Date().toISOString(),
  }

  let applicationId = existing?.id
  if (applicationId) {
    const { error } = await supabase.from('applications').update(record).eq('id', applicationId)
    if (error) return { error: 'We couldn’t save your application. Please try again.' }
  } else {
    const trackingId = `DRAFT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    const { data: created, error } = await supabase
      .from('applications')
      .insert({ ...record, tracking_id: trackingId })
      .select('id')
      .single()
    if (error || !created) return { error: 'We couldn’t save your application. Please try again.' }
    applicationId = created.id
  }

  // A fresh reference per attempt; the webhook matches payments to applications by it
  const reference = newReference(applicationId!)
  const { error: refError } = await supabase
    .from('applications')
    .update({ paystack_reference: reference, form_data: { ...record.form_data, paystack_reference: reference } })
    .eq('id', applicationId!)
  if (refError) return { error: 'We couldn’t start the payment. Please try again.' }

  const email = String(input.formData.email || user.email || '')
  return { error: null, applicationId: applicationId!, reference, amount: quote.total, email: email || `${user.id}@graydocket.user` }
}

/** Step 1 again for a saved, unpaid application (e.g. "Complete payment" on the dashboard) */
export async function resumeCheckout(applicationId: string): Promise<CheckoutStart> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please log in again to continue.' }

  const { data: app } = await supabase
    .from('applications')
    .select('id, user_id, business_name, form_data, payment_status')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!app) return { error: 'Application not found.' }
  if (app.payment_status === 'paid') return { error: 'This application is already paid.' }

  const form = (app.form_data || {}) as Record<string, unknown>
  return startCheckout({
    applicationId: app.id,
    typeId: String(form.businessType || ''),
    businessName: app.business_name,
    formData: form,
    selectedAddOns: Array.isArray(form.selectedAddOns) ? (form.selectedAddOns as string[]) : [],
    deliveryMethod: form.delivery_method === 'courier' ? 'courier' : 'digital',
    deliveryAddress: (form.delivery_address as Record<string, unknown> | null) ?? null,
  })
}

/** Step 3: verify the payment with Paystack and submit the application */
export async function confirmPayment(applicationId: string, reference: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please log in again. Your payment is safe and will be confirmed automatically.' }

  const { data: app } = await supabase
    .from('applications')
    .select('id, paystack_reference')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!app) return { error: 'Application not found.' }
  if (app.paystack_reference !== reference) return { error: 'That payment doesn’t belong to this application.' }

  const verified = await verifyPaystackTransaction(reference)
  if (!verified.ok) {
    return { error: `${verified.error} If you were charged, don’t worry: we’ll confirm it automatically within a few minutes.` }
  }

  const result = await finalizePaidApplication(app.id, reference, verified.amount, verified.currency, 'checkout')
  if (!result.ok) return { error: result.error }
  return { error: null, trackingId: result.trackingId }
}
