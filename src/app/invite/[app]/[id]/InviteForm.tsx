'use client'

import { useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import PersonForm from '@/app/dashboard/applications/new/PersonForm'
import { emptyPerson, type PersonEntry } from '@/app/dashboard/applications/new/constants'
import { personIssues, splitFullName, type Issue } from '@/app/dashboard/applications/new/helpers'
import { submitDirectorInvite } from '@/lib/director-invites'
import styles from './invite.module.css'
import formStyles from '@/app/dashboard/applications/new/new.module.css'

export default function InviteForm({ applicationId, inviteId, name }: { applicationId: string; inviteId: string; name: string }) {
  const [person, setPerson] = useState<PersonEntry>(() => {
    const n = splitFullName(name)
    return { ...emptyPerson, firstName: n.firstName, otherNames: n.otherNames, surname: n.surname }
  })
  const [showErrors, setShowErrors] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const issues = personIssues(person, 'me', 'Your details')

  const jumpTo = (issue: Issue) => {
    setFocusRequest((prev) => ({ id: issue.id, n: (prev?.n ?? 0) + 1 }))
    window.setTimeout(() => {
      const el = document.getElementById(issue.id)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
    }, 80)
  }

  const submit = async () => {
    if (issues.length > 0) {
      setShowErrors(true)
      jumpTo(issues[0])
      return
    }
    setSending(true)
    setError('')
    const res = await submitDirectorInvite(applicationId, inviteId, person)
    setSending(false)
    if (res.error) return setError(res.error)
    setDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (done) {
    return (
      <div className={styles.state}>
        <span className={`${styles.stateIcon} ${styles.stateDone}`}><CheckCircle2 size={28} /></span>
        <h2 className={styles.title}>Thanks, your details are in</h2>
        <p className={styles.lead}>We’ve let them know. There’s nothing else you need to do.</p>
      </div>
    )
  }

  return (
    <div className={`${formStyles.newReg} ${styles.form}`}>
      <PersonForm
        person={person}
        onChange={(field, value) => setPerson((prev) => ({ ...prev, [field]: value }))}
        prefix="me"
        title="Your details"
        showErrors={showErrors}
        focusRequest={focusRequest}
      />

      {showErrors && issues.length > 0 && (
        <div className={styles.issues} role="alert">
          <p className={styles.issuesTitle}>
            <AlertCircle size={18} /> {issues.length === 1 ? 'One thing to fix' : `${issues.length} things to fix`}
          </p>
          <ul>
            {issues.slice(0, 8).map((i) => (
              <li key={i.id}><button type="button" onClick={() => jumpTo(i)}>{i.label.replace('Your details: ', '')}</button></li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}

      <button type="button" className={`btn btn-primary ${styles.submit}`} onClick={submit} disabled={sending}>
        {sending ? 'Sending…' : <>Send my details <ArrowRight size={16} /></>}
      </button>
      <p className={styles.fine}>Your details are only shared with the applicant and GrayDocket, to register the company with the ORC.</p>
    </div>
  )
}
