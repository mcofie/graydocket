'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getMyApplications } from '@/lib/actions'
import styles from './overview.module.css'
import EmptyState from '@/components/ui/EmptyState'
import { BusinessList, type Business } from './BusinessList'

export default function DashboardPage() {
  const [businesses, setBusinesses] = useState<Business[] | null>(null)

  useEffect(() => {
    getMyApplications().then(({ applications }) => setBusinesses(applications as Business[]))
  }, [])

  return (
    <div className={styles.column}>
      {businesses === null ? (
        <div className={styles.list} aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className={`${styles.row} ${styles.rowSkeleton}`} />
          ))}
        </div>
      ) : businesses.length > 0 ? (
        <BusinessList businesses={businesses} />
      ) : (
        <EmptyState variant="arrow" message="Start your first business. We'll handle the paperwork." />
      )}

      <Link href="/dashboard/applications/new" className={styles.newBtn}>
        <Plus size={20} strokeWidth={2} />
        <span>New Registration</span>
      </Link>

      <p className={styles.helper}>
        Not sure which business type? <Link href="/dashboard/choose">Take the 1-minute quiz</Link>
      </p>
    </div>
  )
}
