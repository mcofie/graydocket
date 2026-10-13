import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team sign in',
  description: 'Sign in for the GrayDocket team.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
