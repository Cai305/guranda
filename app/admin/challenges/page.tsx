'use client'
import { useEffect, useState } from 'react'

const API = '/api'

interface Challenge {
  id: string
  title: string
  description: string
  category: string
  type: string
  status: string
  startAt: string
  endAt: string
  xpReward: number
  bonusXpReward: number
  coverImageUrl?: string
  sponsorLabel?: string
  createdAt: string
  winningEntryId?: string
}

interface Sponsorship {
  id: string
  status: string
  brandName: string
  contactEmail?: string
  description?: string
  proposedBudget?: number
  createdAt: string
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-white/10 text-white/50',
  ACTIVE: 'bg-green-500/20 text-green-400',
  ENDED: 'bg-white/10 text-white/30',
  CANCELLED: 'bg-red-500/20 text-red-400',
  PENDING: 'bg-amber-500/20 text-amber-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
}

const CATEGORIES = ['FASHION', 'FITNESS', 'FOOD', 'ART', 'MUSIC', 'GAMING', 'TRAVEL', 'EDUCATION', 'LIFESTYLE', 'COMEDY']
const TYPES = ['DAILY', 'FLASH', 'WEEKEND', 'SEASONAL', 'SPONSORED']

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-15 blur-lg ${color}`} />
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-black text-white tracking-tight">{value}</div>
      <div className="text-sm text-white/50 mt-1">{label}</div>
    </div>
  )
}

const BLANK_FORM = {
  title: '', description: '', promptText: '', category: 'FASHION', type: 'DAILY',
  startAt: '', endAt: '', xpReward: 50, bonusXpReward: 100, coverImageUrl: '', sponsorLabel: '',
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'challenges' | 'create' | 'sponsorships'>('challenges')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState({ ...BLANK_FORM })
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateCount, setGenerateCount] = useState(3)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch(`${API}/admin/challenges`).then(r => r.json()),
      fetch(`${API}/admin/challenges/sponsorships`).then(r => r.json()),
    ]).then(([c, s]) => {
      setChallenges(Array.isArray(c) ? c : [])
      setSponsorships(Array.isArray(s) ? s : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const action = async (id: string, endpoint: string, method = 'POST') => {
    setBusy(id)
    await fetch(`${API}/admin/challenges/${endpoint}`, { method })
    setBusy(null)
    load()
  }

  const approveSponsor = async (id: string) => {
    setBusy(id)
    await fetch(`${API}/admin/challenges/sponsorships/${id}/approve`, { method: 'POST' })
    setBusy(null)
    setSponsorships(prev => prev.filter(s => s.id !== id))
  }

  const rejectSponsor = async (id: string) => {
    setBusy(id)
    await fetch(`${API}/admin/challenges/sponsorships/${id}/reject`, { method: 'POST' })
    setBusy(null)
    setSponsorships(prev => prev.filter(s => s.id !== id))
  }

  const submitCreate = async () => {
    if (!form.title || !form.description || !form.startAt || !form.endAt) {
      setFormError('Title, description, start date and end date are required.')
      return
    }
    setFormError('')
    setFormSaving(true)
    const res = await fetch(`${API}/admin/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setFormSaving(false)
    if (res.ok) {
      setForm({ ...BLANK_FORM })
      setTab('challenges')
      load()
    } else {
      const err = await res.json().catch(() => ({}))
      setFormError(err?.message || 'Failed to create challenge.')
    }
  }

  const generate = async () => {
    setGenerating(true)
    await fetch(`${API}/admin/challenges/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: generateCount }),
    })
    setGenerating(false)
    setTab('challenges')
    load()
  }

  const statuses = ['ALL', 'DRAFT', 'ACTIVE', 'ENDED']
  const filtered = challenges.filter(c => {
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const counts: Record<string, number> = {}
  statuses.slice(1).forEach(s => { counts[s] = challenges.filter(c => c.status === s).length })
  const pendingSponsorships = sponsorships.filter(s => s.status === 'PENDING').length

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white/40 text-sm animate-pulse">Loading challenges…</div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Challenges</h2>
        <p className="text-white/40 text-sm mt-0.5">Create, publish, moderate challenges and review sponsorships</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🔥" label="Active" value={counts['ACTIVE'] ?? 0} color="bg-green-500" />
        <StatCard icon="📝" label="Drafts" value={counts['DRAFT'] ?? 0} color="bg-violet-500" />
        <StatCard icon="🏁" label="Ended" value={counts['ENDED'] ?? 0} color="bg-white" />
        <StatCard icon="🤝" label="Pending Sponsorships" value={pendingSponsorships} color="bg-amber-500" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['challenges', 'create', 'sponsorships'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
            }`}>
            {t === 'sponsorships'
              ? `Sponsorships${pendingSponsorships ? ` (${pendingSponsorships})` : ''}`
              : t === 'create' ? '+ Create / Generate' : 'All Challenges'}
          </button>
        ))}
      </div>

      {/* Challenges list tab */}
      {tab === 'challenges' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            {statuses.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                    : 'bg-white/5 text-white/50 hover:text-white border border-transparent'
                }`}>
                {s === 'ALL' ? `All (${challenges.length})` : `${s} (${counts[s] ?? 0})`}
              </button>
            ))}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title or category…"
              className="ml-auto bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 w-60"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/30">
              {challenges.length === 0 ? 'No challenges yet' : 'No results'}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">Title</th>
                      <th className="px-5 py-3 text-left">Category</th>
                      <th className="px-5 py-3 text-left">Type</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Window</th>
                      <th className="px-5 py-3 text-right">XP</th>
                      <th className="px-5 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map(c => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-white max-w-48 truncate">{c.title}</div>
                          {c.sponsorLabel && <div className="text-xs text-amber-400 mt-0.5">🤝 {c.sponsorLabel}</div>}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-white/60 text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10">{c.category}</span>
                        </td>
                        <td className="px-5 py-3 text-white/50 text-xs">{c.type}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLOR[c.status] || 'bg-white/10 text-white/40'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-white/40 text-xs">
                          <div>{new Date(c.startAt).toLocaleDateString()}</div>
                          <div>→ {new Date(c.endAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-5 py-3 text-right text-violet-300 font-mono text-xs">{c.xpReward}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {c.status === 'DRAFT' && (
                              <button onClick={() => action(c.id, `${c.id}/publish`)}
                                disabled={busy === c.id}
                                className="px-2.5 py-1 rounded-lg bg-green-600/20 text-green-400 text-xs hover:bg-green-600/40 transition-colors disabled:opacity-50">
                                {busy === c.id ? '…' : 'Publish'}
                              </button>
                            )}
                            {c.status === 'ACTIVE' && (
                              <button onClick={() => action(c.id, `${c.id}/end`)}
                                disabled={busy === c.id}
                                className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs hover:bg-red-600/40 transition-colors disabled:opacity-50">
                                {busy === c.id ? '…' : 'End'}
                              </button>
                            )}
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
      )}

      {/* Create / Generate tab */}
      {tab === 'create' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Manual create form */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-white text-sm">✍️ Create Challenge Manually</h3>
            </div>
            <div className="p-5 space-y-4">
              {formError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">{formError}</div>
              )}
              {(['title', 'description', 'promptText', 'coverImageUrl', 'sponsorLabel'] as const).map(field => (
                <div key={field}>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block capitalize">
                    {field === 'promptText' ? 'Prompt Text' : field === 'coverImageUrl' ? 'Cover Image URL' : field === 'sponsorLabel' ? 'Sponsor Label' : field}
                    {['title', 'description'].includes(field) && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {field === 'description' || field === 'promptText' ? (
                    <textarea rows={3} value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 resize-none" />
                  ) : (
                    <input value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" />
                  )}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">Category <span className="text-red-400">*</span></label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">Type <span className="text-red-400">*</span></label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">Start At <span className="text-red-400">*</span></label>
                  <input type="datetime-local" value={form.startAt}
                    onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">End At <span className="text-red-400">*</span></label>
                  <input type="datetime-local" value={form.endAt}
                    onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">XP Reward</label>
                  <input type="number" value={form.xpReward}
                    onChange={e => setForm(f => ({ ...f, xpReward: Number(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">Bonus XP (winner)</label>
                  <input type="number" value={form.bonusXpReward}
                    onChange={e => setForm(f => ({ ...f, bonusXpReward: Number(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                </div>
              </div>
              <button onClick={submitCreate} disabled={formSaving}
                className="w-full py-2.5 rounded-xl bg-violet-600/30 text-violet-300 text-sm font-medium border border-violet-500/40 hover:bg-violet-600/50 transition-colors disabled:opacity-50">
                {formSaving ? 'Creating…' : 'Create as Draft'}
              </button>
            </div>
          </div>

          {/* AI Generate */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden self-start">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-white text-sm">✨ AI-Generate Challenges</h3>
              <p className="text-xs text-white/40 mt-0.5">Proposals land as DRAFT — always reviewed before publishing</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">How many to generate</label>
                <input type="number" min={1} max={10} value={generateCount}
                  onChange={e => setGenerateCount(Number(e.target.value))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
              </div>
              <button onClick={generate} disabled={generating}
                className="w-full py-2.5 rounded-xl bg-pink-600/20 text-pink-300 text-sm font-medium border border-pink-500/30 hover:bg-pink-600/40 transition-colors disabled:opacity-50">
                {generating ? 'Generating…' : `Generate ${generateCount} challenge${generateCount !== 1 ? 's' : ''}`}
              </button>
              <p className="text-xs text-white/30">
                Uses the platform AI to propose challenge content. Requires AI feature flag to be enabled and an API key configured on the backend.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sponsorships tab */}
      {tab === 'sponsorships' && (
        <div className="space-y-3">
          {sponsorships.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/30">
              No sponsorship requests yet
            </div>
          ) : (
            sponsorships.map(s => (
              <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{s.brandName}</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLOR[s.status] || 'bg-white/10 text-white/40'}`}>
                        {s.status}
                      </span>
                    </div>
                    {s.contactEmail && <div className="text-white/50 text-sm mt-0.5">{s.contactEmail}</div>}
                    {s.description && <div className="text-white/40 text-sm mt-1 max-w-lg">{s.description}</div>}
                    <div className="flex items-center gap-4 mt-2">
                      {s.proposedBudget != null && (
                        <span className="text-amber-400 text-sm font-mono">R{Number(s.proposedBudget).toFixed(0)} proposed</span>
                      )}
                      <span className="text-white/30 text-xs">{new Date(s.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {s.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => approveSponsor(s.id)} disabled={busy === s.id}
                        className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 text-xs font-medium hover:bg-green-600/40 transition-colors disabled:opacity-50">
                        {busy === s.id ? '…' : 'Approve'}
                      </button>
                      <button onClick={() => rejectSponsor(s.id)} disabled={busy === s.id}
                        className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs font-medium hover:bg-red-600/40 transition-colors disabled:opacity-50">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
