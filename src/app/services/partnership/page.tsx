import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'

export default function PartnershipPage() {
  return (
    <InfoPageLayout 
      title="Partnership Registration" 
      subtitle="For two or more individuals wanting to trade together under a single name."
    >
      <section>
        <h2>Overview</h2>
        <p>
          A Partnership is a business arrangement where two or more persons (up to a maximum of 20) come together to carry on a business with a view of profit. In Ghana, partnerships are registered under the Incorporated Private Partnerships Act (Act 152).
        </p>
      </section>

      <section>
        <h2>Key Requirements</h2>
        <ul>
          <li><strong>Agreement:</strong> While not mandatory to be in writing, a Partnership Deed is highly recommended.</li>
          <li><strong>Ghana Card:</strong> Required for all partners who are Ghanaian citizens.</li>
          <li><strong>Unlimited Liability:</strong> Partners are generally jointly and severally liable for the debts of the partnership.</li>
        </ul>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-neutral-50)', borderRadius: '24px', border: '1px solid var(--color-neutral-200)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Register your partnership.</h3>
        <p style={{ marginBottom: '32px', color: 'var(--color-neutral-600)' }}>Legalize your business partnership in just a few days.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Get Started</Link>
      </div>
    </InfoPageLayout>
  )
}
