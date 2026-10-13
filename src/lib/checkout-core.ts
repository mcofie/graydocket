// Server-only payment plumbing shared by checkout (src/lib/checkout.ts) and the Paystack webhook.
//
// When we take money: at the end of the registration form, after the customer has reviewed
// everything and the application is saved. The server sets the amount (from the shared pricing
// helpers) and the payment reference, and the application is only submitted to our team once
// Paystack confirms the payment, whether that confirmation arrives from the browser or the webhook.

import { createAdminClient } from '@/lib/supabase/server'
import { formatPhoneNumber } from '@/lib/sms'
import { notify, money, code, adminApplicationLink } from '@/lib/discord'

export function generateTrackingId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `GD-${timestamp}-${random}`
}

export function hasPaystackSecretKey() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_'))
}

/** Ask Paystack what actually happened with a payment */
export async function verifyPaystackTransaction(reference: string) {
  if (!hasPaystackSecretKey()) return { ok: false as const, error: 'Payments aren’t configured on the server.' }
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    const body = await res.json()
    if (!body?.status || body.data?.status !== 'success') {
      return { ok: false as const, error: 'Paystack hasn’t confirmed this payment yet.' }
    }
    return { ok: true as const, amount: Number(body.data.amount) / 100, currency: String(body.data.currency) }
  } catch {
    return { ok: false as const, error: 'We couldn’t reach Paystack to confirm the payment.' }
  }
}

/** Text someone through Zend. Resolves true when Zend accepted the message. */
export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!process.env.ZEND_API_KEY || !to) return false
  try {
    const res = await fetch('https://api.tryzend.com/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ZEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: formatPhoneNumber(to), body, preferred_channels: ['sms'], sender_id: 'GrayDocket' }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) console.error('SMS failed: Zend responded', res.status)
    return res.ok
  } catch (err) {
    console.error('SMS failed:', err instanceof Error ? err.message : err)
    return false
  }
}

// Add-on ids in the form mapped to services table names (lower_snake_case)
const ADD_ON_SERVICE: Record<string, string> = {
  domain: 'domain_name_purchase',
  email: 'business_email_setup',
  website: 'business_website',
  bank: 'bank_account_setup',
}

export type FinalizeResult = { ok: true; trackingId: string; alreadyPaid: boolean } | { ok: false; error: string }

/**
 * Mark an application as paid and hand it to the team. Safe to call more than once (browser
 * confirmation and webhook may both arrive): only the first call does the work.
 */
