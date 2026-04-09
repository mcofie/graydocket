import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'

export default function CompanyGuaranteePage() {
  return (
    <InfoPageLayout 
      title="Company Limited by Guarantee" 
      subtitle="The preferred structure for NGOs, charities, and foundations."
    >
      <section>
        <h2>Overview</h2>
        <p>
          Unlike a company limited by shares, a Company Limited by Guarantee does not have share capital. The liability of its members is limited to the amount they agree to contribute in the event of the company being wound up. All profits are reinvested into the company's objects rather than distributed as dividends.
        </p>
      </section>

      <section>
        <h2>Key Requirements</h2>
        <ul>
          <li><strong>Min. 2 Directors:</strong> Must be individuals of high integrity.</li>
          <li><strong>Executive Council:</strong> The governing body of the organization.</li>
          <li><strong>Non-Profit Object Clause:</strong> Clearly stating the charitable or social nature of the organization.</li>
          <li><strong>Commissioner for Oaths:</strong> Verification of the NGO's constitution.</li>
        </ul>
      </section>

      <section>
        <h2>Social Impact Reporting</h2>
        <p>
          These entities are subject to strict reporting requirements with the Department of Social Welfare (if applicable) and the ORC to maintain their non-profit status.
        </p>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-primary-50)', borderRadius: '24px', border: '1px solid var(--color-primary-100)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Formalize your non-profit.</h3>
        <p style={{ marginBottom: '32px', color: 'var(--color-neutral-600)' }}>GrayDocket simplifies the complex NGO registration process.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Start NGO Setup</Link>
      </div>
    </InfoPageLayout>
  )
}
