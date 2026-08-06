'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'

const API = '/api'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/10">
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${color}`}>{label}</span>
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/admin/users/${id}`)
      .then(r => r.json())
      .then(setUser)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-white/40">Loading user…</div>
  if (!user || user.message) return <div className="text-red-400">User not found</div>

  const name = user.profile?.displayName || user.username
  const totalGames = (user.whiteGames?.length ?? 0) + (user.blackGames?.length ?? 0) + (user.ludoGames?.length ?? 0)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link href="/admin/users" className="text-sm text-white/40 hover:text-white/80 transition-colors">← All Users</Link>

      {/* Header */}
      <div className="flex items-start gap-5 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="w-16 h-16 rounded-2xl bg-violet-600/30 flex items-center justify-center text-2xl font-black text-violet-300 shrink-0">
          {name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <Badge label={`@${user.username}`} color="bg-white/10 text-white/50" />
            {user.isSelfCustodial && <Badge label="Self-custodial" color="bg-amber-500/20 text-amber-400" />}
          </div>
          <div className="text-sm text-white/40 mt-1">{user.phoneNumber || 'No phone'} · Joined {new Date(user.createdAt).toLocaleDateString('en-ZA', { dateStyle: 'long' })}</div>
          {user.profile?.bio && <p className="text-sm text-white/60 mt-2">{user.profile.bio}</p>}
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <span className="text-white/50"><span className="text-amber-400 font-bold">{Number(user.wallet?.balanceMasheleni ?? 0).toFixed(2)}</span> MSH</span>
            <span className="text-white/50"><span className="text-violet-300 font-bold">{totalGames}</span> Games</span>
            <span className="text-white/50"><span className="text-blue-300 font-bold">{user.posts?.length ?? 0}</span> Posts</span>
            <span className="text-white/50"><span className="text-pink-300 font-bold">{user.ootdPosts?.length ?? 0}</span> OOTDs</span>
            <span className="text-white/50"><span className="text-green-300 font-bold">{user.ridesAsRider?.length ?? 0}</span> Rides taken</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Wallet */}
        <Section title="💰 Wallet">
          <div className="text-3xl font-black text-amber-400 mb-1">{Number(user.wallet?.balanceMasheleni ?? 0).toFixed(2)} MSH</div>
          <div className="text-xs text-white/30 mb-4">XRPL: {user.wallet?.xrplAddress || 'Custodial'}</div>
          {user.wallet?.transactions?.length > 0 ? (
            <div className="space-y-2">
              {user.wallet.transactions.slice(0, 8).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge label={tx.type} color={tx.type === 'RECEIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} />
                    <span className="text-white/40 text-xs">{new Date(tx.timestamp).toLocaleDateString()}</span>
                  </div>
                  <span className={`font-mono font-bold ${tx.type === 'RECEIVE' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'RECEIVE' ? '+' : '-'}{Number(tx.amount).toFixed(2)} MSH
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-white/30 text-sm">No transactions</p>}
        </Section>

        {/* Driver profile */}
        <Section title="🚗 Driver Profile">
          {user.driverProfile ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/40">Status</span>
                <Badge label={user.driverProfile.isOnline ? 'Online' : 'Offline'} color={user.driverProfile.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'} />
              </div>
              <div className="flex justify-between"><span className="text-white/40">Vehicle</span><span className="text-white">{user.driverProfile.vehicleMake} {user.driverProfile.vehicleModel}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Plate</span><span className="text-white font-mono">{user.driverProfile.vehiclePlate}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Rating</span><span className="text-amber-400">★ {user.driverProfile.rating.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Total rides</span><span className="text-white">{user.driverProfile.totalRides}</span></div>
            </div>
          ) : <p className="text-white/30 text-sm">Not a driver</p>}
        </Section>

        {/* Recent games */}
        <Section title="🎮 Recent Games">
          {totalGames === 0 ? <p className="text-white/30 text-sm">No games played</p> : (
            <div className="space-y-2">
              {user.ludoGames?.slice(0, 5).map((g: any) => (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Ludo · {g.mode}</span>
                  <div className="flex items-center gap-2">
                    <Badge label={g.status} color={g.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'} />
                    <span className="text-white/30 text-xs">{new Date(g.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {user.whiteGames?.slice(0, 3).map((g: any) => (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Chess vs {g.blackPlayer?.profile?.displayName || g.blackPlayer?.username}</span>
                  <Badge label={g.status} color={g.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Rides taken */}
        <Section title="🛺 Rides">
          {user.ridesAsRider?.length === 0 && user.ridesAsDriver?.length === 0
            ? <p className="text-white/30 text-sm">No rides</p>
            : (
              <div className="space-y-2">
                {user.ridesAsRider?.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Rider: {r.pickupAddress || 'Unknown'} → {r.dropoffAddress || 'Unknown'}</span>
                    <div className="flex items-center gap-2">
                      <Badge label={r.status} color={
                        r.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                        r.status === 'REQUESTED' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-white/10 text-white/40'
                      } />
                      {r.fare && <span className="text-amber-400 font-mono text-xs">R{Number(r.fare).toFixed(0)}</span>}
                    </div>
                  </div>
                ))}
                {user.ridesAsDriver?.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-blue-300/70">Driver: {r.pickupAddress || '—'}</span>
                    <Badge label={r.status} color="bg-blue-500/20 text-blue-400" />
                  </div>
                ))}
              </div>
            )}
        </Section>

        {/* OOTD */}
        <Section title="👗 OOTD Posts">
          {user.ootdPosts?.length === 0 ? <p className="text-white/30 text-sm">No OOTD posts</p> : (
            <div className="space-y-2">
              {user.ootdPosts?.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70 truncate max-w-48">{p.description || 'No caption'}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-pink-400">♥ {p.votes?.length ?? 0}</span>
                    <span className="text-white/30 text-xs">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Social posts */}
        <Section title="📝 Social Posts">
          {user.posts?.length === 0 ? <p className="text-white/30 text-sm">No posts</p> : (
            <div className="space-y-2">
              {user.posts?.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70 truncate max-w-52">{p.content}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-red-400">♥ {p.likes?.length ?? 0}</span>
                    <span className="text-blue-400">💬 {p.comments?.length ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
