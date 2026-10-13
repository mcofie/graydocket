import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { finalizePaidApplication, hasPaystackSecretKey } from '@/lib/checkout-core';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!hasPaystackSecretKey() || !secret) {
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

      // 3. Find the application this payment belongs to (references are set by checkout)
      const { data: app } = await adminClient
        .from('applications')
        .select('id')
        .eq('paystack_reference', reference)
        .maybeSingle();

      const legacy = !app
        ? await adminClient
            .from('applications')
            .select('id')
            .or(`form_data->>paystack_reference.eq.${reference},form_data->>paystackReference.eq.${reference}`)
            .limit(1)
            .maybeSingle()
        : null;

      const applicationId = app?.id || legacy?.data?.id;
      if (!applicationId) {
        console.warn(`Paystack Webhook: Application not found for reference ${reference}`);
        return NextResponse.json({ received: true }); // 200 so Paystack stops retrying; the event is stored above
      }

      // 4. Same finalisation as checkout: checks the amount, marks paid, submits, notifies. Idempotent.
      const result = await finalizePaidApplication(applicationId, reference, actualAmountPesewas / 100, currency, 'webhook');
      if (!result.ok) console.warn(`Paystack Webhook: ${result.error} (reference ${reference})`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Paystack Webhook Error:', message);
    return new Response('Webhook Error', { status: 400 });
  }
}
