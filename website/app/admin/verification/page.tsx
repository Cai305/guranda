'use client'
import { useEffect, useState } from 'react'

const API = '/api'

interface Business {
  id: string
  name: string
  registrationNumber?: string
  documents: string[]
}

interface Certificate {
  id: string
  title: string
  issuer?: string
  fileUrl: string
}

interface Verification {
  id: string
  userId: string
  status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  firstName: string
  lastName: string
  occupation: string
  idType?: string
  idNumber?: string
  idDocumentUrl?: string
  hasBusiness: boolean
  isGraduate: boolean
  submittedAt?: string
  rejectionReason?: string
  user: { id: string; username: string; profile?: { displayName?: string } }
  businesses: Business[]
  certificates: Certificate[]
}

const TABS = [
  { key: 'PENDING', label: 'Pending review' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
]

export default function VerificationPage() {
  const [tab, setTab] = useState('PENDING')
  const [items, setItems] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = (status: string) => {
    setLoading(true)
    fetch(`${API}/admin/verifications?status=${status}`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  const approve = async (id: string) => {
    setBusy(id)
    await fetch(`${API}/admin/verifications/${id}/approve`, { method: 'POST' })
    setBusy(null)
    setItems(prev => prev.filter(v => v.id !== id))
  }

  const reject = async (id: string) => {
    setBusy(id)
    await fetch(`${API}/admin/verifications/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason || 'Documents could not be verified' }),
    })
    setBusy(null)
    setRejecting(null)
    setRejectReason('')
    setItems(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Account Verification</h2>
        <p className="text-white/40 text-sm mt-0.5">
          ID-only submissions auto-approve. Business or certificate claims land here for manual review.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40' : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/30">
          Nothing here right now
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(v => (
            <div key={v.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{v.firstName} {v.lastName}</span>
                    <span className="text-white/40 text-sm">@{v.user.username}</span>
                  </div>
                  <div className="text-white/50 text-sm mt-0.5">{v.occupation}</div>
                  {v.submittedAt && (
                    <div className="text-white/30 text-xs mt-1">Submitted {new Date(v.submittedAt).toLocaleString()}</div>
                  )}
                  {v.status === 'REJECTED' && v.rejectionReason && (
                    <div className="text-red-400 text-xs mt-1">Reason: {v.rejectionReason}</div>
                  )}
                </div>
                {tab === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approve(v.id)}
                      disabled={busy === v.id}
                      className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 text-xs font-medium hover:bg-green-600/40 transition-colors disabled:opacity-50"
                    >
                      {busy === v.id ? '…' : 'Approve'}
                    </button>
                    {rejecting === v.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Reason…"
                          className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none w-40"
                        />
                        <button
                          onClick={() => reject(v.id)}
                          disabled={busy === v.id}
                          className="px-3 py-1.5 rounded-lg bg-red-600/30 text-red-300 text-xs font-medium hover:bg-red-600/50 transition-colors disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRejecting(v.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs font-medium hover:bg-red-600/40 transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-4 text-sm">
                <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                  <div className="text-white/40 text-xs uppercase tracking-wide mb-1">ID Document</div>
                  <div className="text-white/70">{v.idType || '—'} · {v.idNumber || '—'}</div>
                  {v.idDocumentUrl && (
                    <a href={v.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 text-xs mt-1 inline-block">
                      View document →
                    </a>
                  )}
                </div>
                <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                  <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Business</div>
                  {v.businesses.length === 0 ? (
                    <div className="text-white/30">None claimed</div>
                  ) : v.businesses.map(b => (
                    <div key={b.id} className="text-white/70">
                      {b.name} {b.registrationNumber && <span className="text-white/40">· {b.registrationNumber}</span>}
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {b.documents.map((d, i) => (
                          <a key={i} href={d} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 text-xs">
                            Doc {i + 1} →
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                  <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Certificates</div>
                  {v.certificates.length === 0 ? (
                    <div className="text-white/30">None claimed</div>
                  ) : v.certificates.map(c => (
                    <div key={c.id} className="text-white/70">
                      {c.title} {c.issuer && <span className="text-white/40">· {c.issuer}</span>}
                      <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 text-xs ml-2">
                        View →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
