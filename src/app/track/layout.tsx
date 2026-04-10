import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Track Application',
  description: 'Enter your tracking ID to get real-time status updates on your business registration and incorporation process in Ghana.',
}

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
