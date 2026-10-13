// Every document on an application, from wherever it's stored:
//   - issued by GrayDocket: files our team uploads (form_data.documents) plus rows in the documents table
//   - provided by the customer: ID photos attached to each person in the form
// Used by the customer's Documents page and the admin application page, so both list the same files.

export type IssuedDoc = {
  id: string
  title: string
  url: string
  addedAt: string | null
  /** Admin review state for files the customer sent in (approved / rejected), when set */
  status?: string | null
}

export type ProvidedDoc = {
  id: string
  title: string
  /** Image source: a URL or an inline data: URL from the form */
  src: string
  person: string
  role: string
}

type Person = { firstName?: string; surname?: string; fullName?: string; name?: string; idPhotos?: unknown; ghanaCardPhotoUrl?: unknown }
type FormDoc = { title?: string; name?: string; url?: string; file_url?: string; uploadedAt?: string; verifiedAt?: string; verification_status?: string }
type TableDoc = { id: string; name: string; file_url: string; document_type?: string | null; uploaded_at?: string | null }

const personName = (p: Person) =>
  (p.fullName || p.name || [p.firstName, p.surname].filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim() || 'Unnamed'

const isImageSrc = (v: unknown): v is string => typeof v === 'string' && (v.startsWith('data:image') || /^https?:\/\//.test(v))

export const isImageUrl = (url: string) => url.startsWith('data:image') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)

/** Files GrayDocket has issued or filed for this application */
export function issuedDocuments(formData: Record<string, unknown> | null | undefined, tableDocs: TableDoc[] = []): IssuedDoc[] {
  const fromForm = (Array.isArray(formData?.documents) ? (formData!.documents as FormDoc[]) : [])
    .map((d, i) => ({
      id: `form-${i}`,
      title: d.title || d.name || 'Document',
      url: d.url || d.file_url || '',
      addedAt: d.uploadedAt || d.verifiedAt || null,
      status: d.verification_status ?? null,
    }))
    .filter((d) => d.url)
  const fromTable = tableDocs.map((d) => ({
    id: `table-${d.id}`,
    title: d.name || (d.document_type || 'Document').replace(/[_-]+/g, ' '),
    url: d.file_url,
    addedAt: d.uploaded_at || null,
  }))
  // Same file in both places: keep one
  const seen = new Set<string>()
  return [...fromForm, ...fromTable]
    .filter((d) => (seen.has(d.url) ? false : (seen.add(d.url), true)))
    .sort((a, b) => Date.parse(b.addedAt || '') - Date.parse(a.addedAt || '') || 0)
}

/** ID photos the customer attached for each person on the application */
export function providedDocuments(formData: Record<string, unknown> | null | undefined): ProvidedDoc[] {
  if (!formData) return []
  const groups: Array<[string, Person[]]> = [
    ['Owner', formData.proprietor ? [formData.proprietor as Person] : []],
    ['Director', Array.isArray(formData.directors) ? (formData.directors as Person[]) : []],
    ['Company secretary', formData.secretary ? [formData.secretary as Person] : []],
    ['Shareholder', Array.isArray(formData.shareholders) ? (formData.shareholders as Person[]) : []],
    ['Member', Array.isArray(formData.members) ? (formData.members as Person[]) : []],
  ]

  const out: ProvidedDoc[] = []
  const seen = new Set<string>()
  for (const [role, people] of groups) {
    people.forEach((p, pi) => {
      const photos = [
        ...(Array.isArray(p?.idPhotos) ? (p.idPhotos as unknown[]) : []),
        p?.ghanaCardPhotoUrl,
      ].filter(isImageSrc)
      photos.forEach((src, i) => {
        // The same person can appear as director and shareholder with the same photos
        if (seen.has(src)) return
        seen.add(src)
        out.push({
          id: `${role}-${pi}-${i}`,
          title: photos.length > 1 ? `Ghana Card photo ${i + 1}` : 'Ghana Card photo',
          src,
          person: personName(p),
          role,
        })
      })
    })
  }
  return out
}
