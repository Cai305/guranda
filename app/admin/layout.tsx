'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'

// Proxied server-side via app/api/admin/[...path]/route.ts.
const API = '/api'
export { API }

const nav = [
  { href: '/admin', label: 'Overview', icon: '📊', exact: true },
  { href: '/admin/health', label: 'Health', icon: '🟢' },
  { href: '/admin/ai-usage', label: 'AI Usage', icon: '🤖' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/verification', label: 'Verification', icon: '🛡️' },
  { href: '/admin/trust-safety', label: 'Trust & Safety', icon: '🚩' },
  { href: '/admin/deposits', label: 'Deposits', icon: '💳' },
  { href: '/admin/revenue', label: 'Revenue', icon: '💰' },
  { href: '/admin/feature-flags', label: 'Feature Flags', icon: '🎛️' },
  { href: '/admin/cards', label: 'Cards', icon: '🃏' },
  { href: '/admin/challenges', label: 'Challenges', icon: '🏆' },
  { href: '/admin/gaming', label: 'Gaming', icon: '🎮' },
  { href: '/admin/rides', label: 'Rides', icon: '🚗' },
  { href: '/admin/live', label: 'Live', icon: '📡' },
  { href: '/admin/stories', label: 'Stories', icon: '👗' },
  { href: '/admin/discovery', label: 'Discovery', icon: '▶️' },
  { href: '/admin/economy', label: 'Economy', icon: '💹' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen bg-black/60 flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 flex flex-col h-screen
        bg-white/5 backdrop-blur-xl border-r border-white/10
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-auto lg:shrink-0
      `}>
        <div className="p-5 border-b border-white/10 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Guranda</span>
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-0.5">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-white/10 shrink-0">
          <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">← Back to site</Link>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="shrink-0 flex items-center gap-4 px-5 py-3.5 bg-black/80 backdrop-blur border-b border-white/10">
          <button
            className="lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-white/80">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/40">API connected</span>
          </div>
        </header>
        <main className="flex-1 p-5 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
