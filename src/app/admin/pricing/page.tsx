'use client'

import { useState, useEffect } from 'react'
import { getAllBusinessTypes, updateBusinessType } from '@/lib/actions'
import Modal from '../components/Modal'
import styles from '../../dashboard/overview.module.css'
import Skeleton from '@/components/ui/Skeleton'

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', base_price: '0', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchPricing()
  }, [])

  const fetchPricing = async () => {
    const res = await getAllBusinessTypes()
    setPricing(res.business_types)
    setLoading(false)
  }

  const openEditModal = (type: any) => {
    setEditingType(type)
    setFormData({ name: type.name, base_price: type.base_price.toString(), description: type.description || '' })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const { error } = await updateBusinessType(editingType.id, {
      name: formData.name,
      base_price: parseFloat(formData.base_price),
      description: formData.description
    })

    if (error) {
      alert(error)
    } else {
      setPricing(pricing.map(p => p.id === editingType.id ? { 
        ...p, 
        name: formData.name, 
        base_price: parseFloat(formData.base_price),
        description: formData.description 
      } : p))
    }

    setIsSubmitting(false)
    setIsModalOpen(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await updateBusinessType(id, { is_active: !current })
    if (error) {
      alert(error)
    } else {
      setPricing(pricing.map(p => p.id === id ? { ...p, is_active: !current } : p))
    }
  }

  if (loading) {
    return (
      <div className={styles.overview}>
        <div className={styles.sectionHeader}>
          <Skeleton width="180px" height="28px" />
        </div>
        <div className={styles.applicationsTable}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-6)', borderBottom: '1px solid var(--color-neutral-100)' }}>
              <Skeleton width="150px" height="20px" />
              <Skeleton width="100px" height="20px" />
              <Skeleton width="80px" height="20px" />
              <Skeleton width="120px" height="20px" />
              <Skeleton width="100px" height="20px" style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const formatDate = (date: any) => {
    if (!date) return 'Never'
    const d = new Date(date)
    return isNaN(d.getTime()) ? 'Never' : d.toLocaleDateString()
  }

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Pricing Management</h2>
      </div>

      <div className={styles.applicationsTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Business Type</th>
              <th>Base Fee (GH₵)</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td>{item.base_price.toLocaleString()}</td>
                <td>
                  <button 
                    onClick={() => toggleActive(item.id, item.is_active)}
                    className={`badge ${item.is_active ? 'badge-success' : 'badge-error'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {item.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                  {formatDate(item.updated_at || item.created_at)}
                </td>
                <td>
                  <button 
                    onClick={() => openEditModal(item)}
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Edit Business Type & Pricing"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Type Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Price (GH₵)</label>
            <input 
              type="number" 
              className="form-input" 
              value={formData.base_price}
              onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '80px' }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? 'Saving...' : 'Update Configuration'}
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
