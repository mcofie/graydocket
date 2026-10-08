import { getBusinessTypes } from '@/lib/actions'
import { businessTypes } from '../applications/new/constants'
import { priceForType, type DbBusinessType } from '../applications/new/pricing'
import Chooser, { type TypePrice } from './Chooser'

export const metadata = { title: 'Find your business type' }

export default async function ChoosePage() {
  // Same price source as the registration form, so the quiz and checkout agree
  const dbTypes = (await getBusinessTypes()) as DbBusinessType[]
  const prices: Record<string, TypePrice> = Object.fromEntries(
    businessTypes.map((t) => [t.id, priceForType(t.id, dbTypes)])
  )

  return <Chooser prices={prices} />
}
