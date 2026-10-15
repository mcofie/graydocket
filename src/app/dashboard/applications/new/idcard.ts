// Ghana Card photos: shrinking them before they're stored, and reading details off the front.
//
// Photos are kept in the application as text (data URLs), so a 12-megapixel phone photo (~4 MB as
// text) would quickly break saving and the browser's draft storage. Each photo is resized to 1600 px
// on its longest side and saved as a JPEG (~0.3–0.6 MB), which is still sharp enough to read.

import type { PersonEntry } from './constants'

export const MAX_ID_PHOTOS = 4
const MAX_EDGE = 1600
const QUALITY = 0.82
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/** A photo the browser can't open (e.g. HEIC on some browsers) or that's too big to handle */
export class PhotoError extends Error {}

/** Resize and re-encode one image file as a JPEG data URL */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new PhotoError('Choose a photo (JPG or PNG).')
  if (file.size > MAX_UPLOAD_BYTES) throw new PhotoError('That photo is too large. Choose one under 20 MB.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new PhotoError('We couldn’t open that photo. Try a JPG or PNG, or take the photo again.')
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoError('We couldn’t process that photo.')
  // White behind transparent PNGs, so they don't turn black as JPEGs
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', QUALITY)
}

// ---------------------------------------------------------------------------------------------
// Reading the front of a Ghana Card
// ---------------------------------------------------------------------------------------------

export type CardReading = Partial<Pick<PersonEntry, 'ghanaCardNumber' | 'surname' | 'firstName' | 'otherNames' | 'dateOfBirth' | 'gender' | 'nationality'>>

const LABEL = /SURNAME|\bNOM\b|FIRST\s*NAMES?|FORENAMES?|GIVEN|PR[EÉ]NOMS?|PREVIOUS|NATIONALIT|\bSEXE?\b|BIRTH|NAISSANCE|HEIGHT|TAILLE|DOCUMENT|PERSONAL|ISSUANCE|EXPIRY|EXPIRATION|SIGNATURE|ECOWAS|REPUBLIC|IDENTITY/i

/** "TAYLOR-HAYFORD" -> "Taylor-Hayford"; keeps spaces, hyphens and apostrophes */
const tidyName = (raw: string) =>
  raw
    .replace(/[^A-Za-zÀ-ÿ' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'-])([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase())

/** Card numbers misread by OCR: O/Q -> 0, I/l/| -> 1, S -> 5, B -> 8 */
const fixDigits = (s: string) => s.replace(/[OQ]/gi, '0').replace(/[Il|]/g, '1').replace(/S/g, '5').replace(/B/g, '8')

/** The value printed under a label: the next line that isn't itself a label */
function valueAfter(lines: string[], label: RegExp, skip?: RegExp): string | null {
  const at = lines.findIndex((l) => label.test(l) && !(skip && skip.test(l)))
  if (at === -1) return null
  for (const line of lines.slice(at + 1, at + 3)) {
    if (!LABEL.test(line) && /[A-Za-z]{2}/.test(line)) return line
  }
  return null
}

const DATE = /(\d{2})\s*[/.\- ]\s*(\d{2})\s*[/.\- ]\s*(\d{4})/g

function toISO(d: string, m: string, y: string) {
  const day = Number(d), month = Number(m)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${y}-${m}-${d}`
}

/**
 * Pull the details printed on the front of a Ghana Card out of OCR text. Anything that can't be read
 * confidently is left out, so it doesn't overwrite what the person typed.
 */
export function parseGhanaCardText(text: string, today = new Date()): CardReading {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean)
  const all = lines.join('\n')
  const out: CardReading = {}

  // Personal ID number: GHA-123456789-0, tolerating spaces and misread digits
  const pin = all.match(/GHA\s*[-–—_.]?\s*([0-9OQIl|SB]{9})\s*[-–—_.]?\s*([0-9OQIl|SB])\b/i)
  if (pin) {
    const digits = fixDigits(pin[1])
    const check = fixDigits(pin[2])
    if (/^\d{9}$/.test(digits) && /^\d$/.test(check)) out.ghanaCardNumber = `GHA-${digits}-${check}`
  }

  // Names
  const surname = valueAfter(lines, /SURNAME|\bNOM\b/i, /PREVIOUS|PR[EÉ]NOM/i)
  if (surname) out.surname = tidyName(surname)
  const given = valueAfter(lines, /FIRST\s*NAMES?|FORENAMES?|GIVEN\s*NAMES?|PR[EÉ]NOMS?/i, /PREVIOUS/i)
  if (given) {
    const [first, ...rest] = tidyName(given).split(' ')
    if (first) out.firstName = first
    if (rest.length) out.otherNames = rest.join(' ')
  }

  // Date of birth: the date by the "Date of Birth" label, else the earliest plausible date on the card
  // (the others are the issue and expiry dates, which are always later)
  const birthAt = lines.findIndex((l) => /BIRTH|NAISSANCE/i.test(l))
  const near = birthAt === -1 ? '' : lines.slice(birthAt, birthAt + 3).join(' ')
  const candidates = [...(near ? near.matchAll(DATE) : []), ...all.matchAll(DATE)]
    .map((m) => toISO(m[1], m[2], m[3]))
    .filter((d): d is string => Boolean(d))
    .filter((d) => {
      const age = today.getFullYear() - Number(d.slice(0, 4))
      return age >= 10 && age <= 120
    })
  const dob = near && candidates.length ? candidates[0] : [...candidates].sort()[0]
  if (dob) out.dateOfBirth = dob

  // Sex: the M or F printed by the "Sex" label (check FEMALE before MALE: one contains the other)
  const sexAt = lines.findIndex((l) => /\bSEXE?\b/i.test(l))
  const sexText = sexAt === -1 ? '' : lines.slice(sexAt, sexAt + 2).join(' ').replace(/SEXE?/gi, ' ')
  if (/\bFEMALE\b|\bF\b/i.test(sexText)) out.gender = 'Female'
  else if (/\bMALE\b|\bM\b/i.test(sexText)) out.gender = 'Male'

  if (/GHANAIAN/i.test(all)) out.nationality = 'Ghanaian'
  return out
}
