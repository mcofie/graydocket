import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'

export default function RenewalPage() {
  return (
    <InfoPageLayout 
      title="Business Name Renewal" 
      subtitle="Keep your Sole Proprietorship or Partnership active."
    >
      <section>
        <h2>The Annual Renewal Cycle</h2>
        <p>
          Unlike Limited Companies that file "Annual Returns", Sole Proprietorships and Partnerships must "Renew" their registration every year. failing to renew means you are no longer legally protected under that business name.
        </p>
      </section>

      <section>
        <h2>Renewal Process</h2>
        <p>
          The process involves paying a small statutory fee and updating any changes in business location or ownership. GrayDocket can handle this renewal for you automatically.
        </p>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-primary-50)', borderRadius: '24px', border: '1px solid var(--color-primary-100)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Is your renewal due?</h3>
        <p style={{ marginBottom: '32px', color: 'var(--color-neutral-600)' }}>GrayDocket sends you alerts 30 days before your business renewal is due.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Renew Business Name</Link>
      </div>
    </InfoPageLayout>
  )
}
