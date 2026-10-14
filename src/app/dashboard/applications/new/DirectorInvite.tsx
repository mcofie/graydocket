'use client'

import { AlertCircle, Check, CheckCircle2, Copy, Link2, Send, X } from 'lucide-react'
import type { PersonEntry } from './constants'
import { personDisplayName } from './helpers'
import { awaitingInvite, type DirectorInvites } from './useDirectorInvites'
import styles from './new.module.css'

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

/** "Is a director somewhere else?" line shown above the directors */
export function DirectorInviteTip() {
  return (
    <p className={styles.inviteTip}>
      <Link2 size={15} /> Is a director somewhere else? Send them a link and they can fill in their own details.
    </p>
  )
}

/**
 * One director slot: the "Send them a link instead" action, the invite panel, and either a card
 * saying we're waiting on them or the director's form (`children`).
 */
export default function DirectorInvite({
  index,
  director,
  inv,
  actions,
  children,
}: {
  index: number
  director: PersonEntry
  inv: DirectorInvites
  /** Extra buttons for the action row, e.g. "Remove director" */
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const waiting = awaitingInvite(director)
  const invite = director.inviteId ? inv.invites.find((x) => x.id === director.inviteId) : undefined
  const live = invite && !invite.expired && invite.status === 'pending'

  return (
    <>
      <div className={styles.personBlockActions}>
        {!waiting && inv.inviteFor !== index && (
          <button className="btn btn-ghost btn-sm" onClick={() => inv.open(index)} type="button">
            <Send size={14} /> Send them a link instead
          </button>
        )}
        {actions}
      </div>

      {inv.inviteFor === index && (
        <div className={styles.invitePanel}>
          <div className={styles.invitePanelHead}>
            <h3>Send Director {index + 1} a link</h3>
            <button type="button" className={styles.iconBtn} onClick={inv.close} aria-label="Close"><X size={18} /></button>
          </div>
          <p className={styles.invitePanelText}>
            They’ll fill in their own details and ID from their phone, no account needed. We’ll let you know when they’re done.
          </p>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor={`inv-${index}-first`}>First name *</label>
              <input id={`inv-${index}-first`} className="form-input" value={inv.form.firstName} onChange={(e) => inv.setForm({ ...inv.form, firstName: e.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor={`inv-${index}-surname`}>Surname</label>
              <input id={`inv-${index}-surname`} className="form-input" value={inv.form.surname} onChange={(e) => inv.setForm({ ...inv.form, surname: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor={`inv-${index}-phone`}>Their phone (optional)</label>
              <input id={`inv-${index}-phone`} type="tel" className="form-input" placeholder="We’ll text them the link" value={inv.form.phone} onChange={(e) => inv.setForm({ ...inv.form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor={`inv-${index}-days`}>Link works for</label>
              <select id={`inv-${index}-days`} className="form-input" value={inv.form.days} onChange={(e) => inv.setForm({ ...inv.form, days: Number(e.target.value) })}>
                <option value={1}>24 hours</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
              </select>
            </div>
          </div>
          {inv.error && <p className={styles.fieldError}><AlertCircle size={13} /> {inv.error}</p>}
          <div className={styles.invitePanelActions}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={inv.close}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={inv.send} disabled={inv.busy}>
              {inv.busy ? 'Creating link…' : inv.form.phone.trim() ? 'Create link and text it' : 'Create link'}
            </button>
          </div>
        </div>
      )}

      {waiting ? (
        <div className={`${styles.inviteCard} ${invite?.expired ? styles.inviteExpired : ''}`}>
          <div className={styles.inviteHead}>
            <span className={styles.inviteIcon}><Link2 size={18} /></span>
            <div>
              <strong>Director {index + 1}: {personDisplayName(director) || invite?.name || 'Invited'}</strong>
              <span>
                {!invite
                  ? 'Checking the link…'
                  : invite.expired
                    ? `This link expired on ${day(invite.expiresAt)}. Send a new one or fill it in yourself.`
                    : invite.status === 'cancelled'
                      ? 'This link was cancelled.'
                      : `Waiting for them to fill it in. The link works until ${day(invite.expiresAt)}.`}
              </span>
            </div>
          </div>
          {live && (
            <div className={styles.inviteUrl}>
              <code>{invite.url}</code>
            </div>
          )}
          <div className={styles.inviteActions}>
            {live ? (
              <>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => inv.copy(invite)}>
                  {inv.copied === invite.id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}
                </button>
                <a className="btn btn-secondary btn-sm" href={`https://wa.me/?text=${encodeURIComponent(inv.message(invite))}`} target="_blank" rel="noopener noreferrer">
                  Share on WhatsApp
                </a>
              </>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => inv.open(index)}>
                <Send size={14} /> Send a new link
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => inv.fillMyself(index)}>Fill in myself instead</button>
          </div>
        </div>
      ) : (
        <>
          {director.inviteMerged && (
            <p className={styles.inviteDone}><CheckCircle2 size={15} /> {personDisplayName(director) || 'They'} filled this in from your link. Check it over.</p>
          )}
          {children}
        </>
      )}
    </>
  )
}
