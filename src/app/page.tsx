'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building,
  Building2,
  Landmark,
  ShieldCheck,
  Globe,
  Rocket,
  Lock,
  Zap,
  Scale,
  Briefcase,
  Users,
  Check,
  ArrowRight
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import styles from './page.module.css'

const services = [
  { icon: Building, title: 'Sole Proprietorship', desc: 'Register your sole proprietorship with the Office of the Registrar of Companies (ORC).', features: ['ORC name check', 'Business certificate', 'TIN registration'] },
  { icon: Building2, title: 'Limited Company', desc: 'Incorporate a limited company in Ghana with full compliance and all required documentation.', features: ['Articles of incorporation', 'Secretary appointment', 'Share certificates'] },
  { icon: Landmark, title: 'Business Bank Account', desc: 'Open a business bank account with our partner banks instantly.', features: ['Partner banks', 'Document preparation', 'Preferential terms'], status: 'coming-soon' },
  { icon: ShieldCheck, title: 'Compliance Engine', desc: 'Automated reminders for annual returns and regulatory deadlines.', features: ['GRA Registration', 'Return Reminders', 'Deadline Tracking'], status: 'coming-soon' },
  { icon: Globe, title: 'Domain & Email', desc: 'Establish your digital presence with a professional domain and email.', features: ['Domain purchase', 'Email setup', 'DNS configuration'], status: 'coming-soon' },
  { icon: Rocket, title: 'Website Creation', desc: 'Get a professional website for your new business from day one.', features: ['Template design', 'Mobile responsive', 'SEO optimized'], status: 'coming-soon' },
]

const steps = [
  { num: '01', title: 'Choose Service', desc: 'Select the type of business registration you need.' },
  { num: '02', title: 'Fill Details', desc: 'Complete the dynamic form with your business information.' },
  { num: '03', title: 'Submit & Pay', desc: 'Review your information, make payment, and submit.' },
  { num: '04', title: 'Get Registered', desc: 'Track progress and receive your documents digitally.' },
]

const pricingPlans = [
  {
    name: 'Sole Proprietorship', desc: 'Perfect for local freelancers and individual shop owners.', currency: 'GH₵', price: '350', period: 'one-time', popular: false,
    features: ['ORC Name Search & Reservation', 'Business Registration', 'TIN Registration', 'Digital Vault'],
  },
  {
    name: 'Limited Company', desc: 'Professional package for scaling startups and global teams.', currency: 'GH₵', price: '1,200', originalPrice: '4,500', period: 'one-time', popular: true,
    features: ['Articles of Incorporation', 'Company Secretary', 'Ghana Card Verification', 'Document Review'],
  },
]


const trustItems = [
  { icon: Lock, title: 'Bank-Level Security', desc: 'End-to-end encryption for all your data' },
  { icon: Zap, title: 'Priority Processing', desc: 'Direct pathway for faster ORC approval' },
  { icon: Scale, title: 'Legal Support', desc: 'Assistance with constitution drafting' },
  { icon: Briefcase, title: 'Fully Compliant', desc: 'Aligned with Companies Act 2019' },
]

const partners = [
  { name: 'ORC' }, { name: 'GRA' }, { name: 'Banking Partners' }, { name: 'NIC' },
]

