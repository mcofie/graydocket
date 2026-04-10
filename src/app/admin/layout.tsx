'use client'

import { useState, useEffect, Suspense } from 'react'
import { forceFetchProfile } from '@/lib/actions'
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
  Briefcase,
  Cog,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import dashStyles from '../dashboard/dashboard.module.css'

const adminNavItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'registrar', 'bank_manager', 'service_manager'] },
  { label: 'Applications', href: '/admin/applications', icon: FileText, roles: ['admin', 'registrar'] },
  { label: 'Payments', href: '/admin/payments', icon: DollarSign, roles: ['admin', 'bank_manager'] },
  { label: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
  { label: 'Affiliate Brands', href: '/admin/affiliates', icon: Building2, roles: ['admin', 'registrar'] },
  { label: 'Services', href: '/admin/services', icon: Briefcase, roles: ['admin', 'service_manager'] },
  { label: 'Pricing (Zones)', href: '/admin/pricing', icon: DollarSign, roles: ['admin', 'service_manager'] },
  { label: 'Banking Partners', href: '/admin/banking', icon: Building2, roles: ['admin', 'bank_manager'] },
  { label: 'Settings', href: '/admin/settings', icon: Cog, roles: ['admin', 'registrar', 'bank_manager', 'service_manager'] },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; role?: string; full_name?: string; avatar_url?: string; user_metadata?: { full_name?: string } } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        let profile = null;
        try {
          profile = await forceFetchProfile(authUser.id, authUser.email || '')
        } catch (err) {
          console.error("Profile fetch strictly failed:", err)
        }
        
        setUser({ 
          email: authUser.email, 
          role: profile?.role || authUser.app_metadata?.role || authUser.user_metadata?.role, 
          full_name: profile?.full_name || authUser.user_metadata?.full_name, 
          avatar_url: profile?.avatar_url,
          user_metadata: authUser.user_metadata
        })
      }
      setLoading(false)
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

  if (loading) {
    return (
      <div className={dashStyles.dashboardLayout}>
         <div style={{ padding: 'var(--space-12)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            Synchronizing Security Context...
         </div>
      </div>
    )
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
            <span className={dashStyles.sidebarLogoIcon} style={{ background: user?.role === 'registrar' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
              {user?.role === 'registrar' ? 'R' : 'A'}
            </span>
            <span>{user?.role === 'registrar' ? 'Registry Control' : 'Admin Panel'}</span>
          </Link>
        </div>

        <nav className={dashStyles.sidebarNav}>
          <div className={dashStyles.sidebarLink} style={{ gap: 'var(--space-2)', opacity: 0.7, cursor: 'default', pointerEvents: 'none' }}>
            <Shield size={14} />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-neutral-400)' }}>
              Administration
            </span>
          </div>
          {adminNavItems
            .filter((item) => !item.roles || item.roles.includes(user?.role || 'user'))
            .map((item) => {
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
            <div 
              className={dashStyles.sidebarAvatar} 
              style={{ 
                background: !user?.avatar_url ? (user?.role === 'registrar' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)') : 'none',
                overflow: 'hidden'
              }}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.role === 'registrar' ? 'R' : 'A'
              )}
            </div>
            <div className={dashStyles.sidebarUserInfo}>
              <div className={dashStyles.sidebarUserName}>
                {user?.full_name || user?.user_metadata?.full_name || 'Admin'}
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
