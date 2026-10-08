'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MoreHorizontal, Smile, Star, Image as ImageIcon, Trash2, ArrowLeft } from 'lucide-react'
import { updateMyProfile, updateAdminAvatar } from '@/lib/actions'
import { AVATAR_EMOJIS, AVATAR_ICON_NAMES, type AvatarChoice } from '@/lib/avatar'
import UserAvatar, { AVATAR_ICONS } from '@/components/ui/UserAvatar'
import styles from './EditDetailsModal.module.css'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

type Pending =
  | { kind: 'unchanged' }
  | { kind: 'file'; file: File; preview: string }
  | { kind: 'choice'; choice: AvatarChoice }
  | { kind: 'remove' }

type Props = {
  name: string
  avatarUrl: string
  choice: AvatarChoice | null
  onClose: () => void
  onSaved: (next: { name: string; avatarUrl: string; choice: AvatarChoice | null }) => void
}

export default function EditDetailsModal({ name, avatarUrl, choice, onClose, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [draftName, setDraftName] = useState(name)
  const [pending, setPending] = useState<Pending>({ kind: 'unchanged' })
  const [menu, setMenu] = useState<'closed' | 'root' | 'emoji' | 'icon'>('closed')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // First Escape closes the menu, the next closes the modal
      if (menu === 'closed') onClose()
      else setMenu('closed')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menu, onClose])

  useEffect(() => {
    if (menu === 'closed') return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu('closed')
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  // Release the object URL created for a local photo preview
  const previewUrl = pending.kind === 'file' ? pending.preview : null
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // What the avatar would look like if saved now
  const shown =
    pending.kind === 'file' ? { avatarUrl: pending.preview, choice: null }
    : pending.kind === 'choice' ? { avatarUrl: '', choice: pending.choice }
    : pending.kind === 'remove' ? { avatarUrl: '', choice: null }
    : { avatarUrl, choice }
  const hasAvatar = Boolean(shown.avatarUrl || shown.choice)

  const choosePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Please choose an image under 2 MB.')
      return
    }
    setError('')
    setPending({ kind: 'file', file, preview: URL.createObjectURL(file) })
  }

  const pick = (next: AvatarChoice) => {
    setPending({ kind: 'choice', choice: next })
    setMenu('closed')
  }

  const nameChanged = draftName.trim() !== name.trim()
  const dirty = nameChanged || pending.kind !== 'unchanged'

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dirty) return onClose()
    setSaving(true)
    setError('')

    const fail = (message: string) => {
      setSaving(false)
      setError(message)
    }

    let nextAvatarUrl = avatarUrl
    let nextChoice = choice

    if (pending.kind === 'file') {
      const formData = new FormData()
      formData.append('file', pending.file)
      const res = await updateAdminAvatar(formData)
      if (res.error) return fail(res.error)
      nextAvatarUrl = res.avatarUrl || ''
      nextChoice = null
    }

    const updates: Parameters<typeof updateMyProfile>[0] = {}
    if (nameChanged) updates.full_name = draftName
    if (pending.kind === 'file' && choice) updates.avatar_choice = null
    if (pending.kind === 'choice') {
      updates.avatar_choice = pending.choice
      nextAvatarUrl = ''
      nextChoice = pending.choice
    }
    if (pending.kind === 'remove') {
      updates.avatar_url = null
      updates.avatar_choice = null
      nextAvatarUrl = ''
      nextChoice = null
    }

    if (Object.keys(updates).length > 0) {
      const res = await updateMyProfile(updates)
      if (res.error) return fail(res.error)
    }

    setSaving(false)
    onSaved({ name: nameChanged ? draftName.trim() : name, avatarUrl: nextAvatarUrl, choice: nextChoice })
  }

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="edit-details-title">
        <header className={styles.header}>
          <h2 id="edit-details-title" className={styles.title}>Edit Details</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={22} strokeWidth={1.75} />
          </button>
        </header>

        <form onSubmit={save} className={styles.body}>
          <div className={styles.photoBox}>
            <div className={styles.avatarWrap}>
              <UserAvatar size={120} name={draftName} avatarUrl={shown.avatarUrl} choice={shown.choice} />
              <div className={styles.moreWrap} ref={menuRef}>
                <button
                  type="button"
                  className={styles.more}
                  onClick={() => setMenu((m) => (m === 'closed' ? 'root' : 'closed'))}
                  aria-label="Avatar options"
                  aria-expanded={menu !== 'closed'}
                >
                  <MoreHorizontal size={18} />
                </button>

                {menu === 'root' && (
                  <div className={styles.menu} role="menu">
                    <button type="button" role="menuitem" className={styles.menuItem} onClick={() => setMenu('emoji')}>
                      <Smile size={20} strokeWidth={1.75} />
                      <span>Choose Emoji</span>
                    </button>
                    <button type="button" role="menuitem" className={styles.menuItem} onClick={() => setMenu('icon')}>
                      <Star size={20} strokeWidth={1.75} />
                      <span>Choose Icon</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.menuItem}
                      onClick={() => {
                        setMenu('closed')
                        fileRef.current?.click()
                      }}
                    >
                      <ImageIcon size={20} strokeWidth={1.75} />
                      <span>Upload an Image</span>
                    </button>
                    {hasAvatar && (
                      <>
                        <div className={styles.menuDivider} />
                        <button
                          type="button"
                          role="menuitem"
                          className={`${styles.menuItem} ${styles.menuItemMuted}`}
                          onClick={() => {
                            setPending({ kind: 'remove' })
                            setMenu('closed')
                          }}
                        >
                          <Trash2 size={20} strokeWidth={1.75} />
                          <span>Remove</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {(menu === 'emoji' || menu === 'icon') && (
                  <div className={`${styles.menu} ${styles.picker}`}>
                    <div className={styles.pickerHead}>
                      <button type="button" className={styles.pickerBack} onClick={() => setMenu('root')} aria-label="Back">
                        <ArrowLeft size={16} />
                      </button>
                      <span>{menu === 'emoji' ? 'Choose Emoji' : 'Choose Icon'}</span>
                    </div>
                    <div className={styles.grid}>
                      {menu === 'emoji'
                        ? AVATAR_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className={styles.gridItem}
                              onClick={() => pick({ type: 'emoji', value: emoji })}
                              aria-label={`Use ${emoji}`}
                            >
                              <span className={styles.emoji}>{emoji}</span>
                            </button>
                          ))
                        : AVATAR_ICON_NAMES.map((iconName) => {
                            const Icon = AVATAR_ICONS[iconName]
                            return (
                              <button
                                key={iconName}
                                type="button"
                                className={styles.gridItem}
                                onClick={() => pick({ type: 'icon', value: iconName })}
                                aria-label={`Use ${iconName} icon`}
                              >
                                <Icon size={20} strokeWidth={1.75} />
                              </button>
                            )
                          })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={choosePhoto} />
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Account Name</span>
            <input
              className={styles.input}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Your full name"
              autoFocus
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}
