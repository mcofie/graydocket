import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <div className={styles.footerLogo}>
            <div className={styles.footerLogoIcon}>G</div>
            <span>GrayDocket</span>
          </div>
          <p className={styles.footerDesc}>
            The digital-first infrastructure for business in Ghana. Automate your incorporation, tax compliance, and corporate banking from a single interface.
          </p>
        </div>

        <div className={styles.footerColumn}>
          <h4>Foundation</h4>
          <ul>
            <li><Link href="#services">Limited Company</Link></li>
            <li><Link href="#services">Sole Proprietorship</Link></li>
            <li><Link href="#services">Company Guarantee</Link></li>
            <li><Link href="/track">Track Application</Link></li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h4>Platform</h4>
          <ul>
            <li><Link href="#pricing">Pricing Plans</Link></li>
            <li><Link href="/auth/register">Become an Affiliate</Link></li>
            <li><Link href="/contact">Support Center</Link></li>
            <li><Link href="/privacy">Privacy & Terms</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p className={styles.footerCopy}>
          © {new Date().getFullYear()} GrayDocket Infrastructure. All rights reserved. Registered with the ORC.
        </p>
        <div className={styles.footerSocials}>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            𝕏
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            in
          </a>
        </div>
      </div>
    </footer>
  )
}
