'use client'
import { useEffect, useState } from 'react'

const API = '/api'

type Access = 'ALL' | 'VERIFIED_ONLY' | 'OFF'

const LABELS: Record<string, { label: string; icon: string }> = {
  ai: { label: 'AI Companion', icon: '✨' },
  discovery: { label: 'Discovery', icon: '▶️' },
  live: { label: 'Live', icon: '📡' },
  social: { label: 'Social', icon: '💬' },
  games: { label: 'Games (all)', icon: '🎮' },
  ludo: { label: 'Ludo', icon: '🎲' },
  chess: { label: 'Chess', icon: '♟️' },
  murabaraba: { label: 'Murabaraba', icon: '🔲' },
  pool: { label: '8-Ball Pool', icon: '🎱' },
  wordbattle: { label: 'Word Battle', icon: '🔤' },
  marketplace: { label: 'Marketplace', icon: '🛍️' },
  shopping: { label: 'Shopping', icon: '🛒' },
  travel: { label: 'Travel', icon: '✈️' },
  work: { label: 'Work', icon: '💼' },
  health: { label: 'Health', icon: '🩺' },
  finance: { label: 'Finance', icon: '💹' },
  learning: { label: 'Learning', icon: '🎓' },
  moonbase: { label: 'MoonBase 2.0', icon: '🌕' },
  ride: { label: 'Ride', icon: '🚗' },
  eat: { label: 'Eat', icon: '🍽️' },
  property: { label: 'Property', icon: '🏠' },
  miniapps: { label: 'Mini Apps', icon: '🧩' },
  wallet: { label: 'Wallet', icon: '👛' },
  creatorFunds: { label: 'Creator Funds', icon: '💸' },
}

const ACCESS_OPTIONS: { key: Access; label: string; color: string }[] = [
  { key: 'ALL', label: 'Everyone', color: 'green' },
  { key: 'VERIFIED_ONLY', label: 'Verified only', color: 'amber' },
  { key: 'OFF', label: 'Off', color: 'red' },
]

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<Record<string, Access>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/admin/feature-flags`)
      .then(r => r.json())
      .then(setFlags)
      .finally(() => setLoading(false))
  }, [])

  const setAccess = async (key: string, access: Access) => {
    setSaving(key)
    setFlags(prev => ({ ...prev, [key]: access }))
    await fetch(`${API}/admin/feature-flags/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access }),
    })
    setSaving(null)
  }

  const keys = Object.keys(LABELS).filter(k => k in flags || true)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Feature Flags</h2>
        <p className="text-white/40 text-sm mt-0.5">
          Control who can access each module, game and mini-app — changes apply live on the next app refresh.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Loading…</div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden divide-y divide-white/5">
          {keys.map(key => {
            const current = flags[key] ?? 'ALL'
            const meta = LABELS[key]
            return (
              <div key={key} className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{meta.icon}</span>
                  <span className="text-white font-medium text-sm">{meta.label}</span>
                </div>
                <div className="flex gap-1.5">
                  {ACCESS_OPTIONS.map(opt => {
                    const active = current === opt.key
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAccess(key, opt.key)}
                        disabled={saving === key}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                          active
                            ? opt.color === 'green' ? 'bg-green-600/30 text-green-300 border border-green-500/40'
                            : opt.color === 'amber' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                            : 'bg-red-600/30 text-red-300 border border-red-500/40'
                            : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/70'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
