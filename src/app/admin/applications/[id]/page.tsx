'use client'

import { useState, useEffect, use, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, UploadCloud, ExternalLink, Copy, Printer, Clock, Save, User, CheckCircle, XCircle, AlertCircle, Edit2, X } from 'lucide-react'
import { getApplicationDetails, updateApplicationStatus, uploadApplicationDocument, updateApplicationNotes, assignApplication, getRegistrarsForAssignment, verifyDocument, requestFieldCorrection, adminUpdateApplicationData, getAllBusinessTypes, sendDirectSmsToApplicant } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'
import Modal from '../../components/Modal'
import styles from '../../../dashboard/overview.module.css'

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue | undefined }

type CurrentUser = {
  id: string
  app_metadata?: {
    role?: string
  } | null
}

type RegistrarOption = {
  id: string
  full_name: string
}

type ApplicationDocument = {
  title: string
  url: string
  uploadedAt: string
  verification_status?: 'approved' | 'rejected' | 'pending' | null
  admin_notes?: string | null
}

type DirectorEntry = {
  firstName?: string
  surname?: string
  ghanaCardNumber?: string
  tinNumber?: string
  email?: string
  phone?: string
} & JsonObject

type ApplicationFormData = JsonObject & {
  natureOfBusiness?: string
  dateOfCommencement?: string
  mobilePhone?: string
  directors?: DirectorEntry[]
  documents?: ApplicationDocument[]
  corrections?: Record<string, string>
}

type ApplicationHistoryEntry = {
  id: string
  status: string
  notes?: string | null
  created_at: string
  updater?: {
    full_name?: string | null
  } | null
}

type ApplicationDetail = {
  id: string
  tracking_id: string
  business_name: string
  status: string
  notes?: string | null
  created_at: string
  total_amount?: number | null
  payment_status?: string | null
  assigned_to?: string | null
  form_data?: ApplicationFormData | null
  business_types?: {
    id?: string
    name?: string | null
    orc_fee?: number | null
    agent_fee?: number | null
    returns_portion?: number | null
    required_fields?: any
  } | null
  business_type_id?: string | null
  assigned_registrar?: {
    full_name?: string | null
  } | null
  application_status_history?: ApplicationHistoryEntry[]
  profiles?: {
    phone?: string | null
  } | null
  referred_by_id?: string | null
}

