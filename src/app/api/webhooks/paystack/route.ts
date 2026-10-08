import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

function hasValidPaystackSecretKey() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_'));
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!hasValidPaystackSecretKey() || !secret) {
      console.error('PAYSTACK_SECRET_KEY is not defined');
      return new Response('Configuration Error', { status: 500 });
    }

    // 1. Verify Signature
    const hash = crypto
      .createHmac('sha512', secret)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      return new Response('Invalid Signature', { status: 401 });
    }

    // 2. Parse Event
    const event = JSON.parse(body);
    const adminClient = await createAdminClient();

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const actualAmountPesewas = data.amount;
      const currency = data.currency;

      await adminClient
        .from('paystack_webhook_events')
        .upsert(
          {
            event_type: event.event,
            reference,
            payload: event,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'event_type,reference' }
        );

      // 3. Find Application by Reference inside form_data
      // We use the admin client to bypass RLS and search globally
      const { data: app, error: fetchError } = await adminClient
        .from('applications')
        .select('id, total_amount, status, payment_status')
        .eq('paystack_reference', reference)
        .maybeSingle();

      const fallbackLookup = (!app && !fetchError)
        ? await adminClient
            .from('applications')
            .select('id, total_amount, status, payment_status')
            .filter('form_data->>paystack_reference', 'eq', reference)
            .maybeSingle()
        : null;

      const legacyFallbackLookup = (!app && !fetchError && !fallbackLookup?.data)
        ? await adminClient
            .from('applications')
            .select('id, total_amount, status, payment_status')
            .filter('form_data->>paystackReference', 'eq', reference)
            .maybeSingle()
        : null;

      const matchedApplication = legacyFallbackLookup?.data || fallbackLookup?.data || app;
      const matchedFetchError = legacyFallbackLookup?.error || fallbackLookup?.error || fetchError;

      if (matchedFetchError || !matchedApplication) {
        console.warn(`Paystack Webhook: Application not found for reference ${reference}`);
        return NextResponse.json({ received: true }); // Always return 200 to Paystack to stop retries
      }

      // 4. Integrity Check (Security fallback)
      const expectedAmountPesewas = Math.round(matchedApplication.total_amount * 100);
      if (actualAmountPesewas < expectedAmountPesewas || currency !== 'GHS') {
        const { notify, money, code } = await import('@/lib/discord');
        notify({
          channel: 'alerts',
          title: '🚨 Paystack amount mismatch',
          summary: 'Paystack reported a successful payment, but the amount or currency is wrong. The application was not marked as paid.',
          application: { id: matchedApplication.id },
          fields: [
            ['Expected', money(expectedAmountPesewas / 100)],
            ['Received', `${(actualAmountPesewas / 100).toLocaleString()} ${currency || '?'}`],
            ['Paystack ref', code(reference), false],
          ],
        });
        console.warn(`Paystack Webhook: Integrity violation for reference ${reference}. Expected ${expectedAmountPesewas} GHS, got ${actualAmountPesewas} ${currency}`);
        return NextResponse.json({ received: true });
      }

      // 5. Update Status
      const { error: updateError } = await adminClient
        .from('applications')
        .update({ 
          paystack_reference: reference,
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', matchedApplication.id);

      if (updateError) {
        console.error(`Paystack Webhook: Update failed for app ${matchedApplication.id}:`, updateError.message);
        return new Response('Internal Server Error', { status: 500 });
      }

      await adminClient
        .from('paystack_webhook_events')
        .update({
          application_id: matchedApplication.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('event_type', event.event)
        .eq('reference', reference);

      // 6. Record Affiliate Commission
      const { processAffiliateCommission } = await import('@/lib/actions');
      await processAffiliateCommission(matchedApplication.id);
      
      // 7. Optional: Log to History
      if (matchedApplication.payment_status !== 'paid') {
        const { notify, money, code } = await import('@/lib/discord');
        notify({
          channel: 'payments',
          title: `💰 Payment confirmed · ${money(actualAmountPesewas / 100)}`,
          summary: 'Paystack confirmed a payment that was still pending. The application is now paid.',
          application: { id: matchedApplication.id },
          fields: [['Paystack ref', code(reference), false]],
        });
        await adminClient.from('application_status_history').insert({
          application_id: matchedApplication.id,
          status: matchedApplication.status,
          notes: `Payment verified via Paystack Webhook (Ref: ${reference})`,
          created_at: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Paystack Webhook Error:', message);
    return new Response('Webhook Error', { status: 400 });
  }
}
