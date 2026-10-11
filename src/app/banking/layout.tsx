import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata('Corporate & Business Banking Hub', 'Open a business bank account in Ghana alongside your ORC registration. Direct partnerships with Zenith Bank, Ecobank, GCB, and more.', '/banking')

export default function BankingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
