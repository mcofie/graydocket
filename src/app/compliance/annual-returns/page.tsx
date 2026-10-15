import { pageMetadata } from '@/lib/metadata'
import InfoPageLayout from '@/components/InfoPageLayout'
import { JsonLd, breadcrumbLd, serviceLd } from '@/lib/structured-data'
import Link from 'next/link'

const metadataTitle = 'Annual Returns Filing'
const metadataDescription = 'File company annual returns with the ORC in Ghana on time. Maintain corporate good standing and prevent statutory penalties.'

export const metadata = pageMetadata(metadataTitle, metadataDescription, '/compliance/annual-returns')

export default function AnnualReturnsPage() {
  return (
    <InfoPageLayout 
      title="Annual Returns Filing" 
      subtitle="Stay in the Office of the Registrar's good graces."
    >
      <JsonLd data={[serviceLd({ name: metadataTitle, description: metadataDescription, path: '/compliance/annual-returns' }), breadcrumbLd([{ name: metadataTitle, path: '/compliance/annual-returns' }])]} />
      <section>
        <h2>What are Annual Returns?</h2>
        <p>
          Every registered company in Ghana is required to file Annual Returns once every year. This filing confirms to the ORC that the company is still active and provides updated details about directors, shareholders, and auditors.
        </p>
      </section>

      <section>
        <h2>The Danger of Defaulting</h2>
        <p>
          Failure to file annual returns will lead to your company being marked as "inactive" or "dormant". Eventually, the Registrar may strike your company off the register. Penalties for late filing accumulate daily.
        </p>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-neutral-900)', color: 'white', borderRadius: '24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Don't let penalties stack up.</h3>
        <p style={{ marginBottom: '32px', opacity: 0.8 }}>GrayDocket automates your corporate calendar so you never miss a filing window.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Activate Compliance Tracker</Link>
      </div>
    </InfoPageLayout>
  )
}
