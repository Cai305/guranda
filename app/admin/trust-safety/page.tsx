'use client'
import { useEffect, useState, useCallback } from 'react'

const API = '/api'

type Flag = {
  id: string
  eventType: string
  aggregateId: string
  reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED'
  createdAt: string
}

const SEVERITY_STYLE: Record<Flag['severity'], string> = {
  HIGH: 'bg-red-600/30 text-red-300 border-red-500/40',
  MEDIUM: 'bg-amber-600/30 text-amber-300 border-amber-500/40',
  LOW: 'bg-white/10 text-white/50 border-white/10',
}

export default function TrustSafetyPage() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'OPEN' | 'ALL'>('OPEN')
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    const qs = filter === 'OPEN' ? '?status=OPEN' : ''
    const res = await fetch(`${API}/admin/trust-safety/flags${qs}`)
    setFlags(await res.json())
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const review = async (id: string, status: 'REVIEWED' | 'DISMISSED') => {
    setActing(id)
    await fetch(`${API}/admin/trust-safety/flags/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
    setActing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">Trust &amp; Safety</h2>
          <p className="text-white/40 text-sm mt-0.5">
            Automated flags raised from the event bus — every flag is reviewed here before any action is taken. Nothing auto-blocks.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(['OPEN', 'ALL'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setLoading(true); setFilter(f) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filter === f
                  ? 'bg-violet-600/30 text-violet-300 border-violet-500/40'
                  : 'bg-white/5 text-white/40 border-white/10 hover:text-white/70'
              }`}
            >
              {f === 'OPEN' ? 'Open only' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Loading…</div>
      ) : flags.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          {filter === 'OPEN' ? 'No open flags — the queue is clear.' : 'No flags yet.'}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden divide-y divide-white/5">
          {flags.map(flag => (
            <div key={flag.id} className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${SEVERITY_STYLE[flag.severity]}`}>
                    {flag.severity}
                  </span>
                  <span className="text-white/40 text-xs font-mono">{flag.eventType}</span>
                  <span className="text-white/25 text-xs">{new Date(flag.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-white text-sm">{flag.reason}</p>
                <p className="text-white/30 text-xs mt-0.5 font-mono truncate">{flag.aggregateId}</p>
              </div>
              {flag.status === 'OPEN' ? (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => review(flag.id, 'DISMISSED')}
                    disabled={acting === flag.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/80 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => review(flag.id, 'REVIEWED')}
                    disabled={acting === flag.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600/30 text-green-300 border border-green-500/40 hover:bg-green-600/40 disabled:opacity-50"
                  >
                    Mark reviewed
                  </button>
                </div>
              ) : (
                <span className="text-white/30 text-xs shrink-0">{flag.status}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
