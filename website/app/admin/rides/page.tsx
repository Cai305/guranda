'use client'
import { useEffect, useState } from 'react'

const API = '/api'

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'bg-amber-500/20 text-amber-400',
  ACCEPTED: 'bg-blue-500/20 text-blue-400',
  IN_PROGRESS: 'bg-green-500/20 text-green-400',
  COMPLETED: 'bg-white/10 text-white/40',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

export default function RidesPage() {
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetch(`${API}/admin/rides`)
      .then(r => r.json())
      .then(setRides)
      .finally(() => setLoading(false))
  }, [])

  const statuses = ['ALL', 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  const filtered = filter === 'ALL' ? rides : rides.filter(r => r.status === filter)

  const counts: Record<string, number> = {}
  statuses.slice(1).forEach(s => { counts[s] = rides.filter(r => r.status === s).length })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Ride Requests</h2>
        <p className="text-white/40 text-sm mt-0.5">{rides.length} total rides</p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === s ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30' : 'bg-white/5 text-white/50 hover:text-white border border-transparent'
            }`}
          >
            {s === 'ALL' ? `All (${rides.length})` : `${s} (${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Loading rides…</div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Rider</th>
                  <th className="px-5 py-3 text-left">Driver</th>
                  <th className="px-5 py-3 text-left">Pickup</th>
                  <th className="px-5 py-3 text-left">Dropoff</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Fare</th>
                  <th className="px-5 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-white/30">No rides</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">{r.rider?.profile?.displayName || r.rider?.username || '—'}</div>
                      <div className="text-xs text-white/40">@{r.rider?.username}</div>
                    </td>
                    <td className="px-5 py-3 text-white/60">
                      {r.driver ? (
                        <>
                          <div>{r.driver.profile?.displayName || r.driver.username}</div>
                          {r.driver.driverProfile?.vehiclePlate && (
                            <div className="text-xs text-white/30 font-mono">{r.driver.driverProfile.vehiclePlate}</div>
                          )}
                        </>
                      ) : <span className="text-white/30">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3 text-white/60 max-w-36">
                      <div className="truncate">{r.pickupAddress || `${r.pickupLat?.toFixed(4)}, ${r.pickupLng?.toFixed(4)}`}</div>
                    </td>
                    <td className="px-5 py-3 text-white/60 max-w-36">
                      <div className="truncate">{r.dropoffAddress || `${r.dropoffLat?.toFixed(4)}, ${r.dropoffLng?.toFixed(4)}`}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLOR[r.status] || 'bg-white/10 text-white/40'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-amber-400">
                      {r.fare ? `R${Number(r.fare).toFixed(0)}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs">
                      {new Date(r.createdAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
