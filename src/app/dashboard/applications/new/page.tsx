'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const NewRegistrationContent = dynamic(() => import('./client-page'), {
  ssr: false,
})

export default function NewRegistrationPage() {
  return (
    <Suspense fallback={null}>
      <NewRegistrationContent />
    </Suspense>
  )
}
