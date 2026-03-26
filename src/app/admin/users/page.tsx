'use client'

import { useState, useEffect } from 'react'
import { getAdminUsers, updateUserRole } from '@/lib/actions'
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

  const handleRoleChange = async (id: string, newRole: 'user' | 'admin') => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return

    const { error } = await updateUserRole(id, newRole)
    if (error) {
      alert(error)
    } else {
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u))
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
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'user' | 'admin')}
                      style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        background: user.role === 'admin' ? '#ef444415' : '#3b82f615', 
                        color: user.role === 'admin' ? '#ef4444' : '#3b82f6',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="user">USER</option>
                      <option value="admin">ADMIN</option>
                    </select>
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
