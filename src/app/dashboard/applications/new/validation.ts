// What must be filled in, and filled in correctly, before an application moves on. One set of rules for
// the registration form, the edit form, and the server (checkout and resubmission), so none of them can
// let through what another would stop.

import type { PersonEntry, ShareholderEntry } from './constants'
import { isValidEmail, isValidPhone, personIssues, type Issue } from './helpers'

export type BusinessFields = {
  businessName: string
  businessSector: string
  businessSectorOther: string
  natureOfBusiness: string
  dateOfCommencement: string
  buildingName: string
  streetName: string
  city: string
  district: string
  region: string
  digitalAddress: string
  mobilePhone: string
  email: string
}

export type OwnershipFields = {
  authorizedShares: string
  issuedShares: string
  statedCapital: string
  auditorName: string
  auditorLicense: string
  beneficialOwnerName: string
  beneficialOwnerNationality: string
  beneficialOwnerDOB: string
  beneficialOwnerAddress: string
}

export const toNumber = (v: unknown) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0
const blank = (v: unknown) => !String(v ?? '').trim()
const need = (cond: boolean, id: string, label: string, message = 'Required'): Issue[] => (cond ? [{ id, label, message }] : [])

/** Business name, what it does, where it is and how to reach it */
export function businessIssues(f: Partial<BusinessFields>): Issue[] {
  return [
    ...need(blank(f.businessName), 'businessName', 'Business name'),
    ...need(blank(f.businessSector), 'businessSector', 'Business sector'),
    ...need(f.businessSector === 'Other (specify below)' && blank(f.businessSectorOther), 'businessSectorOther', 'Your sector'),
    ...need(blank(f.natureOfBusiness), 'natureOfBusiness', 'What the business does'),
    ...need(blank(f.dateOfCommencement), 'dateOfCommencement', 'Start date'),
    ...need(blank(f.buildingName), 'buildingName', 'House / building'),
    ...need(blank(f.streetName), 'streetName', 'Street name'),
    ...need(blank(f.city), 'city', 'City / town'),
    ...need(blank(f.region), 'region', 'Region'),
    ...need(blank(f.district), 'district', 'District'),
    ...need(blank(f.digitalAddress), 'digitalAddress', 'Digital address'),
    ...need(blank(f.mobilePhone), 'mobilePhone', 'Mobile phone'),
    ...need(!blank(f.mobilePhone) && !isValidPhone(String(f.mobilePhone)), 'mobilePhone', 'Mobile phone (check the number)', 'Enter a valid phone number'),
    ...need(blank(f.email), 'contactEmail', 'Email'),
    ...need(!blank(f.email) && !isValidEmail(String(f.email)), 'contactEmail', 'Email (check the address)', 'Enter a valid email address'),
  ]
}

/** A director who's been sent a link fills in their own details, so they aren't checked here */
const waitingOnLink = (d: PersonEntry) => Boolean(d.inviteId && !d.inviteMerged)

export const proprietorIssues = (p: PersonEntry) => personIssues(p, 'prop', 'Owner')

export const directorIssues = (directors: PersonEntry[]) => [
  ...need(directors.length < 2, 'dir-0-surname', 'At least two directors', 'A company needs at least two directors'),
  ...directors.flatMap((d, i) => (waitingOnLink(d) ? [] : personIssues(d, `dir-${i}`, `Director ${i + 1}`))),
]

export const secretaryIssues = (s: PersonEntry) => personIssues(s, 'sec', 'Secretary')

