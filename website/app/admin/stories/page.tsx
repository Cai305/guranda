'use client'
import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const API = '/api'

interface StoryMetrics {
  totalLabeledStories: number
  trendingLabels: { label: string; count: number }[]
  labeledStoriesGrowth: { day: string; value: number }[]
  recentLabeled: {
    id: string; label: string; author: string
    likes: number; comments: number; avgRank: number | null
    itemsForSale: number; createdAt: string; expiresAt: string
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

export default function StoriesPage() {
  const [data, setData] = useState<StoryMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API}/admin/stories`)
      .then(r => r.json())
      .then((d: any) => {
        if (!d || d.message || d.error) return
        setData({
          ...d,
          trendingLabels:      Array.isArray(d.trendingLabels)      ? d.trendingLabels      : [],
          labeledStoriesGrowth: Array.isArray(d.labeledStoriesGrowth) ? d.labeledStoriesGrowth : [],
          recentLabeled:       Array.isArray(d.recentLabeled)       ? d.recentLabeled       : [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-white/40 text-sm animate-pulse">Loading stories…</div>
  if (!data) return null

  const trendingLabels = data.trendingLabels ?? []
  const growth = data.labeledStoriesGrowth ?? []
  const recent = data.recentLabeled ?? []
  const hasGrowth = growth.some(d => d.value > 0)
  const topLabel = trendingLabels[0]

  const filtered = recent.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase()) ||
    s.author.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Stories</h2>
        <p className="text-white/40 text-sm mt-0.5">
          "Of the Day" labeled stories (OOTD, COTD, anything) — the generalized OOTD feed, plus what's trending.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="👗" label="Labeled Stories" value={data.totalLabeledStories} color="bg-pink-500" />
        <StatCard icon="🔥" label="Top Trending Label" value={topLabel ? `#${topLabel.label}` : '—'}
          sub={topLabel ? `${topLabel.count} posts` : undefined} color="bg-amber-500" />
        <StatCard icon="🏷️" label="Distinct Labels" value={trendingLabels.length} color="bg-violet-500" />
        <StatCard icon="🛍️" label="Items For Sale (recent)" value={recent.reduce((sum, s) => sum + s.itemsForSale, 0)} color="bg-cyan-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-semibold text-white text-sm">📈 Labeled Stories — Last 30 Days</h3>
          </div>
          <div className="p-5">
            {!hasGrowth ? (
              <div className="flex items-center justify-center h-48 text-white/20 text-sm">Not enough data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={growth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="storyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={CHART_STYLE} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Posts" stroke="#ec4899" strokeWidth={2} fill="url(#storyGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-semibold text-white text-sm">🏷️ Trending Labels</h3>
          </div>
          <div className="p-5">
            {trendingLabels.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-white/20 text-sm">No labels yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendingLabels.slice(0, 8)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ ...CHART_STYLE, fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Posts" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-semibold text-white text-sm">Recent Labeled Stories</h3>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search label or author…"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 w-64"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-white/30 text-sm">{recent.length === 0 ? 'No labeled stories yet' : 'No results'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Author</th>
                  <th className="px-5 py-3 text-left">Label</th>
                  <th className="px-5 py-3 text-right">Likes</th>
                  <th className="px-5 py-3 text-right">Comments</th>
                  <th className="px-5 py-3 text-right">Avg Rank</th>
                  <th className="px-5 py-3 text-right">Items</th>
                  <th className="px-5 py-3 text-left">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-white">{s.author}</td>
                    <td className="px-5 py-3"><span className="text-pink-400 font-semibold">#{s.label}</span></td>
                    <td className="px-5 py-3 text-right text-white/70">♥ {s.likes}</td>
                    <td className="px-5 py-3 text-right text-white/70">{s.comments}</td>
                    <td className="px-5 py-3 text-right text-white/70">{s.avgRank != null ? s.avgRank.toFixed(1) : '—'}</td>
                    <td className="px-5 py-3 text-right text-white/70">{s.itemsForSale}</td>
                    <td className="px-5 py-3 text-white/40 text-xs">
                      {new Date(s.createdAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
