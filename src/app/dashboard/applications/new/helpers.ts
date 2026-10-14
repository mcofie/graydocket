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

// =====================================================
// Validation shared by the form, the director invite page and the server
// =====================================================

/** A problem to fix before continuing: `id` is the field's DOM id, so the form can jump to it */
export type Issue = { id: string; label: string; message?: string }

export const MIN_AGE = 18
export const GHANA_CARD = /^GHA-\d{9}-\d$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const isValidGhanaCard = (v: string) => !v || GHANA_CARD.test(v)
export const isValidEmail = (v: string) => !v || EMAIL.test(v.trim())
export const isValidPhone = (v: string) => !v || v.replace(/\D/g, '').length >= 9

/** Whole years between a YYYY-MM-DD birth date and today (null if not a date) */
export function ageFrom(dob: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob || '')
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age -= 1
  return age
}

/** Latest birth date that makes someone an adult today, for the date picker's max */
export function adultCutoffISO(today = new Date()) {
  const d = new Date(today)
  d.setFullYear(d.getFullYear() - MIN_AGE)
  return d.toISOString().slice(0, 10)
}

export function dobProblem(dob: string): string | null {
  if (!dob) return null
  const age = ageFrom(dob)
  if (age === null) return 'Enter a valid date'
  if (age < 0) return 'This date is in the future'
  if (age < MIN_AGE) return `Must be ${MIN_AGE} or older to own or run a business`
  if (age > 120) return 'Check the year'
  return null
}

/** Everything wrong with a person's details, by field: "Required" or a specific message */
export function personProblems(p: PersonEntry, fields: Array<keyof PersonEntry> = PERSON_REQUIRED.map(([k]) => k)) {
  const problems: Partial<Record<keyof PersonEntry, string>> = {}
  for (const [key] of PERSON_REQUIRED) {
    if (fields.includes(key) && !String(p[key] ?? '').trim()) problems[key] = 'Required'
  }
  // Format checks apply whenever something has been typed
  const dob = dobProblem(p.dateOfBirth)
  if (dob) problems.dateOfBirth = dob
  if (!isValidGhanaCard(p.ghanaCardNumber)) problems.ghanaCardNumber = 'Use the format GHA-123456789-0'
  if (!isValidEmail(p.email)) problems.email = 'Enter a valid email address'
  if (!isValidPhone(p.phone)) problems.phone = 'Enter a valid phone number'
  return problems
}

export const personLabel = (key: keyof PersonEntry) => PERSON_REQUIRED.find(([k]) => k === key)?.[1] || String(key)

/** One issue per problem field, labelled "Director 2: Date of birth (must be 18 or older…)" */
export function personIssues(p: PersonEntry, prefix: string, who: string, fields?: Array<keyof PersonEntry>): Issue[] {
  return Object.entries(personProblems(p, fields)).map(([key, msg]) => ({
    id: `${prefix}-${key}`,
    message: msg,
    label: `${who}: ${personLabel(key as keyof PersonEntry)}${msg && msg !== 'Required' ? ` (${msg.charAt(0).toLowerCase()}${msg.slice(1)})` : ''}`,
  }))
}
