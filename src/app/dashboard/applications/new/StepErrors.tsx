'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { Issue } from './helpers'
import styles from './new.module.css'

/**
 * How a step shows what's wrong, shared by the registration and edit forms: Continue stays clickable;
 * pressed with problems, it highlights the fields, lists them, and jumps to the first one.
 */
export function useStepErrors() {
  const [showErrors, setShowErrors] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null)

  /** Open the field's section if needed (PersonForm listens for this), then scroll to it and focus it */
  const jumpTo = (issue: Issue) => {
    setFocusRequest((prev) => ({ id: issue.id, n: (prev?.n ?? 0) + 1 }))
    window.setTimeout(() => {
      const el = document.getElementById(issue.id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
    }, 80)
  }

  /** Run `next` if there's nothing to fix; otherwise show the problems and go to the first */
  const tryNext = (issues: Issue[], next: () => void) => {
    if (issues.length > 0) {
      setShowErrors(true)
      jumpTo(issues[0])
      return
    }
    setShowErrors(false)
    next()
  }

  const visible = (list: Issue[], id: string) => (showErrors ? list.find((i) => i.id === id) : undefined)

  /** aria-invalid and aria-describedby for a plain field */
  const fieldState = (list: Issue[], id: string) =>
    visible(list, id) ? ({ 'aria-invalid': true, 'aria-describedby': `${id}-err` } as const) : {}

  /** The message under a plain field, when it has one */
  const fieldMessage = (list: Issue[], id: string) => {
    const issue = visible(list, id)
    return issue ? <span id={`${id}-err`} className={styles.fieldError}><AlertCircle size={13} /> {issue.message || 'Required'}</span> : null
  }

  return { showErrors, setShowErrors, focusRequest, jumpTo, tryNext, fieldState, fieldMessage }
}

export type StepErrors = ReturnType<typeof useStepErrors>

/** The red "N things to fix" list above a step's buttons; each item jumps to its field */
export function IssueList({ issues, show, onJump, verb = 'continue' }: { issues: Issue[]; show: boolean; onJump: (i: Issue) => void; verb?: string }) {
  if (!show || issues.length === 0) return null
  return (
    <div className={styles.issues} role="alert">
      <p className={styles.issuesTitle}>
        <AlertCircle size={18} />
        {issues.length === 1 ? `One thing to fix before you ${verb}` : `${issues.length} things to fix before you ${verb}`}
      </p>
      <ul>
        {issues.slice(0, 8).map((issue) => (
          <li key={`${issue.id}-${issue.label}`}>
            <button type="button" onClick={() => onJump(issue)}>{issue.label}</button>
          </li>
        ))}
        {issues.length > 8 && <li className={styles.issuesMore}>and {issues.length - 8} more</li>}
      </ul>
    </div>
  )
}
