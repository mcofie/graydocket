import { businessTypes, addOns } from './constants'

export type DbBusinessType = {
  name: string
  base_price?: number | null
  service_fee?: number | null
  orc_fee?: number | null
  agent_fee?: number | null
  returns_portion?: number | null
  processing_timeline?: string | null
}

/** `paidTo` says who receives the money, for fee explanations on pricing screens */
export type PriceLine = { label: string; amount: number; paidTo?: 'government' | 'graydocket' }

export const PRICE_LINE_NOTES: Record<string, string> = {
  'ORC filing fee': 'Government fee for registering with the Office of the Registrar of Companies. We pay it on your behalf.',
  'GrayDocket service fee': 'Our fee for checking your details, preparing and filing your forms, and tracking your application.',
  'First-year renewal': 'Included upfront so your first business name renewal is covered.',
  'First annual return': 'Included upfront so your first annual return with the ORC is covered.',
}

/**
 * Registration price for a business type, preferring the database breakdown
 * (ORC fee + agent fee + annual returns portion), then base price + service fee,
 * then the static fallback in constants.
 */
export function priceForType(typeId: string, dbTypes: DbBusinessType[]) {
  const type = businessTypes.find((t) => t.id === typeId)
  const db = type ? dbTypes.find((bt) => bt.name === type.name) : undefined

  const breakdown: PriceLine[] = [
    { label: 'ORC filing fee', amount: db?.orc_fee || 0, paidTo: 'government' as const },
    { label: 'GrayDocket service fee', amount: db?.agent_fee || 0, paidTo: 'graydocket' as const },
    // Sole proprietorships renew each year; companies file annual returns
    { label: typeId === 'sole_proprietorship' ? 'First-year renewal' : 'First annual return', amount: db?.returns_portion || 0 },
  ].filter((l) => l.amount > 0)

  let lines: PriceLine[]
  if (breakdown.length > 0) {
    lines = breakdown
  } else if (db) {
    lines = [
      { label: 'ORC filing fee', amount: db.base_price || 0, paidTo: 'government' as const },
      { label: 'GrayDocket service fee', amount: db.service_fee || 0, paidTo: 'graydocket' as const },
    ].filter((l) => l.amount > 0)
  } else {
    lines = [{ label: 'Registration', amount: type?.price || 0 }]
  }

  return {
    total: lines.reduce((sum, l) => sum + l.amount, 0),
    lines,
    timeline: db?.processing_timeline || type?.timeline || '',
  }
}

type DbService = { name: string; price: number }

// Add-on ids in constants.ts mapped to service names in the database (lower_snake_case)
const ADD_ON_SERVICE: Record<string, string> = {
  domain: 'domain_name_purchase',
  email: 'business_email_setup',
  website: 'business_website',
  bank: 'bank_account_setup',
}

/** Optional extras with database prices where available, falling back to constants. */
export function addOnsWithPrices(dbServices: DbService[]) {
  return addOns.map((a) => {
    const key = ADD_ON_SERVICE[a.id]
    const match = dbServices.find((s) => s.name.toLowerCase().replace(/\s+/g, '_') === key)
    return { ...a, price: match !== undefined ? match.price : a.price }
  })
}
