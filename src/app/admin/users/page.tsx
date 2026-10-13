'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal, UserPlus } from 'lucide-react'
import Tabs from '@/components/ui/Tabs'
import UserAvatar from '@/components/ui/UserAvatar'
import { createAdminUser, deleteAdminUser, markUserAsAffiliate, updateAdminUserProfile } from '@/lib/actions'
import { getAdminUsersPage, type AdminUserRow } from '@/lib/admin-data'
import Modal from '../components/Modal'
import NewApplication from '../components/NewApplication'
import { PageHeader, Pagination, TableSkeleton, shortDate, ui, useDebounced } from '../ui'
import styles from './users.module.css'

// Customers and the admin team. GrayDocket has two roles: customer ("user") and admin.

type Role = 'user' | 'admin'
type AdminUser = AdminUserRow
type Result = Awaited<ReturnType<typeof getAdminUsersPage>>
type MenuItem = { label: string; run: () => void; danger?: boolean }

const emptyForm = { email: '', full_name: '', phone: '', role: 'user' as Role }

// Phone sign-ups get a placeholder address; it isn't worth showing
const realEmail = (email: string | null) => (email && !email.endsWith('@graydocket.user') ? email : null)

/** ⋯ actions for one row. Fixed-position so the table's scroll container can't clip it. */
function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!pos) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof MouseEvent && (menu.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return
      setPos(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])

  const toggle = () => {
    if (pos) return setPos(null)
    const r = btn.current!.getBoundingClientRect()
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }

  return (
    <>
      <button ref={btn} type="button" className={styles.menuBtn} onClick={toggle} aria-label={`Actions for ${label}`} aria-expanded={Boolean(pos)}>
        <MoreHorizontal size={18} />
      </button>
      {pos && (
        <ul ref={menu} className={styles.menu} style={{ top: pos.top, right: pos.right }} role="menu">
          {items.map((m) => (
            <li key={m.label}>
              <button
                type="button"
                role="menuitem"
                className={`${styles.menuItem} ${m.danger ? styles.danger : ''}`}
                onClick={() => {
                  setPos(null)
                  m.run()
                }}
              >
                {m.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function AdminUsersPage() {
  const [data, setData] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'customers' | 'admins'>('customers')
  const [search, setSearch] = useState('')
  const term = useDebounced(search.trim())
  // The page number belongs to one tab + search; changing either starts again from page 1
  const pageKey = `${tab}|${term}`
  const [pageState, setPageState] = useState({ key: pageKey, n: 1 })
  const page = pageState.key === pageKey ? pageState.n : 1
  const setPage = (n: number) => setPageState({ key: pageKey, n })
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [applyingFor, setApplyingFor] = useState<AdminUser | null>(null)

  // fresh: after a change, re-read accounts instead of the few-minute cache
  const load = useCallback(async (fresh = false) => {
    setLoading(true)
    const res = await getAdminUsersPage({ tab, search: term, page, fresh })
    setData(res)
    setLoading(false)
  }, [tab, term, page])

  useEffect(() => {
    // Loads the current tab, search and page from the server
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const visible = data?.rows || []
  const error = data?.error || ''
  const customers = tab === 'customers'

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, role: customers ? 'user' : 'admin' })
    setOpen(true)
  }

  const openEdit = (u: AdminUser) => {
    setEditing(u)
    setForm({ email: u.email || '', full_name: u.full_name || '', phone: u.phone || '', role: u.role === 'admin' ? 'admin' : 'user' })
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = editing
      ? await updateAdminUserProfile(editing.id, { full_name: form.full_name, phone: form.phone, role: form.role })
      : await createAdminUser(form)
    setSaving(false)
    if (res.error) return alert(res.error)
    setOpen(false)
    load(true)
  }

  const remove = async (u: AdminUser) => {
    const ok = window.confirm(
      `Delete ${u.full_name || u.email || 'this user'}?\n\nThis permanently deletes their sign-in account from the shared Supabase project, including access to any other app that uses it. This can’t be undone.`
    )
    if (!ok) return
    const res = await deleteAdminUser(u.id)
    if (res.error) alert(res.error)
    load(true)
  }

  const toggleAffiliate = async (u: AdminUser) => {
    const res = await markUserAsAffiliate(u.id, !u.is_affiliate)
    if (res.error) alert(res.error)
    load(true)
  }

  const menuFor = (u: AdminUser): MenuItem[] => [
    ...(customers ? [{ label: 'New application', run: () => setApplyingFor(u) }] : []),
    { label: 'Edit details', run: () => openEdit(u) },
    ...(customers ? [{ label: u.is_affiliate ? 'Remove from affiliates' : 'Make an affiliate', run: () => toggleAffiliate(u) }] : []),
    { label: 'Delete account', run: () => remove(u), danger: true },
  ]

  return (
    <div className={ui.page}>
      <PageHeader
        title="Users"
        sub="Customers and the admin team. Everyone signs in with their phone number."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <UserPlus size={16} /> Add {customers ? 'customer' : 'admin'}
          </button>
        }
      />

      <Tabs
        label="User type"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'customers', label: 'Customers', count: data?.counts.customers },
          { id: 'admins', label: 'Admins', count: data?.counts.admins },
        ]}
      />

      <div className={ui.toolbar}>
        <input className={ui.search} type="search" placeholder="Search by name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <p className={ui.error}>{error}</p>}

      <section className={ui.card}>
        {data === null ? (
          <TableSkeleton cols={4} />
        ) : visible.length === 0 ? (
          <p className={ui.empty}>{term ? `No ${tab} match “${term}”.` : `No ${tab} yet.`}</p>
        ) : (
          <div className={`${ui.tableWrap} ${loading ? ui.refreshing : ''}`}>
            <table className={`${ui.table} ${styles.table}`}>
              <thead>
                <tr>
                  <th>{customers ? 'Customer' : 'Admin'}</th>
                  <th className={styles.wide}>Phone</th>
                  {customers && <th className={ui.right}>Applications</th>}
                  <th className={styles.wide}>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  const email = realEmail(u.email)
                  const name = u.full_name || 'No name'
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className={styles.person}>
                          <UserAvatar size={36} name={name} avatarUrl={u.avatar_url} choice={u.avatar_choice} />
                          <span className={styles.personText}>
                            <span className={styles.nameRow}>
                              <strong className={u.full_name ? undefined : ui.muted}>{name}</strong>
                              {u.is_affiliate && (
                                <Link href="/admin/affiliates" className={styles.partner} title={`Affiliate code ${u.affiliate_code || ''}`}>
                                  Affiliate
                                </Link>
                              )}
                            </span>
                            <small>{email || <span className={styles.phoneSmall}>{u.phone || 'No contact details'}</span>}</small>
                          </span>
                        </span>
                      </td>
                      <td className={`${styles.wide} ${styles.phone}`}>{u.phone || <span className={ui.muted}>—</span>}</td>
                      {customers && (
                        <td className={`${ui.right} ${styles.count}`}>
                          {u.applications ? u.applications : <span className={ui.muted}>—</span>}
                        </td>
                      )}
                      <td className={`${styles.wide} ${ui.muted}`}>{shortDate(u.created_at)}</td>
                      <td className={ui.right}>
                        <RowMenu items={menuFor(u)} label={name} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} total={data.total} pageSize={data.pageSize} onChange={setPage} busy={loading} />}
      </section>

      {applyingFor && <NewApplication customer={applyingFor} onClose={() => setApplyingFor(null)} />}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit user' : customers ? 'Add a customer' : 'Add an admin'}>
        <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
          {!editing && (
            <label className={ui.field}>
              <span className={ui.label}>Email</span>
              <input className={ui.input} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          )}
          <label className={ui.field}>
            <span className={ui.label}>Full name</span>
            <input className={ui.input} required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Phone</span>
            <input className={ui.input} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="024 123 4567" />
            <span className={ui.hint}>They sign in with a code sent to this number.</span>
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Role</span>
            <select className={ui.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="user">Customer</option>
              <option value="admin">Admin (full access to this back office)</option>
            </select>
          </label>
          <div className={ui.actions}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
