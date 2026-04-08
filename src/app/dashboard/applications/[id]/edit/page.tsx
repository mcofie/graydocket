import { Suspense, use } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditSubmissionContent from './edit-client-page'

export default function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const appId = resolvedParams.id

  return (
    <Suspense fallback={<div>Loading authorization...</div>}>
      <EditSubmissionContent applicationId={appId} />
    </Suspense>
  )
}
