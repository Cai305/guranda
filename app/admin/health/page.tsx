'use client'
import { useEffect, useState, useCallback } from 'react'

const API = '/api'
const REFRESH_INTERVAL = 30_000 // 30 seconds

interface ServiceStatus {
  name: string
  status: 'ok' | 'error' | 'warning'
  latencyMs: number
  note: string
}

interface HealthCounters {
  userCount: number
  walletCount: number
  activeRides: number
  liveRooms: number
  pendingDeposits: number
  openVerifications: number
  failedAiLast1h: number
  suspendedUsers: number
}

interface HealthData {
  status: 'healthy' | 'degraded'
  checkedAt: string
  apiLatencyMs: number
  services: ServiceStatus[]
  counters: HealthCounters
}

function StatusBadge({ status }: { status: 'ok' | 'error' | 'warning' | 'healthy' | 'degraded' }) {
  const map = {
    ok:       'bg-green-500/20 text-green-400 border-green-500/30',
    healthy:  'bg-green-500/20 text-green-400 border-green-500/30',
    warning:  'bg-amber-500/20 text-amber-400 border-amber-500/30',
    error:    'bg-red-500/20 text-red-400 border-red-500/30',
    degraded: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  const dots = {
    ok: 'bg-green-400', healthy: 'bg-green-400',
    warning: 'bg-amber-400', error: 'bg-red-400', degraded: 'bg-red-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]} ${status === 'ok' || status === 'healthy' ? 'animate-pulse' : ''}`} />
      {status.toUpperCase()}
    </span>
  )
}

interface CounterItem {
  label: string
  value: number
  icon: string
  alert?: boolean
  alertWhen?: (v: number) => boolean
}

function CounterCard({ label, value, icon, alertWhen }: CounterItem) {
  const isAlert = alertWhen ? alertWhen(value) : false
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur transition-colors ${
      isAlert
        ? 'border-red-500/30 bg-red-500/5'
        : 'border-white/10 bg-white/5'
    }`}>
      <div className="text-2xl mb-3">{icon}</div>
      <div className={`text-3xl font-black tracking-tight ${isAlert ? 'text-red-400' : 'text-white'}`}>{value}</div>
      <div className="text-sm text-white/50 mt-1">{label}</div>
      {isAlert && (
        <div className="mt-1 text-xs text-red-400/70">Needs attention</div>
      )}
    </div>
  )
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000)

  const fetchHealth = useCallback(() => {
    fetch(`${API}/admin/health`)
      .then(r => r.json())
      .then((d: any) => {
        if (!d || d.message || d.error || !d.counters) {
          setData({
            status: 'degraded',
            checkedAt: new Date().toISOString(),
            apiLatencyMs: 0,
            services: [{
              name: 'API Server',
              status: 'error',
              latencyMs: 0,
              note: d?.message || d?.error || 'Endpoint returned an unexpected response',
            }],
            counters: {
              userCount: 0, walletCount: 0, activeRides: 0, liveRooms: 0,
              pendingDeposits: 0, openVerifications: 0, failedAiLast1h: 0, suspendedUsers: 0,
            },
          })
          return
        }
        setData(d)
        setLastRefresh(new Date())
        setCountdown(REFRESH_INTERVAL / 1000)
      })
      .catch(() => {
        // API is unreachable — surface as degraded
        setData({
          status: 'degraded',
          checkedAt: new Date().toISOString(),
          apiLatencyMs: 0,
          services: [{
            name: 'API Server',
            status: 'error',
            latencyMs: 0,
            note: 'Could not reach the admin proxy',
          }],
          counters: {
            userCount: 0, walletCount: 0, activeRides: 0, liveRooms: 0,
            pendingDeposits: 0, openVerifications: 0, failedAiLast1h: 0, suspendedUsers: 0,
          },
        })
        setLastRefresh(new Date())
        setCountdown(REFRESH_INTERVAL / 1000)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchHealth])

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : REFRESH_INTERVAL / 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  const COUNTERS: CounterItem[] = data ? [
    { label: 'Total Users',          value: data.counters.userCount,          icon: '👥' },
    { label: 'Wallets',               value: data.counters.walletCount,         icon: '👛' },
    { label: 'Active Rides',          value: data.counters.activeRides,         icon: '🚗', alertWhen: v => v > 50 },
    { label: 'Live Streams',          value: data.counters.liveRooms,           icon: '📡' },
    { label: 'Pending Deposits',      value: data.counters.pendingDeposits,     icon: '💳', alertWhen: v => v > 10 },
    { label: 'Open Verifications',    value: data.counters.openVerifications,   icon: '🛡️', alertWhen: v => v > 20 },
    { label: 'AI Failures (1h)',      value: data.counters.failedAiLast1h,      icon: '🤖', alertWhen: v => v > 5 },
    { label: 'Suspended Users',       value: data.counters.suspendedUsers,      icon: '🚫', alertWhen: v => v > 0 },
  ] : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">System Health</h2>
          <p className="text-white/40 text-sm mt-0.5">
            Real-time monitoring — auto-refreshes every {REFRESH_INTERVAL / 1000}s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && <StatusBadge status={data.status} />}
          <button
            onClick={fetchHealth}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
          >
            ↻ Refresh now
          </button>
          <div className="text-xs text-white/30 tabular-nums">
            Next in {countdown}s
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-64 text-white/40 text-sm animate-pulse">
          Checking systems…
        </div>
      ) : data ? (
        <>
          {/* Last checked */}
          <div className="text-xs text-white/30">
            Last checked: {lastRefresh?.toLocaleTimeString()} · API responded in {data.apiLatencyMs}ms
          </div>

          {/* Service status cards */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Services</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.services.map(svc => (
                <div
                  key={svc.name}
                  className={`rounded-2xl border p-5 backdrop-blur ${
                    svc.status === 'ok'
                      ? 'border-green-500/20 bg-green-500/5'
                      : svc.status === 'warning'
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-white text-sm">{svc.name}</span>
                    <StatusBadge status={svc.status} />
                  </div>
                  <div className="text-xs text-white/40 space-y-1">
                    {svc.latencyMs > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Latency</span>
                        <span className={`font-mono ${svc.latencyMs > 500 ? 'text-amber-400' : 'text-green-400'}`}>
                          {svc.latencyMs}ms
                        </span>
                      </div>
                    )}
                    <div className="text-white/30">{svc.note}</div>
                  </div>
                </div>
              ))}

              {/* Website (Next.js) — we know it's up if this page loads */}
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 backdrop-blur">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-white text-sm">Website (Next.js)</span>
                  <StatusBadge status="ok" />
                </div>
                <div className="text-xs text-white/30">This admin dashboard is running</div>
              </div>
            </div>
          </div>

          {/* Live counters */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Live Counters</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {COUNTERS.map(c => (
                <CounterCard key={c.label} {...c} />
              ))}
            </div>
          </div>

          {/* Alert summary */}
          {COUNTERS.some(c => c.alertWhen?.(c.value)) && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <h3 className="text-sm font-semibold text-red-400 mb-3">⚠️ Alerts</h3>
              <div className="space-y-2">
                {COUNTERS.filter(c => c.alertWhen?.(c.value)).map(c => (
                  <div key={c.label} className="flex items-center gap-2 text-sm text-red-300/80">
                    <span>{c.icon}</span>
                    <span>{c.label}: <strong>{c.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All clear */}
          {!COUNTERS.some(c => c.alertWhen?.(c.value)) && data.status === 'healthy' && (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="text-sm font-semibold text-green-400">All systems operational</div>
                <div className="text-xs text-white/30 mt-0.5">No alerts — everything looks good</div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
