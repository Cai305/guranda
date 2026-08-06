'use client'
import { useEffect, useState } from 'react'

const API = '/api'

export default function LivePage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'live' | 'all'>('live')

  useEffect(() => {
    fetch(`${API}/admin/live`)
      .then(r => r.json())
      .then(setRooms)
      .finally(() => setLoading(false))
  }, [])

  const elapsed = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  }

  const live = rooms.filter(r => r.isLive)
  const ended = rooms.filter(r => !r.isLive)
  const displayed = tab === 'live' ? live : ended

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Live Streams</h2>
        <p className="text-white/40 text-sm mt-0.5">{live.length} currently live · {ended.length} ended</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('live')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'live' ? 'bg-pink-600/30 text-pink-300 border border-pink-500/30' : 'bg-white/5 text-white/50 hover:text-white border border-transparent'}`}>
          🔴 Live ({live.length})
        </button>
        <button onClick={() => setTab('all')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'all' ? 'bg-white/10 text-white border border-white/20' : 'bg-white/5 text-white/50 hover:text-white border border-transparent'}`}>
          History ({ended.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Loading streams…</div>
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/30">
          No {tab === 'live' ? 'active live streams' : 'ended streams'}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(r => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white truncate">{r.title}</h4>
                  <div className="text-xs text-white/40 mt-0.5">Room: {r.roomName}</div>
                </div>
                {r.isLive ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/40 text-xs shrink-0">Ended</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-600/30 flex items-center justify-center text-pink-300 font-bold text-sm">
                  {(r.host?.profile?.displayName || r.host?.username || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{r.host?.profile?.displayName || r.host?.username}</div>
                  <div className="text-xs text-white/40">@{r.host?.username}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Category: {r.categoryId}</span>
                <span>{r.isLive ? `Live for ${elapsed(r.startedAt)}` : `Ended ${r.endedAt ? new Date(r.endedAt).toLocaleDateString() : '—'}`}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
