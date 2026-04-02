'use client'

import { useState, useEffect } from 'react'
import { getAdminUsers, updateUserRole, markUserAsAffiliate } from '@/lib/actions'
import styles from '../../dashboard/overview.module.css'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const res = await getAdminUsers()
    setUsers(res.users)
    setLoading(false)
  }

  const handleRoleChange = async (id: string, newRole: any) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase().replace('_', ' ')}?`)) return

    const { error } = await updateUserRole(id, newRole)
    if (error) {
      alert(error)
    } else {
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u))
    }
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
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>User Management</h2>
      </div>

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
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{user.full_name || 'Anonymous'}</td>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>{user.email || '—'}</td>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <select 
                      value={user.role || 'user'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        background: user.role !== 'user' ? '#3b82f615' : '#6b728015', 
                        color: user.role !== 'user' ? '#3b82f6' : '#6b7280',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="user">DEFAULT USER</option>
                      <option value="admin">SUPER ADMIN</option>
                      <option value="registrar">REGISTRAR (Apps)</option>
                      <option value="bank_manager">BANK MANAGER</option>
                      <option value="service_manager">SERVICE MANAGER</option>
                    </select>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
