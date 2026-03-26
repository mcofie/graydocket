'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  DollarSign,
  Building2,
  Bell,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import dashStyles from '../dashboard/dashboard.module.css'

const adminNavItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Applications', href: '/admin/applications', icon: FileText },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Services', href: '/admin/services', icon: Settings },
  { label: 'Pricing', href: '/admin/pricing', icon: DollarSign },
  { label: 'Banking Partners', href: '/admin/banking', icon: Building2 },
]

export default function AdminLayout({
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

  const getPageTitle = () => {
    const item = adminNavItems.find((item) => item.href === pathname)
    return item ? `Admin — ${item.label}` : 'Admin Panel'
  }

  return (
    <div className={dashStyles.dashboardLayout}>
      <div
        className={`${dashStyles.sidebarOverlay} ${sidebarOpen ? dashStyles.open : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`${dashStyles.sidebar} ${sidebarOpen ? dashStyles.open : ''}`}>
        <div className={dashStyles.sidebarHeader}>
          <Link href="/admin" className={dashStyles.sidebarLogo}>
            <span className={dashStyles.sidebarLogoIcon} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>A</span>
            <span>Admin Panel</span>
          </Link>
        </div>

        <nav className={dashStyles.sidebarNav}>
          <div className={dashStyles.sidebarLink} style={{ gap: 'var(--space-2)', opacity: 0.7, cursor: 'default', pointerEvents: 'none' }}>
            <Shield size={14} />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-neutral-400)' }}>
              Administration
            </span>
          </div>
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${dashStyles.sidebarLink} ${isActive ? dashStyles.active : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            )
          })}

          <div className={dashStyles.sidebarSection}>
            <div className={dashStyles.sidebarSectionTitle}>Quick Links</div>
            <Link href="/dashboard" className={dashStyles.sidebarLink}>
              <LayoutDashboard size={20} />
              User Dashboard
            </Link>
            <Link href="/" className={dashStyles.sidebarLink}>
              <Building2 size={20} />
              Landing Page
            </Link>
          </div>
        </nav>

        <div className={dashStyles.sidebarFooter}>
          <div className={dashStyles.sidebarUser}>
            <div className={dashStyles.sidebarAvatar} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
              A
            </div>
            <div className={dashStyles.sidebarUserInfo}>
              <div className={dashStyles.sidebarUserName}>
                {user?.user_metadata?.full_name || 'Admin'}
              </div>
              <div className={dashStyles.sidebarUserEmail}>
                {user?.email || ''}
              </div>
            </div>
          </div>
          <button
            className={dashStyles.sidebarLink}
            onClick={handleSignOut}
            style={{ marginTop: 'var(--space-2)', width: '100%' }}
            id="admin-sign-out"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className={dashStyles.mainContent}>
        <div className={dashStyles.topBar}>
          <div className={dashStyles.topBarLeft}>
            <button
              className={dashStyles.mobileMenuBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
              id="admin-sidebar-toggle"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className={dashStyles.pageTitle}>{getPageTitle()}</h1>
          </div>
          <div className={dashStyles.topBarRight}>
            <button className={dashStyles.notifBtn} aria-label="Notifications" id="admin-notif">
              <Bell size={20} />
              <span className={dashStyles.notifDot} />
            </button>
          </div>
        </div>

        <main className={dashStyles.content}>{children}</main>
      </div>
    </div>
  )
}
