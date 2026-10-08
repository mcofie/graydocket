import { Check } from 'lucide-react'
import styles from './new.module.css'

export type NameAvailability = {
  available: boolean
  matches?: Array<{ name: string; type: string }> | string[]
  error?: string | null
  message?: string
}

export default function NameCheck({ checking, result, onRetry }: { checking: boolean; result: NameAvailability | null; onRetry: () => void }) {
  if (!checking && !result) return null
  return (
    <div className={styles.nameCheck} aria-live="polite">
      {checking ? (
        <div className={`${styles.nameStatus} ${styles.nameChecking}`}>
          <span className={styles.spinner} />
          <span>Checking the ORC registry…</span>
        </div>
      ) : result?.error === 'unreachable' ? (
        <div className={`${styles.nameStatus} ${styles.nameWarn}`}>
          <span>
            {result.message || "We couldn't reach the ORC registry. We'll check this name manually."}{' '}
            <button type="button" className={styles.linkBtn} onClick={onRetry}>Retry</button>
          </span>
        </div>
      ) : result?.available ? (
        <div className={`${styles.nameStatus} ${styles.nameOk}`}>
          <Check size={14} />
          <span>Looks available. No conflicts found in the ORC registry.</span>
        </div>
      ) : result ? (
        <>
          <div className={`${styles.nameStatus} ${styles.nameBad}`}>
            <span>Possible conflict in the ORC registry.</span>
          </div>
          {result.matches && result.matches.length > 0 && (
            <div className={styles.conflicts}>
              <strong>Similar registered names</strong>
              <ul>
                {result.matches.map((m) => {
                  const label = typeof m === 'string' ? m : `${m.name} (${m.type})`
                  return <li key={label}>{label}</li>
                })}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
