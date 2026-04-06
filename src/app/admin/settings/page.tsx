'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateAdminUserProfile, updateAdminAvatar } from '@/lib/actions'
import styles from '../../dashboard/overview.module.css'
import { User, Mail, Shield, Smartphone, Save, Lock, Camera, Check } from 'lucide-react'

export default function AdminSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    avatar_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setUser(user)
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (prof) {
        setProfile({
          full_name: prof.full_name || '',
          phone: prof.phone || '',
          avatar_url: prof.avatar_url || ''
        })
      }
    }
    setLoading(false)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await updateAdminUserProfile(user.id, {
      full_name: profile.full_name,
      phone: profile.phone
    })
    if (error) alert(error)
    else alert('Identity updated successfully!')
    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    const result = await updateAdminAvatar(formData)
    if (result.error) {
      alert(result.error)
    } else {
      setProfile(prev => ({ ...prev, avatar_url: result.avatarUrl || '' }))
    }
    setUploading(false)
  }

  if (loading) return (
    <div className={styles.overview}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
         Gathering credentials...
      </div>
    </div>
  )

  const initials = profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AD'

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader} style={{ marginBottom: 'var(--space-12)' }}>
        <h2 className={styles.sectionTitle} style={{ fontSize: '32px', letterSpacing: '-0.02em' }}>Administrative Settings</h2>
        <p style={{ fontSize: '15px', color: 'var(--color-neutral-500)', marginTop: '8px' }}>
          Refine your professional persona and secure your platform access.
        </p>
      </div>

      <div className="grid grid-3" style={{ gap: 'var(--space-12)', alignItems: 'flex-start' }}>
        
        {/* LEFT: AVATAR & QUICK STATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
           <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
              <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 24px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 12px 24px -10px rgba(0,0,0,0.15)' }}>
                 {profile.avatar_url ? (
                   <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 ) : (
                   <div style={{ width: '100%', height: '100%', background: 'var(--color-primary-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 800 }}>
                     {initials}
                   </div>
                 )}
                 <label 
                   style={{ 
                     position: 'absolute', 
                     bottom: 0, 
                     left: 0, 
                     right: 0, 
                     height: '40px', 
                     background: 'rgba(0,0,0,0.6)', 
                     backdropFilter: 'blur(4px)', 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center', 
                     color: 'white', 
                     cursor: 'pointer',
                     transition: 'all 0.2s ease',
                     opacity: uploading ? 0.8 : 1
                   }}
                 >
                    <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                    {uploading ? <div className="animate-spin" style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} /> : <Camera size={18} />}
                 </label>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{profile.full_name || 'Admin Agent'}</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-neutral-400)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                 {user?.app_metadata?.role?.replace('_', ' ') || 'Authorized'}
              </p>
              
              <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--color-neutral-50)', borderRadius: '10px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--color-neutral-500)' }}>Account Status</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> ACTIVE</span>
                 </div>
              </div>
           </div>

           <div className="card" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb30' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Lock size={18} style={{ color: '#f59e0b' }} /> Security Portal
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-neutral-600)', lineHeight: 1.6 }}>
                 Password resets and MFA policies are managed via the root infrastructure console.
              </p>
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: '16px', fontSize: '12px' }}>Request Protocol Reset</button>
           </div>
        </div>

        {/* RIGHT: PROFILE FORM */}
        <div className="col-span-2 card" style={{ padding: 'var(--space-10)' }}>
           <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: 'var(--space-8)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={24} style={{ color: 'var(--color-primary-600)' }} /> Personal Branding & Credentials
           </h3>

           <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
              <div className="grid grid-2" style={{ gap: 'var(--space-6)' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase' }}>Professional Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
                      <input 
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', fontSize: '15px', fontWeight: 500 }}
                      />
                    </div>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase' }}>Contact Number</label>
                    <div style={{ position: 'relative' }}>
                      <Smartphone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
                      <input 
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', fontSize: '15px', fontWeight: 500 }}
                      />
                    </div>
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase' }}>Authorized Email (Login)</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-300)' }} />
                  <input 
                    type="email"
                    disabled
                    value={user?.email || ''}
                    style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid var(--color-neutral-100)', background: 'var(--color-neutral-50)', color: 'var(--color-neutral-400)', fontSize: '15px', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ padding: 'var(--space-4)', background: 'var(--color-neutral-50)', borderRadius: '12px', border: '1px solid var(--color-neutral-200)' }}>
                 <p style={{ fontSize: '12px', color: 'var(--color-neutral-500)', lineHeight: 1.6 }}>
                   <strong>Role Context:</strong> You are currently operating as a system administrator. Updates to your name will be reflected across all registry audits and client-facing timelines.
                 </p>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
                style={{ alignSelf: 'flex-start', padding: '0 var(--space-8)', height: '48px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <Save size={18} />
                {saving ? 'Synchronizing...' : 'Save All Changes'}
              </button>
           </form>
        </div>

      </div>
    </div>
  )
}
