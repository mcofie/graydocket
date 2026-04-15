'use client'

import { useState, useEffect } from 'react'
import { getAdminUsers, markUserAsAffiliate, createAdminUser, deleteAdminUser, updateAdminUserProfile } from '@/lib/actions'
import styles from '../../dashboard/overview.module.css'
import { Plus, RefreshCw, AlertCircle, Edit2, Trash2, UserPlus, Mail, Smartphone, Shield } from 'lucide-react'
import Modal from '../components/Modal'

type UserRole = 'user' | 'admin' | 'registrar' | 'bank_manager' | 'service_manager'

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: UserRole
  is_affiliate: boolean
  affiliate_code: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'registrar' as UserRole
  })

  async function fetchUsers() {
    setLoading(true)
    setErrorMsg(null)
    const res = await getAdminUsers()
    if (res.error) {
      setErrorMsg(res.error)
      setUsers([])
    } else {
      setUsers(res.users)
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    
    if (editingUser) {
      // HANDLE EDITING
      const { error } = await updateAdminUserProfile(editingUser.id, {
        full_name: newUser.full_name,
        phone: newUser.phone,
        role: newUser.role
      })
      if (error) {
        alert(error)
      } else {
        alert(`User profile updated correctly.`)
        setIsModalOpen(false)
        setEditingUser(null)
        setNewUser({ email: '', full_name: '', phone: '', role: 'registrar' })
        fetchUsers()
      }
    } else {
      // HANDLE CREATION
      const { error } = await createAdminUser(newUser)
      if (error) {
        alert(error)
      } else {
        alert('User created successfully. They can sign in using the phone OTP flow.')
        setIsModalOpen(false)
        setNewUser({ email: '', full_name: '', phone: '', role: 'registrar' })
        fetchUsers()
      }
    }
    setCreating(false)
  }

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`CAUTION: Delete account for ${email}? This action is permanent and will remove all auth records.`)) return
    
    const { error } = await deleteAdminUser(id)
    if (error) alert(error)
    else fetchUsers()
  }

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user)
    setNewUser({
      email: user.email || '',
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'registrar'
    })
    setIsModalOpen(true)
  }

  const handleToggleAffiliate = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? 'remove from' : 'add to'
    if (!confirm(`Are you sure you want to ${action} the affiliate program?`)) return

    const { error } = await markUserAsAffiliate(id, !currentStatus)
    if (error) {
      alert(error)
    } else {
      setUsers(users.map(u => u.id === id ? { ...u, is_affiliate: !currentStatus } : u))
    }
  }

  if (loading) {
    return <div className={styles.overview}>Loading users...</div>
  }

  return (
    <div className={styles.overview}>
      <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            User Management
            <button 
              onClick={fetchUsers} 
              disabled={loading}
              style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: loading ? 0.3 : 0.6 }}
              title="Refresh List"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)', marginTop: '2px' }}>
            Manage platform access for partners, agents, and administrators.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <Plus size={18} />
          Add Partner
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: 'var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: '#991b1b' }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{errorMsg}</span>
        </div>
      )}

      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👥</div>
          <h3>No users yet</h3>
          <p>Registered users will appear here.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--color-neutral-50)', borderBottom: '1px solid var(--color-neutral-200)' }}>
              <tr>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>NAME</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>EMAIL</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>ROLE</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>PARTNER</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>PHONE</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>JOINED</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>OPERATIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{user.full_name || 'Anonymous'}</td>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>{user.email || '—'}</td>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <div className="badge badge-ghost" style={{ fontSize: '10px', textTransform: 'uppercase' }}>{user.role}</div>
                  </td>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <button 
                      onClick={() => handleToggleAffiliate(user.id, user.is_affiliate)}
                      className={`badge ${user.is_affiliate ? 'badge-success' : 'badge-ghost'}`}
                      style={{ cursor: 'pointer', border: 'none', fontSize: '10px' }}
                    >
                       {user.is_affiliate ? `Active (${user.affiliate_code})` : 'Promote'}
                    </button>
                  </td>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>{user.phone || '—'}</td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => openEditModal(user)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-400)' }}
                        title="Edit Profile"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE USER MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          if (!creating) {
            setIsModalOpen(false)
            setEditingUser(null)
          }
        }} 
        title={editingUser ? "Configure Partner Access" : "Add Project Partner"}
      >
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', padding: 'var(--space-2) 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-neutral-500)', textTransform: 'uppercase' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <UserPlus size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
              <input 
                required
                type="text" 
                placeholder="John Doe"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid var(--color-neutral-200)', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-neutral-500)', textTransform: 'uppercase' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
              <input 
                required
                type="email" 
                placeholder="partner@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid var(--color-neutral-200)', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-neutral-500)', textTransform: 'uppercase' }}>Contact Number</label>
            <div style={{ position: 'relative' }}>
              <Smartphone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
              <input 
                required
                type="tel" 
                placeholder="+233..."
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid var(--color-neutral-200)', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-neutral-500)', textTransform: 'uppercase' }}>Assign Role</label>
            <div style={{ position: 'relative' }}>
              <Shield size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
              <select 
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid var(--color-neutral-200)', fontSize: '14px', appearance: 'none', background: 'white' }}
              >
                <option value="registrar">REGISTRAR (Agent)</option>
                <option value="bank_manager">BANK MANAGER</option>
                <option value="service_manager">SERVICE MANAGER</option>
                <option value="admin">CO-ADMINISTRATOR</option>
                <option value="user">DEFAULT USER</option>
              </select>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>
              * Role determines which dashboard sections the user can access.
            </p>
          </div>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <button 
              type="button"
              onClick={() => {
                setIsModalOpen(false)
                setEditingUser(null)
              }}
              className="btn btn-ghost"
              style={{ flex: 1 }}
              disabled={creating}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
              disabled={creating}
            >
              {creating ? 'Synchronizing...' : (editingUser ? 'Save Updates' : 'Activate Account')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
