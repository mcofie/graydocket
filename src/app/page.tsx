'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building,
  Check,
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertTriangle,
  Zap,
  ShieldCheck,
  FileText,
  UserCheck,
  LockKeyhole,
  Lock,
  Users,
  Banknote,
  Mail,
  Globe,
  Building2,
  Layout,
  Cloud,
  Calendar,
  Database,
  Handshake,
  Link as LinkIcon
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import styles from './page.module.css'
import { getAllBusinessTypes, getServices } from '@/lib/actions'
const solutionPoints = [
  { icon: Calendar, title: 'Compliance on Autopilot', desc: 'Starting is easy; staying official is the hard part. We track your ORC annual returns and GRA filings through our automated corporate calendar.' },
  { icon: Database, title: 'DPC Compliant Vault', desc: 'Securely manage your Certificate of Incorporation and TIN. We are a registered Data Controller with the DPC, ensuring your corporate identity is protected.' },
  { icon: Handshake, title: 'The "Day 2" Bridge', desc: 'Registration is just the start. We facilitate seamless introductions to business bank accounts and SSNIT registration through our partner network.' },
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

  const getEtaFor = (name: string, fallback: string) => {
    const type = dbPrices.find(t => t.name.toLowerCase().includes(name.toLowerCase()))
    return type?.eta || fallback
  }

  const pricingPlans = [
    {
      name: 'Sole Proprietorship', 
      desc: 'Perfect for freelancers, creators, and solo founders who want to go official fast.', 
      currency: 'GH₵', 
      price: getPriceFor('Sole Proprietorship', '625'), 
      period: 'one-time', 
      popular: false,
      eta: getEtaFor('Sole Proprietorship', '3-5 business days'),
      features: ['ORC Form 3 Registration', 'TIN Generation', 'Digital Document Vault (Lifetime)'],
    },
    {
      name: 'Company (Shares)', 
      desc: 'For growing startups and businesses requiring a Limited Liability (LLC) structure.', 
      currency: 'GH₵', 
      price: getPriceFor('Company Limited by Shares', '1,200'), 
      originalPrice: '4,500', 
      period: 'one-time', 
      popular: true,
      eta: getEtaFor('Company Limited by Shares', '5-7 business days'),
      features: ['Full ORC incorporation', 'Board of Directors setup', 'Tax & Annual Compliance Tracker'],
    },
    {
      name: 'Company (Guarantee)', 
      desc: 'Designed for NGOs, charities, and non-profit organizations in Ghana.', 
      currency: 'GH₵', 
      price: getPriceFor('Company Limited by Guarantee', '1,500'), 
      period: 'one-time', 
      popular: false,
      eta: getEtaFor('Company Limited by Guarantee', '10-14 business days'),
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
              Launch & Scale Your Business.<br />
              <span className={styles.gradientText}>Zero Compliance Stress.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              The digital-first administrative infrastructure for founders in Ghana. Automate your incorporation, tax activation, and compliance through our technology-enabled corporate services.
            </p>
            <div className={styles.heroActions}>
              <Link href="/auth/register" className="btn btn-primary btn-lg">Start My Registration</Link>
              <Link href="#how-it-works" className="btn btn-secondary btn-lg">See How It Works</Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroImageWrapper}>
              <img 
                src="/hero-illustration-v2.png" 
                alt="Overwhelmed founder with GOV Portals" 
                className={styles.heroImage}
              />
            </div>
            {/* Background decorative elements */}
            <div className={styles.heroGlow} />
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
            <div className={styles.problemVisualContainer}>
              <img 
                src="/problem-illustration.png" 
                alt="Obstacles to formalizing a business" 
                className={styles.problemVisual}
              />
            </div>
            <p className={styles.problemDetailText}>
              Confusing government portals and overlapping forms. Sitting in the dark, not knowing your application status. Constant back-and-forth and rejected applications.
            </p>
          </div>
          <p className={styles.problemClosingText}>You shouldn't have to be a legal expert just to start a legitimate business in Ghana.</p>
        </div>
      </section>      {/* SOLUTION SECTION */}
      <section className={styles.section} id="solution">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
             <span className={styles.sectionKicker} style={{color: 'var(--color-neutral-900)'}}>GO OFFICIAL, EFFORTLESSLY</span>
            <h2 className={styles.sectionTitle}>We make compliance the easiest part of your startup journey.</h2>
            <p className={styles.sectionSubtitle}>GrayDocket is your done-for-you corporate compliance team. We've removed the friction from business setup.</p>
          </div>
          <div className={styles.grid3}>
            {solutionPoints.map((service, i) => {
              const Icon = service.icon
              return (
                <div key={i} className={styles.serviceCard}>
                  <div className={styles.serviceHeader}>
                    <div className={styles.serviceIcon}><Icon strokeWidth={1.5} size={28} /></div>
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.sectionAlt} id="how-it-works">
        <div className={styles.container}>
           <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>From an idea to officially registered in 3 simple steps.</h2>
          </div>
          <div className={styles.solutionVisualContainer}>
            <img 
              src="/solution-illustration.png" 
              alt="How it works: 3 simple steps" 
              className={styles.solutionVisual}
            />
          </div>
          <p className={styles.solutionDetailText}>
            Fill out our 5-minute form. We handle the ORC bureaucracy, business name searches, and document prep. We file your incorporation and generate your TIN. You receive your certified digital documents in your secure vault. Setup your corporate bank account and stay compliant with automated reminders for annual returns and tax dates.
          </p>
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
                  <div className={styles.pricingEta}>
                    <Clock size={12} strokeWidth={2.5} /> {plan.eta}
                  </div>
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
            <div className={styles.precisionSection}>
              <div className={styles.precisionHeader}>
                <h3 className={styles.sectionTitleSmall}>Precision Corporate Services</h3>
                <p className={styles.sectionSubtitleSmall}>Itemized solutions for specific administrative needs.</p>
              </div>
              
              <div className={styles.precisionGrid}>
                {services
                  .filter(s => !s.name.toLowerCase().includes('courier'))
                  .map((s, idx) => {
                    const iconMap: Record<string, any> = {
                      'Bank Account Setup': Building2,
                      'Business Email Setup': Mail,
                      'Business Website': Layout,
                      'Domain Name Purchase': Globe
                    }
                    const Icon = iconMap[s.name] || CheckCircle2
                    
                    return (
                      <div key={idx} className={styles.precisionCard}>
                        <div className={styles.precisionTitleWrapper}>
                          <div className={styles.precisionIconWrapper}>
                            <Icon className={styles.precisionIcon} size={16} strokeWidth={2} />
                          </div>
                          <span className={styles.precisionName}>{s.name}</span>
                        </div>
                        <div className={styles.precisionPrice}>
                          GH₵ {Number(s.price).toLocaleString()}
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div className={styles.precisionDisclaimer}>
                All prices are inclusive of government statutory fees where applicable. GrayDocket is a technology-enabled corporate service provider and does not provide legal, tax, or accounting advice.
              </div>
            </div>
          )}
        </div>
      </section>



      {/* FOUNDERS FOCUS SECTION */}
      <section className={styles.infrastructureSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '40px' }}>
            <h2 className={styles.sectionTitle}>Built for founders in Ghana who value their time.</h2>
          </div>
          <div className={styles.infrastructureVisualContainer}>
            <img 
              src="/infrastructure-illustration.png" 
              alt="GrayDocket Infrastructure: From Paperwork to Partner Banking" 
              className={styles.infrastructureVisual}
            />
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaOverlay} />
        <div className={styles.ctaContent}>
          <h2 className={styles.sectionTitle}>Stop waiting. Start building.</h2>
          <p className={styles.sectionSubtitle} style={{ marginBottom: '32px' }}>
            Join the founders who skipped the queue and secured their business future with GrayDocket.
          </p>
          <Link href="/auth/register" className="btn btn-accent btn-lg">
            Get Started Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
