import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authenticate',
  description: 'Sign in or create your GrayDocket account to start your business registration in Ghana.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
