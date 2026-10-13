'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import Tabs from '@/components/ui/Tabs'
import NewApplication from '../components/NewApplication'
import { getAdminApplicationsPage, type AdminListRow } from '@/lib/admin-data'
import { ADMIN_QUEUES } from '@/lib/application-flow'
import { PageHeader, Pagination, PaymentChip, StageChip, TableSkeleton, cedis, timeAgo, ui, useDebounced } from '../ui'

type Result = Awaited<ReturnType<typeof getAdminApplicationsPage>>

function ApplicationsList() {
  const router = useRouter()
  const params = useSearchParams()
  const queue = ADMIN_QUEUES.some((q) => q.id === params.get('queue')) ? params.get('queue')! : 'new'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(params.get('q') || '')
  const term = useDebounced(search.trim())
  const [data, setData] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Queue, search and page live in the URL so back/forward and shared links keep your place
  const go = (next: { queue?: string; page?: number; q?: string }) => {
    const sp = new URLSearchParams()
    sp.set('queue', next.queue ?? queue)
    const q = next.q ?? term
    if (q) sp.set('q', q)
    const p = next.page ?? 1
    if (p > 1) sp.set('page', String(p))
    router.replace(`/admin/applications?${sp}`, { scroll: false })
  }

  useEffect(() => {
    if (term === (params.get('q') || '')) return
    go({ q: term, page: 1 })
    // Only when the settled search term changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  useEffect(() => {
    let live = true
    // Shows the refreshing state while the next page loads
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getAdminApplicationsPage({ queue, search: params.get('q') || '', page }).then((res) => {
      if (!live) return
      setData(res)
      setLoading(false)
    })
    return () => {
      live = false
    }
  }, [queue, page, params])

  const rows = data?.rows || []
  const searching = Boolean(params.get('q'))

  return (
    <div className={ui.page}>
      <PageHeader
        title="Applications"
        sub="Work through each queue from left to right. Click an application to take the next step."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={16} /> New application
          </button>
        }
      />

      <Tabs
        label="Queues"
        value={queue}
        onChange={(id) => {
          setSearch('')
          go({ queue: id, q: '', page: 1 })
        }}
        items={ADMIN_QUEUES.map((q) => ({ id: q.id, label: q.label, count: data?.counts[q.id] ?? undefined }))}
      />

      <div className={ui.toolbar}>
        <input
          className={ui.search}
          type="search"
          placeholder="Search by business, tracking ID, customer name, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {data?.error && <p className={ui.error}>{data.error}</p>}

      <section className={ui.card}>
        {data === null ? (
          <TableSkeleton cols={6} />
        ) : rows.length === 0 ? (
          <p className={ui.empty}>{searching ? 'No applications match that search.' : 'Nothing in this queue. Nice work.'}</p>
        ) : (
          <>
            {searching && <p className={`${ui.cardNote} ${ui.cardBody}`} style={{ paddingBottom: 0 }}>Results from every queue</p>}
            <div className={`${ui.tableWrap} ${loading ? ui.refreshing : ''}`}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Customer</th>
                    <th>Stage</th>
                    <th>Payment</th>
                    <th className={ui.right}>Amount</th>
                    <th className={ui.right}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: AdminListRow) => (
                    <tr key={r.id} className={ui.rowLink} onClick={() => router.push(`/admin/applications/${r.id}`)}>
                      <td>
                        <span className={ui.cellMain}>
                          {/* A real link too, so the page is prefetched and can open in a new tab */}
                          <Link href={`/admin/applications/${r.id}`} onClick={(e) => e.stopPropagation()}>
                            <strong>{r.business_name}</strong>
                          </Link>
                          <small>
                            {r.business_types?.name}
                            {r.tracking_id && !r.tracking_id.startsWith('DRAFT-') && <> · <span className={ui.mono}>{r.tracking_id}</span></>}
                            {r.delivery === 'courier' && ' · Courier'}
                          </small>
                        </span>
                      </td>
                      <td>
                        <span className={ui.cellMain}>
                          <span>{r.profiles?.full_name || 'No name'}</span>
                          <small>{r.profiles?.phone || r.profiles?.email}</small>
                        </span>
                      </td>
                      <td><StageChip status={r.status} /></td>
                      <td><PaymentChip status={r.payment_status} /></td>
                      <td className={ui.right}>{cedis(r.total_amount)}</td>
                      <td className={`${ui.right} ${ui.muted}`}>{timeAgo(r.updated_at || r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {data && <Pagination page={page} total={data.total} pageSize={data.pageSize} onChange={(p) => go({ page: p })} busy={loading} />}
      </section>

      {creating && <NewApplication onClose={() => setCreating(false)} />}
    </div>
  )
}

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <ApplicationsList />
    </Suspense>
  )
}
