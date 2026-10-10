import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In & Account Access',
  description: 'Sign in or create your GrayDocket account to start or track your business registration in Ghana.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
