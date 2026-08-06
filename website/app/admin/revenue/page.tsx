'use client'
import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const API = '/api'

interface RevenueData {
  totalRevenueMSH: number
  totalTransactions: number
  last30DaysRevenueMSH: number
  last30DaysTransactions: number
  totalDeposits: number
  depositVolumeZar: number
  pendingDeposits: number
  byType: { type: string; totalMSH: number; count: number; color: string }[]
  volumeChart: { day: string; value: number }[]
  topSpenders: { username: string; displayName?: string; totalSpentMSH: number; txCount: number }[]
  recentTransactions: {
    id: string; type: string; amount: number; status: string
    timestamp: string; username?: string; displayName?: string
  }[]
}

const CHART_STYLE = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }

const TYPE_LABELS: Record<string, string> = {
  PAYMENT: 'In-App Payments',
  EAT_ORDER_PAYOUT: 'Food Orders',
  SHOPPING_ORDER_PAYOUT: 'Shopping',
  STORY_ITEM_SALE: 'Story Item Sales',
  DEPOSIT: 'Deposits',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-black/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white shadow-xl">
      <div className="text-white/50 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-15 blur-lg ${color}`} />
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-black text-white tracking-tight">{value}</div>
      <div className="text-sm text-white/50 mt-1">{label}</div>
      {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/admin/revenue`)
      .then(r => r.json())
      .then((d: any) => {
        if (!d || d.message || d.error || typeof d.totalRevenueMSH === 'undefined') {
          setError(d?.message || d?.error || 'Unexpected response from API')
          return
        }
        setData({
          ...d,
          byType:             Array.isArray(d.byType)             ? d.byType             : [],
          volumeChart:        Array.isArray(d.volumeChart)        ? d.volumeChart        : [],
          topSpenders:        Array.isArray(d.topSpenders)        ? d.topSpenders        : [],
          recentTransactions: Array.isArray(d.recentTransactions) ? d.recentTransactions : [],
        })
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white/40 text-sm animate-pulse">Loading revenue data…</div>
  )
  if (error) return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-sm">
      <strong>Revenue data unavailable:</strong> {error}
    </div>
  )
  if (!data) return null

  const hasChart = data.volumeChart.some(d => d.value > 0)
  const hasByType = data.byType.length > 0
  const hasSpenders = data.topSpenders.length > 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Revenue &amp; Service Fees</h2>
        <p className="text-white/40 text-sm mt-0.5">Platform-side MSH flows — payments, orders, deposits and item sales</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="💰" label="Total Revenue (all time)"
          value={`${Number(data.totalRevenueMSH).toFixed(0)} MSH`}
          sub={`${data.totalTransactions} transactions`} color="bg-amber-500" />
        <StatCard icon="📅" label="Last 30 Days"
          value={`${Number(data.last30DaysRevenueMSH).toFixed(0)} MSH`}
          sub={`${data.last30DaysTransactions} transactions`} color="bg-violet-500" />
        <StatCard icon="🏦" label="Confirmed Deposits"
          value={`R${Number(data.depositVolumeZar).toFixed(0)}`}
          sub={`${data.totalDeposits} paid deposits`} color="bg-green-500" />
        <StatCard icon="⏳" label="Pending Deposits"
          value={data.pendingDeposits}
          sub="Awaiting confirmation" color="bg-amber-600" />
      </div>

      {/* Volume chart + by-type breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="📈 Daily Revenue Volume — Last 30 Days">
          {!hasChart ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No revenue data in range</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.volumeChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={CHART_STYLE} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="MSH" stroke="#f59e0b"
                  strokeWidth={2} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="🏷️ Revenue by Type">
          {!hasByType ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No transactions yet</div>
          ) : (
            <div className="flex flex-col gap-3">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.byType.map(t => ({ ...t, name: TYPE_LABELS[t.type] ?? t.type }))}
                    cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                    dataKey="totalMSH" paddingAngle={3}>
                    {data.byType.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {data.byType.map(t => (
                  <div key={t.type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                      <span className="text-white/70">{TYPE_LABELS[t.type] ?? t.type}</span>
                      <span className="text-white/30">({t.count} tx)</span>
                    </div>
                    <span className="font-mono text-amber-400">{Number(t.totalMSH).toFixed(2)} MSH</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Top spenders + recent transactions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="🏆 Top Spenders (all time)">
          {!hasSpenders ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No spenders yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.topSpenders.map(s => ({
                  name: s.displayName || s.username,
                  msh: parseFloat(Number(s.totalSpentMSH).toFixed(2)),
                }))}
                layout="vertical"
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={CHART_STYLE} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ ...CHART_STYLE, fontSize: 10 }}
                  tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="msh" name="MSH Spent" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-semibold text-white text-sm">🕒 Recent Transactions</h3>
          </div>
          <div className="divide-y divide-white/5 overflow-y-auto max-h-72">
            {data.recentTransactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-white/30 text-sm">No transactions yet</p>
            ) : data.recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">
                    {tx.displayName || tx.username || 'Unknown'}
                  </div>
                  <div className="text-xs text-white/40">{TYPE_LABELS[tx.type] ?? tx.type}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-amber-400 text-sm">{Number(tx.amount).toFixed(2)} MSH</div>
                  <div className="text-xs text-white/30">
                    {new Date(tx.timestamp).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
