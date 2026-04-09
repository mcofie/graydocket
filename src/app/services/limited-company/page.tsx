import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'
import { Check } from 'lucide-react'

export default function LimitedCompanyPage() {
  return (
    <InfoPageLayout 
      title="Limited Company (Shares)" 
      subtitle="The gold standard for startups and established businesses in Ghana."
    >
      <section>
        <h2>Overview</h2>
        <p>
          A Company Limited by Shares is the most common legal structure for profit-making ventures. Under the Companies Act, 2019 (Act 992), it provides limited liability protection to its shareholders, meaning personal assets are protected from the company's debts.
        </p>
      </section>

      <section>
        <h2>Key Requirements</h2>
        <ul>
          <li><strong>Min. 2 Directors:</strong> At least one must be a resident of Ghana.</li>
          <li><strong>Min. 1 Shareholder:</strong> Can be an individual or a corporate entity.</li>
          <li><strong>Company Secretary:</strong> An individual or firm qualified under the Act.</li>
          <li><strong>Independent Auditor:</strong> Required to verify annual financial statements.</li>
          <li><strong>Registered Office:</strong> A physical address in Ghana with a digital address.</li>
        </ul>
      </section>

      <section>
        <h2>Processing & Logistics</h2>
        <p>
          With GrayDocket, the typical turnaround time is 5-7 business days. We handle the name search, drafting of the Constitution, and filing of Form 3 with the ORC.
        </p>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-primary-50)', borderRadius: '24px', border: '1px solid var(--color-primary-100)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Ready to incorporate?</h3>
        <p style={{ marginBottom: '32px', color: 'var(--color-neutral-600)' }}>Join thousands of founders launching their LLCs on GrayDocket today.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Start My Registration</Link>
      </div>
    </InfoPageLayout>
  )
}
