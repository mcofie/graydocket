import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'

export default function SolePropPage() {
  return (
    <InfoPageLayout 
      title="Sole Proprietorship" 
      subtitle="Fast, simple registration for individual entrepreneurs."
    >
      <section>
        <h2>Overview</h2>
        <p>
          Registering as a Sole Proprietor (Business Name) is the fastest way to formalize your personal venture. It allows you to trade under a business name and open a corporate bank account, though it does not provide separate legal liability from the owner.
        </p>
      </section>

      <section>
        <h2>What You Get</h2>
        <ul>
          <li><strong>Business Name Certificate:</strong> Official recognition under the Registration of Business Names Act.</li>
          <li><strong>TIN Certificate:</strong> Your unique Tax Identification Number.</li>
          <li><strong>Banking Bridge:</strong> Open a business account in your trade name.</li>
        </ul>
      </section>

      <section>
        <h2>Requirements</h2>
        <ul>
          <li>Ghana Card (for Ghanaian citizens).</li>
          <li>Digital Address of the business location.</li>
          <li>Nature of business and commencement date.</li>
        </ul>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-primary-50)', borderRadius: '24px', border: '1px solid var(--color-primary-100)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Get official in 3 days.</h3>
        <p style={{ marginBottom: '32px', color: 'var(--color-neutral-600)' }}>The fastest path to legitimacy for solo founders in Ghana.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Register Now</Link>
      </div>
    </InfoPageLayout>
  )
}
