import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create your GrayDocket account and start your business in Ghana. We handle the paperwork.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
