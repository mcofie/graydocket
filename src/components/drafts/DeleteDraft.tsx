'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { discardDraft } from '@/lib/actions'
import styles from './delete-draft.module.css'

/**
 * "Delete draft" with an inline confirmation, for unfinished applications. `dark` suits the dashboard's
 * dark row menu. Only the owner's unpaid drafts can be deleted (checked on the server).
 */
export default function DeleteDraft({
  applicationId,
  name,
  onDeleted,
  dark = false,
  trigger = 'link',
  prompt,
}: {
  applicationId: string
  name: string
  onDeleted: () => void
  dark?: boolean
  /** 'link': a red text button. 'menu': a full-width row for a menu. 'quiet': small grey text */
  trigger?: 'link' | 'menu' | 'quiet'
  /** Words before the quiet link, e.g. "No longer need this?" */
  prompt?: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    setBusy(true)
    setError('')
    const res = await discardDraft(applicationId)
    setBusy(false)
    if (res.error) return setError(res.error)
    onDeleted()
  }

  if (!confirming && trigger === 'quiet') {
    return (
      <p className={styles.quiet}>
        {prompt}{prompt ? ' ' : ''}
        <button type="button" className={styles.quietBtn} onClick={() => setConfirming(true)}>Delete draft</button>
      </p>
    )
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className={`${trigger === 'menu' ? styles.menuTrigger : styles.linkTrigger} ${dark ? styles.dark : ''}`}
        onClick={() => setConfirming(true)}
        role={trigger === 'menu' ? 'menuitem' : undefined}
      >
        <Trash2 size={trigger === 'menu' ? 19 : 15} strokeWidth={1.75} />
        <span>Delete draft</span>
      </button>
    )
  }

  return (
    <div className={`${styles.confirm} ${dark ? styles.dark : ''}`} role="alertdialog" aria-label={`Delete ${name}`}>
      <p>
        <strong>Delete “{name}”?</strong> Everything entered for it will be removed. This can’t be undone.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.keep} onClick={() => setConfirming(false)} disabled={busy}>Keep it</button>
        <button type="button" className={styles.danger} onClick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete draft'}</button>
      </div>
    </div>
  )
}