export async function finalizePaidApplication(
  applicationId: string,
  reference: string,
  amountPaid: number,
  currency: string,
  source: 'checkout' | 'webhook' | 'admin',
  /** For payments the team records by hand (cash, mobile money, bank transfer): who recorded it and how it was paid */
  recorded?: { by: string; method: string }
): Promise<FinalizeResult> {
  const admin = await createAdminClient()
  const { data: app } = await admin
    .from('applications')
    .select('id, user_id, status, payment_status, total_amount, tracking_id, business_name, form_data, referred_by_id, business_types(name)')
    .eq('id', applicationId)
    .maybeSingle()

  if (!app) return { ok: false, error: 'Application not found.' }
  if (app.payment_status === 'paid') return { ok: true, trackingId: app.tracking_id, alreadyPaid: true }

  const expected = Number(app.total_amount) || 0
  if (currency !== 'GHS' || amountPaid + 0.005 < expected) {
    notify({
      channel: 'alerts',
      title: '🚨 Payment amount mismatch',
      summary: 'Paystack confirmed a payment that doesn’t match the application total. It was not marked as paid.',
      application: { id: app.id },
      fields: [
        ['Expected', money(expected)],
        ['Received', `${amountPaid.toLocaleString()} ${currency}`],
        ['Reference', code(reference), false],
        ['Seen by', source === 'webhook' ? 'Paystack webhook' : source === 'admin' ? 'Admin' : 'Checkout'],
      ],
    })
    return { ok: false, error: 'The payment amount didn’t match. Our team has been alerted and will sort it out.' }
  }

  // Drafts get their permanent tracking ID once paid
  const trackingId = String(app.tracking_id || '').startsWith('DRAFT-') || !app.tracking_id ? generateTrackingId() : app.tracking_id
  const now = new Date().toISOString()

  // Only the first confirmation flips pending → paid; a second one finds nothing to update
  const { data: updated } = await admin
    .from('applications')
    .update({
      payment_status: 'paid',
      status: app.status === 'draft' ? 'submitted' : app.status,
      paystack_reference: reference,
      tracking_id: trackingId,
      updated_at: now,
    })
    .eq('id', app.id)
    .eq('payment_status', 'pending')
    .select('id')
  if (!updated || updated.length === 0) return { ok: true, trackingId, alreadyPaid: true }

  const typeName = (app.business_types as { name?: string } | null)?.name || 'Registration'
  const form = (app.form_data || {}) as Record<string, unknown>

  await admin.from('application_status_history').insert({
    application_id: app.id,
    status: 'submitted',
    notes: recorded
      ? `${money(amountPaid)} paid by ${recorded.method}, recorded by the GrayDocket team (ref ${reference})`
      : `Paid ${money(amountPaid)} and submitted for review (Paystack ref ${reference})`,
    updated_by: recorded?.by || app.user_id,
  })

  await admin
    .from('paystack_webhook_events')
    .update({ application_id: app.id, processed_at: now, updated_at: now })
    .eq('reference', reference)
    .is('application_id', null)

  // Record the add-ons that were paid for
  const addOnIds = Array.isArray(form.selectedAddOns) ? (form.selectedAddOns as string[]) : []
  if (addOnIds.length > 0) {
    const { data: services } = await admin.from('services').select('id, name, price')
    const rows = (services || [])
      .filter((s: { name: string }) => addOnIds.some((id) => ADD_ON_SERVICE[id] === s.name.toLowerCase().trim().replace(/\s+/g, '_')))
      .map((s: { id: string; price: number }) => ({ application_id: app.id, service_id: s.id, price: s.price }))
    if (rows.length > 0) await admin.from('application_services').insert(rows)
  }

  if (app.referred_by_id) {
    const { processAffiliateCommission } = await import('@/lib/actions')
    await processAffiliateCommission(app.id)
  }

  notify({
    channel: 'payments',
    title: `💰 Paid application · ${app.business_name}`,
    summary: `${typeName} registration paid and submitted. Ready for review.`,
    link: adminApplicationLink(app.id),
    user: { id: app.user_id },
    fields: [
      ['Amount', money(amountPaid)],
      ['Type', typeName],
      ['Delivery', (app.form_data as { delivery_method?: string } | null)?.delivery_method === 'courier' ? 'Courier' : 'Digital'],
      ['Tracking ID', code(trackingId)],
      [recorded ? 'Reference' : 'Paystack ref', code(reference)],
      ['Paid by', recorded?.method],
      ['Add-ons', addOnIds.length ? addOnIds.join(', ') : null, false],
      ['Confirmed by', source === 'webhook' ? 'Paystack webhook' : source === 'admin' ? 'Recorded by an admin' : 'Checkout'],
    ],
  })

  // Texts: the customer, then the admin team
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'
  const customerPhone = String(form.mobilePhone || form.phone || '')
  await sendSms(customerPhone, `Payment received! Your GrayDocket application for "${app.business_name}" is now with our team. Track it here: ${appUrl}/track/${trackingId}`)
  const { data: admins } = await admin.from('profiles').select('phone').eq('role', 'admin')
  const adminPhones = [...new Set((admins || []).map((a: { phone: string | null }) => a.phone).filter(Boolean))] as string[]
  await Promise.all(adminPhones.map((p) => sendSms(p, `New paid application: ${app.business_name} (${typeName}). Open the admin to start it.`)))

  return { ok: true, trackingId, alreadyPaid: false }
}
