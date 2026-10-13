'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import { getAdminPaymentsPage } from '@/lib/admin-data'
import { PageHeader, Pagination, StageChip, StatsSkeleton, TableSkeleton, cedis, shortDate, ui } from '../ui'

type Result = Awaited<ReturnType<typeof getAdminPaymentsPage>>
type Tab = 'paid' | 'awaiting'

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('paid')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    // Shows the refreshing state while the next page loads
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getAdminPaymentsPage({ tab, page }).then((res) => {
      if (!live) return
      setData(res)
      setLoading(false)
    })
    return () => {
      live = false
    }
  }, [tab, page])

  const s = data?.summary
  const rows = data?.rows || []

  return (
    <div className={ui.page}>
      <PageHeader title="Payments" sub="Money is taken at checkout, after the customer reviews their application. Nothing is submitted to the team until it’s paid." />

      {!s ? <StatsSkeleton /> : (
      <section className={ui.stats}>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Paid this month</span>
          <span className={ui.statValue}>{cedis(s.monthTotal)}</span>
          <span className={ui.statHint}>{`${s.monthCount} payment${s.monthCount === 1 ? '' : 's'}`}</span>
        </div>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Of which ORC fees</span>
          <span className={ui.statValue}>{cedis(s.monthOrc)}</span>
          <span className={ui.statHint}>Passed on to the government</span>
        </div>
        <div className={ui.stat}>
          <span className={ui.statLabel}>All time</span>
          <span className={ui.statValue}>{cedis(s.allTotal)}</span>
          <span className={ui.statHint}>{`${s.allCount} paid application${s.allCount === 1 ? '' : 's'}`}</span>
        </div>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Awaiting payment</span>
          <span className={ui.statValue}>{cedis(s.awaitingTotal)}</span>
          <span className={ui.statHint}>{`${s.awaitingCount} reviewed, not yet paid`}</span>
        </div>
      </section>
      )}

      <Tabs
        label="Payments"
        value={tab}
        onChange={(t) => {
          setTab(t)
          setPage(1)
        }}
        items={[
          { id: 'paid', label: 'Paid', count: s?.allCount },
          { id: 'awaiting', label: 'Awaiting payment', count: s?.awaitingCount },
        ]}
      />

      {data?.error && <p className={ui.error}>{data.error}</p>}

      <section className={ui.card}>
        {data === null ? (
          <TableSkeleton cols={5} />
        ) : rows.length === 0 ? (
          <p className={ui.empty}>{tab === 'paid' ? 'No payments yet.' : 'Nobody is waiting to pay.'}</p>
        ) : (
          <div className={`${ui.tableWrap} ${loading ? ui.refreshing : ''}`}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Business</th>
                  <th>Customer</th>
                  <th>{tab === 'paid' ? 'Stage' : 'Status'}</th>
                  <th className={ui.right}>Amount</th>
                  {tab === 'paid' && <th>Paystack ref</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className={ui.rowLink} onClick={() => router.push(`/admin/applications/${p.id}`)}>
                    <td className={ui.muted}>{shortDate(p.updated_at || p.created_at)}</td>
                    <td>
                      <span className={ui.cellMain}>
                        <strong>{p.business_name}</strong>
                        <small>{p.business_types?.name}</small>
                      </span>
                    </td>
                    <td>
                      <span className={ui.cellMain}>
                        <span>{p.profiles?.full_name || 'No name'}</span>
                        <small>{p.profiles?.phone}</small>
                      </span>
                    </td>
                    <td>{tab === 'paid' ? <StageChip status={p.status} /> : <span className={`${ui.chip} ${ui.amber}`}>Checkout started</span>}</td>
                    <td className={ui.right}>
                      <span className={ui.cellMain}>
                        <strong>{cedis(p.total_amount)}</strong>
                        {tab === 'paid' && p.government > 0 && <small>{cedis(p.government)} to ORC</small>}
                      </span>
                    </td>
                    {tab === 'paid' && <td className={ui.mono}>{p.paystack_reference || '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} total={data.total} pageSize={data.pageSize} onChange={setPage} busy={loading} />}
      </section>
    </div>
  )
}
