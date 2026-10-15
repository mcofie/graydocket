import { pageMetadata } from '@/lib/metadata'
import InfoPageLayout from '@/components/InfoPageLayout'
import { JsonLd, breadcrumbLd, serviceLd } from '@/lib/structured-data'
import Link from 'next/link'

const metadataTitle = 'Tax Identification Number (TIN)'
const metadataDescription = 'Understand individual and corporate TIN generation in Ghana, linking your Ghana Card to GRA tax and ORC business records.'

export const metadata = pageMetadata(metadataTitle, metadataDescription, '/compliance/tin')

export default function TINPage() {
  return (
    <InfoPageLayout 
      title="TIN Generation" 
      subtitle="Your individual and corporate Tax Identification Number."
    >
      <JsonLd data={[serviceLd({ name: metadataTitle, description: metadataDescription, path: '/compliance/tin' }), breadcrumbLd([{ name: metadataTitle, path: '/compliance/tin' }])]} />
      <section>
        <h2>The Importance of TIN</h2>
        <p>
          In Ghana, the TIN is essential for almost any formal transaction, including clearing goods at the port, opening a bank account, and filing taxes with the Ghana Revenue Authority (GRA).
        </p>
      </section>

      <section>
        <h2>How it Works</h2>
        <p>
          For new company registrations, the TIN is now typically integrated into the certificate. However, for individuals and older businesses, a manual generation process may be required.
        </p>
      </section>

      <div style={{ marginTop: '64px', padding: '40px', background: 'var(--color-primary-50)', borderRadius: '24px', border: '1px solid var(--color-primary-100)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Need a TIN?</h3>
        <p style={{ marginBottom: '32px', color: 'var(--color-neutral-600)' }}>We facilitate the generation of individual and corporate TINs quickly.</p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">Generate My TIN</Link>
      </div>
    </InfoPageLayout>
  )
}
