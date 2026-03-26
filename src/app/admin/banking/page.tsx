'use client'

import { useState, useEffect } from 'react'
import { getBankingPartners, updateBankingPartner, createBankingPartner, deleteBankingPartner } from '@/lib/actions'
import Modal from '../components/Modal'
import styles from '../../dashboard/overview.module.css'
import Image from 'next/image'

export default function AdminBankingPage() {
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', description: '', logo_url: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchPartners()
  }, [])

  const fetchPartners = async () => {
    const res = await getBankingPartners()
    setPartners(res.partners)
    setLoading(false)
  }

  const openCreateModal = () => {
    setEditingPartner(null)
    setFormData({ name: '', description: '', logo_url: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (partner: any) => {
    setEditingPartner(partner)
    setFormData({ 
      name: partner.name, 
      description: partner.description || '', 
      logo_url: partner.logo_url || '' 
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (editingPartner) {
      const { error } = await updateBankingPartner(editingPartner.id, formData)
      if (error) alert(error)
    } else {
      const { error } = await createBankingPartner({ ...formData, is_active: true })
      if (error) alert(error)
    }

    setIsSubmitting(false)
    setIsModalOpen(false)
    fetchPartners()
  }

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await updateBankingPartner(id, { is_active: !current })
    if (error) {
      alert(error)
    } else {
      setPartners(partners.map(p => p.id === id ? { ...p, is_active: !current } : p))
    }
  }

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Are you sure you want to remove this partner?')) return
    const { error } = await deleteBankingPartner(id)
    if (error) {
      alert(error)
    } else {
      setPartners(partners.filter(p => p.id !== id))
    }
  }

  if (loading) {
    return <div className={styles.overview}>Loading banking partners...</div>
  }

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Banking Partner Management</h2>
        <button onClick={openCreateModal} className="btn btn-primary btn-sm">+ Add Partner</button>
      </div>

      <div className={styles.applicationsTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Logo</th>
              <th>Bank Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner) => (
              <tr key={partner.id}>
                <td>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '8px', 
                    background: 'var(--color-neutral-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {partner.logo_url ? (
                      <img 
                        src={partner.logo_url} 
                        alt={partner.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          (e.target as any).src = 'https://via.placeholder.com/40?text=Bank'
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--color-neutral-400)' }}>Logo</span>
                    )}
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{partner.name}</td>
                <td style={{ color: 'var(--color-neutral-500)', fontSize: '11px' }}>
                  {partner.description || 'No description available.'}
                </td>
                <td>
                  <button 
                    onClick={() => toggleActive(partner.id, partner.is_active)}
                    className={`badge ${partner.is_active ? 'badge-success' : 'badge-error'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {partner.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => openEditModal(partner)}
                      className="btn btn-ghost btn-sm"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteBank(partner.id)}
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
        title={editingPartner ? 'Edit Banking Partner' : 'Add New Partner'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Bank Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Ghana Commercial Bank"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Logo URL</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            {formData.logo_url && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-neutral-500)' }}>Preview:</span>
                <img src={formData.logo_url} alt="Preview" style={{ height: '24px', objectFit: 'contain' }} />
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '100px' }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of requirements/services..."
            />
          </div>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? 'Saving...' : editingPartner ? 'Update Partner' : 'Create Partner'}
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
