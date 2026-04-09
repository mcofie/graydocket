'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building,
  Check,
  ArrowRight,
  Clock,
  AlertTriangle,
  Zap,
  ShieldCheck,
  FileText,
  UserCheck
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import styles from './page.module.css'
import { getAllBusinessTypes, getServices } from '@/lib/actions'

const problemPoints = [
  { icon: FileText, title: 'Endless Paperwork', desc: 'Confusing government portals and overlapping forms.' },
  { icon: Clock, title: 'Weeks of Waiting', desc: 'Sitting in the dark, not knowing your application status.' },
  { icon: AlertTriangle, title: 'Unclear Requirements', desc: 'Constant back-and-forth and rejected applications.' }
]

const solutionPoints = [
  { icon: Zap, title: 'Simpler', desc: 'No legal jargon or confusing forms. Tell us about your business in a plain-English form, and we do the rest.' },
  { icon: Clock, title: 'Faster', desc: 'We know exactly what the ORC requires. We submit the right things the first time, preventing annoying delays.' },
  { icon: ShieldCheck, title: 'Done-For-You', desc: 'From business name searches to TIN registration and tax compliance, we handle the entire process from start to finish.' }
]

const steps = [
  { num: '01', title: 'Tell us about your business', desc: 'Fill out our simple, 5-minute digital form with your business details and founder information.' },
  { num: '02', title: 'We handle the bureaucracy', desc: "Our experts prepare your documents, file with the ORC, and process your tax IDs. You don't have to lift a finger or stand in a single queue." },
  { num: '03', title: 'You’re ready to operate', desc: 'Receive your official registration documents digitally. Now you\'re ready to open a business bank account, sign contracts, and close deals.' },
]

const trustItems = [
  { icon: UserCheck, title: 'Built by founders, for founders', desc: 'We felt the stress of the ORC process ourselves, so we built the solution you deserve.' },
  { icon: ShieldCheck, title: 'Clear process, zero surprises', desc: 'Track exactly where your application is at all times. Never wonder what\'s happening behind the scenes.' },
  { icon: Zap, title: 'No back-and-forth', desc: 'We verify your details on day one so you aren\'t bothered with endless corrections or rejected applications.' },
]

const partners = [
  { name: 'ORC' }, { name: 'GRA' }, { name: 'Banking Partners' }, { name: 'NIC' },
]