const statusOptions = [
  'draft', 'submitted', 'name_search', 'under_review', 
  'approved', 'rejected', 'dispatched', 'delivered', 'completed', 'cancelled', 'on_hold'
]

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const appId = resolvedParams.id

  
  const [app, setApp] = useState<ApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Auth & Assignment State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [registrars, setRegistrars] = useState<RegistrarOption[]>([])
  const [assigning, setAssigning] = useState(false)
  
  // Doc Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Notes State
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Edit Mode State
  const [isEditingForm, setIsEditingForm] = useState(false)
  const [businessTypes, setBusinessTypes] = useState<any[]>([])
  const [editPayload, setEditPayload] = useState<any>({ businessTypeId: '', businessName: '', formData: {} })
  const [savingForm, setSavingForm] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  
  // SMS Modal State
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false)
  const [smsMessage, setSmsMessage] = useState('')
  const [sendingSms, setSendingSms] = useState(false)

  const fetchData = useCallback(async () => {
    if (!appId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    let adminFlag = false
    if (user) {
      setCurrentUser(user as CurrentUser)
      if (user.app_metadata?.role === 'admin') {
        adminFlag = true
        setIsSuperAdmin(true)
      } else {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        if (prof?.role === 'admin') {
          adminFlag = true
          setIsSuperAdmin(true)
        }
      }
    }

    if (adminFlag) {
      const [regs, bTypes] = await Promise.all([
        getRegistrarsForAssignment(),
        getAllBusinessTypes()
      ])
      setRegistrars(regs as RegistrarOption[])
      const uniqueBTypes = (bTypes.business_types || []).filter((v: any, i: number, a: any[]) => 
        a.findIndex(t => t.name === v.name) === i
      )
      setBusinessTypes(uniqueBTypes)
    }

    const res = await getApplicationDetails(appId)
    if (res.error) setError(res.error)
    setApp((res.application as ApplicationDetail | null) || null)
    setNotes(res.application?.notes || '')
    setLoading(false)
  }, [appId])

  useEffect(() => {
    if (appId) {
      fetchData()
    }
  }, [appId, fetchData])

  const handleAssignAction = async (targetUserId: string) => {
    if (!appId || !targetUserId) return
    setAssigning(true)
    const res = await assignApplication(appId, targetUserId)
    if (res.error) alert(res.error)
    else await fetchData()
    setAssigning(false)
  }

  const handleVerify = async (docUrl: string, status: 'approved' | 'rejected') => {
    if (!appId) return
    let notes = ''
    if (status === 'rejected') {
      notes = window.prompt('Why are you rejecting this document?') || ''
      if (!notes) return // Don't reject without a reason
    }

    const res = await verifyDocument(appId, docUrl, status, notes)
    if (res.error) alert(res.error)
    else await fetchData()
  }

  const handleSaveNotes = async () => {
    if (!appId) return
    setSavingNotes(true)
    const res = await updateApplicationNotes(appId, notes)
    if (res.error) alert(res.error)
    else {
      setApp((currentApp) => (
        currentApp
          ? { ...currentApp, notes }
          : currentApp
      ))
    }
    setSavingNotes(false)
  }

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!app || !appId) return

    const newStatus = e.target.value
    const currentStatus = app.status

    // 1. Irreversibility Alert (Client-side Guard)
    const terminalStates = ['completed', 'cancelled']
    const checkpointStates = ['dispatched', 'delivered']
    
    let warning = ''
    if (terminalStates.includes(newStatus)) {
      warning = `CRITICAL: Moving to ${newStatus.toUpperCase()} is PERMANENT. You will NOT be able to change the status again. Are you absolutely sure?`
    } else if (checkpointStates.includes(newStatus)) {
      warning = `LOGISTICS ALERT: Moving to ${newStatus.toUpperCase()} is a procedural checkpoint. Reversing this state later will be restricted by the system. Proceed?`
    }

    if (warning && !window.confirm(warning)) {
      // Revert the UI state if cancelled
      e.target.value = currentStatus
      return
    }

    const customNote = window.prompt(`Add a status update note for the customer (sent via SMS):`) || undefined
    
    setApp({ ...app, status: newStatus }) // Optimistic UI
    const { error } = await updateApplicationStatus(appId, newStatus, customNote)
    if (error) {
      alert(error)
      await fetchData() // Rollback
    } else {
      await fetchData()
    }
  }

  const handleSendCustomSms = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!appId) return
    if (!smsMessage || !smsMessage.trim()) {
      alert('Please enter a message.')
      return
    }

    setSendingSms(true)
    const res = await sendDirectSmsToApplicant(appId, smsMessage.trim())
    if (res.error) {
      alert(`Error sending SMS: ${res.error}`)
    } else {
      alert('SMS successfully queued for sending!')
      setIsSmsModalOpen(false)
      setSmsMessage('')
      await fetchData() // Refresh history timeline
    }
    setSendingSms(false)
  }

  const handleFlagField = async (fieldKey: string, fieldName: string) => {
    if (!appId) return
    const reason = window.prompt(`Why does "${fieldName}" need correction? Individual fields flagged will help the user fix them precisely.`)
    if (reason === null) return // Cancelled
    if (!reason.trim()) {
      alert('You must provide a reason for the correction request.')
      return
    }
    
    const res = await requestFieldCorrection(appId, fieldKey, reason)
    if (res.error) {
      alert(res.error)
    } else {
      await fetchData()
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appId || !selectedFile || !docTitle) {
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

  const generateText = (obj: JsonValue | undefined, indent = 0): string => {
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

  const generateObjectHTML = (obj: JsonValue | undefined): string => {
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
    if (!app) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print PDF.')
      return
    }
    const fd = app.form_data || {}
    const restData = { ...fd }
    delete restData.documents
    
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

  const startEditing = () => {
    setIsEditingForm(true)
    setEditPayload({
      businessTypeId: app?.business_type_id || app?.business_types?.id || '',
      businessName: app?.business_name || '',
      formData: app?.form_data || {}
    })
  }

  const saveEditedForm = async () => {
    if (!appId) return
    setSavingForm(true)
    const res = await adminUpdateApplicationData(appId, editPayload)
    if (res.error) {
       alert(res.error)
    } else {
       setIsEditingForm(false)
       await fetchData()
    }
    setSavingForm(false)
  }

  const renderEditField = (field: string) => {
    const isComplex = ['directors', 'secretary', 'shareholders', 'members', 'proprietor'].includes(field)
    
    if (isComplex) {
       const isArray = ['directors', 'secretary', 'shareholders', 'members'].includes(field) && field !== 'secretary';
       const rawVal = editPayload.formData[field] || (isArray ? [] : {});
       
       const getEmptyEntityTemplate = () => {
         if (['directors', 'secretary', 'proprietor', 'members'].includes(field)) {
            return { title: '', surname: '', firstName: '', otherNames: '', dateOfBirth: '', gender: '', nationality: '', occupation: '', ghanaCardNumber: '', tinNumber: '', residentialAddress: '', city: '', region: '', digitalAddress: '', phone: '', email: '', idPhotos: [], ghanaCardPhotoUrl: '' };
         }
         if (field === 'shareholders') {
            return { type: 'individual', name: '', tinNumber: '', nationality: '', address: '', numberOfShares: '', valuePerShare: '' };
         }
         return {};
       };

       const handlePhotoUpload = (idx: number, files: FileList | null) => {
          if (!files) return;
          const fileArray = Array.from(files);
          const promises = fileArray.map(file => new Promise<string>((resolve) => {
             const reader = new FileReader();
             reader.onloadend = () => resolve(reader.result as string);
             reader.readAsDataURL(file);
          }));
          Promise.all(promises).then(results => {
             if (isArray) {
                const arr = [...(editPayload.formData[field] || [])];
                const existingPhotos = arr[idx].idPhotos || [];
                arr[idx] = { ...arr[idx], idPhotos: [...existingPhotos, ...results] };
                setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: arr } });
             } else {
                const currentVal = editPayload.formData[field] || {};
                const existingPhotos = currentVal.idPhotos || [];
                const updated = { ...currentVal, idPhotos: [...existingPhotos, ...results] };
                setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: updated } });
             }
          });
       };

       const removePhoto = (idx: number, photoIdx: number, isOldGhanaCardUrl: boolean) => {
          if (isArray) {
             const arr = [...(editPayload.formData[field] || [])];
             if (isOldGhanaCardUrl) {
                arr[idx] = { ...arr[idx], ghanaCardPhotoUrl: '' };
             } else {
                const newPhotos = [...(arr[idx].idPhotos || [])];
                newPhotos.splice(photoIdx, 1);
                arr[idx] = { ...arr[idx], idPhotos: newPhotos };
             }
             setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: arr } });
          } else {
             const currentVal = editPayload.formData[field] || {};
             if (isOldGhanaCardUrl) {
                setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: { ...currentVal, ghanaCardPhotoUrl: '' } } });
             } else {
                const newPhotos = [...(currentVal.idPhotos || [])];
                newPhotos.splice(photoIdx, 1);
                setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: { ...currentVal, idPhotos: newPhotos } } });
             }
          }
       };

       const updateItem = (idx: number, key: string, val: any) => {
          if (isArray) {
             const arr = [...(editPayload.formData[field] || [])];
             arr[idx] = { ...arr[idx], [key]: val };
             setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: arr } });
          } else {
             const currentVal = editPayload.formData[field] || {};
             setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: { ...currentVal, [key]: val } } });
          }
       };

       const renderEntityCard = (item: any, idx: number) => {
         const standardKeys = Object.keys(getEmptyEntityTemplate()).filter(k => k !== 'idPhotos' && k !== 'ghanaCardPhotoUrl');
         return (
           <div key={idx} style={{ background: 'white', border: '1px solid var(--color-neutral-200)', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <strong style={{ fontSize: '13px' }}>{isArray ? `Item #${idx + 1}` : 'Details'}</strong>
                {isArray && (
                   <button type="button" onClick={() => {
                      const arr = [...(editPayload.formData[field] || [])];
                      arr.splice(idx, 1);
                      setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: arr } });
                   }} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Remove</button>
                )}
             </div>
             {field !== 'proprietor' && (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                 {standardKeys.map(k => (
                   <div key={k}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-neutral-500)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>{k.replace(/([A-Z])/g, ' $1')}</label>
                      <input type="text" className="form-input" style={{ fontSize: '12px', padding: '6px' }} value={item[k] || ''} onChange={(e) => updateItem(idx, k, e.target.value)} />
                   </div>
                 ))}
               </div>
             )}
             <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-neutral-100)' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', display: 'block', color: 'var(--color-neutral-600)' }}>UPLOADED ID PHOTOS</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                   {item.ghanaCardPhotoUrl && (
                     <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                        <img src={item.ghanaCardPhotoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--color-neutral-200)' }} />
                        <button type="button" onClick={() => removePhoto(idx, -1, true)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'white', border: '1px solid var(--color-error)', borderRadius: '50%', color: 'var(--color-error)', cursor: 'pointer', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', padding: 0 }}>&times;</button>
                     </div>
                   )}
                   {item.idPhotos?.map((p: string, pIdx: number) => (
                     <div key={pIdx} style={{ position: 'relative', width: '60px', height: '60px' }}>
                        <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--color-neutral-200)' }} />
                        <button type="button" onClick={() => removePhoto(idx, pIdx, false)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'white', border: '1px solid var(--color-error)', borderRadius: '50%', color: 'var(--color-error)', cursor: 'pointer', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', padding: 0 }}>&times;</button>
                     </div>
                   ))}
                   <label style={{ width: '60px', height: '60px', border: '1px dashed var(--color-neutral-300)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--color-neutral-50)' }}>
                      <span style={{ fontSize: '20px', color: 'var(--color-neutral-400)' }}>+</span>
                      <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(idx, e.target.files)} />
                   </label>
                </div>
             </div>
           </div>
         );
       };

       return (
         <div style={{ background: 'var(--color-neutral-50)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-neutral-200)' }}>
           {isArray ? (
              <>
                {(rawVal as any[]).map((item, idx) => renderEntityCard(item, idx))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                   const arr = [...(editPayload.formData[field] || [])];
                   arr.push(getEmptyEntityTemplate());
                   setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: arr } });
                }} style={{ marginTop: '8px' }}>+ Add New</button>
              </>
           ) : (
              renderEntityCard(rawVal, 0)
           )}
         </div>
       );
    }

    return (
       <input 
         type="text" 
         className="form-input" 
         value={editPayload.formData[field] || ''}
         onChange={(e) => setEditPayload({ ...editPayload, formData: { ...editPayload.formData, [field]: e.target.value } })}
       />
    )
  }

  const renderUIDataNode = (obj: JsonValue | undefined, level = 0, path = ''): React.ReactNode => {
    if (!obj) return null
    if (typeof obj !== 'object') return <span style={{ fontWeight: 500 }}>{String(obj)}</span>
    
    const corrections = app?.form_data?.corrections || {}

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(obj).map(([key, val]) => {
          if (key === 'documents' || key === 'corrections' || key === 'paystackReference' || key === 'total_amount' || key === 'delivery_method' || key === 'delivery_address' || key === 'businessType') return null
          
          const currentPath = path ? `${path}.${key}` : key
          const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
          const existingCorrection = corrections[currentPath]
          
          return (
            <div key={key} style={{ 
              background: level === 0 ? 'white' : 'transparent', 
              padding: level === 0 ? '16px' : '0', 
              border: level === 0 ? (existingCorrection ? '1px solid var(--color-error)' : '1px solid var(--color-neutral-200)') : 'none', 
              borderRadius: '8px',
              position: 'relative',
              transition: 'all 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: existingCorrection ? 'var(--color-error)' : 'var(--color-neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {readableKey}
                </div>
                {(!Array.isArray(val) && typeof val !== 'object') && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlagField(currentPath, readableKey);
                    }}
                    style={{ background: 'none', border: 'none', color: existingCorrection ? 'var(--color-error)' : 'var(--color-neutral-200)', cursor: 'pointer', display: 'flex' }}
                    title="Flag for Correction"
                  >
                    <AlertCircle size={14} />
                  </button>
                )}
              </div>
              
              {existingCorrection && (
                <div style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', fontSize: '11px', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid var(--color-error-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ fontWeight: 900 }}>REVISION REQUIRED:</div> {existingCorrection}
                </div>
              )}
              
              {Array.isArray(val) ? (
                val.length === 0 ? <span style={{ color: 'var(--color-neutral-400)', fontSize: '13px', fontStyle: 'italic' }}>Empty</span> : (
                  key === 'idPhotos' ? (
                     <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {val.map((item, i) => (
                           String(item).startsWith('data:image') 
                             ? (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-neutral-200)', width: '240px' }}>
                                   <img src={String(item)} alt={`ID Photo ${i+1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-neutral-100)', cursor: 'zoom-in' }} onClick={() => setLightboxImage(String(item))} />
                                   <a href={String(item)} download={`ID_Photo_${i+1}.png`} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none', padding: '8px', border: '1px solid var(--color-primary-200)', borderRadius: '4px', background: 'var(--color-primary-50)', transition: 'background 0.2s' }}>
                                      Download
                                   </a>
                                </div>
                             )
                             : <span key={i}>{String(item)}</span>
                        ))}
                     </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      {val.map((item, i) => (
                        <div key={i} style={{ padding: '16px', background: 'var(--color-neutral-50)', border: '1px solid var(--color-neutral-200)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary-600)', textTransform: 'uppercase', marginBottom: '12px' }}>Item {i + 1}</div>
                          {typeof item === 'object' ? renderUIDataNode(item, level + 1, `${currentPath}.${i}`) : String(item)}
                        </div>
                      ))}
                    </div>
                  )
                )
              ) : typeof val === 'object' ? (
                <div style={{ marginTop: '8px', padding: '12px', background: 'var(--color-neutral-50)', borderRadius: '8px', border: '1px solid var(--color-neutral-200)' }}>
                  {renderUIDataNode(val, level + 1, currentPath)}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: val === '' ? 'var(--color-neutral-400)' : 'var(--color-neutral-900)', fontWeight: val === '' ? 400 : 500, fontStyle: val === '' ? 'italic' : 'normal' }}>
                  {val === '' ? 'N/A' : (
                    (key === 'ghanaCardPhotoUrl' && String(val).startsWith('data:image')) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-neutral-200)', marginTop: '8px', width: '240px' }}>
                         <img src={String(val)} alt="Ghana Card" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-neutral-100)', cursor: 'zoom-in' }} onClick={() => setLightboxImage(String(val))} />
                         <a href={String(val)} download="Ghana_Card.png" style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none', padding: '8px', border: '1px solid var(--color-primary-200)', borderRadius: '4px', background: 'var(--color-primary-50)', transition: 'background 0.2s' }}>
                            Download
                         </a>
                      </div>
                    ) : String(val)
                  )}
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
    return (
      <div className={styles.overview} style={{ padding: 'var(--space-8)' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Application not found.</h2>
        {error && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--color-error-light)', border: '1px solid var(--color-error)', borderRadius: '8px', fontSize: '14px' }}>
            <strong>System Error:</strong> {error}
          </div>
        )}
        <p style={{ marginTop: '20px', color: 'var(--color-neutral-500)', fontSize: '14px' }}>
          Verify the ID in your URL bar is correct. If you are a Super Admin, double-check your browser session.
        </p>
      </div>
    )
  }

  const fd = (app.form_data || {}) as ApplicationFormData
  const directors = Array.isArray(fd.directors) ? fd.directors : []
  const docs = Array.isArray(fd.documents) ? fd.documents : []
  const history = Array.isArray(app.application_status_history) ? app.application_status_history : []

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

      <div style={{ background: app.assigned_to ? 'var(--color-neutral-50)' : '#fffbeb30', border: app.assigned_to ? '1px solid var(--color-neutral-200)' : '1px solid #f59e0b50', borderLeft: app.assigned_to ? '4px solid var(--color-neutral-300)' : '4px solid #f59e0b', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <User size={20} style={{ color: app.assigned_to ? 'var(--color-neutral-500)' : '#f59e0b' }} />
            <div>
               <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-neutral-500)', letterSpacing: '0.05em' }}>Working Ownership</div>
               <div style={{ fontSize: '15px', fontWeight: 600, color: app.assigned_to ? 'var(--color-neutral-900)' : '#f59e0b', marginTop: '2px' }}>
                  {app.assigned_registrar?.full_name ? `Assigned to ${app.assigned_registrar.full_name}` : 'UNASSIGNED (Awaiting Pickup)'}
               </div>
            </div>
         </div>

         {isSuperAdmin ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
               <select 
                  className="form-input" 
                  style={{ width: '200px', padding: '8px 12px', fontSize: '13px' }}
                  value={app.assigned_to || ''}
                  onChange={(e) => handleAssignAction(e.target.value)}
                  disabled={assigning}
               >
                  <option value="">-- Unassigned --</option>
                  {registrars.map(r => (
                     <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
               </select>
            </div>
         ) : !app.assigned_to ? (
            <button 
               className="btn btn-primary" 
               style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
               onClick={() => {
                 if (currentUser?.id) {
                   void handleAssignAction(currentUser.id)
                 }
               }}
               disabled={assigning || !currentUser}
            >
               {assigning ? 'Claiming...' : 'Pick Up Application'}
            </button>
         ) : app.assigned_to === currentUser?.id ? (
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-light)', padding: '4px 12px', borderRadius: '20px' }}>Your Case</span>
         ) : null}
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

          {directors.length > 0 && (
             <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--color-neutral-200)', padding: 'var(--space-6)' }}>
               <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-neutral-100)' }}>
                 Directors ({directors.length})
               </h3>
               {directors.map((d, idx) => (
                 <div key={idx} style={{ marginBottom: idx < directors.length - 1 ? 'var(--space-4)' : 0, paddingBottom: idx < directors.length - 1 ? 'var(--space-4)' : 0, borderBottom: idx < directors.length - 1 ? '1px dashed var(--color-neutral-200)' : 'none' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                     <div>
                       <div style={{ fontWeight: 600 }}>{d.firstName} {d.surname}</div>
                       <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)' }}>Ghana Card: {d.ghanaCardNumber} | TIN: {d.tinNumber}</div>
                       <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)' }}>{d.email} | {d.phone}</div>
                     </div>
                     {d.ghanaCardPhotoUrl && typeof d.ghanaCardPhotoUrl === 'string' && (
                       <a href={d.ghanaCardPhotoUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', background: 'var(--color-neutral-100)', padding: '4px 8px', borderRadius: '4px', textDecoration: 'none', color: 'var(--color-neutral-700)', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--color-neutral-200)' }}>
                         View ID Photo
                       </a>
                     )}
                   </div>
                 </div>
               ))}
             </div>
          )}

          {isEditingForm ? (
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: 'var(--space-6)', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Edit Application Data</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingForm(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={saveEditedForm} disabled={savingForm}>
                    {savingForm ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <label className="form-label">Business Type</label>
                  <select 
                    className="form-input" 
                    value={editPayload.businessTypeId}
                    onChange={(e) => {
                       const newBType = businessTypes.find(b => b.id === e.target.value)
                       if (newBType && window.confirm('Changing the business type will alter the required fields. Continue?')) {
                          const newRequiredFields = newBType.required_fields || [];
                          const cleanedFormData = { ...editPayload.formData };
                          
                          // Keys that should be preserved across all business types
                          const standardKeys = ['documents', 'corrections', 'delivery_method', 'delivery_address', 'total_amount', 'paystackReference', 'businessType'];
                          
                          // Remove fields that are no longer needed
                          Object.keys(cleanedFormData).forEach(key => {
                             if (!newRequiredFields.includes(key) && !standardKeys.includes(key)) {
                                delete cleanedFormData[key];
                             }
                          });
                          
                          // Initialize any new required fields
                          newRequiredFields.forEach((field: string) => {
                             if (cleanedFormData[field] === undefined) {
                                 const isComplex = ['directors', 'secretary', 'shareholders', 'members'].includes(field);
                                 cleanedFormData[field] = isComplex ? [] : '';
                             }
                          });

                          setEditPayload({ 
                             ...editPayload, 
                             businessTypeId: e.target.value,
                             formData: cleanedFormData
                          });
                       }
                    }}
                  >
                    <option value="" disabled>-- Select Business Type --</option>
                    {businessTypes.map(b => {
                       const orcFee = b.orc_fee || 0;
                       const agentFee = b.agent_fee || 0;
                       const returnsPortion = b.returns_portion || 0;
                       const basePrice = b.base_price || 0;
                       const serviceFee = b.service_fee || 0;
                       const totalPrice = returnsPortion > 0 
                          ? (orcFee + agentFee + returnsPortion) 
                          : (basePrice + serviceFee);
                       return (
                          <option key={b.id} value={b.id}>
                             {b.name} (GH₵ {totalPrice.toLocaleString()})
                          </option>
                       );
                    })}
                  </select>
                </div>

                <div>
                  <label className="form-label">Business Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editPayload.businessName}
                    onChange={(e) => setEditPayload({ ...editPayload, businessName: e.target.value })}
                  />
                </div>

                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid #e2e8f0' }}>
                   <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Form Fields</h4>
                   {(() => {
                      const selectedBType = businessTypes.find(b => b.id === editPayload.businessTypeId) || app.business_types;
                      let fields = selectedBType?.required_fields || [];
                      
                      if (selectedBType?.name?.toLowerCase().includes('sole proprietorship') && !fields.includes('proprietor')) {
                         fields = [...fields, 'proprietor'];
                      }
                      
                      return (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {fields.map((field: string) => (
                               <div key={field}>
                                  <label className="form-label" style={{ textTransform: 'capitalize' }}>
                                     {field.replace(/_/g, ' ')}
                                  </label>
                                  {renderEditField(field)}
                               </div>
                            ))}
                         </div>
                      )
                   })()}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--color-neutral-0)', borderRadius: '12px', padding: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', padding: 'var(--space-6) var(--space-6) 0 var(--space-6)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                  Comprehensive Form Payload
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isSuperAdmin && (
                    <button className="btn btn-secondary btn-sm" onClick={startEditing} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Edit2 size={14} /> Edit Data
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = `mailto:${(app.profiles as any)?.email}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Email User
                  </button>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => setIsSmsModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    SMS Applicant
                  </button>
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
          )}
          
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
                docs.map((d, idx) => (
                  <div key={idx} style={{ padding: '12px', background: 'white', border: '1px solid var(--color-neutral-200)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <div style={{ background: 'var(--color-neutral-50)', padding: '8px', borderRadius: '8px' }}>
                            <FileText size={16} style={{ color: 'var(--color-primary-600)' }} />
                         </div>
                         <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{d.title}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-neutral-400)' }}>{new Date(d.uploadedAt).toLocaleString()}</div>
                         </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {d.verification_status === 'approved' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '11px', fontWeight: 600, background: '#10b98115', padding: '4px 8px', borderRadius: '6px' }}>
                            <CheckCircle size={14} /> VERIFIED
                          </div>
                        ) : d.verification_status === 'rejected' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '11px', fontWeight: 600, background: '#ef444415', padding: '4px 8px', borderRadius: '6px' }}>
                            <XCircle size={14} /> REJECTED
                          </div>
                        ) : (
                          <>
                             <button 
                               onClick={() => handleVerify(d.url, 'approved')}
                               style={{ border: 'none', background: '#10b98115', color: '#10b981', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                               title="Approve"
                             >
                                <CheckCircle size={16} />
                             </button>
                             <button 
                               onClick={() => handleVerify(d.url, 'rejected')}
                               style={{ border: 'none', background: '#ef444415', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                               title="Reject"
                             >
                                <XCircle size={16} />
                             </button>
                          </>
                        )}
                        <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', padding: '6px', borderRadius: '6px', background: 'var(--color-neutral-100)', color: 'var(--color-neutral-600)' }}>
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                    {d.verification_status === 'rejected' && d.admin_notes && (
                      <div style={{ fontSize: '12px', color: '#ef4444', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', marginTop: '8px', borderLeft: '3px solid #ef4444' }}>
                         <strong>Reason:</strong> {d.admin_notes}
                      </div>
                    )}
                  </div>
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
              Revenue & Disbursement Split
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-neutral-500)' }}>
                <span>ORC Government:</span>
                <span style={{ fontWeight: 600 }}>GH₵ {app.business_types?.orc_fee || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-neutral-500)' }}>
                <span>Registrar Agent:</span>
                <span style={{ fontWeight: 600 }}>GH₵ {app.business_types?.agent_fee || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-neutral-500)' }}>
                <span>Returns (GD/Aff):</span>
                <span style={{ fontWeight: 600 }}>GH₵ {app.business_types?.returns_portion || 0}</span>
              </div>
              
              <div style={{ margin: '8px 0', borderTop: '1px solid var(--color-neutral-100)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800 }}>Total Paid:</span>
                <span style={{ fontWeight: 800, color: 'var(--color-primary-600)' }}>GH₵ {(Number(app.total_amount) || 0).toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: 'var(--color-neutral-500)' }}>Status:</span>
                <span style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: app.payment_status === 'paid' ? 'var(--color-success)' : 'var(--color-neutral-400)' }}>
                  {app.payment_status || 'Unpaid'}
                </span>
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
              {history.length > 0 ? (
                history.map((hist, i) => (
                  <div key={hist.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                    {/* Timeline Line */}
                    {i < history.length - 1 && (
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

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}
          onClick={() => setLightboxImage(null)}
        >
          <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', backgroundClip: 'padding-box', backgroundColor: 'rgba(255,255,255,0.1)' }} onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}>
             <X size={32} />
          </button>
          <img src={lightboxImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* SMS Modal */}
      <Modal isOpen={isSmsModalOpen} onClose={() => setIsSmsModalOpen(false)} title="Send SMS to Applicant">
        <form onSubmit={handleSendCustomSms}>
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SMS Message</span>
              <span style={{ fontSize: '11px', color: smsMessage.length > 160 ? 'var(--color-error)' : 'var(--color-neutral-400)' }}>
                {smsMessage.length}/160 chars
              </span>
            </label>
            <textarea
              className="form-input"
              style={{ minHeight: '100px', fontSize: '14px', resize: 'vertical' }}
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="e.g. Please log in to complete your signature requirements..."
              required
            />
            <p style={{ fontSize: '11px', color: 'var(--color-neutral-500)', marginTop: '8px' }}>
              This will be sent directly to the applicant's phone number as "GrayDocket".
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsSmsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={sendingSms || !smsMessage.trim()}>
              {sendingSms ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
} 
