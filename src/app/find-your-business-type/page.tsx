import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getBusinessTypes } from '@/lib/actions'
import { businessTypes } from '@/app/dashboard/applications/new/constants'
import { priceForType, type DbBusinessType } from '@/app/dashboard/applications/new/pricing'
import Chooser, { type TypePrice } from '@/app/dashboard/choose/Chooser'
import styles from '../guides/guides.module.css'

export const metadata: Metadata = {
  title: 'Find Your Business Type',
  description: 'Answer a few quick questions to see which business type suits you in Ghana, what you’ll need and what it costs.',
}

// Public, logged-out version of the dashboard quiz. The last step sends people to sign up.
export default async function PublicQuizPage() {
  const dbTypes = (await getBusinessTypes()) as DbBusinessType[]
  const prices: Record<string, TypePrice> = Object.fromEntries(
    businessTypes.map((t) => [t.id, priceForType(t.id, dbTypes)])
  )

  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        <Chooser prices={prices} mode="public" />
      </main>
      <Footer />
    </div>
  )
}
