'use client'
import { useEffect, useState } from 'react'

const API = '/api'

export default function GamingPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/admin/gaming`)
      .then(r => r.json())
      .then((d: any) => {
        if (!d || d.message || d.error) return
        setData({
          chess: Array.isArray(d.chess) ? d.chess : [],
          ludo:  Array.isArray(d.ludo)  ? d.ludo  : [],
          cards: Array.isArray(d.cards) ? d.cards : [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-white/40">Loading games…</div>

  const chess: any[] = data?.chess ?? []
  const ludo: any[] = data?.ludo ?? []

  const elapsed = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Gaming Activity</h2>
        <p className="text-white/40 text-sm mt-0.5">{chess.length + ludo.length} active sessions</p>
      </div>

      {/* Chess */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
          <span className="text-xl">♟️</span>
          <h3 className="font-semibold text-white">Chess</h3>
          <span className="ml-auto px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-xs">{chess.length} active</span>
        </div>
        {chess.length === 0 ? (
          <p className="text-center py-10 text-white/30 text-sm">No active chess games</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">White</th>
                  <th className="px-5 py-3 text-left">Black</th>
                  <th className="px-5 py-3 text-left">Time Control</th>
                  <th className="px-5 py-3 text-left">Duration</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {chess.map((g: any) => (
                  <tr key={g.id} className="hover:bg-white/5">
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">{g.whitePlayer?.profile?.displayName || g.whitePlayer?.username}</div>
                      <div className="text-xs text-white/40">⏱ {Math.floor(g.whiteTime / 60)}:{String(g.whiteTime % 60).padStart(2, '0')}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">{g.blackPlayer?.profile?.displayName || g.blackPlayer?.username}</div>
                      <div className="text-xs text-white/40">⏱ {Math.floor(g.blackTime / 60)}:{String(g.blackTime % 60).padStart(2, '0')}</div>
                    </td>
                    <td className="px-5 py-3 text-white/60">{g.timeControl === 0 ? '∞' : `${g.timeControl / 60}min`}</td>
                    <td className="px-5 py-3 text-white/60">{elapsed(g.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-xs">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ludo */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
          <span className="text-xl">🎲</span>
          <h3 className="font-semibold text-white">Ludo</h3>
          <span className="ml-auto px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-xs">{ludo.length} active</span>
        </div>
        {ludo.length === 0 ? (
          <p className="text-center py-10 text-white/30 text-sm">No active Ludo games</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Host</th>
                  <th className="px-5 py-3 text-left">Mode</th>
                  <th className="px-5 py-3 text-left">Players</th>
                  <th className="px-5 py-3 text-left">Current Turn</th>
                  <th className="px-5 py-3 text-left">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ludo.map((g: any) => {
                  const seats = Array.isArray(g.seats) ? g.seats : []
                  const players = seats.filter((s: any) => !s.isAI)
                  return (
                    <tr key={g.id} className="hover:bg-white/5">
                      <td className="px-5 py-3 font-medium text-white">
                        {g.createdBy?.profile?.displayName || g.createdBy?.username}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 text-xs">{g.mode}</span>
                      </td>
                      <td className="px-5 py-3 text-white/60">
                        {players.length} human{players.length !== 1 ? 's' : ''} + {seats.length - players.length} AI
                      </td>
                      <td className="px-5 py-3 text-white/60">
                        Seat {g.currentSeat + 1}{g.diceValue != null ? ` · rolled ${g.diceValue}` : ''}
                      </td>
                      <td className="px-5 py-3 text-white/60">{elapsed(g.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
