import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'

export default function ExternalCompanyPage() {
  return (
    <InfoPageLayout 
      title="External Company (Branch Office)" 
      subtitle="For foreign entities looking to operate in Ghana."
    >
      <section>
        <h2>Overview</h2>
        <p>
          An External Company is a body corporate formed outside Ghana which has an established place of business in Ghana. Unlike incorporating a local subsidiary, this process registers the existing foreign entity as a branch in Ghana.
        </p>
      </section>

      <section>
        <h2>Requirements</h2>
        <ul>
          <li><strong>Local Manager:</strong> A resident of Ghana must be appointed to manage operations.</li>
          <li><strong>Local Process Agent:</strong> Required to receive legal documents.</li>
          <li><strong>Certified Documents:</strong> Constitutional documents from the country of origin must be notarized and certified.</li>
        </ul>
      </section>

      <section>
        <h2>GIPC Registration</h2>
        <p>
          Most external companies will also need to register with the Ghana Investment Promotion Centre (GIPC) depending on the nature of their business and capital requirements.
        </p>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-primary-50)', borderRadius: '24px', border: '1px solid var(--color-neutral-200)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Expand to Ghana.</h3>
        <p style={{ marginBottom: '32px', color: 'var(--color-neutral-600)' }}>GrayDocket handles the international-to-local registration bridge.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Start Onboarding</Link>
      </div>
    </InfoPageLayout>
  )
}
