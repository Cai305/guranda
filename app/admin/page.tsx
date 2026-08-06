'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// Proxied server-side via app/api/admin/[...path]/route.ts — the admin API
// key never reaches this browser code.
const API = '/api'

interface Stats {
  totalUsers: number
  activeGames: number
  activeChess: number
  activeLudo: number
  pendingRides: number
  activeRides: number
  liveRooms: number
  totalOotd: number
  totalMSH: number
  totalTransactions: number
  recentUsers: { id: string; username: string; createdAt: string; profile?: { displayName?: string } }[]
  newUsersThisWeek: number
  newUsersLastWeek: number
  weekOverWeekPct: number
  userGrowth: { day: string; value: number }[]
  cumulativeUserGrowth: { day: string; value: number }[]
  gameActivity: { day: string; value: number }[]
  rideActivity: { day: string; value: number }[]
  rideStatus: { name: string; value: number; color: string }[]
  gameTypes: { name: string; value: number; color: string }[]
  ludoModes: { name: string; value: number }[]
  topWallets: { name: string; msh: number }[]
}

const CHART_STYLE = {
  fontSize: 11,
  fill: 'rgba(255,255,255,0.4)',
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

function ChartCard({ title, children, className = '' }: {
  title: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/admin/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setError('Cannot reach API at localhost:3000 — make sure the backend is running.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-white/40 text-sm animate-pulse">Loading dashboard…</div>
    </div>
  )
  if (error) return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-sm">{error}</div>
  )
  if (!stats) return null

  const userGrowth = stats.userGrowth ?? []
  const cumulativeUserGrowth = stats.cumulativeUserGrowth ?? []
  const gameActivity = stats.gameActivity ?? []
  const rideActivity = stats.rideActivity ?? []
  const rideStatus = stats.rideStatus ?? []
  const gameTypes = stats.gameTypes ?? []
  const ludoModes = stats.ludoModes ?? []
  const topWallets = stats.topWallets ?? []

  const hasUserGrowth = userGrowth.some(d => d.value > 0)
  const hasGameActivity = gameActivity.some(d => d.value > 0)
  const hasRides = rideStatus.some(d => d.value > 0)
  const hasWallets = topWallets.some(d => d.msh > 0)
  const hasLudoModes = ludoModes.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Overview</h2>
        <p className="text-white/40 text-sm mt-0.5">Real-time platform statistics</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} color="bg-violet-500" />
        <StatCard icon="🎮" label="Active Games" value={stats.activeGames}
          sub={`Chess ${stats.activeChess} · Ludo ${stats.activeLudo}`} color="bg-blue-500" />
        <StatCard icon="🚗" label="Pending Rides" value={stats.pendingRides}
          sub={`${stats.activeRides} in progress`} color="bg-amber-500" />
        <StatCard icon="📡" label="Live Streams" value={stats.liveRooms} color="bg-pink-500" />
        <StatCard icon="👗" label="OOTD Posts" value={stats.totalOotd} color="bg-purple-500" />
        <StatCard icon="💰" label="Total MSH" value={Number(stats.totalMSH).toFixed(2)}
          sub="Masheleni in circulation" color="bg-yellow-500" />
        <StatCard icon="🔄" label="Transactions" value={stats.totalTransactions} color="bg-green-500" />
        <StatCard icon={stats.weekOverWeekPct >= 0 ? '📈' : '📉'} label="Week-over-Week Growth"
          value={`${stats.weekOverWeekPct >= 0 ? '+' : ''}${stats.weekOverWeekPct.toFixed(1)}%`}
          sub={`${stats.newUsersThisWeek} new users this week vs ${stats.newUsersLastWeek} last week`}
          color={stats.weekOverWeekPct >= 0 ? 'bg-green-500' : 'bg-red-500'} />
      </div>

      {/* Cumulative growth — the trajectory shape investors actually look for */}
      <ChartCard title="🚀 Total Users Over Time (Cumulative)">
        {cumulativeUserGrowth.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-white/20 text-sm">Not enough data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cumulativeUserGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={CHART_STYLE} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="Total users" stroke="#22c55e"
                strokeWidth={2} fill="url(#cumGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Row 1: User Growth + Game Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="📈 User Registrations — Last 30 Days">
          {!hasUserGrowth ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">Not enough data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={CHART_STYLE} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="New users" stroke="#8b5cf6"
                  strokeWidth={2} fill="url(#userGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="🎮 Game Sessions — Last 30 Days">
          {!hasGameActivity ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No game data in range</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={gameActivity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gameGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={CHART_STYLE} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Sessions" stroke="#06b6d4"
                  strokeWidth={2} fill="url(#gameGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 2: Ride Status Pie + Game Types Bar + Ludo Modes */}
      <div className="grid lg:grid-cols-3 gap-6">
        <ChartCard title="🚗 Ride Status Breakdown">
          {!hasRides ? (
            <div className="flex items-center justify-center h-52 text-white/20 text-sm">No rides yet</div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={rideStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" paddingAngle={3}>
                    {rideStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                {rideStatus.map(r => (
                  <div key={r.name} className="flex items-center gap-1.5 text-xs text-white/50">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                    {r.name} ({r.value})
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="🎲 Game Type Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gameTypes} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ ...CHART_STYLE, fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                {gameTypes.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🎯 Ludo Game Modes">
          {!hasLudoModes ? (
            <div className="flex items-center justify-center h-52 text-white/20 text-sm">No Ludo games yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ludoModes} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={CHART_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Games" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Ride Activity + Top MSH Wallets */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="🛺 Ride Requests — Last 30 Days">
          {!rideActivity.some(d => d.value > 0) ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No ride data in range</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={rideActivity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rideGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={CHART_STYLE} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Rides" stroke="#f59e0b"
                  strokeWidth={2} fill="url(#rideGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="💰 Top MSH Holders">
          {!hasWallets ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No MSH balances yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topWallets} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={CHART_STYLE} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ ...CHART_STYLE, fontSize: 10 }}
                  tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="msh" name="MSH" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Recent sign-ups */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Recent Sign-ups</h3>
          <Link href="/admin/users" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all →</Link>
        </div>
        <div className="divide-y divide-white/5">
          {stats.recentUsers.length === 0 && (
            <p className="px-5 py-8 text-center text-white/30 text-sm">No users yet</p>
          )}
          {stats.recentUsers.map(u => (
            <Link key={u.id} href={`/admin/users/${u.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 font-bold text-sm shrink-0">
                {(u.profile?.displayName || u.username)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">
                  {u.profile?.displayName || u.username}
                </div>
                <div className="text-xs text-white/40">@{u.username}</div>
              </div>
              <div className="text-xs text-white/30">{new Date(u.createdAt).toLocaleDateString()}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