/** Shareholders (or members), stated capital, auditor and beneficial owner */
export function ownershipIssues(input: {
  shareholders: ShareholderEntry[]
  details: Partial<OwnershipFields>
  auditorLater: boolean
  /** Company limited by shares; a company limited by guarantee has members and no shares */
  isShares: boolean
}): Issue[] {
  const { shareholders, details: c, auditorLater, isShares } = input
  return [
    ...shareholders.flatMap((sh, i) => {
      const who = `${isShares ? 'Shareholder' : 'Member'} ${i + 1}`
      return [
        ...need(blank(sh.name), `sh-${i}-name`, `${who}: Name`),
        ...need(blank(sh.tinNumber), `sh-${i}-tin`, `${who}: TIN`),
        ...need(blank(sh.nationality), `sh-${i}-nationality`, `${who}: ${sh.type === 'corporate' ? 'Country' : 'Nationality'}`),
        ...need(blank(sh.address), `sh-${i}-address`, `${who}: Address`),
        ...(isShares
          ? [
              ...need(!(toNumber(sh.numberOfShares) > 0), `sh-${i}-shares`, `${who}: Number of shares`),
              ...need(!(toNumber(sh.valuePerShare) > 0), `sh-${i}-value`, `${who}: Price per share`),
            ]
          : []),
      ]
    }),
    ...(isShares
      ? [
          ...need(blank(c.authorizedShares), 'authorizedShares', 'Authorised shares'),
          ...need(blank(c.issuedShares), 'issuedShares', 'Issued shares'),
          ...need(
            !blank(c.authorizedShares) && toNumber(c.issuedShares) > toNumber(c.authorizedShares),
            'authorizedShares',
            'Authorised shares (can’t be fewer than issued)',
            'Can’t be fewer than the issued shares'
          ),
          ...need(blank(c.statedCapital), 'statedCapital', 'Stated capital'),
        ]
      : []),
    ...(auditorLater
      ? []
      : [
          ...need(blank(c.auditorName), 'auditorName', 'Auditor name'),
          ...need(blank(c.auditorLicense), 'auditorLicense', 'Auditor’s ICAG licence'),
        ]),
    ...need(blank(c.beneficialOwnerName), 'beneficialOwnerName', 'Beneficial owner: Name'),
    ...need(blank(c.beneficialOwnerNationality), 'beneficialOwnerNationality', 'Beneficial owner: Nationality'),
    ...need(blank(c.beneficialOwnerDOB), 'beneficialOwnerDOB', 'Beneficial owner: Date of birth'),
    ...need(blank(c.beneficialOwnerAddress), 'beneficialOwnerAddress', 'Beneficial owner: Address'),
  ]
}

/** One sentence for the server to send back: what's missing, first few by name */
export function describeIssues(issues: Issue[]) {
  const names = [...new Set(issues.map((i) => i.label))]
  const shown = names.slice(0, 4).join('; ')
  return `Some details still need attention: ${shown}${names.length > 4 ? `, and ${names.length - 4} more` : ''}. Please complete them, then try again.`
}

/**
 * Every problem in a whole application, for the server. Accepts both saved shapes: business fields at
 * the top level (checkout) or under `formData` (drafts and the edit form).
 */
export function applicationIssues(form: Record<string, unknown>, typeId: string): Issue[] {
  const business = (form.formData && typeof form.formData === 'object' ? form.formData : form) as Partial<BusinessFields>
  const pick = <T,>(key: string): T | undefined => (form[key] ?? (business as Record<string, unknown>)[key]) as T | undefined
  const isCompany = typeId === 'limited_by_shares' || typeId === 'limited_by_guarantee'
  if (!isCompany) return [...businessIssues(business), ...proprietorIssues((pick<PersonEntry>('proprietor') || {}) as PersonEntry)]
  const company = (pick<Record<string, unknown>>('companyDetails') || {}) as Partial<OwnershipFields> & { auditorLater?: boolean }
  return [
    ...businessIssues(business),
    ...directorIssues(pick<PersonEntry[]>('directors') || []),
    ...secretaryIssues((pick<PersonEntry>('secretary') || {}) as PersonEntry),
    ...ownershipIssues({
      shareholders: pick<ShareholderEntry[]>('shareholders') || [],
      details: company,
      auditorLater: Boolean(company.auditorLater),
      isShares: typeId === 'limited_by_shares',
    }),
  ]
}
