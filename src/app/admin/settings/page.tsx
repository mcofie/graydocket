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
      <div className={styles.settingsHeader}>
        <h2 className={styles.sectionTitle} style={{ fontSize: '32px', letterSpacing: '-0.02em' }}>Administrative Settings</h2>
        <p style={{ fontSize: '15px', color: 'var(--color-neutral-500)', marginTop: '8px' }}>
          Refine your professional persona and secure your platform access.
        </p>
      </div>

      <div className={styles.settingsContainer}>
        
        {/* LEFT: AVATAR & QUICK STATS */}
        <div className={styles.settingsLeftCol}>
           <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)', background: 'linear-gradient(180deg, #ffffff 0%, #fcfcfc 100%)', border: '1px solid var(--color-neutral-200)', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)' }}>
              <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto 28px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 6px white, 0 16px 32px -12px rgba(0,0,0,0.25)', border: '1px solid var(--color-neutral-100)' }}>
                 {profile.avatar_url ? (
                   <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 ) : (
                   <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                     {initials}
                   </div>
                 )}
                 <label 
                   style={{ 
                     position: 'absolute', 
                     bottom: 0, 
                     left: 0, 
                     right: 0, 
                     height: '48px', 
                     background: 'rgba(0,0,0,0.65)', 
                     backdropFilter: 'blur(8px)', 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center', 
                     color: 'white', 
                     cursor: 'pointer',
                     transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                     opacity: uploading ? 0.8 : 0,
                     transform: uploading ? 'translateY(0)' : 'translateY(10px)'
                   }}
                   onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
                   onMouseLeave={(e) => { e.currentTarget.style.opacity = uploading ? '0.8' : '0'; e.currentTarget.style.transform = uploading ? 'translateY(0)' : 'translateY(10px)' }}
                 >
                    <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                    {uploading ? <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} /> : <Camera size={20} />}
                 </label>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-neutral-900)' }}>{profile.full_name || 'Admin Agent'}</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-primary-600)', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                 {user?.app_metadata?.role?.replace('_', ' ') || 'Authorized'}
              </p>
              
              <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--color-neutral-50)', borderRadius: '12px', fontSize: '13px', border: '1px solid var(--color-neutral-200)' }}>
                    <span style={{ color: 'var(--color-neutral-500)', fontWeight: 600 }}>Account Status</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#ecfdf5', borderRadius: '20px' }}><Check size={14} strokeWidth={3} /> ACTIVE</span>
                 </div>
              </div>
           </div>

           <div className="card" style={{ padding: 'var(--space-6)', background: 'linear-gradient(to right, #fffbeb, #ffffff)', border: '1px solid #fde68a', borderLeft: '5px solid #f59e0b', boxShadow: '0 4px 12px -8px rgba(245, 158, 11, 0.2)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
                 <Lock size={18} style={{ color: '#d97706' }} /> Security Portal
              </h3>
              <p style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.6, fontWeight: 500 }}>
                 Password resets and MFA policies are centrally managed via the root infrastructure console.
              </p>
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: '16px', fontSize: '13px', fontWeight: 700, color: '#b45309', background: '#fef3c7', border: 'none' }}>Request Protocol Reset</button>
           </div>
        </div>

        {/* RIGHT: PROFILE FORM */}
        <div className={`card ${styles.settingsRightCol}`}>
           <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: 'var(--space-8)', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-neutral-900)' }}>
              <div style={{ padding: '10px', background: 'var(--color-primary-50)', borderRadius: '12px' }}>
                 <Shield size={24} style={{ color: 'var(--color-primary-600)' }} />
              </div>
              Personal Branding & Credentials
           </h3>

           <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Professional Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
                      <input 
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        style={{ width: '100%', padding: '16px 16px 16px 44px', borderRadius: '12px', border: '2px solid var(--color-neutral-200)', fontSize: '15px', fontWeight: 600, color: 'var(--color-neutral-900)', transition: 'border-color 0.2s', outline: 'none' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-500)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-neutral-200)'}
                      />
                    </div>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Number</label>
                    <div style={{ position: 'relative' }}>
                      <Smartphone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
                      <input 
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        style={{ width: '100%', padding: '16px 16px 16px 44px', borderRadius: '12px', border: '2px solid var(--color-neutral-200)', fontSize: '15px', fontWeight: 600, color: 'var(--color-neutral-900)', transition: 'border-color 0.2s', outline: 'none' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-500)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-neutral-200)'}
                      />
                    </div>
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authorized Email (Login)</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
                  <input 
                    type="email"
                    disabled
                    value={user?.email || ''}
                    style={{ width: '100%', padding: '16px 16px 16px 44px', borderRadius: '12px', border: '2px solid var(--color-neutral-100)', background: 'var(--color-neutral-50)', color: 'var(--color-neutral-500)', fontSize: '15px', fontWeight: 500, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                 <div style={{ padding: '8px', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5' }}>
                    <Shield size={20} />
                 </div>
                 <div>
                   <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Role Context</h4>
                   <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, fontWeight: 500 }}>
                     You are currently operating as a system administrator. Updates to your name will be reflected across all registry audits and client-facing timelines securely.
                   </p>
                 </div>
              </div>

              <button 
                type="submit" 
                className={`btn btn-primary ${styles.settingsSubmitBtn}`}
                disabled={saving}
                style={{ padding: '0 32px', height: '52px', fontSize: '15px', fontWeight: 700, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 16px -4px var(--color-primary-300)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Save size={20} />
                {saving ? 'Synchronizing...' : 'Save All Changes'}
              </button>
           </form>
        </div>

      </div>
    </div>
  )
}
