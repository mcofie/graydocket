'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, ShieldCheck, Bell, Building2, UploadCloud, CheckCircle2, ChevronRight, LayoutGrid } from 'lucide-react'
import styles from './settings.module.css'

type Tab = 'account' | 'security' | 'notifications' | 'businesses'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('account')
  
  // Profile State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [initials, setInitials] = useState('GD')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        const name = user.user_metadata?.full_name || ''
        setFullName(name)
        setPhone(user.user_metadata?.phone || '')
        setCompany(user.user_metadata?.company || '')
        
        if (name) {
          const split = name.split(' ')
          if (split.length >= 2) {
            setInitials(split[0][0] + split[1][0])
          } else {
            setInitials(name.substring(0, 2).toUpperCase())
          }
        }
      }
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const supabase = createClient()
    await supabase.auth.updateUser({
      data: { full_name: fullName, phone, company },
    })
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your account preferences, security, and workspaces.</p>
      </header>

      <div className={styles.layout}>
        {/* Sidebar Navigation */}
        <nav className={styles.sidebarNav}>
          <button 
            className={`${styles.navItem} ${activeTab === 'account' ? styles.active : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <User size={18} /> Account Profile
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'security' ? styles.active : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <ShieldCheck size={18} /> Security & Auth
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'notifications' ? styles.active : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} /> Notifications
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'businesses' ? styles.active : ''}`}
            onClick={() => setActiveTab('businesses')}
          >
            <Building2 size={18} /> Connected Entities
          </button>
        </nav>

        {/* Content Area */}
        <main>
          {activeTab === 'account' && (
            <div className={styles.contentArea}>
              <div>
                <h2 className={styles.sectionTitle}>Personal Information</h2>
                <p className={styles.sectionDesc}>Update your photo and personal details here.</p>
              </div>

              <div className={styles.avatarSection}>
                <div className={styles.avatar}>{initials}</div>
                <div>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <UploadCloud size={16} /> Upload new photo
                  </button>
                  <p style={{ fontSize: '11px', color: 'var(--color-neutral-400)', marginTop: '8px' }}>
                    JPG, GIF or PNG. Max size of 800K.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave}>
                <div className={styles.formRow}>
                  <div className={`form-group ${styles.formGroup}`}>
                    <label className="form-label" htmlFor="settings-name">Full Name</label>
                    <input
                      id="settings-name"
                      type="text"
                      className="form-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Kwame Mensah"
                    />
                  </div>
                  <div className={`form-group ${styles.formGroup}`}>
                    <label className="form-label" htmlFor="settings-email">Email Address</label>
                    <input
                      id="settings-email"
                      type="email"
                      className="form-input"
                      value={email}
                      disabled
                      style={{ opacity: 0.6, backgroundColor: 'var(--color-neutral-50)' }}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={`form-group ${styles.formGroup}`}>
                    <label className="form-label" htmlFor="settings-phone">Phone Number</label>
                    <input
                      id="settings-phone"
                      type="tel"
                      className="form-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 XXX XXX XXX"
                    />
                  </div>
                  <div className={`form-group ${styles.formGroup}`}>
                    <label className="form-label" htmlFor="settings-company">Default Workspace</label>
                    <input
                      id="settings-company"
                      type="text"
                      className="form-input"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Business Name"
                    />
                  </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.actionRow}>
                  {saved && (
                    <span className={styles.savedMessage}>
                      <CheckCircle2 size={16} /> Profile updated
                    </span>
                  )}
                  <button type="button" className="btn btn-ghost">Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className={styles.contentArea}>
              <div>
                <h2 className={styles.sectionTitle}>Security & Identity</h2>
                <p className={styles.sectionDesc}>Manage your password, 2FA, and identity verification status.</p>
              </div>

              <div className={styles.securityCard}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-neutral-900)' }}>Identity Verification</h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Your account is verified for corporate onboarding.</p>
                </div>
                <div className={styles.securityBadge}>
                  <CheckCircle2 size={14} /> Verified
                </div>
              </div>

              <div className={styles.securityCard}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-neutral-900)' }}>Two-Factor Authentication (2FA)</h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Protect your account with an extra layer of security.</p>
                </div>
                <button className="btn btn-secondary btn-sm">Enable</button>
              </div>

              <div className={styles.divider} />

              <div style={{ maxWidth: 400 }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-neutral-900)', marginBottom: 'var(--space-4)' }}>Update Password</h4>
                <div className={`form-group ${styles.formGroup}`}>
                  <label className="form-label">Current password</label>
                  <input type="password" className="form-input" placeholder="••••••••" />
                </div>
                <div className={`form-group ${styles.formGroup}`}>
                  <label className="form-label">New password</label>
                  <input type="password" className="form-input" placeholder="••••••••" />
                </div>
                <button className="btn btn-primary btn-sm">Update Password</button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={styles.contentArea}>
              <div>
                <h2 className={styles.sectionTitle}>Notification Preferences</h2>
                <p className={styles.sectionDesc}>Choose what updates you want to receive.</p>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <h4>Application Milestones</h4>
                  <p>Receive emails when your ORC registration moves to the next step.</p>
                </div>
                <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--color-primary-600)' }} />
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <h4>Compliance Alerts</h4>
                  <p>Reminders for annual returns, tax filings, and mandatory renewals.</p>
                </div>
                <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--color-primary-600)' }} />
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <h4>Marketing & Promotions</h4>
                  <p>News about new banking partners, add-ons, or platform features.</p>
                </div>
                <input type="checkbox" style={{ width: 16, height: 16, accentColor: 'var(--color-primary-600)' }} />
              </div>
            </div>
          )}

          {activeTab === 'businesses' && (
            <div className={styles.contentArea}>
              <div>
                <h2 className={styles.sectionTitle}>Connected Entities</h2>
                <p className={styles.sectionDesc}>Manage the businesses linked to your GrayDocket profile.</p>
              </div>

              <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-neutral-300)' }}>
                <LayoutGrid size={32} style={{ color: 'var(--color-neutral-300)', margin: '0 auto var(--space-3)' }} />
                <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>Centralize your portfolio</h4>
                <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', maxWidth: 300, margin: '0 auto var(--space-4)' }}>
                  View the entity management dashboard to configure corporate settings for each business.
                </p>
                <a href="/dashboard" className="btn btn-secondary btn-sm">Go to Dashboard <ChevronRight size={14} /></a>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
