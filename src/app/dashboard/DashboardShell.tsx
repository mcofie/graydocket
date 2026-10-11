'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, FolderOpen, BookOpen, ShieldCheck, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/ui/UserAvatar'
import { parseAvatarChoice } from '@/lib/avatar'
import styles from './shell.module.css'

type ShellUser = {
  profile?: { full_name?: string; role?: string; avatar_url?: string } | null
  user?: { user_metadata?: { avatar_choice?: unknown } } | null
}

const STAFF_ROLES = ['admin', 'registrar', 'bank_manager', 'service_manager']

function getPageTitle(pathname: string) {
  if (pathname === '/dashboard/applications/new') return 'New Registration'
  if (pathname.startsWith('/dashboard/applications/')) return 'Registration'
  if (pathname.startsWith('/dashboard/choose')) return 'Find your business type'
  if (pathname.startsWith('/dashboard/documents')) return 'Documents'
  if (pathname.startsWith('/dashboard/resources')) return 'Resources'
  if (pathname.startsWith('/dashboard/settings')) return 'Account'
  return 'Your Businesses'
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userData, setUserData] = useState<ShellUser | null>(null)

  useEffect(() => {
    // Read the profile straight from Supabase in the browser rather than via a server action:
    // Next runs server actions one at a time, so an action here would delay each page's own data.
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const [{ data: { user } }, { data: profile }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('full_name, role, avatar_url').eq('id', session.user.id).single(),
      ])
      setUserData({ profile, user })
    }
    load()
    // The account page fires this after a name or photo change so the sidebar avatar stays current
    window.addEventListener('profile-updated', load)
    return () => window.removeEventListener('profile-updated', load)
  }, [])

  const isStaff = STAFF_ROLES.includes(userData?.profile?.role ?? '')

  const navItems = [
    { label: 'Your Businesses', href: '/dashboard', icon: Briefcase, match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/applications') || p.startsWith('/dashboard/choose') },
    { label: 'Documents', href: '/dashboard/documents', icon: FolderOpen, match: (p: string) => p.startsWith('/dashboard/documents') },
    { label: 'Resources', href: '/dashboard/resources', icon: BookOpen, match: (p: string) => p.startsWith('/dashboard/resources') },
    ...(isStaff ? [{ label: 'Partner Portal', href: '/admin', icon: ShieldCheck, match: () => false }] : []),
  ]


  return (
    <div className={styles.shell}>
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayOpen : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.brand} onClick={() => setSidebarOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
            </svg>
            <span>Account</span>
          </Link>

          <Link
            href="/dashboard/settings"
            className={`${styles.avatar} ${pathname.startsWith('/dashboard/settings') ? styles.avatarActive : ''}`}
            aria-label="Account"
            onClick={() => setSidebarOpen(false)}
          >
            <UserAvatar
              size={30}
              name={userData?.profile?.full_name}
              avatarUrl={userData?.profile?.avatar_url}
              choice={parseAvatarChoice(userData?.user?.user_metadata?.avatar_choice)}
            />
          </Link>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} strokeWidth={1.75} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/support">Support</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">Terms</Link>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className={styles.pageTitle}>{getPageTitle(pathname)}</h1>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
