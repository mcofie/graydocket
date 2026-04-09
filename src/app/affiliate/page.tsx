import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'

export default function AffiliatePage() {
  return (
    <InfoPageLayout 
      title="GrayDocket Affiliate Program" 
      subtitle="Partner with the leading business infrastructure platform in Ghana."
    >
      <section>
        <h2>Why Partner with Us?</h2>
        <p>
          Help other founders launch their businesses correctly while earning a commission. Our affiliate program is designed for startup mentors, fintechs, and business advisors.
        </p>
      </section>

      <section>
        <h2>The Benefits</h2>
        <ul>
          <li><strong>Competitive Commissions:</strong> Earn for every successful registration you refer.</li>
          <li><strong>Real-time Dashboard:</strong> Track your referrals and earnings in real-time.</li>
          <li><strong>Instant Payouts:</strong> Withdraw your earnings directly to your bank or mobile money.</li>
          <li><strong>Exclusive Content:</strong> Access to marketing assets and educational content for your audience.</li>
        </ul>
      </section>

      <div style={{ marginTop: '64px', padding: '48px', background: 'var(--color-neutral-900)', color: 'white', borderRadius: '24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px' }}>Become an Affiliate today.</h3>
        <p style={{ marginBottom: '32px', opacity: 0.8, maxWidth: '500px', margin: '0 auto 32px' }}>Join the network of professionals driving the new formal economy in Ghana.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Join the Partner Program</Link>
      </div>
    </InfoPageLayout>
  )
}
