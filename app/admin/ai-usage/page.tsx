'use client'
import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const API = '/api'

interface AiUsage {
  totalUsers: number
  totalAgents: number
  onboardedAgents: number
  aiAdoptionPct: number
  totalExecutions: number
  successCount: number
  failedCount: number
  pendingCount: number
  uniqueAiUsers: number
  avgExecutionsPerActiveUser: number
  avgDurationMs: number
  executionsGrowth: { day: string; value: number }[]
  topModules: { name: string; value: number }[]
  topTools: { name: string; value: number }[]
  statusBreakdown: { name: string; value: number; color: string }[]
  recentExecutions: {
    id: string; toolName: string; status: string; durationMs: number | null
    createdAt: string; username?: string; displayName?: string
  }[]
}

const CHART_STYLE = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }

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

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: 'text-green-400',
  FAILED: 'text-red-400',
  PENDING: 'text-amber-400',
}

export default function AiUsagePage() {
  const [data, setData] = useState<AiUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/admin/ai-usage`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Cannot reach API at localhost:3000 — make sure the backend is running.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-white/40 text-sm animate-pulse">Loading AI usage…</div>
  if (error) return <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-sm">{error}</div>
  if (!data) return null

  const hasExecutions = data.executionsGrowth.some(d => d.value > 0)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">AI Usage</h2>
        <p className="text-white/40 text-sm mt-0.5">
          What the AI companion is doing on users&apos; behalf — separate from direct user activity in Overview.
        </p>
      </div>

      {/* AI adoption — how many users have actually turned the companion on */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🧑‍🤝‍🧑" label="Total Users" value={data.totalUsers} color="bg-violet-500" />
        <StatCard icon="✨" label="AI Companions Set Up" value={data.onboardedAgents}
          sub={`${data.aiAdoptionPct.toFixed(1)}% of all users`} color="bg-pink-500" />
        <StatCard icon="🙋" label="Active AI Users" value={data.uniqueAiUsers}
          sub="Ran at least one action" color="bg-cyan-500" />
        <StatCard icon="⚙️" label="Avg Actions / AI User" value={data.avgExecutionsPerActiveUser.toFixed(1)} color="bg-blue-500" />
      </div>

      {/* Execution volume + reliability */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🤖" label="Total AI Actions" value={data.totalExecutions} color="bg-indigo-500" />
        <StatCard icon="✅" label="Succeeded" value={data.successCount}
          sub={data.totalExecutions > 0 ? `${((data.successCount / data.totalExecutions) * 100).toFixed(1)}%` : undefined}
          color="bg-green-500" />
        <StatCard icon="❌" label="Failed" value={data.failedCount} color="bg-red-500" />
        <StatCard icon="⏱️" label="Avg Duration" value={`${Math.round(data.avgDurationMs)}ms`}
          sub="Background & tool calls" color="bg-amber-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="🤖 AI Actions Executed — Last 30 Days">
          {!hasExecutions ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No AI activity in range</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.executionsGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={CHART_STYLE} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Actions" stroke="#ec4899"
                  strokeWidth={2} fill="url(#aiGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="📊 Success / Failed / Pending">
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {data.statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
              {data.statusBreakdown.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-white/50">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="🧩 Actions by Module">
          {data.topModules.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No data in range</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topModules} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ ...CHART_STYLE, fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Actions" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="🔧 Top Tools Called">
          {data.topTools.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No data in range</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topTools} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ ...CHART_STYLE, fontSize: 9 }} tickLine={false} axisLine={false} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Calls" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Recent executions */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white text-sm">Recent AI Actions</h3>
        </div>
        <div className="divide-y divide-white/5">
          {data.recentExecutions.length === 0 && (
            <p className="px-5 py-8 text-center text-white/30 text-sm">No AI actions yet</p>
          )}
          {data.recentExecutions.map(e => (
            <div key={e.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{e.toolName}</div>
                <div className="text-xs text-white/40">{e.displayName || e.username || 'Unknown user'}</div>
              </div>
              <div className={`text-xs font-semibold ${STATUS_COLOR[e.status] || 'text-white/40'}`}>{e.status}</div>
              {e.durationMs != null && <div className="text-xs text-white/30 w-16 text-right">{e.durationMs}ms</div>}
              <div className="text-xs text-white/30 w-24 text-right">{new Date(e.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
