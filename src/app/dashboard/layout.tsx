'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  FolderOpen,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './dashboard.module.css'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Applications', href: '/dashboard/applications', icon: FileText },
  { label: 'New Registration', href: '/dashboard/applications/new', icon: PlusCircle },
  { label: 'Documents', href: '/dashboard/documents', icon: FolderOpen },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || 'U'
    return name
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getPageTitle = () => {
    const item = navItems.find((item) => item.href === pathname)
    return item?.label || 'Dashboard'
  }

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar Overlay */}
      <div
        className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.open : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.sidebarLogo}>
            <span className={styles.sidebarLogoIcon}>G</span>
            <span>GrayDocket</span>
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.sidebarLink} ${isActive ? styles.active : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarUser}>
            <div className={styles.sidebarAvatar}>{getInitials()}</div>
            <div className={styles.sidebarUserInfo}>
              <div className={styles.sidebarUserName}>
                {user?.user_metadata?.full_name || 'User'}
              </div>
              <div className={styles.sidebarUserEmail}>
                {user?.email || ''}
              </div>
            </div>
          </div>
          <button
            className={styles.sidebarLink}
            onClick={handleSignOut}
            style={{ marginTop: 'var(--space-2)', width: '100%' }}
            id="sign-out-btn"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button
              className={styles.mobileMenuBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
              id="sidebar-toggle"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
          </div>
          <div className={styles.topBarRight}>
            <button className={styles.notifBtn} aria-label="Notifications" id="notif-btn">
              <Bell size={20} />
              <span className={styles.notifDot} />
            </button>
          </div>
        </div>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
