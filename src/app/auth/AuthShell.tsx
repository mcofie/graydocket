import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import styles from './auth.module.css'

interface AuthShellProps {
  children: React.ReactNode
  /** Small announcement pill pinned near the bottom of the page */
  pill: { text: string; label: string; href: string }
}

/** Minimal, centred auth layout (after app.family.co): logo, one short form, pill and links at the bottom. */
export default function AuthShell({ children, pill }: AuthShellProps) {
  return (
    <div className={styles.shell}>
      <main className={styles.shellMain}>
        <div className={styles.shellBody}>
          <Link href="/" className={styles.shellLogo} aria-label="GrayDocket home">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
            </svg>
          </Link>
          {children}
        </div>
      </main>

      <footer className={styles.shellFooter}>
        <div className={styles.shellPill}>
          <span>{pill.text}</span>
          <Link href={pill.href} className={styles.shellPillLink}>
            {pill.label}
            <ArrowUpRight size={15} strokeWidth={2} />
          </Link>
        </div>
        <nav className={styles.shellLinks} aria-label="Legal and support">
          <Link href="/support">Support</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </div>
  )
}
