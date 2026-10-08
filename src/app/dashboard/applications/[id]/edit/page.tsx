import { use } from 'react'
import EditSubmissionContent from './edit-client-page'

export default function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <EditSubmissionContent applicationId={id} />
}
