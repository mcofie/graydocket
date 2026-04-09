import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'
import { Mail, MessageSquare, Phone } from 'lucide-react'

export default function SupportPage() {
  return (
    <InfoPageLayout 
      title="Support Center" 
      subtitle="We're here to help you navigate the bureaucracy."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '64px' }}>
        <div style={{ padding: '32px', background: 'var(--color-neutral-50)', borderRadius: '24px', textAlign: 'center' }}>
          <Mail size={32} color="var(--color-primary-600)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontWeight: 800 }}>Email Support</h3>
          <p style={{ fontSize: '14px', color: 'var(--color-neutral-500)', marginTop: '8px' }}>Response in 24 hours.</p>
          <p style={{ marginTop: '16px', fontWeight: 600 }}>hello@graydocket.com</p>
        </div>
        <div style={{ padding: '32px', background: 'var(--color-neutral-50)', borderRadius: '24px', textAlign: 'center' }}>
          <MessageSquare size={32} color="var(--color-primary-600)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontWeight: 800 }}>WhatsApp</h3>
          <p style={{ fontSize: '14px', color: 'var(--color-neutral-500)', marginTop: '8px' }}>Instant messaging.</p>
          <p style={{ marginTop: '16px', fontWeight: 600 }}>+233 558 508 306</p>
        </div>
      </div>

      <section>
        <h2>Frequently Asked Questions</h2>
        <div style={{ marginTop: '32px' }}>
          <details style={{ marginBottom: '16px', borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '16px' }}>
            <summary style={{ fontWeight: 700, cursor: 'pointer' }}>How long does registration take?</summary>
            <p style={{ marginTop: '8px', color: 'var(--color-neutral-600)' }}>Sole Proprietorships take 3-5 days. Limited companies take 5-7 days.</p>
          </details>
          <details style={{ marginBottom: '16px', borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '16px' }}>
            <summary style={{ fontWeight: 700, cursor: 'pointer' }}>Do I need to visit the ORC physically?</summary>
            <p style={{ marginTop: '8px', color: 'var(--color-neutral-600)' }}>No. GrayDocket handles all physical filings. You receive your documents digitally in your vault.</p>
          </details>
        </div>
      </section>
    </InfoPageLayout>
  )
}
