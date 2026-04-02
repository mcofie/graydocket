'use client'

import { useState, useEffect } from 'react'
import { 
  getAllBusinessTypes, 
  updateBusinessType,
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

export default function AdminPricingPage() {
  const [businessTypes, setBusinessTypes] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [courierFee, setCourierFee] = useState<number>(50)
  const [isEditingCourier, setIsEditingCourier] = useState(false)
  const [courierFormValue, setCourierFormValue] = useState('50')
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'edit_business' | 'edit_service' | 'create_service'>('edit_business')
  const [editingItem, setEditingItem] = useState<any>(null)
  
  // Generic form data that can handle both entity types
  const [formData, setFormData] = useState({ 
    name: '', 
    price: '0', 
    serviceFee: '0', // only used for business types
    description: '',
    category: '' // only used for services
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [bizRes, svcRes, fee] = await Promise.all([
      getAllBusinessTypes(),
      getServices(),
      getSystemFee('Courier Delivery')
    ])
    setBusinessTypes(bizRes.business_types || [])
    setServices(svcRes.services || [])
    setCourierFee(fee)
    setCourierFormValue(fee.toString())
    setLoading(false)
  }

  // ---- Modal Handlers ----
  const openEditBusinessModal = (type: any) => {
    setModalMode('edit_business')
    setEditingItem(type)
    setFormData({ 
      name: type.name, 
      price: type.base_price?.toString() || '0', 
      serviceFee: type.service_fee?.toString() || '0',
      description: type.description || '',
      category: ''
    })
    setIsModalOpen(true)
  }

  const openEditServiceModal = (service: any) => {
    setModalMode('edit_service')
    setEditingItem(service)
    setFormData({ 
      name: service.name, 
      price: service.price?.toString() || '0', 
      serviceFee: '0',
      description: service.description || '',
      category: service.category || ''
    })
    setIsModalOpen(true)
  }

  const openCreateServiceModal = () => {
    setModalMode('create_service')
    setEditingItem(null)
    setFormData({ name: '', price: '0', serviceFee: '0', description: '', category: 'business_addon' })
    setIsModalOpen(true)
  }

  // ---- Submit Handlers ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (modalMode === 'edit_business') {
      const { error } = await updateBusinessType(editingItem.id, {
        name: formData.name,
        base_price: parseFloat(formData.price),
        service_fee: parseFloat(formData.serviceFee),
        description: formData.description
      })
      if (error) alert(error)
    } 
    else if (modalMode === 'edit_service') {
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
              <th>Base Fee (GH₵)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {businessTypes.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-neutral-900)' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                    {item.description?.substring(0, 60)}{item.description?.length > 60 ? '...' : ''}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '12px', color: 'var(--color-neutral-600)' }}>Base: GH₵ {item.base_price.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-primary-600)', fontWeight: 600 }}>GrayDocket Fee: GH₵ {item.service_fee?.toLocaleString() || 0}</div>
                  <div style={{ marginTop: '4px', borderTop: '1px solid var(--color-neutral-100)', paddingTop: '4px', fontWeight: 'bold' }}>
                    Total: GH₵ {(item.base_price + (item.service_fee || 0)).toLocaleString()}
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
                  <button 
                    onClick={() => openEditBusinessModal(item)}
                    className="btn btn-ghost btn-sm"
                  >
                    Edit Details
                  </button>
                </td>
              </tr>
            ))}
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
            {services.map((svc) => (
              <tr key={svc.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-neutral-900)' }}>{svc.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                    {svc.description?.substring(0, 60)}{svc.description?.length > 60 ? '...' : ''}
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
                  {svc.price === 0 ? 'FREE' : svc.price.toLocaleString()}
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
            ))}
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

          <div className="form-group">
            <label className="form-label">{modalMode === 'edit_business' ? 'Government Base Fee (GH₵)' : 'Service Price (GH₵)'}</label>
            <input 
              type="number" 
              className="form-input" 
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>

          {modalMode === 'edit_business' && (
            <div className="form-group">
              <label className="form-label">GrayDocket Service Fee / Commission (GH₵)</label>
              <input 
                type="number" 
                className="form-input" 
                value={formData.serviceFee}
                onChange={(e) => setFormData({ ...formData, serviceFee: e.target.value })}
                required
              />
            </div>
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
