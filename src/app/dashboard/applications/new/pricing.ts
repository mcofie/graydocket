// The single source of truth for what a registration costs.
//
// Every price on the site (pricing page, quiz, registration form, checkout, admin) comes from here,
// and the server uses the same functions to charge, so what people see is what they pay.
//
//   Registration = ORC filing fee + GrayDocket service fee + first renewal / annual return
//                  (business_types.orc_fee + agent_fee + returns_portion)
//   Add-ons      = services table prices (constants are only a fallback)
//   Courier      = the "Courier Delivery" row in services
//
// The legacy base_price / service_fee columns are not read anywhere.

import { businessTypes, addOns } from './constants'

export type DbBusinessType = {
  id?: string
  name: string
  is_active?: boolean | null
  base_price?: number | null
  service_fee?: number | null
  orc_fee?: number | null
  agent_fee?: number | null
  returns_portion?: number | null
  affiliate_share_percentage?: number | null
  processing_timeline?: string | null
  created_at?: string | null
}

/** `paidTo` says who receives the money, for fee explanations on pricing screens */
export type PriceLine = { label: string; amount: number; paidTo?: 'government' | 'graydocket' }

export const PRICE_LINE_NOTES: Record<string, string> = {
  'ORC filing fee': 'Government fee for registering with the Office of the Registrar of Companies. We pay it on your behalf.',
  'GrayDocket service fee': 'Our fee for checking your details, preparing and filing your forms, and tracking your application.',
  'First-year renewal': 'Included upfront so your first business name renewal is covered.',
  'First annual return': 'Included upfront so your first annual return with the ORC is covered.',
}

/** Used only if the database can't be read */
export const COURIER_FEE_FALLBACK = 75

const num = (v: number | string | null | undefined) => Number(v) || 0
const breakdownTotal = (row: DbBusinessType) => num(row.orc_fee) + num(row.agent_fee) + num(row.returns_portion)

/**
 * The database can hold several active rows with the same name (old seeds, copies). Pick one,
 * the same way everywhere: rows with a real breakdown first, then ones whose legacy columns agree
 * with it (last saved through admin pricing), then the highest total, then the newest.
 */
export function canonicalRow(typeName: string, rows: DbBusinessType[]) {
  const candidates = rows.filter((r) => r.name === typeName && r.is_active !== false)
  if (candidates.length === 0) return undefined
  const score = (r: DbBusinessType) => {
    const total = breakdownTotal(r)
    const synced = total > 0 && Math.abs(num(r.base_price) + num(r.service_fee) - total) < 0.01
    return [total > 0 ? 1 : 0, synced ? 1 : 0, total, r.created_at ? Date.parse(r.created_at) : 0]
  }
  return [...candidates].sort((a, b) => {
    const sa = score(a)
    const sb = score(b)
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i]
    return 0
  })[0]
}

/** Rows that lose to the canonical one: shown to admins so they can retire them */
export function duplicateRows(rows: DbBusinessType[]) {
  return businessTypes.flatMap((t) => {
    const keep = canonicalRow(t.name, rows)
    return rows.filter((r) => r.name === t.name && r.is_active !== false && r !== keep)
  })
}

/** Registration price for a business type, from its canonical database row */
export function priceForType(typeId: string, dbTypes: DbBusinessType[]) {
  const type = businessTypes.find((t) => t.id === typeId)
  const db = type ? canonicalRow(type.name, dbTypes) : undefined

  const lines: PriceLine[] = db
    ? [
        { label: 'ORC filing fee', amount: num(db.orc_fee), paidTo: 'government' as const },
        { label: 'GrayDocket service fee', amount: num(db.agent_fee), paidTo: 'graydocket' as const },
        // Sole proprietorships renew each year; companies file annual returns
        { label: typeId === 'sole_proprietorship' ? 'First-year renewal' : 'First annual return', amount: num(db.returns_portion) },
      ].filter((l) => l.amount > 0)
    : [{ label: 'Registration', amount: type?.price || 0 }]

  return {
    /** The business_types row this price came from (what applications should reference) */
    dbId: db?.id ?? null,
    total: lines.reduce((sum, l) => sum + l.amount, 0),
    lines,
    timeline: db?.processing_timeline || type?.timeline || '',
    affiliateShare: num(db?.affiliate_share_percentage),
  }
}

type DbService = { name: string; price: number | string; is_active?: boolean | null }

// Add-on ids in constants.ts mapped to service names in the database (lower_snake_case)
const ADD_ON_SERVICE: Record<string, string> = {
  domain: 'domain_name_purchase',
  email: 'business_email_setup',
  website: 'business_website',
  bank: 'bank_account_setup',
}

const serviceKey = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '_')

/**
 * Optional extras with database prices where available, falling back to constants.
 * An add-on switched off on the admin Pricing page is left out entirely.
 */
export function addOnsWithPrices(dbServices: DbService[]) {
  return addOns.flatMap((a) => {
    const match = dbServices.find((s) => serviceKey(s.name) === ADD_ON_SERVICE[a.id])
    if (match?.is_active === false) return []
    return [{ ...a, price: match ? num(match.price) : a.price }]
  })
}

/** Courier delivery fee from the services table */
export function courierFeeFrom(dbServices: DbService[]) {
  const row = dbServices.find((s) => serviceKey(s.name) === 'courier_delivery')
  return row ? num(row.price) : COURIER_FEE_FALLBACK
}

export type QuoteInput = { typeId: string; addOnIds: string[]; delivery: 'digital' | 'courier' }

/**
 * The full amount for an application. The registration form shows this, and the server
 * recomputes it with the same function before charging, so the two can never disagree.
 */
export function quoteApplication(input: QuoteInput, dbTypes: DbBusinessType[], dbServices: DbService[]) {
  const registration = priceForType(input.typeId, dbTypes)
  const extras = addOnsWithPrices(dbServices).filter((a) => input.addOnIds.includes(a.id) && a.price > 0)
  const courier = input.delivery === 'courier' ? courierFeeFrom(dbServices) : 0

  const lines: PriceLine[] = [
    ...registration.lines,
    ...extras.map((a) => ({ label: a.name, amount: a.price })),
    ...(courier > 0 ? [{ label: 'Courier delivery', amount: courier }] : []),
  ]
  return {
    dbTypeId: registration.dbId,
    lines,
    total: lines.reduce((sum, l) => sum + l.amount, 0),
  }
}
