import Link from 'next/link'
import Image from 'next/image'
import {
  Building2,
  Search,
  ShieldCheck,
  FolderLock,
  CheckCircle2,
  CalendarClock,
  ArrowRight,
  Plus,
  Check,
  Compass,
  Bell,
  FileText,
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Reveal from '@/components/ui/Reveal'
import styles from './page.module.css'

// What GrayDocket takes off a founder's plate, one family accent each
const HANDLED = [
  { icon: Building2, title: 'Registration', desc: 'We file with the ORC for you.', accent: 'var(--accent-blue)', badge: null },
  { icon: Search, title: 'Name search', desc: 'We check your name is free first.', accent: 'var(--accent-green)', badge: null },
  { icon: ShieldCheck, title: 'Compliance', desc: 'Annual returns and renewals, filed.', accent: 'var(--accent-gold)', badge: null },
  { icon: FolderLock, title: 'Documents', desc: 'Every certificate, kept safe.', accent: 'var(--accent-orange)', badge: 'Encrypted' },
]

const featureSections = [
  {
    accent: 'var(--accent-blue)',
    eyebrow: 'Name Search',
    title: 'Pick your name with confidence.',
    desc: 'Type a name and we check the ORC register for you, flagging exact matches and look-alikes before you file. No guesswork, no rejected applications.',
    image: '/hero-illustration-v2.png',
    imageHeight: 682,
    faded: false,
    alt: 'Illustration of a founder surrounded by registration forms',
    checks: ['Live ORC Search', 'Look-Alike Detection', 'Instant Results', 'No Account Needed', 'Straight To Filing'],
  },
  {
    accent: 'var(--accent-green)',
    eyebrow: 'Compliance, handled',
    title: 'Compliance runs itself. You run the business.',
    desc: 'Annual returns, renewals and tax registrations are tracked for you. We remind you well before anything is due and file it once you approve, so paperwork never pulls you away from your business.',
    image: '/compliance_on_autopilot_visual_1775813416373.png',
    imageHeight: 819,
    faded: true,
    alt: 'Compliance calendar illustration',
    checks: ['Every Deadline Tracked', 'Early Reminders', 'Filed For You', 'Plain-Language Status'],
  },
  {
    accent: 'var(--accent-gold)',
    eyebrow: 'Document Vault',
    title: 'Your paperwork, sorted for you.',
    desc: 'Certificates, constitutions and filings are stored and organised automatically, ready the moment a bank, client or accountant asks. Nothing to file away yourself.',
    image: '/secure_vault_visual_1775814096065.png',
    imageHeight: 819,
    faded: true,
    alt: 'Document vault illustration',
    checks: ['Encrypted Storage', 'Auto-Organised', 'Secure Sharing', 'Download Anytime'],
  },
]

const faqs = [
  {
    q: 'How long does registration take?',
    a: 'Filling in your details takes about 15 minutes. Processing time then depends on the Office of the Registrar of Companies, and you can follow every step from your dashboard.',
  },
  {
    q: 'Which business types can I register?',
    a: 'Sole proprietorships, companies limited by shares, and companies limited by guarantee for non-profits. Not sure which fits? Take the 1-minute quiz, or talk to us if you need something else.',
  },
  {
    q: 'Can I move an existing business to GrayDocket?',
    a: 'Yes. Add your registered business and documents, and we’ll keep track of its filings from then on, so you can stay focused on running it.',
  },
  {
    q: 'Do I need to understand the legal side?',
    a: 'No. We ask simple questions in plain English, check your details, and handle the filing with the ORC. You focus on your business; we deal with the paperwork.',
  },
  {
    q: 'Is my information safe?',
    a: 'Your documents are encrypted and only visible to you and the people you invite. See our security page for details.',
  },
]

export default function Home() {
  return (
    <div className={styles.pageWrapper}>
      <Header />
      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Start your business.<br />We&apos;ll handle the paperwork.
          </h1>
          <p className={styles.heroText}>
            Register your business in Ghana in minutes. We keep it compliant, so you can focus on getting it
            off the ground.
          </p>
          <div className={styles.heroActions}>
            <Link href="/auth/register" className={styles.primaryBtn}>
              <span>Start my business</span>
              <ArrowRight size={15} />
            </Link>
            <Link href="/support" className={styles.secondaryBtn}>
              Request a call
            </Link>
          </div>
          <Link href="/find-your-business-type" className={styles.quizLink}>
            <Compass size={16} strokeWidth={2} className={styles.quizIcon} />
            <span className={styles.quizText}>
              <span className={styles.quizAsk}>Not sure which business type?</span>{' '}
              <span className={styles.quizAction}>Take the 1-minute quiz</span>
            </span>
            <ArrowRight size={14} className={styles.quizArrow} />
          </Link>
        </section>

        <div className={styles.container}>
          {/* Bento grid */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              You run the business.<br />We handle the rest.
            </h2>

            <Reveal className={styles.grid}>
              {/* Easy: everything we take off your plate */}
              <div className={`${styles.card} ${styles.cardEasy}`}>
                <div className={styles.visualEasy}>
                  <div className={styles.darkMenu}>
                    <p className={styles.menuLabel}>We handle</p>
                    {HANDLED.map(({ icon: Icon, title, desc, accent, badge }) => (
                      <div key={title} className={styles.menuItem}>
                        <div className={styles.menuIcon} style={{ backgroundColor: accent }}>
                          <Icon size={15} color="#ffffff" strokeWidth={2.25} />
                        </div>
                        <div className={styles.menuText}>
                          <div className={styles.menuTitleRow}>
                            <span className={styles.menuTitle}>{title}</span>
                            {badge && <span className={styles.idBadge}>{badge}</span>}
                          </div>
                          <div className={styles.menuDesc}>{desc}</div>
                        </div>
                        <Check size={14} strokeWidth={3} className={styles.menuDone} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <h3 className={styles.cardTitle}>Easy</h3>
                  <p className={styles.cardDesc}>Anyone can start. Simple questions, plain English, no legal jargon.</p>
                </div>
              </div>

              {/* Fast */}
              <div className={styles.card}>
                <div className={styles.visualFast}>
                  <div className={styles.timelineBox}>
                    {[
                      { title: 'Name cleared', date: 'Mon' },
                      { title: 'Filed with ORC', date: 'Tue' },
                      { title: 'Certificate issued', date: 'Thu' },
                    ].map((step, i, arr) => (
                      <div key={step.title} className={styles.timelineItem}>
                        <div className={styles.timelineNode}>
                          <CheckCircle2 size={16} className={styles.timelineCheck} />
                          {i < arr.length - 1 && <div className={styles.timelineLine} />}
                        </div>
                        <div className={styles.timelineContent}>
                          <span className={styles.timelineTitle}>{step.title}</span>
                          <span className={styles.timelineDate}>{step.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <h3 className={styles.cardTitle}>Fast</h3>
                  <p className={styles.cardDesc}>Fill in your details in about 15 minutes. We take it from there.</p>
                </div>
              </div>

              {/* Handled: the filing happens without you */}
              <div className={styles.card}>
                <div className={styles.visualCenter}>
                  <div className={styles.statusPill}>
                    <span className={styles.statusFiling}>
                      <span className={styles.spinner} aria-hidden="true" />
                      Filing for you
                    </span>
                    <span className={styles.statusDone}>
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                      Compliant
                    </span>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <h3 className={styles.cardTitle}>Handled</h3>
                  <p className={styles.cardDesc}>Annual returns and renewals filed for you. Compliance is our job, not yours.</p>
                </div>
              </div>

              {/* Reliable */}
              <div className={styles.card}>
                <div className={styles.visualCenter}>
                  <div className={styles.deadlineCard}>
                    <CalendarClock size={18} className={styles.deadlineIcon} />
                    <div className={styles.deadlineCenter}>
                      <div className={styles.deadlineTitle}>Annual return</div>
                      <div className={styles.deadlineSub}>Due in 14 days</div>
                    </div>
                    <span className={styles.deadlineBadge}>
                      <Bell size={11} strokeWidth={2.5} className={styles.bell} />
                      We&apos;re on it
                    </span>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <h3 className={styles.cardTitle}>Reliable</h3>
                  <p className={styles.cardDesc}>We watch every deadline, so nothing slips while you&apos;re busy running things.</p>
                </div>
              </div>

              {/* Supported */}
              <div className={styles.card}>
                <div className={styles.visualCenter}>
                  <div className={styles.chat}>
                    <span className={`${styles.bubble} ${styles.bubbleMe}`}>Is my name approved?</span>
                    <span className={styles.typing} aria-hidden="true"><i /><i /><i /></span>
                    <span className={`${styles.bubble} ${styles.bubbleUs}`}>Yes! We&apos;re filing today.</span>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <h3 className={styles.cardTitle}>Supported</h3>
                  <p className={styles.cardDesc}>Questions? Talk to a real person on WhatsApp or email, whenever you need us.</p>
                </div>
              </div>
            </Reveal>
          </section>

          {/* How it works: you answer, we file, you get to work */}
          <section className={styles.showcaseSection}>
            <div className={styles.showcaseHeader}>
              <p className={styles.showcaseEyebrow}>How it works</p>
              <h2 className={styles.showcaseTitle}>
                From idea to open<br />
                for business
              </h2>
            </div>

            <Reveal className={styles.showcaseGrid}>
              <div className={styles.showcaseCard}>
                <div className={styles.showcaseVisual} style={{ '--panel': 'var(--accent-blue)' } as React.CSSProperties}>
                  <span className={styles.stepNum}>1</span>
                  <div className={styles.mockCard}>
                    <span className={styles.mockLabel}>Business name</span>
                    <span className={styles.mockInput}>
                      <span className={styles.typed}>Ama&apos;s Kitchen</span>
                      <span className={styles.caret} aria-hidden="true" />
                    </span>
                    <span className={styles.mockLabel}>Business type</span>
                    <span className={`${styles.mockChip} ${styles.mockChipOn}`}>
                      <Check size={12} strokeWidth={3} /> Sole proprietorship
                    </span>
                    <span className={styles.mockChip}>Company limited by shares</span>
                  </div>
                </div>
                <div className={styles.showcaseContent}>
                  <h3 className={styles.showcaseCardTitle}>Tell us about your business</h3>
                  <p className={styles.showcaseCardDesc}>
                    Simple questions, about 15 minutes. No forms to print, no office visits.
                  </p>
                </div>
              </div>

              <div className={styles.showcaseCard}>
                <div className={styles.showcaseVisual} style={{ '--panel': 'var(--accent-gold)' } as React.CSSProperties}>
                  <span className={styles.stepNum}>2</span>
                  <div className={`${styles.mockCard} ${styles.mockDoc}`}>
                    <span className={styles.mockDocIcon}><FileText size={18} /></span>
                    <span className={styles.mockDocTitle}>Registration filing</span>
                    <span className={styles.mockLines} aria-hidden="true">
                      <span /><span /><span />
                    </span>
                    <span className={styles.stamp}>Filed with ORC</span>
                  </div>
                </div>
                <div className={styles.showcaseContent}>
                  <h3 className={styles.showcaseCardTitle}>We file it for you</h3>
                  <p className={styles.showcaseCardDesc}>
                    We check your details and file with the ORC. You&apos;ll see every update in your dashboard.
                  </p>
                </div>
              </div>

              <div className={styles.showcaseCard}>
                <div className={styles.showcaseVisual} style={{ '--panel': 'var(--accent-green)' } as React.CSSProperties}>
                  <span className={styles.stepNum}>3</span>
                  <div className={styles.mockToast}>
                    <span className={styles.mockToastIcon}><Bell size={13} strokeWidth={2.5} /></span>
                    Your certificate is ready
                  </div>
                  <div className={`${styles.mockCard} ${styles.mockCert}`}>
                    <span className={styles.mockSeal}><Check size={20} strokeWidth={3} /></span>
                    <span className={styles.mockCertKicker}>Certificate of registration</span>
                    <span className={styles.mockCertName}>Ama&apos;s Kitchen</span>
                  </div>
                </div>
                <div className={styles.showcaseContent}>
                  <h3 className={styles.showcaseCardTitle}>Open for business</h3>
                  <p className={styles.showcaseCardDesc}>
                    Your certificate lands in your Documents. We keep you compliant from here, so you can get to work.
                  </p>
                </div>
              </div>
            </Reveal>
          </section>

          {/* Alternating feature sections */}
          {featureSections.map((s, i) => (
            <section
              key={s.title}
              className={`${styles.split} ${i % 2 === 1 ? styles.splitReverse : ''}`}
              style={{ '--accent': s.accent } as React.CSSProperties}
            >
              <div className={styles.splitVisual}>
                <Image src={s.image} alt={s.alt} width={1024} height={s.imageHeight} sizes="(max-width: 900px) min(480px, 100vw), 484px" className={`${styles.splitImg} ${s.faded ? styles.splitImgFaded : ''}`} />
              </div>
              <div className={styles.splitText}>
                <p className={styles.splitEyebrow}>{s.eyebrow}</p>
                <h2 className={styles.splitTitle}>{s.title}</h2>
                <p className={styles.splitDesc}>{s.desc}</p>
                <ul className={styles.checkList}>
                  {s.checks.map((c) => (
                    <li key={c} className={styles.checkItem}>
                      <Check size={20} strokeWidth={2.5} />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}

          {/* FAQ */}
          <section id="faq" className={styles.section}>
            <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
            <div className={styles.faqList}>
              {faqs.map((f) => (
                <details key={f.q} className={styles.faqItem}>
                  <summary className={styles.faqQuestion}>
                    <span>{f.q}</span>
                    <Plus size={18} className={styles.faqIcon} />
                  </summary>
                  <p className={styles.faqAnswer}>{f.a}</p>
                </details>
              ))}
            </div>
            <div className={styles.faqMore}>
              <Link href="/support" className={styles.secondaryBtn}>
                See more FAQs
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
