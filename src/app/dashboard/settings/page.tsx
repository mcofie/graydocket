'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../overview.module.css'

export default function SettingsPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        setFullName(user.user_metadata?.full_name || '')
        setPhone(user.user_metadata?.phone || '')
      }
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    await supabase.auth.updateUser({
      data: { full_name: fullName, phone },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Account Settings</h2>
      </div>

      <div className="card card-elevated" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="settings-name">Full Name</label>
            <input
              id="settings-name"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settings-email">Email Address</label>
            <input
              id="settings-email"
              type="email"
              className="form-input"
              value={email}
              disabled
              style={{ opacity: 0.6 }}
            />
            <span className="form-hint">Email cannot be changed</span>
          </div>

          <div className="form-group">
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <button type="submit" className="btn btn-primary" id="save-settings">
              Save Changes
            </button>
            {saved && (
              <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                ✓ Saved successfully
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
