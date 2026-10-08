'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, UserRound, Smartphone, Mail, ChevronRight, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getMyProfile } from '@/lib/actions'
import EditDetailsModal from './EditDetailsModal'
import UserAvatar from '@/components/ui/UserAvatar'
import { parseAvatarChoice, type AvatarChoice } from '@/lib/avatar'
import styles from './settings.module.css'

// Accounts created without an email get a generated address; don't show it to the user
const isPlaceholderEmail = (email: string) => email.endsWith('@graydocket.user')

function formatPhone(phone: string) {
  const m = phone.match(/^\+233(\d{2})(\d{3})(\d{4})$/)
  return m ? `+233 ${m[1]} ${m[2]} ${m[3]}` : phone
}

const notifyShell = () => window.dispatchEvent(new Event('profile-updated'))

export default function AccountPage() {
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [choice, setChoice] = useState<AvatarChoice | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    getMyProfile().then((stats) => {
      setName(stats?.profile?.full_name || stats?.user?.user_metadata?.full_name || '')
      setEmail(stats?.profile?.email || stats?.user?.email || '')
      setPhone(stats?.profile?.phone || stats?.user?.user_metadata?.phone || '')
      setAvatarUrl(stats?.profile?.avatar_url || '')
      setChoice(parseAvatarChoice(stats?.user?.user_metadata?.avatar_choice))
      setLoaded(true)
    })
  }, [])

  const logout = async () => {
    setLoggingOut(true)
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  const showEmail = email && !isPlaceholderEmail(email)

  return (
    <div className={styles.column}>
      <div className={styles.avatarWrap}>
        <UserAvatar size={96} name={name} avatarUrl={avatarUrl} choice={choice} />
        <button
          type="button"
          className={styles.avatarAdd}
          onClick={() => setEditing(true)}
          disabled={!loaded}
          aria-label="Edit details"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className={styles.group}>
        <button type="button" className={styles.row} onClick={() => setEditing(true)} disabled={!loaded}>
          <UserRound size={20} strokeWidth={1.75} className={styles.rowIcon} />
          <span className={styles.rowLabel}>Name</span>
          <span className={styles.rowValue}>{name || 'Add your name'}</span>
          <ChevronRight size={18} className={styles.chevron} />
        </button>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Sign-in</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <Smartphone size={20} strokeWidth={1.75} className={styles.rowIcon} />
            <span className={styles.rowLabel}>Login Method</span>
            <span className={styles.rowValue}>{phone ? formatPhone(phone) : '—'}</span>
          </div>
          {showEmail && (
            <div className={styles.row}>
              <Mail size={20} strokeWidth={1.75} className={styles.rowIcon} />
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>{email}</span>
            </div>
          )}
        </div>
      </div>

      <button type="button" className={styles.logoutBtn} onClick={logout} disabled={loggingOut}>
        <LogOut size={18} strokeWidth={2} />
        <span>{loggingOut ? 'Logging out…' : 'Logout'}</span>
      </button>

      {editing && (
        <EditDetailsModal
          name={name}
          avatarUrl={avatarUrl}
          choice={choice}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setName(next.name)
            setAvatarUrl(next.avatarUrl)
            setChoice(next.choice)
            setEditing(false)
            notifyShell()
          }}
        />
      )}
    </div>
  )
}
