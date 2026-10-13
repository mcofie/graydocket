// Server-only: the documents bucket is private, so files are shown through short-lived signed links.
// Uploads store the file's path in the bucket; older records stored a public URL, which still works
// here because the path is read back out of it.

import type { createAdminClient } from '@/lib/supabase/server'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>
type FormDoc = { url?: string; file_url?: string; path?: string; [key: string]: unknown }

export const DOCUMENTS_BUCKET = 'documents'
const LINK_SECONDS = 60 * 60

/** The file's path inside the documents bucket, from a stored path or an old public/signed URL */
export function documentPath(doc: { path?: unknown; url?: unknown; file_url?: unknown }): string | null {
  if (typeof doc.path === 'string' && doc.path) return doc.path
  const url = [doc.url, doc.file_url].find((v): v is string => typeof v === 'string' && v.length > 0)
  if (!url) return null
  const match = url.match(new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${DOCUMENTS_BUCKET}/([^?#]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Swap stored document links for signed ones (valid for an hour) on any number of applications'
 * form_data and documents-table rows, in one request to storage. Links to other places are left alone.
 */
export async function signDocumentLinks<F extends Record<string, unknown> | null | undefined, R extends { file_url: string }>(
  admin: AdminClient,
  formDatas: F[],
  rows: R[] = []
): Promise<{ formDatas: F[]; rows: R[] }> {
  const formDocs = formDatas.map((fd) => (Array.isArray(fd?.documents) ? (fd!.documents as FormDoc[]) : []))
  const paths = [
    ...formDocs.flat().map((d) => documentPath(d)),
    ...rows.map((r) => documentPath({ url: r.file_url })),
  ].filter((p): p is string => Boolean(p))
  if (paths.length === 0) return { formDatas, rows }

  const { data } = await admin.storage.from(DOCUMENTS_BUCKET).createSignedUrls([...new Set(paths)], LINK_SECONDS)
  const signed = new Map((data || []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]))
  const link = (path: string | null) => (path ? signed.get(path) : undefined)

  return {
    formDatas: formDatas.map((fd, i) => {
      if (!fd || formDocs[i].length === 0) return fd
      return { ...fd, documents: formDocs[i].map((d) => ({ ...d, url: link(documentPath(d)) || d.url || d.file_url })) } as F
    }),
    rows: rows.map((r) => ({ ...r, file_url: link(documentPath({ url: r.file_url })) || r.file_url })),
  }
}
