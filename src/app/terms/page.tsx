import InfoPageLayout from '@/components/InfoPageLayout'

export default function TermsPage() {
  return (
    <InfoPageLayout 
      title="Terms of Service" 
      subtitle="Last updated: October 24, 2026"
    >
      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using GrayDocket, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
        </p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>
          GrayDocket provides technology-enabled corporate services, including but not limited to business registration, tax compliance facilitation, and administrative support with the Office of the Registrar of Companies (ORC) in Ghana.
        </p>
      </section>

      <section>
        <h2>3. Not a Law Firm</h2>
        <p>
          GrayDocket is not a law firm and does not provide legal advice. Our services are administrative and technology-driven. Any information provided on this platform is for informational purposes only and should not be construed as legal or tax advice.
        </p>
      </section>

      <section>
        <h2>4. User Responsibilities</h2>
        <p>
          You are responsible for providing accurate and complete information for all applications. GrayDocket is not liable for delays or rejections caused by inaccurate data provided by the user.
        </p>
      </section>

      <section>
        <h2>5. Fees and Payments</h2>
        <p>
          All fees displayed on the platform include government statutory fees where applicable. Payments are processed through secure third-party gateways. Fees are generally non-refundable once the administrative process has commenced.
        </p>
      </section>
    </InfoPageLayout>
  )
}
