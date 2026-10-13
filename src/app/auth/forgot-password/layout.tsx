import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Reset the password for your GrayDocket account.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
