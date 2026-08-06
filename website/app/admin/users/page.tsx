'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const API = '/api'

interface User {
  id: string
  username: string
  phoneNumber?: string
  createdAt: string
  isSelfCustodial: boolean
  profile?: { displayName?: string; avatarUrl?: string }
  wallet?: { balanceMasheleni: number }
  _count: {
    ootdPosts: number
    posts: number
    sentMessages: number
    ludoGames: number
    whiteGames: number
    blackGames: number
    ridesAsRider: number
    ridesAsDriver: number
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [suspending, setSuspending] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/admin/users`)
      .then(r => r.json())
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.profile?.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phoneNumber || '').includes(search)
  )

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`Suspend ${name}? They will not be able to log in.`)) return
    setSuspending(id)
    await fetch(`${API}/admin/users/${id}/suspend`, { method: 'POST' })
    setSuspending(null)
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const totalGames = (u: User) => u._count.ludoGames + u._count.whiteGames + u._count.blackGames

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">Users</h2>
          <p className="text-white/40 text-sm mt-0.5">{users.length} total accounts</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search username, name, phone…"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 w-72"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Loading users…</div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-right">MSH</th>
                  <th className="px-4 py-3 text-right">Games</th>
                  <th className="px-4 py-3 text-right">Posts</th>
                  <th className="px-4 py-3 text-right">Messages</th>
                  <th className="px-4 py-3 text-right">Rides</th>
                  <th className="px-4 py-3 text-right">OOTD</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-white/30">No users found</td></tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 font-bold shrink-0">
                          {(u.profile?.displayName || u.username)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-violet-300 transition-colors">
                            {u.profile?.displayName || u.username}
                          </div>
                          <div className="text-xs text-white/40">@{u.username}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/50">{u.phoneNumber || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-400">
                      {Number(u.wallet?.balanceMasheleni ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-white/70">{totalGames(u)}</td>
                    <td className="px-4 py-3 text-right text-white/70">{u._count.posts}</td>
                    <td className="px-4 py-3 text-right text-white/70">{u._count.sentMessages}</td>
                    <td className="px-4 py-3 text-right text-white/70">{u._count.ridesAsRider}</td>
                    <td className="px-4 py-3 text-right text-white/70">{u._count.ootdPosts}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/users/${u.id}`}
                          className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 text-xs hover:bg-violet-600/40 transition-colors">
                          View
                        </Link>
                        <button
                          onClick={() => handleSuspend(u.id, u.profile?.displayName || u.username)}
                          disabled={suspending === u.id}
                          className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs hover:bg-red-600/40 transition-colors disabled:opacity-50">
                          {suspending === u.id ? '…' : 'Suspend'}
                        </button>
                      </div>
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
