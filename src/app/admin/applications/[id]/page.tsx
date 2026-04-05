'use client'

import { useState, useEffect, use, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, UploadCloud, ExternalLink, Copy, Printer, Clock, Save } from 'lucide-react'
import { getApplicationDetails, updateApplicationStatus, uploadApplicationDocument, updateApplicationNotes } from '@/lib/actions'
import styles from '../../../dashboard/overview.module.css'

const statusOptions = [
  'draft', 'submitted', 'name_search', 'under_review', 
  'approved', 'rejected', 'dispatched', 'delivered', 'completed', 'cancelled', 'on_hold'
]

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const appId = resolvedParams.id
  
  const [app, setApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Doc Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Notes State
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    fetchData()
  }, [appId])

  const fetchData = async () => {
    const res = await getApplicationDetails(appId)
    setApp(res.application)
    setNotes(res.application?.notes || '')
    setLoading(false)
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    const res = await updateApplicationNotes(appId, notes)
    if (res.error) alert(res.error)
    else setApp({ ...app, notes })
    setSavingNotes(false)
  }

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    const { error } = await updateApplicationStatus(appId, newStatus)
    if (error) alert(error)
    else setApp({ ...app, status: newStatus })
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !docTitle) {
      alert('Please provide both a title and a file.')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', docTitle)

    const res = await uploadApplicationDocument(appId, formData)
    if (res.error) {
      alert(`Upload failed: ${res.error}`)
    } else {
      // Re-fetch to get updated documents list
      await fetchData()
      setDocTitle('')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setUploading(false)
  }

  const generateText = (obj: any, indent = 0): string => {
    if (!obj) return ''
    if (typeof obj !== 'object') return String(obj)
    
    let text = ''
    const spaces = '  '.repeat(indent)
    for (const [key, val] of Object.entries(obj)) {
      if (key === 'documents') continue
      const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      
      if (Array.isArray(val)) {
        if (val.length === 0) {
          text += `${spaces}${readableKey}: Empty\n`
        } else {
          text += `${spaces}${readableKey}:\n`
          val.forEach((item, i) => {
            text += `${spaces}  [Item ${i + 1}]\n`
            text += typeof item === 'object' ? generateText(item, indent + 2) : `${spaces}    ${item}\n`
          })
        }
      } else if (typeof val === 'object') {
        text += `${spaces}${readableKey}:\n`
        text += generateText(val, indent + 1)
      } else {
        text += `${spaces}${readableKey}: ${val === '' ? 'N/A' : val}\n`
      }
    }
    return text
  }

  const getFormattedText = () => {
    if (!app) return ''
    const fd = app.form_data || {}
    let text = `APPLICATION DETAILS - ${app.tracking_id}\n`
    text += `Business Name: ${app.business_name}\n`
    text += `Type: ${app.business_types?.name}\n\n`
    text += `--- EXTRACTED DATA ---\n\n`
    text += generateText(fd)
    return text
  }

  const handleCopyData = () => {
    navigator.clipboard.writeText(getFormattedText())
    alert('Application data copied to clipboard!')
  }

  const generateObjectHTML = (obj: any): string => {
    if (!obj) return ''
    if (typeof obj !== 'object') return `<span>${obj}</span>`
    
    let html = `<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">`
    for (const [key, val] of Object.entries(obj)) {
      if (key === 'documents') continue
      
      const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      
      html += `<tr><td style="padding: 10px; border: 1px solid #ddd; width: 35%; background: #f4f4f5; font-weight: 600; font-size: 12px; text-transform: uppercase;">${readableKey}</td>`
      html += `<td style="padding: 10px; border: 1px solid #ddd; font-size: 14px;">`
      
      if (Array.isArray(val)) {
        if (val.length === 0) {
          html += `<span style="color: #999; font-style: italic;">Empty</span>`
        } else {
          val.forEach((item, i) => {
            html += `<div style="margin-bottom: ${i < val.length - 1 ? '15px' : '0'}; padding-bottom: ${i < val.length - 1 ? '15px' : '0'}; border-bottom: ${i < val.length - 1 ? '1px dashed #ccc' : 'none'};">`
            html += `<div style="font-size: 10px; color: #666; margin-bottom: 4px; text-transform: uppercase; font-weight: 600;">Item ${i + 1}</div>`
            html += typeof item === 'object' ? generateObjectHTML(item) : item
            html += `</div>`
          })
        }
      } else if (typeof val === 'object') {
        html += generateObjectHTML(val)
      } else {
        html += val === '' ? `<span style="color: #999; font-style: italic;">N/A</span>` : val
      }
      
      html += `</td></tr>`
    }
    html += `</table>`
    return html
  }

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print PDF.')
      return
    }
    const fd = app.form_data || {}
    const { documents, ...restData } = fd
    
    let html = `<html><head><title>App_${app.tracking_id}</title><style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.6; color: #111; max-width: 900px; margin: 0 auto; }
      h1 { font-size: 28px; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px; font-weight: 800; }
      h2 { font-size: 18px; color: #444; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 40px; margin-bottom: 20px; }
      .meta { margin-bottom: 40px; background: #fafafa; padding: 20px; border-radius: 8px; border: 1px solid #eee; font-size: 14px; }
      .meta strong { color: #555; }
    </style></head><body>`
    
    html += `<h1>${app.business_name}</h1>`
    html += `<div class="meta">
      <div style="margin-bottom: 8px;"><strong>Tracking ID:</strong> <span style="font-family: monospace; color: #dc2626;">${app.tracking_id}</span></div>
      <div style="margin-bottom: 8px;"><strong>Entity Type:</strong> ${app.business_types?.name}</div>
      <div><strong>Date Submitted:</strong> ${new Date(app.created_at).toLocaleString()}</div>
    </div>`
    html += `<h2>Submitted Business Information</h2>`
    html += generateObjectHTML(restData)
    html += `</body></html>`
    
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const renderUIDataNode = (obj: any, level = 0): React.ReactNode => {
    if (!obj) return null
    if (typeof obj !== 'object') return <span style={{ fontWeight: 500 }}>{String(obj)}</span>
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(obj).map(([key, val]) => {
          if (key === 'documents') return null
          const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
          
          return (
            <div key={key} style={{ background: level === 0 ? 'white' : 'transparent', padding: level === 0 ? '16px' : '0', border: level === 0 ? '1px solid var(--color-neutral-200)' : 'none', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-neutral-500)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
                {readableKey}
              </div>
              
              {Array.isArray(val) ? (
                val.length === 0 ? <span style={{ color: 'var(--color-neutral-400)', fontSize: '13px', fontStyle: 'italic' }}>Empty</span> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    {val.map((item, i) => (
                      <div key={i} style={{ padding: '16px', background: 'var(--color-neutral-50)', border: '1px solid var(--color-neutral-200)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary-600)', textTransform: 'uppercase', marginBottom: '12px' }}>Item {i + 1}</div>
                        {typeof item === 'object' ? renderUIDataNode(item, level + 1) : String(item)}
                      </div>
                    ))}
                  </div>
                )
              ) : typeof val === 'object' ? (
                <div style={{ marginTop: '8px', padding: '12px', background: 'var(--color-neutral-50)', borderRadius: '8px', border: '1px solid var(--color-neutral-200)' }}>
                  {renderUIDataNode(val, level + 1)}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: val === '' ? 'var(--color-neutral-400)' : 'var(--color-neutral-900)', fontWeight: val === '' ? 400 : 500, fontStyle: val === '' ? 'italic' : 'normal' }}>
                  {val === '' ? 'N/A' : String(val)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return <div className={styles.overview} style={{ padding: 'var(--space-8)' }}>Loading application details...</div>
  }

  if (!app) {
    return <div className={styles.overview} style={{ padding: 'var(--space-8)' }}>Application not found.</div>
  }

  const fd = app.form_data || {}
  const docs = fd.documents || []

  return (
    <div className={styles.overview}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/admin/applications" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-neutral-500)', fontSize: '13px', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Requirements
        </Link>
      </div>

      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{app.business_name}</h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-primary-600)', marginTop: '4px' }}>
            Tracking ID: {app.tracking_id} | Created: {new Date(app.created_at).toLocaleString()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-neutral-500)' }}>Status:</span>
          <select 
            value={app.status}
            onChange={handleStatusChange}
            className="form-input"
            style={{ width: 'auto', padding: '6px 12px', fontWeight: 600 }}
          >
            {statusOptions.map(opt => (
              <option key={opt} value={opt}>{opt.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', marginTop: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* Left Column: Form Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-neutral-100)' }}>
              Core Application Data
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-neutral-400)', fontWeight: 600 }}>Entity Type</label>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>{app.business_types?.name || 'Unknown'}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-neutral-400)', fontWeight: 600 }}>Nature of Business</label>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>{fd.natureOfBusiness || 'N/A'}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-neutral-400)', fontWeight: 600 }}>Commencement</label>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>{fd.dateOfCommencement || 'N/A'}</div>
              </div>
            </div>
          </div>

          {fd.directors && fd.directors.length > 0 && (
             <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', padding: 'var(--space-6)' }}>
               <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-neutral-100)' }}>
                 Directors ({fd.directors.length})
               </h3>
               {fd.directors.map((d: any, idx: number) => (
                 <div key={idx} style={{ marginBottom: idx < fd.directors.length - 1 ? 'var(--space-4)' : 0, paddingBottom: idx < fd.directors.length - 1 ? 'var(--space-4)' : 0, borderBottom: idx < fd.directors.length - 1 ? '1px dashed var(--color-neutral-200)' : 'none' }}>
                   <div style={{ fontWeight: 600 }}>{d.firstName} {d.surname}</div>
                   <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)' }}>Ghana Card: {d.ghanaCardNumber} | TIN: {d.tinNumber}</div>
                   <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)' }}>{d.email} | {d.phone}</div>
                 </div>
               ))}
             </div>
          )}

          <div style={{ background: 'var(--color-neutral-0)', borderRadius: '12px', padding: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', padding: 'var(--space-6) var(--space-6) 0 var(--space-6)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                Comprehensive Form Payload
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleCopyData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Copy size={14} /> Copy All
                </button>
                <button className="btn btn-primary btn-sm" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={14} /> Export to PDF
                </button>
              </div>
            </div>
            
            <div style={{ padding: '0 var(--space-6) var(--space-6) var(--space-6)' }}>
              {renderUIDataNode(fd)}
            </div>
          </div>
          
        </div>

        {/* Right Column: Documents and Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          <div style={{ background: 'var(--color-neutral-50)', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', padding: 'var(--space-6)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
              <FileText size={18} /> Official Documents
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {docs.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)', fontStyle: 'italic', padding: '12px', border: '1px dashed var(--color-neutral-300)', borderRadius: '8px', textAlign: 'center' }}>
                  No documents uploaded yet.
                </div>
              ) : (
                docs.map((d: any, idx: number) => (
                  <a key={idx} href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'white', border: '1px solid var(--color-neutral-200)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{d.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--color-neutral-400)' }}>{new Date(d.uploadedAt).toLocaleString()}</div>
                    </div>
                    <ExternalLink size={14} style={{ color: 'var(--color-primary-600)' }} />
                  </a>
                ))
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--color-neutral-200)', paddingTop: 'var(--space-4)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Upload New Document</h4>
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Document Title (e.g. Form 3 Signed)"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  required
                />
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="form-input" 
                  style={{ padding: '8px', fontSize: '12px' }}
                  required
                />
                <button type="submit" disabled={uploading} className="btn btn-primary btn-sm" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  {uploading ? 'Uploading...' : <><UploadCloud size={14} /> Upload to Storage</>}
                </button>
              </form>
            </div>
          </div>
          
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
              Payment & Review Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-neutral-500)' }}>Paid Amount:</span>
                <span style={{ fontWeight: 600 }}>GH₵ {app.total_amount || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-neutral-500)' }}>Payment Status:</span>
                <span style={{ fontWeight: 600, color: app.payment_status === 'paid' ? 'var(--color-success)' : 'var(--color-neutral-900)' }}>{app.payment_status?.toUpperCase() || 'UNKNOWN'}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between' }}>
              Internal Diagnostic Notes
              <button 
                onClick={handleSaveNotes} 
                disabled={savingNotes} 
                style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {savingNotes ? 'Saving...' : <><Save size={14} /> Save</>}
              </button>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-3)' }}>
              Client cannot see these notes. Use for internal tasks and flags.
            </p>
            <textarea 
              className="form-input" 
              style={{ minHeight: '120px', resize: 'vertical', fontSize: '13px' }}
              placeholder="e.g., Client missing valid Ghana card scan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> Audit Timeline
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {app.application_status_history && app.application_status_history.length > 0 ? (
                app.application_status_history.map((hist: any, i: number) => (
                  <div key={hist.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                    {/* Timeline Line */}
                    {i < app.application_status_history.length - 1 && (
                      <div style={{ position: 'absolute', top: '20px', bottom: '-16px', left: '5px', width: '2px', background: 'var(--color-neutral-200)' }} />
                    )}
                    
                    {/* Timeline Dot */}
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'white', border: '3px solid var(--color-primary-500)', zIndex: 1, marginTop: '4px' }} />
                    
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{hist.notes || `Status: ${hist.status}`}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                        {new Date(hist.created_at).toLocaleString()} • {hist.updater?.full_name || 'System Action'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)' }}>No timeline events recorded.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
