'use client'
import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const API = '/api'

interface CardsAnalytics {
  totalGames: number
  activeGames: number
  finishedGames: number
  gamesLast30Days: number
  totalWagerVolume: number
  activeRooms: number
  openTournaments: number
  openReports: number
  distinctPlayers: { fiveCards: number; cassino: number }
}

interface PlayerReport {
  id: string
  status: string
  reason?: string
  createdAt: string
  reporter: { id: string; username: string; profile?: { displayName?: string } }
  reportedUser: { id: string; username: string; profile?: { displayName?: string } }
}

interface Tournament {
  id: string
  name: string
  status: string
  maxPlayers: number
  buyIn: number
  prizePool: number
  createdAt: string
  entries: { id: string }[]
  rounds: { id: string }[]
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

const REPORT_STATUS_TABS = ['open', 'reviewed', 'actioned', 'dismissed']

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-amber-500/20 text-amber-400',
  reviewed: 'bg-blue-500/20 text-blue-400',
  actioned: 'bg-green-500/20 text-green-400',
  dismissed: 'bg-white/10 text-white/40',
  registration: 'bg-violet-500/20 text-violet-300',
  active: 'bg-green-500/20 text-green-400',
  completed: 'bg-white/10 text-white/40',
  cancelled: 'bg-red-500/20 text-red-400',
}

