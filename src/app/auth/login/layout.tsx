import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to GrayDocket with your phone number to see your business registrations, documents and updates.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
