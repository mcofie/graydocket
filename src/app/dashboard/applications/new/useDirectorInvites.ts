'use client'

import { useEffect, useState } from 'react'
import { createDirectorInvite, getDirectorInvites, cancelDirectorInvite, type InviteSummary } from '@/lib/director-invites'
import type { PersonEntry } from './constants'

/** A director who's been sent a link and hasn't replied yet */
export const awaitingInvite = (d: PersonEntry) => Boolean(d.inviteId && !d.inviteMerged)

/**
 * Director invite links, shared by the registration form and the edit form.
 * - ensureApplicationId: the saved application's id, saving first if needed (null if it can't be saved)
 * - knownApplicationId: the id when already known, so answers can be checked for
 * - afterChange: optional save once a director starts or stops waiting on a link
 */
export function useDirectorInvites({
  directors,
  setDirectors,
  ensureApplicationId,
  knownApplicationId,
  afterChange,
  businessName,
}: {
  directors: PersonEntry[]
  setDirectors: React.Dispatch<React.SetStateAction<PersonEntry[]>>
  ensureApplicationId: () => Promise<string | null>
  knownApplicationId: string | null
  afterChange?: (directors: PersonEntry[]) => Promise<unknown> | void
  businessName: string
}) {
  const [invites, setInvites] = useState<InviteSummary[]>([])
  const [inviteFor, setInviteFor] = useState<number | null>(null)
  const [form, setForm] = useState({ firstName: '', surname: '', phone: '', days: 3 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  /** Take the latest invite list and drop any answers into the directors waiting for them */
  const apply = (list: InviteSummary[]) => {
    setInvites(list)
    setDirectors((prev) =>
      prev.map((d) => {
        if (!awaitingInvite(d)) return d
        const inv = list.find((x) => x.id === d.inviteId)
        return inv?.status === 'completed' && inv.response ? { ...inv.response, inviteId: d.inviteId, inviteMerged: true } : d
      })
    )
  }

  // While anyone is still to reply, check for their answers now and every 15 seconds
  const waitingIds = directors.filter(awaitingInvite).map((d) => d.inviteId).join(',')
  useEffect(() => {
    if (!waitingIds || !knownApplicationId) return
    let live = true
    const load = () => getDirectorInvites(knownApplicationId).then((r) => live && apply(r.invites))
    load()
    const timer = window.setInterval(load, 15000)
    return () => {
      live = false
      window.clearInterval(timer)
    }
    // apply only uses state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingIds, knownApplicationId])

  const open = (index: number) => {
    const d = directors[index]
    setForm({ firstName: d.firstName, surname: d.surname, phone: d.phone, days: 3 })
    setError('')
    setInviteFor(index)
  }

  const close = () => setInviteFor(null)

  const send = async () => {
    if (inviteFor === null) return
    if (!form.firstName.trim()) return setError('Enter their first name.')
    setBusy(true)
    setError('')
    const appId = await ensureApplicationId()
    if (!appId) {
      setBusy(false)
      return setError('We couldn’t save your application first. Please try again.')
    }
    const res = await createDirectorInvite({
      applicationId: appId,
      index: inviteFor,
      firstName: form.firstName.trim(),
      surname: form.surname.trim(),
      phone: form.phone.trim(),
      expiresInDays: form.days,
    })
    if (res.error || !res.invite) {
      setBusy(false)
      return setError(res.error || 'Couldn’t create the link.')
    }
    const invite = res.invite
    const next = directors.map((d, i) =>
      i === inviteFor
        ? { ...d, firstName: form.firstName.trim(), surname: form.surname.trim(), phone: form.phone.trim() || d.phone, inviteId: invite.id, inviteMerged: false }
        : d
    )
    setDirectors(next)
    setInvites((prev) => [...prev.filter((x) => x.id !== invite.id), invite])
    await afterChange?.(next)
    setBusy(false)
    setInviteFor(null)
  }

  /** Stop waiting on a link and fill this director in here instead */
  const fillMyself = async (index: number) => {
    const d = directors[index]
    if (d.inviteId && knownApplicationId) await cancelDirectorInvite(knownApplicationId, d.inviteId)
    const next = directors.map((x, i) => (i === index ? { ...x, inviteId: undefined, inviteMerged: undefined } : x))
    setDirectors(next)
    await afterChange?.(next)
  }

  const copy = async (invite: InviteSummary) => {
    try {
      await navigator.clipboard.writeText(invite.url)
      setCopied(invite.id)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      window.prompt('Copy this link', invite.url)
    }
  }

  const message = (invite: InviteSummary) =>
    `Hi ${invite.name.split(' ')[0]}, please add your details as a director of "${businessName || 'our company'}" on GrayDocket. It takes about 5 minutes: ${invite.url}`

  return { invites, inviteFor, form, setForm, busy, error, open, close, send, fillMyself, copy, copied, message }
}

export type DirectorInvites = ReturnType<typeof useDirectorInvites>
