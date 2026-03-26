'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import styles from './Header.module.css'

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Process', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <header
        className={`${styles.header} ${scrolled ? styles.scrolled : styles.transparent}`}
      >
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>G</div>
            <span className={styles.logoText}>GrayDocket</span>
          </Link>

          <nav className={styles.nav}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.navLink}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.navActions}>
            <Link href="/auth/login" className={styles.loginLink}>
              Sign In
            </Link>
            <Link href="/auth/register" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>

          <button
            className={styles.mobileToggle}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.open : ''}`}>
        <div className={styles.mobileMenuInner}>
          <div className={styles.mobileNav}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.mobileNavLink}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className={styles.mobileActions}>
            <Link
              href="/auth/login"
              className="btn btn-secondary btn-lg"
              onClick={() => setMobileOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="btn btn-primary btn-lg"
              onClick={() => setMobileOpen(false)}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
