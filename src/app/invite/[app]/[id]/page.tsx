import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, Clock, Link2Off } from 'lucide-react'
import { getInviteForPage } from '@/lib/director-invites'
import InviteForm from './InviteForm'
import styles from './invite.module.css'

export const metadata: Metadata = {
  title: 'Add your director details',
  robots: { index: false, follow: false },
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

// A director fills in their own details from a link the applicant sent. No account needed.
export default async function InvitePage({ params }: { params: Promise<{ app: string; id: string }> }) {
  const { app, id } = await params
  const invite = await getInviteForPage(app, id)

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.logo}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
          </svg>
          GrayDocket
        </Link>
      </header>

      <main className={styles.main}>
        {invite.state === 'open' ? (
          <>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>Director details</p>
              <h1 className={styles.title}>{invite.inviter} needs your details for {invite.businessName}</h1>
              <p className={styles.lead}>
                You’re listed as a director of this {invite.typeName.toLowerCase()}. Add your details and a photo of your Ghana Card so we can
                register it with the ORC. It takes about 5 minutes, and this link works until {day(invite.expiresAt)}.
              </p>
            </div>
            <InviteForm applicationId={app} inviteId={id} name={invite.name} />
          </>
        ) : (
          <div className={styles.state}>
            <span className={`${styles.stateIcon} ${invite.state === 'completed' ? styles.stateDone : ''}`}>
              {invite.state === 'completed' ? <CheckCircle2 size={28} /> : invite.state === 'expired' ? <Clock size={28} /> : <Link2Off size={28} />}
            </span>
            <h1 className={styles.title}>
              {invite.state === 'completed'
                ? 'Your details have been sent'
                : invite.state === 'expired'
                  ? 'This link has expired'
                  : invite.state === 'closed'
                    ? 'This link is no longer active'
                    : 'This link isn’t valid'}
            </h1>
            <p className={styles.lead}>
              {invite.state === 'completed'
                ? `Thanks. ${invite.inviter} can now finish registering ${invite.businessName}.`
                : invite.state === 'not_found'
                  ? 'Check you copied the whole link, or ask the person who sent it for a new one.'
                  : `Ask ${invite.inviter} to send you a new link from their GrayDocket application.`}
            </p>
            <Link href="/" className="btn btn-secondary">About GrayDocket</Link>
          </div>
        )}
      </main>
    </div>
  )
}
