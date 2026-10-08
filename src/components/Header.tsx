'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, Menu, X, Rocket, ShieldCheck } from 'lucide-react'
import styles from './Header.module.css'

const PRODUCTS = [
  {
    title: 'Start',
    desc: 'Launch, grow, and manage your business',
    href: '/find-your-business-type',
    icon: Rocket,
  },
  {
    title: 'Agent',
    desc: 'All-in-one compliance for your business',
    href: '/pricing?view=existing',
    icon: ShieldCheck,
  },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileOpen])

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <div className={styles.headerInner}>
          {/* Left: Logo & Nav Links */}
          <div className={styles.leftGroup}>
            <Link href="/" className={styles.logo}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.logoIcon}
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
              </svg>
              <span className={styles.logoText}>GrayDocket</span>
            </Link>

            <nav className={styles.nav}>
              {/* Products Dropdown */}
              <div
                className={styles.dropdownWrap}
                onMouseEnter={() => setActiveDropdown('products')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  type="button"
                  className={styles.navLinkButton}
                  aria-expanded={activeDropdown === 'products'}
                  onClick={() =>
                    setActiveDropdown(activeDropdown === 'products' ? null : 'products')
                  }
                >
                  <span>Products</span>
                  <ChevronDown size={11} strokeWidth={2.5} className={styles.chevronIcon} />
                </button>

                <div
                  className={`${styles.dropdownMenu} ${
                    activeDropdown === 'products' ? styles.dropdownVisible : ''
                  }`}
                >
                  <div className={styles.dropdownCard}>
                    {PRODUCTS.map((product) => {
                      const Icon = product.icon
                      return (
                        <Link
                          key={product.href}
                          href={product.href}
                          className={styles.dropdownItem}
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className={styles.itemIconBox}>
                            <Icon size={20} strokeWidth={2} />
                          </div>
                          <div className={styles.itemText}>
                            <div className={styles.itemTitle}>{product.title}</div>
                            <div className={styles.itemDesc}>{product.desc}</div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>

              <Link href="/pricing" className={styles.navLink}>
                Pricing
              </Link>

              <Link href="/resources" className={styles.navLink}>
                Resources
              </Link>

            </nav>
          </div>

          {/* Right: Log In & Start my business buttons */}
          <div className={styles.rightGroup}>
            <Link href="/auth/login" className={styles.loginPillBtn}>
              Log In
            </Link>
            <Link href="/auth/register" className={styles.getStartedPillBtn}>
              Start my business
            </Link>

            <button
              className={styles.mobileToggle}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ''}`}>
        <div className={styles.mobileNavLinks}>
          <div className={styles.mobileSectionTitle}>Products</div>
          {PRODUCTS.map((product) => (
            <Link
              key={product.href}
              href={product.href}
              className={styles.mobileNavLink}
              onClick={() => setMobileOpen(false)}
            >
              {product.title}
              <span className={styles.mobileNavDesc}>{product.desc}</span>
            </Link>
          ))}

          <div className={styles.mobileSectionTitle}>Company</div>
          <Link
            href="/pricing"
            className={styles.mobileNavLink}
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="/resources"
            className={styles.mobileNavLink}
            onClick={() => setMobileOpen(false)}
          >
            Resources
          </Link>
        </div>

        <div className={styles.mobileActions}>
          <Link
            href="/auth/login"
            className={styles.mobileLoginBtn}
            onClick={() => setMobileOpen(false)}
          >
            Log In
          </Link>
          <Link
            href="/auth/register"
            className={styles.mobileGetStartedBtn}
            onClick={() => setMobileOpen(false)}
          >
            Start my business
          </Link>
        </div>
      </div>
    </>
  )
}
