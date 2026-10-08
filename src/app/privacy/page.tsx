import InfoPageLayout from '@/components/InfoPageLayout'

export default function PrivacyPage() {
  return (
    <InfoPageLayout 
      title="Privacy policy" 
      subtitle="What we collect, why we collect it, and how we protect it."
    >
      <section>
        <h2>1. Data Collection</h2>
        <p>
          We collect information necessary to process your business registration and compliance filings. This includes personal identification, contact details, and corporate structure information.
        </p>
      </section>

      <section>
        <h2>2. Data Usage</h2>
        <p>
          Your data is used strictly for the purpose of facilitating the services you request. We share data with government agencies (ORC, GRA, SSNIT) as required by law to complete your registration.
        </p>
      </section>

      <section>
        <h2>3. Data Protection (DPC)</h2>
        <p>
          GrayDocket is a registered Data Controller with the Data Protection Commission (DPC) of Ghana. We adhere to the Data Protection Act, 2012 (Act 843) to ensure your information is handled with the highest level of security.
        </p>
      </section>

      <section>
        <h2>4. Third-Party Sharing</h2>
        <p>
          We do not sell your personal data. We only share information with accredited partners (e.g., banks, legal partners) when you explicitly opt-in for those secondary services.
        </p>
      </section>

      <section>
        <h2>5. Security</h2>
        <p>
          We employ industry-standard encryption and security protocols to protect the documents in your account.
        </p>
      </section>
    </InfoPageLayout>
  )
}
