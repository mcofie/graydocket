import type { PersonEntry } from './constants'

/**
 * Best-effort region from a Ghana Post GPS digital address, using the first letter of the code.
 * Only letters that map to a single region are used; anything else returns null so the user picks.
 */
const REGION_BY_LETTER: Record<string, string> = {
  G: 'Greater Accra',
  A: 'Ashanti',
  C: 'Central',
  E: 'Eastern',
}

export function regionFromDigitalAddress(code: string): string | null {
  const letter = code.trim().toUpperCase().match(/^([A-Z])[A-Z]-?\d/)?.[1]
  return (letter && REGION_BY_LETTER[letter]) || null
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

/** "Kwame Kofi Asante" -> first: Kwame, other: Kofi, surname: Asante */
export function splitFullName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', otherNames: '', surname: '' }
  if (parts.length === 1) return { firstName: parts[0], otherNames: '', surname: '' }
  return { firstName: parts[0], otherNames: parts.slice(1, -1).join(' '), surname: parts[parts.length - 1] }
}

export const personDisplayName = (p: PersonEntry) => [p.firstName, p.otherNames, p.surname].filter(Boolean).join(' ')

/** Fields PersonForm marks as required, with friendly labels */
export const PERSON_REQUIRED: Array<[keyof PersonEntry, string]> = [
  ['surname', 'Surname'],
  ['firstName', 'First name'],
  ['dateOfBirth', 'Date of birth'],
  ['gender', 'Gender'],
  ['nationality', 'Nationality'],
  ['occupation', 'Occupation'],
  ['ghanaCardNumber', 'Ghana Card'],
  ['tinNumber', 'TIN'],
  ['residentialAddress', 'Address'],
  ['city', 'City'],
  ['region', 'Region'],
  ['phone', 'Phone'],
  ['email', 'Email'],
]

/** Labels of the given person fields that are still empty */
export function missingPersonFields(p: PersonEntry, fields: Array<keyof PersonEntry>) {
  return PERSON_REQUIRED.filter(([key]) => fields.includes(key) && !String(p[key] ?? '').trim()).map(([, label]) => label)
}

/** Combine "Director 1" + ["Ghana Card", "TIN"] -> "Director 1: Ghana Card, TIN" */
export const missingLine = (who: string, labels: string[]) => (labels.length ? `${who}: ${labels.join(', ')}` : null)
