'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './documents.module.css'

interface Document {
  id: string
  name: string
  file_url: string
  document_type: string
  uploaded_at: string
  application_id: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDocs = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false })

      setDocuments((data as Document[]) || [])
      setLoading(false)
    }
    fetchDocs()
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <h2 className={styles.title}>Secure Document Vault</h2>
        <p style={{ color: 'var(--color-neutral-400)', textAlign: 'center', padding: 'var(--space-16)' }}>
          Loading documents...
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Secure Document Vault</h2>

      {documents.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔒</div>
          <h3>Your vault is empty</h3>
          <p>
            Documents related to your business registrations (certificates, forms, receipts) will appear here once your applications are processed.
          </p>
        </div>
      ) : (
        <div className={styles.docGrid}>
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docCard}
            >
              <span className={styles.docIcon}>📄</span>
              <div>
                <h4>{doc.name}</h4>
                <p>{doc.document_type} • {new Date(doc.uploaded_at).toLocaleDateString()}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
