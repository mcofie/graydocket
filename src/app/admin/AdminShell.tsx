'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Wallet, Tag, Handshake, Users, LogOut, Menu, X, ArrowLeftRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './admin-ui.module.css'

// The back office. One role (admin) sees one set of pages.
const NAV = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Applications', href: '/admin/applications', icon: FileText },
  { label: 'Payments', href: '/admin/payments', icon: Wallet },
  { label: 'Pricing', href: '/admin/pricing', icon: Tag },
  { label: 'Affiliates', href: '/admin/affiliates', icon: Handshake },
  { label: 'Users', href: '/admin/users', icon: Users },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [me, setMe] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setMe({ name: (user.user_metadata?.full_name as string) || 'Admin', email: user.email || '' })
    })
  }, [])

  const signOut = async () => {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <Link href="/admin" className={styles.brand} onClick={() => setOpen(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
          </svg>
          GrayDocket
          <span className={styles.brandTag}>Admin</span>
        </Link>

        <nav aria-label="Admin">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${isActive(href) ? styles.navActive : ''}`}
              aria-current={isActive(href) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} strokeWidth={1.9} />
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {me && (
            <div className={styles.who}>
              <strong>{me.name}</strong>
              {me.email}
            </div>
          )}
          <Link href="/dashboard" className={styles.navLink}>
            <ArrowLeftRight size={18} strokeWidth={1.9} />
            Customer view
          </Link>
          <button type="button" className={styles.navLink} onClick={signOut} style={{ border: 0, background: 'none', cursor: 'pointer', font: 'inherit' }}>
            <LogOut size={18} strokeWidth={1.9} />
            Sign out
          </button>
        </div>
      </aside>

      <div>
        <div className={styles.topBar}>
          <button type="button" onClick={() => setOpen(!open)} aria-label="Menu" style={{ border: 0, background: 'none', cursor: 'pointer' }}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <strong>GrayDocket Admin</strong>
          <span style={{ width: 22 }} />
        </div>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
