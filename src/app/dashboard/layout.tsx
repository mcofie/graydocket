'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutGrid,
  ClipboardList,
  Building2,
  FolderOpen,
  Settings,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getDashboardStats } from '@/lib/actions'
import dashStyles from './dashboard.module.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const stats = await getDashboardStats()
      if (stats) {
        setUserData(stats)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isAffiliate = userData?.profile?.is_affiliate
  const isPartner = ['admin', 'registrar', 'bank_manager', 'service_manager'].includes(userData?.profile?.role)

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutGrid },
    { label: 'Registrations', href: '/dashboard/applications', icon: ClipboardList },
    { label: 'Banking Hub', href: '/dashboard/banking', icon: Building2 },
    { label: 'Legal Vault', href: '/dashboard/documents', icon: FolderOpen },
  ]

  const accountItems = [
    ...(isPartner ? [{ label: 'Partner Portal', href: '/admin', icon: ShieldCheck }] : []),
    ...(isAffiliate ? [{ label: 'Partner Program', href: '/dashboard/affiliate', icon: TrendingUp }] : []),
    { label: 'Account & Security', href: '/dashboard/settings', icon: Settings },
  ]

  const getPageTitle = () => {
    const allItems = [...navItems, ...accountItems]
    const item = allItems.find((item) => item.href === pathname)
    return item ? item.label : 'Dashboard'
  }

  if (loading) {
    return (
      <div className={dashStyles.dashboardLayout}>
         <div style={{ padding: 'var(--space-12)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: 'var(--color-neutral-400)' }}>
            Initialising your workspace...
         </div>
      </div>
    )
  }

  return (
    <div className={dashStyles.dashboardLayout}>
      {/* Mobile Overlay */}
      <div
        className={`${dashStyles.sidebarOverlay} ${sidebarOpen ? dashStyles.open : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`${dashStyles.sidebar} ${sidebarOpen ? dashStyles.open : ''}`}>
        <div className={dashStyles.sidebarHeader}>
          <Link href="/dashboard" className={dashStyles.sidebarLogo}>
            <div className={dashStyles.sidebarLogoIcon}>GD</div>
            <span>GrayDocket</span>
          </Link>
        </div>

        <nav className={dashStyles.sidebarNav}>
          <div className={dashStyles.sidebarSectionTitle}>Main</div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
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
            <div className={dashStyles.sidebarSectionTitle}>Account</div>
            {accountItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
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
          </div>
        </nav>

        <div className={dashStyles.sidebarFooter}>
          <div className={dashStyles.sidebarUser}>
            <div className={dashStyles.sidebarAvatar}>
              {userData?.profile?.full_name?.substring(0, 1).toUpperCase() || 'U'}
            </div>
            <div className={dashStyles.sidebarUserInfo}>
              <div className={dashStyles.sidebarUserName}>{userData?.profile?.full_name}</div>
              <div className={dashStyles.sidebarUserEmail}>{userData?.user?.email}</div>
            </div>
          </div>
          <button
            className={dashStyles.sidebarLink}
            onClick={handleSignOut}
            style={{ marginTop: 'var(--space-2)', width: '100%', border: 'none', background: 'none' }}
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={dashStyles.mainContent}>
        <header className={dashStyles.topBar}>
          <div className={dashStyles.topBarLeft}>
            <button
              className={dashStyles.mobileMenuBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className={dashStyles.pageTitle}>{getPageTitle()}</h1>
          </div>
          <div className={dashStyles.topBarRight}>
             <span className={dashStyles.statusBadge} style={{ background: '#ecfdf5', color: '#059669', fontSize: '11px' }}>
                <ShieldCheck size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Official
             </span>
            <button className={dashStyles.notifBtn} aria-label="Notifications">
              <Bell size={20} />
            </button>
          </div>
        </header>

        <main className={dashStyles.content}>{children}</main>
      </div>
    </div>
  )
}
