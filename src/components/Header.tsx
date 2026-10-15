'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X, Rocket, ShieldCheck, BookOpen, MessageCircle, Sparkles } from 'lucide-react'
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
  {
    title: 'Name ideas',
    desc: 'Find a business name and check it’s free',
    href: '/name-ideas',
    icon: Sparkles,
  },
]

const RESOURCES = [
  { title: 'Guides & videos', desc: 'Learn about registration and compliance', href: '/resources', icon: BookOpen },
  { title: 'Help & support', desc: 'Get help with your account or application', href: '/support', icon: MessageCircle },
  { title: 'Security', desc: 'Account safety and reporting concerns', href: '/security', icon: ShieldCheck },
]

export default function Header() {
  const pathname = usePathname()
  const inSection = (path: string) => pathname === path || pathname.startsWith(`${path}/`)
  const startActive = inSection('/find-your-business-type') || inSection('/services')
  const agentActive = inSection('/compliance')
  const resourceActive = (href: string) => inSection(href) || (href === '/resources' && inSection('/guides'))
  const resourcesActive = RESOURCES.some(({ href }) => resourceActive(href))
  const productActive = (href: string) => href === '/find-your-business-type' ? startActive : agentActive
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
                  data-active={startActive || agentActive || undefined}
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
                          data-active={productActive(product.href) || undefined}
                          aria-current={productActive(product.href) ? 'location' : undefined}
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

              <Link href="/pricing" className={styles.navLink} data-active={inSection('/pricing') || undefined} aria-current={inSection('/pricing') ? 'page' : undefined}>
                Pricing
              </Link>

              <div
                className={styles.dropdownWrap}
                onMouseEnter={() => setActiveDropdown('resources')}
                onMouseLeave={() => setActiveDropdown(null)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setActiveDropdown(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setActiveDropdown(null)
                    event.currentTarget.querySelector('button')?.focus()
                  }
                }}
              >
                <button
                  type="button"
                  className={styles.navLinkButton}
                  aria-expanded={activeDropdown === 'resources'}
                  aria-controls="resources-navigation"
                  data-active={resourcesActive || undefined}
                  onClick={() => setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')}
                >
                  <span>Resources</span>
                  <ChevronDown size={11} strokeWidth={2.5} className={styles.chevronIcon} />
                </button>
                <div
                  id="resources-navigation"
                  className={`${styles.dropdownMenu} ${activeDropdown === 'resources' ? styles.dropdownVisible : ''}`}
                  inert={activeDropdown !== 'resources'}
                >
                  <div className={styles.dropdownCard}>
                    {RESOURCES.map(({ title, desc, href, icon: Icon }) => (
                      <Link key={href} href={href} className={styles.dropdownItem} data-active={resourceActive(href) || undefined} aria-current={resourceActive(href) ? (pathname === href ? 'page' : 'location') : undefined} onClick={() => setActiveDropdown(null)}>
                        <div className={styles.itemIconBox}><Icon size={20} strokeWidth={2} /></div>
                        <div className={styles.itemText}>
                          <div className={styles.itemTitle}>{title}</div>
                          <div className={styles.itemDesc}>{desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

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
              data-active={productActive(product.href) || undefined}
              aria-current={productActive(product.href) ? 'location' : undefined}
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
            data-active={inSection('/pricing') || undefined}
            aria-current={inSection('/pricing') ? 'page' : undefined}
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </Link>
          <div className={styles.mobileSectionTitle} data-active={resourcesActive || undefined}>Resources</div>
          {RESOURCES.map(({ title, desc, href }) => (
            <Link key={href} href={href} className={styles.mobileNavLink} data-active={resourceActive(href) || undefined} aria-current={resourceActive(href) ? (pathname === href ? 'page' : 'location') : undefined} onClick={() => setMobileOpen(false)}>
              {title}
              <span className={styles.mobileNavDesc}>{desc}</span>
            </Link>
          ))}
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
