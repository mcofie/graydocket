'use client'

import { useState, useEffect } from 'react'
import { 
  getAllBusinessTypes, 
  updateBusinessType,
  deleteBusinessType,
  getServices,
  updateService,
  createService,
  deleteService,
  getSystemFee,
  setSystemFee
} from '@/lib/actions'
import Modal from '../components/Modal'
import styles from '../../dashboard/overview.module.css'
import Skeleton from '@/components/ui/Skeleton'

type BusinessTypeRow = {
  id: string
  name: string
  description?: string | null
  base_price?: number | null
  service_fee?: number | null
  orc_fee?: number | null
  agent_fee?: number | null
  returns_portion?: number | null
  affiliate_share_percentage?: number | null
  processing_timeline?: string | null
  is_active: boolean
}

type ServiceRow = {
  id: string
  name: string
  description?: string | null
  category?: string | null
  price?: number | null
  is_active?: boolean
}

type PricingFormState = {
  name: string
  price: string
  serviceFee: string
  orc_fee: string
  agent_fee: string
  returns_portion: string
  affiliate_share: string
  timeline: string
  description: string
  category: string
}

export default function AdminPricingPage() {
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [courierFee, setCourierFee] = useState<number>(50)
  const [isEditingCourier, setIsEditingCourier] = useState(false)
  const [courierFormValue, setCourierFormValue] = useState('50')
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'edit_business' | 'edit_service' | 'create_service'>('edit_business')
  const [editingItem, setEditingItem] = useState<BusinessTypeRow | ServiceRow | null>(null)
  
  // Generic form data that can handle both entity types
  const [formData, setFormData] = useState<PricingFormState>({ 
    name: '', 
    price: '0', 
    serviceFee: '0', // legacy/internal - we will use breakdowns now
    orc_fee: '0',
    agent_fee: '0',
    returns_portion: '0',
    affiliate_share: '40', // default share
    timeline: '',    // only used for business types
    description: '',
    category: '' // only used for services
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    const [bizRes, svcRes, fee] = await Promise.all([
      getAllBusinessTypes(),
      getServices(),
      getSystemFee('Courier Delivery')
    ])
    
    // Deduplicate by name to prevent UI clutter if database has redundant rows
    const uniqueBizTypes = ((bizRes.business_types as BusinessTypeRow[] | undefined) || []).filter((v, i, a) => 
      a.findIndex(t => t.name === v.name) === i
    )

    setBusinessTypes(uniqueBizTypes)
    setServices((svcRes.services as ServiceRow[] | undefined) || [])
    setCourierFee(fee)
    setCourierFormValue(fee.toString())
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [])

  // ---- Modal Handlers ----
  const openEditBusinessModal = (type: BusinessTypeRow) => {
    setModalMode('edit_business')
    setEditingItem(type)
    setFormData({ 
      name: type.name, 
      price: type.base_price?.toString() || '0', 
      serviceFee: type.service_fee?.toString() || '0',
      orc_fee: type.orc_fee?.toString() || '0',
      agent_fee: type.agent_fee?.toString() || '0',
      returns_portion: type.returns_portion?.toString() || '0',
      affiliate_share: type.affiliate_share_percentage?.toString() || '40',
      timeline: type.processing_timeline || '',
      description: type.description || '',
      category: ''
    })
    setIsModalOpen(true)
  }

  const openEditServiceModal = (service: ServiceRow) => {
    setModalMode('edit_service')
    setEditingItem(service)
    setFormData({ 
      name: service.name, 
      price: service.price?.toString() || '0', 
      serviceFee: '0',
      orc_fee: '0',
      agent_fee: '0',
      returns_portion: '0',
      affiliate_share: '0',
      timeline: '',
      description: service.description || '',
      category: service.category || ''
    })
    setIsModalOpen(true)
  }

  const openCreateServiceModal = () => {
    setModalMode('create_service')
    setEditingItem(null)
    setFormData({ 
      name: '', 
      price: '0', 
      serviceFee: '0', 
      orc_fee: '0',
      agent_fee: '0',
      returns_portion: '0',
      affiliate_share: '0',
      timeline: '', 
      description: '', 
      category: 'business_addon' 
    })
    setIsModalOpen(true)
  }

  // ---- Submit Handlers ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (modalMode === 'edit_business') {
      if (!editingItem) {
        setIsSubmitting(false)
        return
      }

      const orcFee = parseFloat(formData.orc_fee) || 0
      const agentFee = parseFloat(formData.agent_fee) || 0
      const returnsPortion = parseFloat(formData.returns_portion) || 0
      const affShare = parseFloat(formData.affiliate_share) || 0

      const { error } = await updateBusinessType(editingItem.id, {
        name: formData.name,
        base_price: orcFee, // Keeping base_price for backward compat (Government portion)
        service_fee: returnsPortion + agentFee, // Total beyond government fee
        orc_fee: orcFee,
        agent_fee: agentFee,
        returns_portion: returnsPortion,
        affiliate_share_percentage: affShare,
        processing_timeline: formData.timeline,
        description: formData.description
      })
      if (error) alert(error)
    } 
    else if (modalMode === 'edit_service') {
      if (!editingItem) {
        setIsSubmitting(false)
        return
      }

      const { error } = await updateService(editingItem.id, {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        category: formData.category || 'addon'
      })
      if (error) alert(error)
    }
    else if (modalMode === 'create_service') {
      const { error } = await createService({
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        category: formData.category || 'addon'
      })
      if (error) alert(error)
    }

    setIsSubmitting(false)
    setIsModalOpen(false)
    fetchData()
  }

  // ---- Quick Toggles & Deletes ----
  const toggleBusinessActive = async (id: string, current: boolean) => {
    const { error } = await updateBusinessType(id, { is_active: !current })
    if (error) alert(error)
    else setBusinessTypes(businessTypes.map(p => p.id === id ? { ...p, is_active: !current } : p))
  }

  const handleDeleteBusinessType = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete the business category: ${name}? This action cannot be undone.`)) return
    const { error } = await deleteBusinessType(id)
    if (error) alert(error)
    else {
      setBusinessTypes(businessTypes.filter(b => b.id !== id))
    }
  }

  const handleSaveCourierFee = async () => {
    setIsSubmitting(true)
    const val = parseFloat(courierFormValue)
    const { error } = await setSystemFee('Courier Delivery', val)
    if (error) {
      alert(error)
    } else {
      setCourierFee(val)
      setIsEditingCourier(false)
    }
    setIsSubmitting(false)
  }

  const handleDeleteService = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the service: ${name}?`)) return
    const { error } = await deleteService(id)
    if (error) alert(error)
    else setServices(services.filter(s => s.id !== id))
  }

  if (loading) {
    return (
      <div className={styles.overview}>
        <div className={styles.sectionHeader}><Skeleton width="180px" height="28px" /></div>
        <div className={styles.applicationsTable}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-6)', borderBottom: '1px solid var(--color-neutral-100)' }}>
              <Skeleton width="150px" height="20px" />
              <Skeleton width="100px" height="20px" />
              <Skeleton width="80px" height="20px" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overview}>
      
      {/* --- Business Types Section --- */}
      <div className={styles.sectionHeader} style={{ marginTop: 'var(--space-4)' }}>
        <h2 className={styles.sectionTitle}>Main Business Registration Pricing</h2>
        <p style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
          Configure the base mandatory fees for company incorporation.
        </p>
      </div>

      <div className={styles.applicationsTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Business Type</th>
              <th style={{ minWidth: '220px' }}>Institutional Split (GH₵)</th>
              <th>Target Timeline</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {businessTypes.map((item) => {
              const basePrice = item.base_price || 0
              const serviceFee = item.service_fee || 0
              const orcFee = item.orc_fee || 0
              const agentFee = item.agent_fee || 0
              const returnsPortion = item.returns_portion || 0

              return (
              <tr key={item.id}>
                <td style={{ verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)', marginTop: '2px' }}>
                    {item.description?.substring(0, 80)}{(item.description?.length || 0) > 80 ? '...' : ''}
                  </div>
                </td>
                <td style={{ verticalAlign: 'top' }}>
                  {returnsPortion > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: 'var(--color-neutral-500)' }}>ORC Gov:</span>
                        <span style={{ fontWeight: 600 }}>GH₵ {orcFee.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: 'var(--color-neutral-500)' }}>Agent:</span>
                        <span style={{ fontWeight: 600 }}>GH₵ {agentFee.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: 'var(--color-neutral-500)' }}>Returns (GD/Aff):</span>
                        <span style={{ fontWeight: 600 }}>GH₵ {returnsPortion.toLocaleString()}</span>
                      </div>
                      <div style={{ marginTop: '4px', borderTop: '1px solid var(--color-neutral-100)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, color: 'var(--color-primary-600)' }}>
                        <span>TOTAL PRICE:</span>
                        <span>GH₵ {(orcFee + agentFee + returnsPortion).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '12px', color: 'var(--color-neutral-600)' }}>Base: GH₵ {basePrice.toLocaleString()}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-primary-600)', fontWeight: 600 }}>GrayDocket Fee: GH₵ {serviceFee.toLocaleString()}</div>
                      <div style={{ marginTop: '4px', borderTop: '1px solid var(--color-neutral-100)', paddingTop: '4px', fontWeight: 'bold' }}>
                        Total: GH₵ {(basePrice + serviceFee).toLocaleString()}
                      </div>
                    </>
                  )}
                </td>
                <td style={{ verticalAlign: 'top' }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    color: 'var(--color-primary-700)',
                    background: 'var(--color-primary-50)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    display: 'inline-block'
                  }}>
                    {item.processing_timeline || 'Not Set'}
                  </div>
                </td>
                <td>
                  <button 
                    onClick={() => toggleBusinessActive(item.id, item.is_active)}
                    className={`badge ${item.is_active ? 'badge-success' : 'badge-error'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {item.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => openEditBusinessModal(item)}
                      className="btn btn-ghost btn-sm"
                    >
                      Edit Details
                    </button>
                    <button 
                      onClick={() => handleDeleteBusinessType(item.id, item.name)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--color-error)' }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* --- Logistics & Delivery --- */}
      <div className={styles.sectionHeader} style={{ marginTop: 'var(--space-8)' }}>
        <div>
          <h2 className={styles.sectionTitle}>Logistics & Delivery</h2>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            Set the flat rate courier delivery fee applied at checkout.
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--color-neutral-0)', border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-neutral-900)' }}>Courier Document Delivery</div>
          <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)' }}>Hard-copy certificates, constitutions, and stamps shipped directly to client address.</div>
        </div>
        <div>
          {!isEditingCourier ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
                GH₵ {courierFee.toLocaleString()}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingCourier(true)}>Edit</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-neutral-400)' }}>GH₵</span>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '100px', padding: '6px 12px' }}
                value={courierFormValue} 
                onChange={e => setCourierFormValue(e.target.value)} 
              />
              <button className="btn btn-primary btn-sm" disabled={isSubmitting} onClick={handleSaveCourierFee}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-ghost btn-sm" disabled={isSubmitting} onClick={() => { setIsEditingCourier(false); setCourierFormValue(courierFee.toString()) }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>


      {/* --- Add-on Services Section --- */}
      <div className={styles.sectionHeader} style={{ marginTop: 'var(--space-8)' }}>
        <div>
          <h2 className={styles.sectionTitle}>Add-on Services & Value-Adds</h2>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            Manage pricing for optional services like domains, websites, and bank accounts.
          </p>
        </div>
        <button onClick={openCreateServiceModal} className="btn btn-secondary btn-sm">
          + Add New Service
        </button>
      </div>

      <div className={styles.applicationsTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Price (GH₵)</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => {
              const svcPrice = svc.price || 0

              return (
              <tr key={svc.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-neutral-900)' }}>{svc.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                    {svc.description?.substring(0, 60)}{(svc.description?.length || 0) > 60 ? '...' : ''}
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
                  {svcPrice === 0 ? 'FREE' : svcPrice.toLocaleString()}
                </td>
                <td>
                  <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                    {svc.category || 'Add-on'}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => openEditServiceModal(svc)}
                    className="btn btn-ghost btn-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteService(svc.id, svc.name)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-error)' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )})}
            {services.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  No services configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Universal Modal --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={
          modalMode === 'edit_business' ? 'Edit Business Configuration' :
          modalMode === 'edit_service' ? 'Edit Add-on Service' : 'Create New Service'
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          
          <div className="form-group">
            <label className="form-label">{modalMode === 'edit_business' ? 'Record Name' : 'Service Name'}</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {modalMode !== 'edit_business' && (
            <div className="form-group">
              <label className="form-label">Service Price (GH₵)</label>
              <input 
                type="number" 
                className="form-input" 
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
          )}

          {modalMode === 'edit_business' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f9fafb', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', width: '100%', boxSizing: 'border-box' }}>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>ORC Government Fee (GH₵)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ width: '100%' }}
                    value={formData.orc_fee}
                    onChange={(e) => setFormData({ ...formData, orc_fee: e.target.value })}
                    required
                  />
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                    {((parseFloat(formData.orc_fee) / (parseFloat(formData.orc_fee) + parseFloat(formData.agent_fee) + parseFloat(formData.returns_portion) || 1)) * 100).toFixed(1)}% of total
                  </div>
                </div>

                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Registrar Agent Fee (GH₵)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ width: '100%' }}
                    value={formData.agent_fee}
                    onChange={(e) => setFormData({ ...formData, agent_fee: e.target.value })}
                    required
                  />
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                    {((parseFloat(formData.agent_fee) / (parseFloat(formData.orc_fee) + parseFloat(formData.agent_fee) + parseFloat(formData.returns_portion) || 1)) * 100).toFixed(1)}% of total
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, margin: 0 }}>Returns Portion (GD + Affiliate) (GH₵)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '2px 8px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                       <span style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280' }}>Affiliate Cut:</span>
                       <input 
                         type="number" 
                         className="form-input" 
                         style={{ width: '45px', padding: '2px 4px', fontSize: '11px', textAlign: 'center', border: 'none', background: 'transparent' }}
                         value={formData.affiliate_share}
                         onChange={(e) => setFormData({ ...formData, affiliate_share: e.target.value })}
                       />
                       <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>%</span>
                    </div>
                  </div>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ width: '100%' }}
                    value={formData.returns_portion}
                    onChange={(e) => setFormData({ ...formData, returns_portion: e.target.value })}
                    required
                  />
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    background: 'white', 
                    borderRadius: '10px', 
                    border: '1px dashed #d1d5db',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ fontSize: '11px' }}>
                      <span style={{ color: '#6b7280' }}>GD ({100 - parseFloat(formData.affiliate_share)}%):</span> <strong style={{ color: 'var(--color-primary-600)' }}>GH₵ {(parseFloat(formData.returns_portion) * (1 - (parseFloat(formData.affiliate_share)/100))).toFixed(2)}</strong>
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      <span style={{ color: '#6b7280' }}>Affiliate ({formData.affiliate_share}%):</span> <strong style={{ color: '#059669' }}>GH₵ {(parseFloat(formData.returns_portion) * (parseFloat(formData.affiliate_share)/100)).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '16px', background: 'var(--color-primary-50)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '13px' }}>TOTAL CLIENT PRICE</span>
                <span style={{ fontWeight: 900, fontSize: '18px', color: 'var(--color-primary-600)' }}>
                  GH₵ {(parseFloat(formData.orc_fee) + parseFloat(formData.agent_fee) + parseFloat(formData.returns_portion) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Target Timeline</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  placeholder="e.g. 5-7 working days"
                />
              </div>
            </>
          )}

          {(modalMode === 'edit_service' || modalMode === 'create_service') && (
            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="form-input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="business_addon">Business Add-on</option>
                <option value="digital_branding">Digital & Branding</option>
                <option value="compliance">Compliance & Tax</option>
                <option value="fintech">Fintech Integration</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Client-facing Description</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '80px' }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          </div>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
          </div>
          
        </form>
      </Modal>
    </div>
  )
}
