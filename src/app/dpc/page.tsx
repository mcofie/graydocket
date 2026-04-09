import InfoPageLayout from '@/components/InfoPageLayout'

export default function DPCPage() {
  return (
    <InfoPageLayout 
      title="DPC Compliance" 
      subtitle="Adhering to Ghana's Data Protection Act, 2012 (Act 843)."
    >
      <section>
        <h2>Regulatory Oversight</h2>
        <p>
          GrayDocket is fully registered with the Data Protection Commission (DPC) of Ghana as a Data Controller. This registration is a legal requirement for any entity handling personal data in Ghana.
        </p>
      </section>

      <section>
        <h2>The 8 Guiding Principles</h2>
        <p>
          We strictly follow the eight data protection principles outlined in Act 843:
        </p>
        <ul>
          <li><strong>Accountability:</strong> We take responsibility for the data we handle.</li>
          <li><strong>Lawfulness of Processing:</strong> Data is only processed with consent or legal necessity.</li>
          <li><strong>Specification of Purpose:</strong> Data is only used for the services you requested.</li>
          <li><strong>Compatibility of Further Processing:</strong> No surprise usage of your data.</li>
          <li><strong>Quality of Information:</strong> We strive to keep your data accurate.</li>
          <li><strong>Openness:</strong> We are transparent about our data practices.</li>
          <li><strong>Data Security Safeguards:</strong> Prevent unauthorized access or loss.</li>
          <li><strong>Data Subject Participation:</strong> You have the right to access and correct your data.</li>
        </ul>
      </section>

      <section>
        <h2>Data Protection Officer</h2>
        <p>
          GrayDocket has a designated Data Protection Officer who ensures that our internal processes remain compliant with evolving regulations.
        </p>
      </section>
    </InfoPageLayout>
  )
}
