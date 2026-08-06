'use client'
import { useEffect, useState } from 'react'

const API = '/api'

interface Deposit {
  id: string
  userId: string
  reference: string
  method: string
  amountZar: number
  status: 'PENDING' | 'PAID' | 'REJECTED'
  adminNote?: string
  createdAt: string
  confirmedAt?: string
  user: { username: string }
}

export default function DepositsPage() {
  const [items, setItems] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/deposits`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const confirm = async (id: string) => {
    setBusy(id)
    await fetch(`${API}/admin/deposits/${id}/confirm`, { method: 'POST' })
    setBusy(null)
    setItems(prev => prev.filter(d => d.id !== id))
  }

  const reject = async (id: string) => {
    setBusy(id)
    await fetch(`${API}/admin/deposits/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminNote: rejectReason || 'Payment could not be confirmed' }),
    })
    setBusy(null)
    setRejecting(null)
    setRejectReason('')
    setItems(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Deposits</h2>
        <p className="text-white/40 text-sm mt-0.5">
          PayShap deposit requests waiting on payment confirmation. Confirming credits MSH straight to the user&apos;s wallet.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/30">
          No pending deposits
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(d => (
            <div key={d.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">R{Number(d.amountZar).toFixed(2)}</span>
                    <span className="text-white/40 text-sm">@{d.user.username}</span>
                    <span className="text-xs text-white/30 px-2 py-0.5 rounded-full border border-white/10">{d.method}</span>
                  </div>
                  <div className="text-white/50 text-sm mt-0.5 font-mono">{d.reference}</div>
                  <div className="text-white/30 text-xs mt-1">Requested {new Date(d.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => confirm(d.id)}
                    disabled={busy === d.id}
                    className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 text-xs font-medium hover:bg-green-600/40 transition-colors disabled:opacity-50"
                  >
                    {busy === d.id ? '…' : 'Confirm paid'}
                  </button>
                  {rejecting === d.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason…"
                        className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none w-40"
                      />
                      <button
                        onClick={() => reject(d.id)}
                        disabled={busy === d.id}
                        className="px-3 py-1.5 rounded-lg bg-red-600/30 text-red-300 text-xs font-medium hover:bg-red-600/50 transition-colors disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRejecting(d.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs font-medium hover:bg-red-600/40 transition-colors"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
