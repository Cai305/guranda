'use client'
import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const API = '/api'

interface DiscoveryData {
  totalVideos: number
  videosLast30: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalPlaylists: number
  totalSubscriptions: number
  totalCreators: number
  uploadGrowth: { day: string; value: number }[]
  categoryBreakdown: { name: string; value: number }[]
  topVideos: {
    id: string; title: string; category: string; views: number
    duration: number; likes: number; comments: number
    creator: string; createdAt: string
  }[]
  recentVideos: {
    id: string; title: string; category: string; views: number
    duration: number; creator: string; createdAt: string
  }[]
}

const CHART_STYLE = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }

const CATEGORY_COLORS = [
  '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#22c55e',
  '#3b82f6', '#ef4444', '#a78bfa', '#34d399', '#fb923c',
]

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

function fmtDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function DiscoveryPage() {
  const [data, setData] = useState<DiscoveryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'top' | 'recent'>('top')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API}/admin/discovery`)
      .then(r => r.json())
      .then((d: any) => {
        if (d?.message || d?.error || !d?.totalVideos === undefined) {
          // Backend returned an error shape
          setError(d?.message || d?.error || 'Unexpected response from API')
          return
        }
        setData({
          ...d,
          uploadGrowth:      Array.isArray(d.uploadGrowth)      ? d.uploadGrowth      : [],
          categoryBreakdown: Array.isArray(d.categoryBreakdown) ? d.categoryBreakdown : [],
          topVideos:         Array.isArray(d.topVideos)         ? d.topVideos         : [],
          recentVideos:      Array.isArray(d.recentVideos)      ? d.recentVideos      : [],
        })
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white/40 text-sm animate-pulse">Loading discovery data…</div>
  )
  if (error) return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-sm">
      <strong>Discovery data unavailable:</strong> {error}
      <div className="mt-2 text-red-400/60 text-xs">Check that the backend is running and the Video table has been migrated.</div>
    </div>
  )
  if (!data) return null

  const hasGrowth = data.uploadGrowth.some(d => d.value > 0)
  const hasCategories = data.categoryBreakdown.length > 0

  const videos = tab === 'top' ? data.topVideos : data.recentVideos
  const filtered = videos.filter(v =>
    !search ||
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.creator?.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Discovery</h2>
        <p className="text-white/40 text-sm mt-0.5">Video platform — uploads, views, creators and engagement</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🎬" label="Total Videos" value={data.totalVideos}
          sub={`+${data.videosLast30} last 30 days`} color="bg-violet-500" />
        <StatCard icon="👁️" label="Total Views" value={data.totalViews.toLocaleString()} color="bg-cyan-500" />
        <StatCard icon="🎥" label="Creators" value={data.totalCreators}
          sub={`${data.totalSubscriptions} subscriptions`} color="bg-pink-500" />
        <StatCard icon="❤️" label="Total Likes" value={data.totalLikes.toLocaleString()}
          sub={`${data.totalComments} comments`} color="bg-red-500" />
        <StatCard icon="📋" label="Playlists" value={data.totalPlaylists} color="bg-amber-500" />
        <StatCard icon="📊" label="Avg Views / Video"
          value={data.totalVideos > 0 ? Math.round(data.totalViews / data.totalVideos) : 0}
          color="bg-blue-500" />
        <StatCard icon="💬" label="Comments" value={data.totalComments.toLocaleString()} color="bg-indigo-500" />
        <StatCard icon="🔔" label="Subscriptions" value={data.totalSubscriptions.toLocaleString()} color="bg-green-500" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-semibold text-white text-sm">📈 Video Uploads — Last 30 Days</h3>
          </div>
          <div className="p-5">
            {!hasGrowth ? (
              <div className="flex items-center justify-center h-48 text-white/20 text-sm">No uploads in range</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.uploadGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="discGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={CHART_STYLE} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Uploads" stroke="#8b5cf6"
                    strokeWidth={2} fill="url(#discGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-semibold text-white text-sm">🏷️ Videos by Category</h3>
          </div>
          <div className="p-5">
            {!hasCategories ? (
              <div className="flex items-center justify-center h-48 text-white/20 text-sm">No videos yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.categoryBreakdown} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={CHART_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ ...CHART_STYLE, fontSize: 10 }}
                    tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Videos" radius={[0, 4, 4, 0]}>
                    {data.categoryBreakdown.map((_, i) => (
                      <rect key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Video table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-4 flex-wrap">
          <div className="flex gap-2">
            {(['top', 'recent'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                    : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                }`}>
                {t === 'top' ? '🔥 Top Videos' : '🆕 Recent Videos'}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, creator, category…"
            className="ml-auto bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 w-64"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-white/30 text-sm">No videos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Title</th>
                  <th className="px-5 py-3 text-left">Creator</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-right">Views</th>
                  <th className="px-5 py-3 text-right">Likes</th>
                  {tab === 'top' && <th className="px-5 py-3 text-right">Comments</th>}
                  <th className="px-5 py-3 text-right">Duration</th>
                  <th className="px-5 py-3 text-left">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((v, i) => (
                  <tr key={v.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {tab === 'top' && (
                          <span className="text-white/20 text-xs w-5 shrink-0">#{i + 1}</span>
                        )}
                        <span className="font-medium text-white max-w-48 truncate">{v.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-white/60">{v.creator ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/50">
                        {v.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-cyan-400 font-mono">{v.views.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-white/70">
                      {'likes' in v ? (v as any).likes : '—'}
                    </td>
                    {tab === 'top' && (
                      <td className="px-5 py-3 text-right text-white/70">
                        {'comments' in v ? (v as any).comments : '—'}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right text-white/40 font-mono text-xs">
                      {fmtDuration(v.duration)}
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs">
                      {new Date(v.createdAt).toLocaleDateString()}
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
