'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePaystackPayment } from 'react-paystack'
import { ArrowRight } from 'lucide-react'
import { resumeCheckout, confirmPayment } from '@/lib/checkout'

/**
 * Pay for a saved, unpaid application. The server re-prices it and issues a fresh reference
 * (src/lib/checkout.ts), so the amount always matches current pricing.
 */
export default function PayNowButton({ applicationId, label = 'Complete payment' }: { applicationId: string; label?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const initializePayment = usePaystackPayment({ publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '', currency: 'GHS' })

  const pay = async () => {
    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      setError('Payments aren’t set up yet. Please contact support.')
      return
    }
    setBusy(true)
    setError('')
    const checkout = await resumeCheckout(applicationId)
    if (checkout.error !== null) {
      setError(checkout.error)
      setBusy(false)
      return
    }
    initializePayment({
      config: {
        email: checkout.email,
        amount: Math.round(checkout.amount * 100),
        reference: checkout.reference,
        currency: 'GHS',
        metadata: { application_id: checkout.applicationId, custom_fields: [] },
      },
      onSuccess: async (response?: { reference?: string }) => {
        const confirmed = await confirmPayment(checkout.applicationId, response?.reference || checkout.reference)
        if (confirmed.error) setError(confirmed.error)
        setBusy(false)
        router.refresh()
      },
      onClose: () => {
        setBusy(false)
        setError('Payment wasn’t completed. You can try again any time.')
      },
    })
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button type="button" className="btn btn-primary" onClick={pay} disabled={busy}>
        {busy ? 'Opening payment…' : label} {!busy && <ArrowRight size={16} />}
      </button>
      {error && <p style={{ fontSize: 13, color: '#b91c1c' }} role="alert">{error}</p>}
    </div>
  )
}