export default function Home() {

  return (
    <div className={styles.main}>
      <Header />

      <section className={styles.hero} id="hero">
        <div className={styles.heroLayout}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Business Infrastructure <br />
              <span className={styles.gradientText}>for Founders.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              The all-in-one "Business-in-a-Box" for Ghanaian founders. Automate incorporation, compliance, and corporate banking so you can focus on building, not bureaucracy.
            </p>
            <div className={styles.heroActions}>
              <Link href="/auth/register" className="btn btn-primary btn-lg">Launch Platform</Link>
              <Link href="#services" className="btn btn-secondary btn-lg">View Services</Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.certificateMockup}>
              <div className={styles.certBorderOuter}>
                <div className={styles.certBorderInner}>
                  <div className={styles.certHeader}>
                    <div className={styles.certCoatOfArms}>
                      <Building size={24} strokeWidth={1.5} />
                    </div>
                    <div className={styles.certHeaderText}>
                      <span>REPUBLIC OF GHANA</span>
                      <strong>CERTIFICATE OF INCORPORATION</strong>
                    </div>
                  </div>

                  <div className={styles.certBody}>
                    <p className={styles.certMainText}>
                      This is to certify that
                    </p>
                    <h3 className={styles.certCompanyName}>MODERN VENTURES LTD</h3>
                    <p className={styles.certDetailText}>
                      is this day incorporated under the Companies Act, 2019 (Act 992) and that the liability of its members is limited.
                    </p>

                    <div className={styles.certMetadata}>
                      <div className={styles.certMetaItem}>
                        <span>REGISTRATION NO.</span>
                        <strong>CS123452026</strong>
                      </div>
                      <div className={styles.certMetaItem}>
                        <span>GIVEN UNDER MY HAND BY</span>
                        <strong>ACCRA, GHANA</strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.certFooter}>
                    <div className={styles.certSeal}>
                      <div className={styles.sealInner}>
                        <Check size={16} />
                      </div>
                    </div>
                    <div className={styles.certSignatures}>
                      <div className={styles.signatureLine}>
                        <div className={styles.signature}>Mrs. Jemima Oware</div>
                        <span>REGISTRAR OF COMPANIES</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Background decorative elements */}
            <div className={styles.heroGlow} />
          </div>
        </div>
      </section>

      <section className={styles.partners}>
        <div className={styles.partnersInner}>
          <div className={styles.partnersList}>
            {partners.map((p, i) => (
              <span key={i} className={styles.partnerItem} style={{ fontSize: '14px', color: 'var(--color-neutral-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="services">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Precision Services</h2>
            <p className={styles.sectionSubtitle}>Everything you need to go from idea to operational business in days, not months.</p>
          </div>
          <div className={styles.servicesGrid}>
            {services.map((Service, i) => (
              <div key={i} className={`${styles.serviceCard} ${Service.status === 'coming-soon' ? styles.comingSoon : ''}`}>
                <div className={styles.serviceHeader}>
                  <div className={styles.serviceIcon}><Service.icon strokeWidth={1.5} size={28} /></div>
                  {Service.status === 'coming-soon' && (
                    <span className={styles.comingSoonBadge}>COMING SOON</span>
                  )}
                </div>
                <h3>{Service.title}</h3>
                <p>{Service.desc}</p>
                <div className={styles.serviceFeatures}>
                  {Service.features.map((feature, j) => (
                    <div key={j} className={styles.serviceFeature}><Check size={14} style={{ color: 'var(--color-success)' }} /> {feature}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.focusLayout}>
            <div className={styles.focusContent}>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>We handle the foundation.<br />You handle the growth.</h2>
              <p className={styles.sectionSubtitle} style={{ textAlign: 'left', marginLeft: '0', maxWidth: '100%' }}>
                GrayDocket was built on a simple premise: founders shouldn't spend their best hours navigating bureaucratic maze. While you focus on building your product and finding customers, we operate in the background to ensure your business infrastructure is rock-solid, fully compliant, and ready to scale.
              </p>
              <div className={styles.focusList}>
                <div className={styles.focusItem}>
                  <div className={styles.focusIcon}><ShieldCheck size={20} /></div>
                  <div>
                    <strong>Total Compliance</strong>
                    <p>From ORC filings to GRA tax registrations, we ensure every box is checked.</p>
                  </div>
                </div>
                <div className={styles.focusItem}>
                  <div className={styles.focusIcon}><Landmark size={20} /></div>
                  <div>
                    <strong>Financial Ready</strong>
                    <p>Your business bank account is ready to receive payments before your first sale.</p>
                  </div>
                </div>
                <div className={styles.focusItem}>
                  <div className={styles.focusIcon}><Zap size={20} /></div>
                  <div>
                    <strong>Zero Friction</strong>
                    <p>No queues, no physical forms, no hidden 'facilitation' fees. Just pure speed.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.focusVisual}>
              <div className={styles.focusCardStack}>
                <div className={styles.focusCard} style={{ transform: 'translateY(-20px) rotate(-2deg)' }}>
                  <div className={styles.focusCardHeader}>Your Focus</div>
                  <div className={styles.focusCardBody}>
                    <div className={styles.focusActionItem}><Rocket size={16} /> Product Development</div>
                    <div className={styles.focusActionItem}><Globe size={16} /> Customer Acquisition</div>
                    <div className={styles.focusActionItem}><Users size={16} /> Team Scaling</div>
                  </div>
                </div>
                <div className={styles.focusCard} style={{ transform: 'translateY(40px) rotate(2deg)', background: 'var(--color-primary-900)', color: 'white' }}>
                  <div className={styles.focusCardHeader} style={{ color: 'rgba(255,255,255,0.6)' }}>Our Focus</div>
                  <div className={styles.focusCardBody}>
                    <div className={styles.focusActionItem}><Check size={16} /> Local Incorporation</div>
                    <div className={styles.focusActionItem}><Check size={16} /> Tax ID Generation</div>
                    <div className={styles.focusActionItem}><Check size={16} /> Bank Account Setup</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt} id="pricing">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Simple Economics</h2>
            <p className={styles.sectionSubtitle}>Professional-grade business registration with zero hidden fees.</p>
          </div>
          <div className={styles.pricingGrid}>
            {pricingPlans.map((plan, i) => (
              <div key={i} className={`${styles.pricingCard} ${plan.popular ? styles.popularCard : ''}`}>
                <div className={styles.pricingHeader}>
                  <h3>{plan.name}</h3>
                  <p>{plan.desc}</p>
                </div>
                <div className={styles.pricingAmount}>
                  <span className={styles.currency}>{plan.currency}</span>
                  <span className={styles.price}>{plan.price}</span>
                </div>
                <div className={styles.pricingFeatures} style={{ borderTop: '1px solid var(--color-neutral-200)', marginTop: '24px', paddingTop: '24px' }}>
                  {plan.features.map((feature, j) => (
                    <div key={j} className={styles.pricingFeature}><Check size={16} /> {feature}</div>
                  ))}
                </div>
                <div style={{ marginTop: '32px' }}>
                  <Link href="/auth/register" className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} btn-lg`} style={{ width: '100%' }}>Get Started</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt} style={{ textAlign: 'center', borderTop: '1px solid var(--color-neutral-200)' }}>
        <div className={styles.containerSmall}>
          <h2 className={styles.sectionTitle}>Deploy your business today.</h2>
          <p className={styles.sectionSubtitle} style={{ marginBottom: '32px' }}>Join hundreds of founders building on GrayDocket infrastructure.</p>
          <Link href="/auth/register" className="btn btn-primary btn-lg">Begin Incorporation <ArrowRight size={18} /></Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
