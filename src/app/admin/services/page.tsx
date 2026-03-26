'use client'

import { useState, useEffect } from 'react'
import { getServices, updateService, createService, deleteService } from '@/lib/actions'
import Modal from '../components/Modal'
import styles from '../../dashboard/overview.module.css'

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', category: 'Value-Added', price: '0' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    const res = await getServices()
    setServices(res.services)
    setLoading(false)
  }

  const openCreateModal = () => {
    setEditingService(null)
    setFormData({ name: '', category: 'Value-Added', price: '0' })
    setIsModalOpen(true)
  }

  const openEditModal = (service: any) => {
    setEditingService(service)
    setFormData({ name: service.name, category: service.category || 'General', price: service.price.toString() })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = { 
      ...formData, 
      price: parseFloat(formData.price || '0') 
    }

    if (editingService) {
      const { error } = await updateService(editingService.id, payload)
      if (error) alert(error)
    } else {
      const { error } = await createService({ ...payload, is_active: true })
      if (error) alert(error)
    }

    setIsSubmitting(false)
    setIsModalOpen(false)
    fetchServices()
  }

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await updateService(id, { is_active: !current })
    if (error) {
      alert(error)
    } else {
      setServices(services.map(s => s.id === id ? { ...s, is_active: !current } : s))
    }
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to remove this service?')) return
    const { error } = await deleteService(id)
    if (error) {
      alert(error)
    } else {
      setServices(services.filter(s => s.id !== id))
    }
  }

  if (loading) {
    return <div className={styles.overview}>Loading services...</div>
  }

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Service Configuration</h2>
        <button onClick={openCreateModal} className="btn btn-primary btn-sm">+ Add Service</button>
      </div>

      <div className={styles.applicationsTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Category</th>
              <th>Price (GH₵)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td style={{ fontWeight: 600 }}>{service.name}</td>
                <td>
                  <span className="badge badge-neutral">{service.category}</span>
                </td>
                <td>{service.price === 0 ? 'Free' : service.price.toLocaleString()}</td>
                <td>
                  <button 
                    onClick={() => toggleActive(service.id, service.is_active)}
                    className={`badge ${service.is_active ? 'badge-success' : 'badge-error'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {service.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => openEditModal(service)}
                      className="btn btn-ghost btn-sm"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteService(service.id)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--color-error)' }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingService ? 'Edit Service' : 'Add New Service'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Service Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Tax Registration"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select 
              className="form-input" 
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Registration">Registration</option>
              <option value="Compliance">Compliance</option>
              <option value="Value-Added">Value-Added</option>
              <option value="Banking">Banking</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Price (GH₵)</label>
            <input 
              type="number" 
              className="form-input" 
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
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