export default function CardsPage() {
  const [analytics, setAnalytics] = useState<CardsAnalytics | null>(null)
  const [reports, setReports] = useState<PlayerReport[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'analytics' | 'reports' | 'tournaments'>('analytics')
  const [reportStatus, setReportStatus] = useState('open')
  const [reportsLoading, setReportsLoading] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/cards/analytics`).then(r => r.json()),
      fetch(`${API}/admin/cards/tournaments`).then(r => r.json()),
    ]).then(([a, t]) => {
      setAnalytics(a)
      setTournaments(Array.isArray(t) ? t : [])
    }).finally(() => setLoading(false))
  }, [])

  const loadReports = (status: string) => {
    setReportsLoading(true)
    fetch(`${API}/admin/cards/reports?status=${status}`)
      .then(r => r.json())
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => setReports([]))
      .finally(() => setReportsLoading(false))
  }

  useEffect(() => {
    if (tab === 'reports') loadReports(reportStatus)
  }, [tab, reportStatus])

  const resolve = async (id: string, status: 'reviewed' | 'actioned' | 'dismissed') => {
    setResolving(id)
    await fetch(`${API}/admin/cards/reports/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setResolving(null)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white/40 text-sm animate-pulse">Loading cards data…</div>
  )

  const gameBreakdown = analytics ? [
    { name: 'Active', value: analytics.activeGames, color: '#22c55e' },
    { name: 'Finished', value: analytics.finishedGames, color: '#8b5cf6' },
  ] : []

  const playerBreakdown = analytics ? [
    { name: 'Five Cards', value: analytics.distinctPlayers.fiveCards },
    { name: 'Cassino', value: analytics.distinctPlayers.cassino },
  ] : []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Cards Platform</h2>
        <p className="text-white/40 text-sm mt-0.5">Five Cards &amp; Cassino — games, wagers, tournaments, moderation</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['analytics', 'reports', 'tournaments'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {t === 'reports'
              ? `Reports${analytics?.openReports ? ` (${analytics.openReports} open)` : ''}`
              : t === 'tournaments'
              ? `Tournaments${analytics?.openTournaments ? ` (${analytics.openTournaments} open)` : ''}`
              : 'Analytics'}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {tab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="🃏" label="Total Games" value={analytics.totalGames} color="bg-violet-500" />
            <StatCard icon="🎮" label="Active Games" value={analytics.activeGames}
              sub={`${analytics.activeRooms} waiting rooms`} color="bg-green-500" />
            <StatCard icon="📅" label="Last 30 Days" value={analytics.gamesLast30Days} color="bg-blue-500" />
            <StatCard icon="💰" label="Total Wager Vol." value={`${Number(analytics.totalWagerVolume).toFixed(0)} MSH`}
              sub="Wagered across all games" color="bg-amber-500" />
            <StatCard icon="🏆" label="Open Tournaments" value={analytics.openTournaments} color="bg-pink-500" />
            <StatCard icon="🚨" label="Open Reports" value={analytics.openReports} color="bg-red-500" />
            <StatCard icon="🂡" label="Five Cards Players" value={analytics.distinctPlayers.fiveCards} color="bg-cyan-500" />
            <StatCard icon="🎴" label="Cassino Players" value={analytics.distinctPlayers.cassino} color="bg-indigo-500" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="font-semibold text-white text-sm">🃏 Game Status Breakdown</h3>
              </div>
              <div className="p-5 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={gameBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" paddingAngle={3}>
                      {gameBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-1">
                  {gameBreakdown.map(g => (
                    <div key={g.name} className="flex items-center gap-1.5 text-xs text-white/50">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
                      {g.name} ({g.value})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="font-semibold text-white text-sm">🎴 Players by Game Mode</h3>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={playerBreakdown} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={CHART_STYLE} tickLine={false} axisLine={false} />
                    <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Players" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {REPORT_STATUS_TABS.map(s => (
              <button
                key={s}
                onClick={() => setReportStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                  reportStatus === s
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                    : 'bg-white/5 text-white/50 hover:text-white border border-transparent'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {reportsLoading ? (
            <div className="text-center py-20 text-white/30">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/30">
              No {reportStatus} reports
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white/50">Reporter:</span>
                        <span className="font-medium text-white">
                          {r.reporter.profile?.displayName || r.reporter.username}
                        </span>
                        <span className="text-white/30 text-xs">@{r.reporter.username}</span>
                        <span className="text-white/30 text-xs">→</span>
                        <span className="text-sm text-white/50">Reported:</span>
                        <span className="font-medium text-white">
                          {r.reportedUser.profile?.displayName || r.reportedUser.username}
                        </span>
                        <span className="text-white/30 text-xs">@{r.reportedUser.username}</span>
                      </div>
                      {r.reason && (
                        <div className="text-white/50 text-sm mt-1 italic">"{r.reason}"</div>
                      )}
                      <div className="text-white/30 text-xs mt-1">
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLOR[r.status] || 'bg-white/10 text-white/40'}`}>
                        {r.status}
                      </span>
                      {r.status === 'open' && (
                        <>
                          <button
                            onClick={() => resolve(r.id, 'actioned')}
                            disabled={resolving === r.id}
                            className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs font-medium hover:bg-red-600/40 transition-colors disabled:opacity-50"
                          >
                            {resolving === r.id ? '…' : 'Action'}
                          </button>
                          <button
                            onClick={() => resolve(r.id, 'reviewed')}
                            disabled={resolving === r.id}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-medium hover:bg-blue-600/40 transition-colors disabled:opacity-50"
                          >
                            Reviewed
                          </button>
                          <button
                            onClick={() => resolve(r.id, 'dismissed')}
                            disabled={resolving === r.id}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white/40 text-xs font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tournaments Tab */}
      {tab === 'tournaments' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          {tournaments.length === 0 ? (
            <p className="text-center py-12 text-white/30 text-sm">No tournaments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Entries</th>
                    <th className="px-5 py-3 text-right">Rounds</th>
                    <th className="px-5 py-3 text-right">Buy-in</th>
                    <th className="px-5 py-3 text-right">Prize Pool</th>
                    <th className="px-5 py-3 text-right">Max Players</th>
                    <th className="px-5 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tournaments.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 font-medium text-white">{t.name}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLOR[t.status] || 'bg-white/10 text-white/40'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-white/70">{t.entries.length}</td>
                      <td className="px-5 py-3 text-right text-white/70">{t.rounds.length}</td>
                      <td className="px-5 py-3 text-right font-mono text-amber-400">
                        {Number(t.buyIn).toFixed(0)} MSH
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-amber-400">
                        {Number(t.prizePool).toFixed(0)} MSH
                      </td>
                      <td className="px-5 py-3 text-right text-white/70">{t.maxPlayers}</td>
                      <td className="px-5 py-3 text-white/40 text-xs">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
