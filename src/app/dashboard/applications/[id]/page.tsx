import Link from 'next/link'
import { getApplicationDetails } from '@/lib/actions'
import ApplicationDetailContent from './client-details'
import styles from './detail.module.css'

export default async function UserApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await getApplicationDetails(id)

  if (res.error || !res.application) {
    return (
      <div className={styles.notFound}>
        <h1>We couldn&apos;t open this application</h1>
        <p>It may have been removed, or it belongs to a different account.</p>
        <Link href="/dashboard" className={styles.primaryBtn}>
          Back to your businesses
        </Link>
      </div>
    )
  }

  return <ApplicationDetailContent app={res.application} appId={id} />
}
