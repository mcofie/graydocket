import { getApplicationDetails } from '@/lib/actions'
import ApplicationDetailContent from './client-details'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import styles from './detail.module.css'

export default async function UserApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const appId = resolvedParams.id
  
  const res = await getApplicationDetails(appId)

  if (res.error || !res.application) {
    return (
      <div className={styles.page} style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className={styles.card} style={{ textAlign: 'center', maxWidth: '500px', border: '1px solid var(--color-error-light)' }}>
           <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-error-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-8)' }}>
              <AlertCircle size={40} style={{ color: 'var(--color-error)' }} />
           </div>
           <h2 style={{ color: 'var(--color-neutral-900)', fontSize: '28px', fontWeight: 800 }}>Sync Error</h2>
           <p style={{ color: 'var(--color-neutral-500)', marginTop: '12px', lineHeight: 1.6 }}>
              {res.error || 'The institutional record index might have shifted during live migration.'}
           </p>
           <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn-primary">Return Home</Link>
           </div>
        </div>
      </div>
    )
  }

  return <ApplicationDetailContent app={res.application} appId={appId} />
}
