'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Check } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import styles from './page.module.css'

const services = [
  {
    icon: '🏢',
    title: 'Sole Proprietorship',
    desc: 'Register your sole proprietorship with the Office of the Registrar of Companies (ORC) quickly and hassle-free.',
    features: [
      'ORC name search & reservation',
      'Business registration certificate',
      'TIN registration',
      'Digital certificate delivery',
    ],
  },
  {
    icon: '🏛️',
    title: 'Limited Company',
    desc: 'Incorporate a limited company in Ghana with full compliance and all required documentation.',
    features: [
      'Company name search & reservation',
      'Articles of incorporation',
      'Company secretary appointment',
      'Certificate of incorporation',
    ],
  },
  {
    icon: '🏦',
    title: 'Business Bank Account',
    desc: 'Open a business bank account with our partner banks. Choose from Ghana\'s top banks with preferential terms.',
    features: [
      'Partner bank selection',
      'Document preparation',
      'Account opening initiation',
      'Preferential banking terms',
    ],
  },
  {
    icon: '📋',
    title: 'Compliance Engine',
    desc: 'Automated reminders for annual returns, tax filings, and regulatory deadlines so you never fall out of good standing.',
    features: [
      'TIN & GRA Registration',
      'Automated Return Reminders',
      'Tax Obligation Guidance',
      'Regulatory Deadline Tracking',
    ],
  },
  {
    icon: '🌐',
    title: 'Domain & Email',
    desc: 'Establish your digital presence with a professional domain name and business email setup.',
    features: [
      'Domain name purchase',
      'Professional email setup',
      'DNS configuration',
      'Email migration support',
    ],
  },
  {
    icon: '🚀',
    title: 'Website Creation',
    desc: 'Get a professional website for your new business. Launch your online presence from day one.',
    features: [
      'Professional template design',
      'Mobile responsive',
      'SEO optimized',
      'Content management system',
    ],
  },
]

const steps = [
  {
    num: 1,
    title: 'Choose Service',
    desc: 'Select the type of business registration you need.',
  },
  {
    num: 2,
    title: 'Fill Details',
    desc: 'Complete the dynamic form with your business information.',
  },
  {
    num: 3,
    title: 'Submit & Pay',
    desc: 'Review your information, make payment, and submit.',
  },
  {
    num: 4,
    title: 'Get Registered',
    desc: 'Track progress and receive your documents digitally.',
  },
]

const pricingPlans = [
  {
    name: 'Sole Proprietorship',
    desc: 'Perfect for local freelancers and individual shop owners.',
    currency: 'GH₵',
    price: '350',
    originalPrice: '800', // Lawyer anchor
    period: 'one-time',
    features: [
      'ORC Name Search & Reservation',
      'Form A Business Name Registration',
      'TIN Registration & GRA Compliance',
      'Digital Certificate of Registration',
      'Certified Real-Time State Copy',
      '14-Day Priority Support',
      'Secure Document Vault',
      'Automatic Renewal Reminders',
    ],
    popular: false,
  },
  {
    name: 'Limited Company',
    desc: 'Professional package for scaling startups and global teams.',
    currency: 'GH₵',
    price: '1,200',
    originalPrice: '4,500', // Lawyer anchor
    period: 'one-time',
    features: [
      'Everything in Sole Proprietorship',
      'Articles of Incorporation (Form 3)',
      'Ghana Card Verification Support',
      'Company Secretary Appointment',
      'First Auditor Consent Management',
      'Share Certificate Preparation',
      'Nominee Director Referral (Add-on)',
      'Expedited 24HR Document Review',
    ],
    popular: true,
  },
]

const faqs = [
  {
    q: 'How long does business registration take?',
    a: 'Sole Proprietorship registration typically takes 3-5 business days once all documents are submitted. Limited Company registration takes 5-10 business days depending on the ORC processing time.',
  },
  {
    q: 'What documents do I need?',
    a: 'For Sole Proprietorship, you need a valid Ghana Card or passport, proof of address, and your proposed business name. For a Limited Company, you\'ll also need details of directors, shareholders, and a registered office address.',
  },
  {
    q: 'Can I track my application status?',
    a: 'Yes! Every application receives a unique tracking ID. You can check your status in real-time from your dashboard or our public tracking page.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use bank-level encryption and comply with Ghana\'s data protection regulations. Your documents are stored securely and never shared without your consent.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'If your application hasn\'t been submitted to the ORC yet, we offer a full refund. After submission, refunds are handled on a case-by-case basis.',
  },
  {
    q: 'Can I add services later?',
    a: 'Yes! You can add value-added services like domain purchase, business email, and website creation at any time from your dashboard.',
  },
]

