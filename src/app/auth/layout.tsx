import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Keeps the site-wide "… | GrayDocket" suffix for the auth pages' own titles
  title: { default: 'Log in or create an account', template: '%s | GrayDocket' },
  robots: { index: false, follow: false },
  description: 'Sign in or create your GrayDocket account to start or track your business registration in Ghana.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
