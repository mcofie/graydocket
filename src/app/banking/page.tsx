import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'
import { Building2, Landmark, CreditCard } from 'lucide-react'

export default function BankingPage() {
  return (
    <InfoPageLayout 
      title="Partner Banking Bridge" 
      subtitle="The seamless path from registration to a corporate bank account."
    >
      <section>
        <h2>The Banking Hurdle</h2>
        <p>
          For most founders, the hardest part of starting isn't the registration—it's opening the bank account. Long queues, repetitive KYC, and confusing requirements often delay operations by weeks.
        </p>
      </section>

      <section>
        <h2>Our Solution</h2>
        <p>
          GrayDocket has built consolidated KYC bridges with Ghana's leading banks. Once your company is registered, we can securely push your verified documents and data to our partner banks to accelerate your account opening.
        </p>
      </section>

      <div style={{ margin: '48px 0', padding: '48px', background: 'var(--color-primary-50)', borderRadius: '32px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '32px', textAlign: 'center' }}>Participating Institutions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '24px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, opacity: 0.6 }}>GCB BANK</div>
          <div style={{ fontWeight: 700, opacity: 0.6 }}>ECOBANK</div>
          <div style={{ fontWeight: 700, opacity: 0.6 }}>FIDELITY</div>
          <div style={{ fontWeight: 700, opacity: 0.6 }}>CALBANK</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '64px' }}>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Start with Partner Banking</Link>
      </div>
    </InfoPageLayout>
  )
}
