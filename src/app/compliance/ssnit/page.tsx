import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'

export default function SSNITPage() {
  return (
    <InfoPageLayout 
      title="SSNIT Registration" 
      subtitle="Ensuring social security compliance for your team."
    >
      <section>
        <h2>Employer Registration</h2>
        <p>
          Once you have employees, you are legally required to register your business with the Social Security and National Insurance Trust (SSNIT). This allows you to make mandatory pension contributions for your staff.
        </p>
      </section>

      <section>
        <h2>Compliance Benefits</h2>
        <p>
          Being SSNIT-compliant is often a requirement for bidding on government contracts and ensures your business is viewed as a responsible employer.
        </p>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-primary-50)', borderRadius: '24px', border: '1px solid var(--state-info-light, var(--color-primary-100))', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Ready to hire?</h3>
        <p style={{ marginBottom: '32px', color: 'var(--color-neutral-600)' }}>Automate your SSNIT business registration through GrayDocket.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Start SSNIT Process</Link>
      </div>
    </InfoPageLayout>
  )
}
