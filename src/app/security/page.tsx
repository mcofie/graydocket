import InfoPageLayout from '@/components/InfoPageLayout'
import { ShieldCheck, Lock, Eye, Cloud } from 'lucide-react'

export default function SecurityPage() {
  return (
    <InfoPageLayout 
      title="Security" 
      subtitle="Enterprise-grade protection for your corporate records."
    >
      <section>
        <h2>The Digital Vault</h2>
        <p>
          Every business on GrayDocket receives a secure Digital Vault. This is where your Certificate of Incorporation, TIN certificates, and other sensitive documents are stored.
        </p>
      </section>

      <section>
        <h2>Encryption Standards</h2>
        <p>
          All data transmitted to and from GrayDocket is encrypted using 256-bit SSL encryption. Your documents are encrypted at rest using industry-leading protocols.
        </p>
      </section>

      <section>
        <h2>Multi-Factor Authentication</h2>
        <p>
          We support and recommend Multi-Factor Authentication (MFA) for all accounts to prevent unauthorized access to your business profile.
        </p>
      </section>

      <section>
        <h2>Regular Audits</h2>
        <p>
          Our systems undergo regular security audits to ensure compliance with international and local data protection standards.
        </p>
      </section>

      <div style={{ marginTop: '48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ padding: '24px', background: 'var(--color-neutral-50)', borderRadius: '16px' }}>
          <Lock size={24} color="var(--color-primary-600)" />
          <h3 style={{ marginTop: '16px', fontWeight: 700 }}>Encrypted Storage</h3>
          <p style={{ fontSize: '14px', color: 'var(--color-neutral-500)', marginTop: '8px' }}>Your records are protected by military-grade AES-256 encryption.</p>
        </div>
        <div style={{ padding: '24px', background: 'var(--color-neutral-50)', borderRadius: '16px' }}>
          <ShieldCheck size={24} color="var(--color-primary-600)" />
          <h3 style={{ marginTop: '16px', fontWeight: 700 }}>Access Controls</h3>
          <p style={{ fontSize: '14px', color: 'var(--color-neutral-500)', marginTop: '8px' }}>Granular permissions ensure only authorized users see your documents.</p>
        </div>
      </div>
    </InfoPageLayout>
  )
}
