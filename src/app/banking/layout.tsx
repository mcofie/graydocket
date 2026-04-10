import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Institutional Banking Hub',
  description: 'Connect with Ghana\'s leading banks to open your corporate account. Seamless integration with Zenith Bank, Access Bank, and more.',
}

export default function BankingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
