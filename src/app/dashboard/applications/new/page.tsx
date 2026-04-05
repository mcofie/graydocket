'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import styles from './new.module.css'

const NewRegistrationContent = dynamic(() => import('./client-page'), {
  ssr: false,
})

export default function NewRegistrationPage() {
  return (
    <Suspense fallback={<div className={styles.newReg}>Loading Registration...</div>}>
      <NewRegistrationContent />
    </Suspense>
  )
}
