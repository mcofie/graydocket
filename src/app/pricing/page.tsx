import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'
import { Check, Clock, Shield } from 'lucide-react'

export default function PricingPage() {
  return (
    <InfoPageLayout 
      title="Simple, Transparent Pricing" 
      subtitle="No hidden fees. Professional-grade registration."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '64px' }}>
        {/* Standard card layout here or similar */}
        <div style={{ padding: '32px', border: '1px solid var(--color-neutral-200)', borderRadius: '24px' }}>
          <h3 style={{ fontWeight: 800, fontSize: '20px' }}>Sole Proprietorship</h3>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '14px', marginTop: '8px' }}>For solo entrepreneurs.</p>
          <div style={{ margin: '24px 0', fontSize: '32px', fontWeight: 800 }}>GH₵ 625</div>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px' }}>
            <li style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}><Check size={16} color="var(--color-primary-600)" /> Official Certificate</li>
            <li style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}><Check size={16} color="var(--color-primary-600)" /> TIN Generation</li>
            <li style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}><Check size={16} color="var(--color-primary-600)" /> 24-hr Support</li>
          </ul>
        </div>

        <div style={{ padding: '32px', border: '2px solid var(--color-primary-600)', borderRadius: '24px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-primary-600)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 700 }}>MOST POPULAR</span>
          <h3 style={{ fontWeight: 800, fontSize: '20px' }}>Company (Shares)</h3>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '14px', marginTop: '8px' }}>For startups & LLCs.</p>
          <div style={{ margin: '24px 0', fontSize: '32px', fontWeight: 800 }}>GH₵ 1,200</div>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px' }}>
            <li style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}><Check size={16} color="var(--color-primary-600)" /> Full Incorporation</li>
            <li style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}><Check size={16} color="var(--color-primary-600)" /> Constitution Drafting</li>
            <li style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}><Check size={16} color="var(--color-primary-600)" /> Compliance Dashboard</li>
          </ul>
        </div>
      </div>

      <section>
        <h2>Enterprise & Custom Solutions</h2>
        <p>
          Looking to register multiple companies or require complex foreign subsidiary setups? We offer tailored packages for venture studios and law firms.
        </p>
        <Link href="mailto:hello@graydocket.com" style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>Contact Enterprise Relations &rarr;</Link>
      </section>
    </InfoPageLayout>
  )
}
