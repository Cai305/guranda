'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const API = '/api'

const TX_COLOR: Record<string, string> = {
  RECEIVE: 'text-green-400',
  SEND: 'text-red-400',
  PAYMENT: 'text-amber-400',
}

export default function EconomyPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'wallets' | 'transactions'>('wallets')

  useEffect(() => {
    fetch(`${API}/admin/economy`)
      .then(r => r.json())
      .then((d: any) => {
        if (!d || d.message || d.error) return
        setData({
          ...d,
          wallets:      Array.isArray(d.wallets)      ? d.wallets      : [],
          transactions: Array.isArray(d.transactions) ? d.transactions : [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-white/40">Loading economy data…</div>

  const wallets: any[] = data?.wallets ?? []
  const transactions: any[] = data?.transactions ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">MSH Economy</h2>
        <p className="text-white/40 text-sm mt-0.5">Masheleni token circulation</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total MSH', value: `${Number(data?.totalMSH ?? 0).toFixed(2)} MSH`, color: 'text-amber-400' },
          { label: 'Avg per wallet', value: `${Number(data?.avgMSH ?? 0).toFixed(2)} MSH`, color: 'text-yellow-300' },
          { label: 'Transactions', value: transactions.length, color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('wallets')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'wallets' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/50 hover:text-white border border-transparent'}`}>
          Wallets ({wallets.length})
        </button>
        <button onClick={() => setTab('transactions')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'transactions' ? 'bg-white/10 text-white border border-white/20' : 'bg-white/5 text-white/50 hover:text-white border border-transparent'}`}>
          Transactions ({transactions.length})
        </button>
      </div>

      {tab === 'wallets' ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Rank</th>
                  <th className="px-5 py-3 text-left">User</th>
                  <th className="px-5 py-3 text-right">Balance (MSH)</th>
                  <th className="px-5 py-3 text-left">XRPL Address</th>
                  <th className="px-5 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {wallets.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-white/30">No wallets</td></tr>
                )}
                {wallets.map((w, i) => (
                  <tr key={w.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-white/30 text-xs">#{i + 1}</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/users/${w.userId}`} className="flex items-center gap-3 group">
                        <div className="w-7 h-7 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-300 text-xs font-bold shrink-0">
                          {(w.user?.profile?.displayName || w.user?.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-amber-300 transition-colors">
                            {w.user?.profile?.displayName || w.user?.username}
                          </div>
                          <div className="text-xs text-white/40">@{w.user?.username}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono font-bold text-amber-400 text-base">
                        {Number(w.balanceMasheleni).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {w.xrplAddress
                        ? <span className="font-mono text-xs text-white/40">{w.xrplAddress.slice(0, 16)}…</span>
                        : <span className="text-white/20 text-xs">Custodial</span>}
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs">{new Date(w.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">User</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-white/30">No transactions</td></tr>
                )}
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-white/5">
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">{tx.wallet?.user?.profile?.displayName || tx.wallet?.user?.username}</div>
                      <div className="text-xs text-white/40">@{tx.wallet?.user?.username}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${TX_COLOR[tx.type] || 'text-white/60'}`}>{tx.type}</span>
                    </td>
                    <td className={`px-5 py-3 text-right font-mono font-bold ${TX_COLOR[tx.type] || 'text-white'}`}>
                      {tx.type === 'RECEIVE' ? '+' : '-'}{Number(tx.amount).toFixed(2)} MSH
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs ${
                        tx.status === 'SUCCESS' ? 'bg-green-500/20 text-green-400' :
                        tx.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{tx.status}</span>
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs">
                      {new Date(tx.timestamp).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
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
