import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Corporate Services',
  description: 'Select your business structure and start your registration. From Sole Proprietorships to Limited Companies, we handle the ORC process for you.',
}

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
