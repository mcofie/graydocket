import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getBusinessTypes, getServices, getSystemFee } from '@/lib/actions'
import { businessTypes } from '@/app/dashboard/applications/new/constants'
import { priceForType, addOnsWithPrices, type DbBusinessType } from '@/app/dashboard/applications/new/pricing'
import PricingExperience, { type Plan, type ComplianceService } from './PricingExperience'
import styles from './pricing.module.css'

export const metadata = {
  title: 'Pricing',
  description: 'Transparent prices for registering a sole proprietorship, limited company or non-profit in Ghana with GrayDocket.',
}

// What GrayDocket does for each type; keep this to things the product actually delivers
const PLAN_COPY: Record<string, { audience: string; included: string[] }> = {
  sole_proprietorship: {
    audience: 'For individuals starting on their own.',
    included: [
      'Business name search with the ORC',
      'Form A prepared and filed for you',
      'Digital certificate in your Documents',
      'Progress updates at every step',
    ],
  },
  limited_by_shares: {
    audience: 'For co-founders, investors and growing teams.',
    included: [
      'Company name search with the ORC',
      'Standard constitution drafted',
      'Form 3 prepared and filed for you',
      'Digital certificates in your Documents',
      'Progress updates at every step',
    ],
  },
  limited_by_guarantee: {
    audience: 'For NGOs, charities and associations.',
    included: [
      'Organisation name search with the ORC',
      'Form 3 prepared and filed for you',
      'Digital certificates in your Documents',
      'Progress updates at every step',
    ],
  },
}

const FAQS = [
  {
    q: 'Are there any hidden fees?',
    a: 'No. The total on each plan is what you pay for registration. You see the full breakdown again before you pay, and optional extras are only added if you choose them.',
  },
  {
    q: 'When do I pay?',
    a: 'At the end of your registration, after you’ve reviewed everything. Payment is handled securely by Paystack.',
  },
  {
    q: 'What if my application needs changes?',
    a: 'If the registrar asks for corrections, you can fix and resubmit from your dashboard at no extra cost.',
  },
  {
    q: 'How long does registration take?',
    a: 'Each plan shows the usual processing time once your application is submitted. Timelines depend on the ORC, and we update your dashboard at every step.',
  },
]

// Compliance services for already-registered businesses. A price shows once a service with the
// same name is added under Admin > Pricing; until then visitors are invited to ask for a quote.
const COMPLIANCE: Array<Omit<ComplianceService, 'price'>> = [
  { id: 'annual-returns', name: 'Annual Returns Filing', desc: 'Yearly return for companies, filed with the ORC', href: '/compliance/annual-returns' },
  { id: 'renewal', name: 'Business Name Renewal', desc: 'Keep a sole proprietorship or partnership active', href: '/compliance/renewal' },
  { id: 'tin', name: 'TIN Generation', desc: 'Tax Identification Number for you or your business', href: '/compliance/tin' },
  { id: 'gra', name: 'GRA Tax Activation', desc: 'Connect your business to the Ghana Revenue Authority', href: '/compliance/gra' },
  { id: 'ssnit', name: 'SSNIT Registration', desc: 'Register as an employer for your team', href: '/compliance/ssnit' },
]

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  // Same sources as the registration form and the quiz, so prices always match checkout
  const [dbTypes, { services }, courierFee] = await Promise.all([
    getBusinessTypes() as Promise<DbBusinessType[]>,
    getServices(),
    getSystemFee('Courier Delivery'),
  ])
  const extras = addOnsWithPrices(services).filter((a) => a.id !== 'bank')

  const plans: Plan[] = businessTypes.map((type) => {
    const price = priceForType(type.id, dbTypes)
    return {
      id: type.id as Plan['id'],
      name: type.name,
      audience: PLAN_COPY[type.id]?.audience ?? '',
      included: PLAN_COPY[type.id]?.included ?? [],
      ...price,
    }
  })

  const servicePrice = (name: string) =>
    (services as Array<{ name: string; price: number }>).find((s) => s.name.toLowerCase() === name.toLowerCase())?.price ?? null
  const compliance: ComplianceService[] = COMPLIANCE.map((c) => ({ ...c, price: servicePrice(c.name) }))

  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>Simple, transparent pricing</h1>
          <p className={styles.lead}>
            One price to get your business registered. We handle the paperwork, and you&apos;ll see the full breakdown before you pay.
          </p>
          <Link href="/find-your-business-type" className={styles.quizLink}>
            <Compass size={16} />
            <span>Not sure which one you need? Take the 1-minute quiz</span>
            <ArrowRight size={14} />
          </Link>
        </section>

        <PricingExperience
          plans={plans}
          extras={extras}
          courierFee={courierFee}
          compliance={compliance}
          initialView={view === 'existing' ? 'existing' : 'new'}
        />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Questions</h2>
          <div className={styles.faqList}>
            {FAQS.map((f) => (
              <details key={f.q} className={styles.faq}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className={styles.contact}>
            Registering several businesses or need something custom? <Link href="/support">Talk to us</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