export default function Home() {
  const [dbPrices, setDbPrices] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      const [pricingRes, servicesRes] = await Promise.all([
        getAllBusinessTypes(),
        getServices()
      ])
      if (pricingRes.business_types) setDbPrices(pricingRes.business_types)
      if (servicesRes.services) setServices(servicesRes.services)
    }
    fetchData()
  }, [])

  // Helper to get total price
  const getPriceFor = (name: string, fallback: string) => {
    const type = dbPrices.find(t => t.name.toLowerCase().includes(name.toLowerCase()))
    if (!type) return fallback
    const total = (Number(type.orc_fee) || 0) + (Number(type.agent_fee) || 0) + (Number(type.returns_portion) || 0)
    if (total === 0) return (Number(type.base_price || 0) + Number(type.service_fee || 0)).toLocaleString()
    return total.toLocaleString()
  }

  const pricingPlans = [
    {
      name: 'Sole Proprietorship', 
      desc: 'Perfect for freelancers, creators, and solo founders who want to go official fast.', 
      currency: 'GH₵', 
      price: getPriceFor('Sole Proprietorship', '625'), 
      period: 'one-time', 
      popular: false,
      features: ['ORC Form 3 Registration', 'TIN Generation', 'Digital Document Vault'],
    },
    {
      name: 'Company (Shares)', 
      desc: 'For growing startups and businesses requiring a Limited Liability (LLC) structure.', 
      currency: 'GH₵', 
      price: getPriceFor('Company Limited by Shares', '1,200'), 
      originalPrice: '4,500', 
      period: 'one-time', 
      popular: true,
      features: ['Full ORC incorporation', 'Board of Directors setup', 'Tax & Compliance setup'],
    },
    {
      name: 'Company (Guarantee)', 
      desc: 'Designed for NGOs, charities, and non-profit organizations in Ghana.', 
      currency: 'GH₵', 
      price: getPriceFor('Company Limited by Guarantee', '1,500'), 
      period: 'one-time', 
      popular: false,
      features: ['NGO legal structure', 'Commissioner for Oaths verification', 'Tax exemption assistance'],
    }
  ]

  return (
    <div className={styles.main}>
      <Header />

      {/* HERO SECTION */}
      <section className={styles.hero} id="hero">
        <div className={styles.heroLayout}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Launch Your Business in Days.<br />
              <span className={styles.gradientText}>Zero Stress Included.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              We handle the paperwork, TINs, and government bureaucracy so you can focus on building your business. No queues, no confusion, just a registered company ready to operate.
            </p>
            <div className={styles.heroActions}>
              <Link href="/auth/register" className="btn btn-primary btn-lg">Start My Registration</Link>
              <Link href="#how-it-works" className="btn btn-secondary btn-lg">See How It Works</Link>
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

      {/* PARTNERS */}
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

      {/* PROBLEM SECTION */}
      <section className={styles.sectionAlt} id="problem">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>THE PROBLEM</span>
            <h2 className={styles.sectionTitle}>Starting a business shouldn't feel like a second job.</h2>
            <p className={styles.sectionSubtitle}>
              You have a great idea, or maybe you’re already making money. But the process of becoming a formal business stands in your way.
            </p>
          </div>
          <div className={styles.grid3}>
            {problemPoints.map((point, i) => (
              <div key={i} className={styles.problemCard}>
                <div className={styles.problemIcon}><point.icon size={24} strokeWidth={1.5} /></div>
                <h3>{point.title}</h3>
                <p>{point.desc}</p>
              </div>
            ))}
          </div>
          <p className={styles.problemClosingText}>You shouldn't have to be a legal expert just to start a legitimate business in Ghana.</p>
        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section className={styles.section} id="solution">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
             <span className={styles.sectionKicker} style={{color: 'var(--color-primary-600)'}}>GO OFFICIAL, EFFORTLESSLY</span>
            <h2 className={styles.sectionTitle}>We make compliance the easiest part of your startup journey.</h2>
            <p className={styles.sectionSubtitle}>GrayDocket is your done-for-you corporate compliance team. We've removed the friction from business setup.</p>
          </div>
          <div className={styles.grid3}>
            {solutionPoints.map((Service, i) => (
              <div key={i} className={styles.serviceCard}>
                <div className={styles.serviceHeader}>
                  <div className={styles.serviceIcon}><Service.icon strokeWidth={1.5} size={28} /></div>
                </div>
                <h3>{Service.title}</h3>
                <p>{Service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.sectionAlt} id="how-it-works">
        <div className={styles.container}>
           <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>From an idea to officially registered in 3 simple steps.</h2>
          </div>
          <div className={styles.stepsContainer}>
            {steps.map((step, i) => (
              <div key={i} className={styles.stepItem}>
                <div className={styles.stepNumber}>{step.num}</div>
                <div className={styles.stepContent}>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className={styles.section} id="pricing">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Simple pricing for serious founders.</h2>
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
                  {plan.currency !== 'Custom' && <span className={styles.currency}>{plan.currency}</span>}
                  <span className={styles.price}>{plan.price}</span>
                </div>
                <div className={styles.pricingFeatures} style={{ borderTop: plan.popular ? '1px solid rgba(var(--color-primary-900-rgb), 0.2)' : '1px solid var(--color-neutral-200)', marginTop: '24px', paddingTop: '24px' }}>
                  {plan.features.map((feature, j) => (
                    <div key={j} className={styles.pricingFeature}><Check size={16} style={{flexShrink: 0}} /> {feature}</div>
                  ))}
                </div>
                <div style={{ marginTop: '32px', display: 'flex', flexGrow: 1, alignItems: 'flex-end' }}>
                  <Link href="/auth/register" className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} btn-lg`} style={{ width: '100%' }}>{plan.popular ? 'Start My Registration' : 'Get Started'}</Link>
                </div>
              </div>
            ))}
          </div>

          {/* Precision Services List */}
          {services.length > 0 && (
            <div style={{ marginTop: '80px', paddingTop: '60px', borderTop: '1px solid var(--color-neutral-100)' }}>
              <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-neutral-900)' }}>Precision Corporate Services</h3>
                <p style={{ color: 'var(--color-neutral-500)', fontSize: '15px', marginTop: '8px' }}>Itemized solutions for specific administrative needs.</p>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '16px' 
              }}>
                {services.map((s, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '20px 24px', 
                    background: 'white', 
                    borderRadius: '16px', 
                    border: '1px solid var(--color-neutral-200)',
                    transition: 'all 0.2s',
                    cursor: 'default'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary-500)' }} />
                       <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-neutral-800)' }}>{s.name}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-primary-600)' }}>
                       GH₵ {Number(s.price).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>
                  All prices are inclusive of government statutory fees where applicable.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className={styles.sectionAlt} id="trust">
        <div className={styles.container}>
           <div className={styles.focusLayout}>
            <div className={styles.focusContent}>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Built for founders in Ghana who value their time.</h2>
              <div className={styles.focusList}>
                {trustItems.map((item, i) => (
                  <div key={i} className={styles.focusItem}>
                    <div className={styles.focusIcon}><item.icon size={20} /></div>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.focusVisual}>
              <div className={styles.focusCardStack}>
                 {/* Some visual representation of trust */}
                 <div className={styles.focusCard} style={{ transform: 'none', background: 'var(--color-primary-900)', color: 'white', border: 'none' }}>
                    <div className={styles.focusCardHeader} style={{ color: 'rgba(255,255,255,0.6)' }}>OUR GUARANTEE</div>
                    <div className={styles.focusCardBody}>
                      <div className={styles.focusActionItem}><Check size={16} /> Fast Processing</div>
                      <div className={styles.focusActionItem}><Check size={16} /> Transparent Pricing</div>
                      <div className={styles.focusActionItem}><Check size={16} /> 100% Compliant</div>
                    </div>
                  </div>
              </div>
            </div>
           </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className={styles.section} style={{ textAlign: 'center' }}>
        <div className={styles.containerSmall}>
          <h2 className={styles.sectionTitle}>Stop waiting. Start building.</h2>
          <p className={styles.sectionSubtitle} style={{ marginBottom: '32px' }}>Join the founders who skipped the queue and registered their businesses the smart way.</p>
          <Link href="/auth/register" className="btn btn-primary btn-lg">Get Started Now <ArrowRight size={18} /></Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
