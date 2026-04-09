import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'

export default function GRAPage() {
  return (
    <InfoPageLayout 
      title="GRA Tax Activation" 
      subtitle="Connecting your business to the Ghana Revenue Authority."
    >
      <section>
        <h2>Tax Activation vs. Registration</h2>
        <p>
          While your TIN is often generated at the time of ORC registration, your "Tax Office" must still be activated with the GRA. This process assigns you to a specific domestic tax office and prepares you for filing VAT, Income Tax, and PAYE.
        </p>
      </section>

      <section>
        <h2>Tax Clearance Certificates (TCC)</h2>
        <p>
          To maintain a healthy business, you will eventually need a Tax Clearance Certificate. This requires consistent filing of monthly and annual tax returns. GrayDocket helps you keep these records organized.
        </p>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-neutral-900)', color: 'white', borderRadius: '24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Stay Tax Compliant.</h3>
        <p style={{ marginBottom: '32px', opacity: 0.8 }}>We bridge the gap between your ORC registration and GRA activation.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Activate Tax Status</Link>
      </div>
    </InfoPageLayout>
  )
}
