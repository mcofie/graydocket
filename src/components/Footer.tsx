import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <div className={styles.footerLogo}>
            <span className={styles.footerLogoIcon}>G</span>
            <span>GrayDocket</span>
          </div>
          <p className={styles.footerDesc}>
            The simplest way to register your business in Ghana. We handle the
            paperwork so you can focus on building your dream.
          </p>
        </div>

        <div className={styles.footerColumn}>
          <h4>Services</h4>
          <ul>
            <li><Link href="#services">Sole Proprietorship</Link></li>
            <li><Link href="#services">Limited Company</Link></li>
            <li><Link href="#services">Tax Registration</Link></li>
            <li><Link href="#services">Bank Account Setup</Link></li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h4>Company</h4>
          <ul>
            <li><Link href="#how-it-works">How It Works</Link></li>
            <li><Link href="#pricing">Pricing</Link></li>
            <li><Link href="#faq">FAQ</Link></li>
            <li><Link href="/track">Track Application</Link></li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h4>Legal</h4>
          <ul>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/contact">Contact Us</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p className={styles.footerCopy}>
          © {new Date().getFullYear()} GrayDocket. All rights reserved.
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
