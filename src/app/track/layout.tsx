import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata('Track Application', 'Enter your tracking ID to get real-time status updates on your business registration and incorporation process in Ghana.', '/track')

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
