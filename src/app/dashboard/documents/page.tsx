'use client'

import { useState, useEffect } from 'react'
import { FileText, ArrowUpRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getMyApplications } from '@/lib/actions'
import styles from './documents.module.css'
import EmptyState from '@/components/ui/EmptyState'

interface Document {
  id: string
  name: string
  file_url: string
  document_type: string
  uploaded_at: string
  application_id: string
}

// "certificate_of_incorporation" -> "Certificate of incorporation"
function formatType(type: string) {
  const text = type.replace(/[_-]+/g, ' ').trim()
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[] | null>(null)
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
      getMyApplications(),
    ]).then(([{ data }, { applications }]) => {
      setDocuments((data as Document[]) || [])
      setBusinessNames(
        Object.fromEntries(
          (applications as Array<{ id: string; business_name?: string | null }>).map((a) => [a.id, a.business_name || ''])
        )
      )
    })
  }, [])

  return (
    <div className={styles.column}>
      {documents === null ? (
        <div className={styles.list} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${styles.row} ${styles.rowSkeleton}`} />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          variant="documents"
          message="No documents yet. Certificates and filings from your registrations will appear here."
        />
      ) : (
        <div className={styles.list}>
          {documents.map((doc) => {
            const business = businessNames[doc.application_id]
            return (
              <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className={styles.row}>
                <span className={styles.icon}>
                  <FileText size={18} strokeWidth={1.75} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{doc.name}</span>
                  <span className={styles.rowSub}>
                    {[doc.document_type && formatType(doc.document_type), business, formatDate(doc.uploaded_at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <ArrowUpRight size={18} className={styles.open} aria-hidden="true" />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
