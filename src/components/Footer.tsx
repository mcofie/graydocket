import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'
import FooterNavColumn from './FooterNavColumn'
import styles from './Footer.module.css'

const SUPPORT_EMAIL = 'support@graydocket.com'

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: 'Products',
    links: [
      { label: 'Start', href: '/find-your-business-type' },
      { label: 'Agent', href: '/pricing?view=existing' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Track an application', href: '/track' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Guides & videos', href: '/resources' },
      { label: 'Choosing a business type', href: '/guides/choosing-a-business-type' },
      { label: 'Staying compliant', href: '/guides/staying-compliant' },
      { label: 'Help & support', href: '/support' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Security', href: '/security' },
      { label: 'Contact', href: `mailto:${SUPPORT_EMAIL}` },
      { label: 'Terms of service', href: '/terms' },
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Cookie policy', href: '/cookies' },
      { label: 'Data protection', href: '/dpc' },
    ],
  },
]

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className={styles.footerWrapper}>
      {/* Closing call to action */}
      <section className={styles.calloutSection}>
        <div className={styles.calloutContainer}>
          <div className={styles.calloutContent}>
            <h2 className={styles.calloutTitle}>Start your business today</h2>
            <p className={styles.calloutText}>
              We&apos;ll handle the registration and keep you compliant after, so you can focus on getting your
              business off the ground.
            </p>
            <div className={styles.calloutActions}>
              <Link href="/auth/register" className={styles.calloutPrimary}>
                Start my business <ArrowRight size={16} />
              </Link>
              <Link href="/find-your-business-type" className={styles.calloutSecondary}>
                Take the 1-minute quiz
              </Link>
            </div>
          </div>

          <div className={styles.calloutIllo}>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
            <img src="/meadow.svg" alt="" className={styles.illoImg} />
          </div>
        </div>
      </section>

      {/* Links */}
      <div className={styles.bottomFooter}>
        <div className={styles.bottomContainer}>
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brand} aria-label="GrayDocket home">
              <LogoMark />
              <span>GrayDocket</span>
            </Link>
            <p className={styles.brandText}>Start your business in Ghana. We handle the paperwork.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.email}>
              <Mail size={15} />
              <span>{SUPPORT_EMAIL}</span>
            </a>
          </div>

          <nav className={styles.navGrid} aria-label="Footer">
            {COLUMNS.map((col) => (
              <FooterNavColumn key={col.title} title={col.title} links={col.links} />
            ))}
          </nav>
        </div>

        <div className={styles.legalBar}>
          <span>© {new Date().getFullYear()} GrayDocket. All rights reserved.</span>
          <span>GrayDocket is a business registration service and does not provide legal advice.</span>
        </div>
      </div>
    </footer>
  )
}