const trustItems = [
  { icon: '🔒', title: 'Bank-Level Security', desc: 'End-to-end encryption for all your data' },
  { icon: '⚡', title: 'Priority Processing', desc: 'Direct pathway for faster ORC approval' },
  { icon: '📞', title: 'Legal Support', desc: 'Assistance with constitution drafting' },
  { icon: '✅', title: 'Fully Compliant', desc: 'Aligned with Companies Act 2019 (Act 992)' },
]

const partners = [
  { name: 'ORC', logo: 'Office of the Registrar of Companies' },
  { name: 'GRA', logo: 'Ghana Revenue Authority' },
  { name: 'Banks', logo: 'Leading Commercial Banks' },
  { name: 'NIC', logo: 'National Identification Authority' },
]

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <>
      <Header />
      <section className={styles.hero} id="hero">
        <div className={styles.heroLayout}>
          <div className={styles.heroTextContent}>
            <div className={styles.announcement}>
              <span className={styles.newBadge}>PREMIUM</span>
              Now live in Ghana & USA
            </div>
            <h1 className={styles.title}>
              Launch your Business <span className={styles.gradientText}>with a Single Engine.</span>
            </h1>
            <p className={styles.subtitle}>
              GrayDocket is the digital-first 'Business-in-a-Box' platform that automates incorporation, tax registration, and banking through a single, hassle-free interface.
            </p>
            <div className={styles.heroActions}>
              <Link href="/auth/register" className="btn btn-primary btn-lg">Start Your Engine →</Link>
              <Link href="#how-it-works" className="btn btn-secondary btn-lg">Watch Demo</Link>
            </div>
            <div className={styles.heroTrust}>
              <p>Trusted by 500+ Founders & Ventures</p>
              <div className={styles.partnerLogos}>
                <span className={styles.partnerLogo}>ORC</span>
                <span className={styles.partnerLogo}>GRA</span>
                <span className={styles.partnerLogo}>GCB</span>
              </div>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.visualContainer}>
              <img 
                src="/premium_business_platform_hero_1774525453935.png" 
                alt="GrayDocket Engine"
                className={styles.heroImage}
              />
              <div className={styles.floatingStats}>
                <div className={styles.floatingStat}>
                  <span>99.9%</span>
                  <p>Success Rate</p>
                </div>
                <div className={styles.floatingStat}>
                  <span>&lt;24h</span>
                  <p>Sync Speed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className={styles.partners}>
        <div className={styles.partnersContent}>
          <div className={styles.partnersTitle}>POWERING GHANA&apos;S NEXT GENERATION OF FOUNDERS</div>
          <div className={styles.partnersList}>
            {partners.map((p, i) => (
              <div key={i} className={styles.partnerItem}>{p.name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className={styles.services} id="services">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Our Services</span>
          <h2 className={styles.sectionTitle}>Everything You Need to Launch</h2>
          <p className={styles.sectionDesc}>
            From registration to banking, we handle every step of your business formation journey in Ghana.
          </p>
        </div>

        <div className={styles.servicesGrid}>
          {services.map((service, i) => (
            <div key={i} className={styles.serviceCard}>
              <div className={styles.serviceIcon}>{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
              <div className={styles.serviceFeatures}>
                {service.features.map((feature, j) => (
                  <div key={j} className={styles.serviceFeature}>
                    <span className={styles.serviceFeatureCheck}>✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>How It Works</span>
          <h2 className={styles.sectionTitle}>Four Simple Steps</h2>
          <p className={styles.sectionDesc}>
            Our streamlined process makes business registration effortless.
          </p>
        </div>

        <div className={styles.stepsContainer}>
          {steps.map((step) => (
            <div key={step.num} className={styles.step}>
              <div className={styles.stepNumber}>{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Transparent Pricing</span>
          <h2 className={styles.sectionTitle}>Simple, Honest Pricing</h2>
          <p className={styles.sectionDesc}>
            No hidden fees. Pay once and we handle everything.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {pricingPlans.map((plan, i) => (
            <div
              key={i}
              className={`${styles.pricingCard} ${plan.popular ? styles.popular : ''}`}
            >
              {plan.popular && (
                <span className={styles.pricingPopular}>Most Popular</span>
              )}
              <h3>{plan.name}</h3>
              <p>{plan.desc}</p>
              <div className={styles.pricingAmount}>
                {plan.originalPrice && (
                  <span className={styles.originalPrice}>
                    {plan.currency}{plan.originalPrice}
                  </span>
                )}
                <span className={styles.pricingCurrency}>{plan.currency}</span>
                <span className={styles.pricingValue}>{plan.price}</span>
                <span className={styles.pricingPeriod}>/ {plan.period}</span>
              </div>
              <div className={styles.pricingFeatures}>
                {plan.features.map((feature, j) => (
                  <div key={j} className={styles.pricingFeature}>
                    <span className={styles.pricingCheck}>✓</span>
                    {feature}
                  </div>
                ))}
              </div>
              <Link
                href="/auth/register"
                className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} btn-lg`}
                style={{ width: '100%' }}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className={styles.trust}>
        <div className={styles.trustContent}>
          <h2 className={styles.trustTitle}>Trusted by Entrepreneurs Across Ghana</h2>
          <p className={styles.trustDesc}>
            We&apos;re committed to making business formation accessible, secure, and transparent.
          </p>
          <div className={styles.trustGrid}>
            {trustItems.map((item, i) => (
              <div key={i} className={styles.trustItem}>
                <div className={styles.trustIcon}>{item.icon}</div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.faq} id="faq">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>FAQ</span>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <p className={styles.sectionDesc}>
            Everything you need to know about registering your business with GrayDocket.
          </p>
        </div>

        <div className={styles.faqGrid}>
          {faqs.map((faq, i) => (
            <div key={i} className={styles.faqItem}>
              <button
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                id={`faq-toggle-${i}`}
              >
                {faq.q}
                <ChevronDown
                  size={20}
                  className={`${styles.faqChevron} ${openFaq === i ? styles.open : ''}`}
                />
              </button>
              {openFaq === i && (
                <div className={styles.faqAnswer}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Expansion Section */}
      <section className={styles.expansion}>
        <div className={styles.expansionContent}>
          <div className={styles.expansionText}>
            <span className={styles.sectionTag}>Global Expansion</span>
            <h2 className={styles.sectionTitle}>Built for Scale, not just Ghana.</h2>
            <p className={styles.sectionDesc}>
              Our infrastructure is expanding to support your growth in Africa and beyond.
            </p>
            <div className={styles.expansionGrid}>
              <div className={styles.expansionItem}>
                 <span className={styles.expansionFlag}>🇬🇭</span>
                 <div>
                   <h4>Ghana</h4>
                   <p>Active & Live</p>
                 </div>
              </div>
              <div className={styles.expansionItem}>
                 <span className={styles.expansionFlag}>🇳🇬</span>
                 <div>
                   <h4>Nigeria (Coming Soon)</h4>
                   <p>Beta starting Q3 2026</p>
                 </div>
              </div>
              <div className={styles.expansionItem}>
                 <span className={styles.expansionFlag}>🇺🇸</span>
                 <div>
                   <h4>USA DE/WY (Coming Soon)</h4>
                   <p>Beta starting Q4 2026</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>
            Ready to Start Your Business?
          </h2>
          <p className={styles.ctaDesc}>
            Join hundreds of entrepreneurs who&apos;ve launched their businesses
            through GrayDocket. It only takes 15 minutes.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Get Started Now →
            </Link>
            <Link href="/track" className="btn btn-secondary btn-lg">
              Track Application
            </Link>
          </div>
          <p className={styles.ctaNote}>
            No credit card required to get started
          </p>
        </div>
      </section>

      <Footer />
    </>
  )
}
