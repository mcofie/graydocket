'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import styles from './Header.module.css'

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Track', href: '/track' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
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
            <span className={styles.logoIcon}>G</span>
            <span>
              <span className={styles.logoTextGray}>Gray</span>
              <span className={styles.logoTextDocket}>Docket</span>
            </span>
          </Link>

          <nav className={styles.nav}>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={styles.navLink}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className={styles.navActions}>
            <Link href="/auth/login" className="btn btn-ghost btn-sm">
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
            id="mobile-menu-toggle"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.open : ''}`}>
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={styles.mobileNavLink}
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </a>
        ))}
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
    </>
  )
}
