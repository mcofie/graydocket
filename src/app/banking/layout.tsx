import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Corporate & Business Banking Hub',
  description: 'Open a business bank account in Ghana alongside your ORC registration. Direct partnerships with Zenith Bank, Ecobank, GCB, and more.',
}

export default function BankingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
