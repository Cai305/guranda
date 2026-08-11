'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaCalendarAlt, FaUsers, FaTrophy, FaArrowRight, FaRocket, FaVideo, FaGamepad } from 'react-icons/fa'

const EVENTS = [
  {
    id: 1, title: 'Summer Chess Championship',
    date: '2026-08-15T18:00:00', type: 'Tournament', icon: '♟️',
    color: 'from-violet-500 to-purple-600', bgColor: 'from-violet-600/10 to-purple-600/5',
    desc: 'Top 128 Chess players compete for 200K MSH. Wager matches, live commentary, and ELO integration.',
    attendees: '2.5K', prize: '200K MSH', featured: true,
    href: '/tournaments/chess-championship',
  },
  {
    id: 2, title: 'Guranda Official Launch',
    date: '2027-01-01T00:00:00', type: 'App Launch', icon: '🚀',
    color: 'from-amber-500 to-orange-500', bgColor: 'from-amber-600/10 to-orange-600/5',
    desc: 'The official public launch of Guranda. New features, live events, giveaways and the biggest community gathering yet.',
    attendees: '50K+', prize: 'Special Rewards', featured: true,
    href: '/roadmap',
  },
  {
    id: 3, title: 'Ludo Masters Series',
    date: '2026-08-28T17:00:00', type: 'Tournament', icon: '🎲',
    color: 'from-amber-500 to-orange-600', bgColor: 'from-amber-600/10 to-orange-600/5',
    desc: '256 players, multiple Ludo modes, and MSH wagers. The biggest Ludo event on the continent.',
    attendees: '8K+', prize: '150K MSH', featured: false,
    href: '/tournaments/ludo-masters',
  },
  {
    id: 4, title: 'Early Access Opens',
    date: '2026-12-01T00:00:00', type: 'Beta Launch', icon: '🎟️',
    color: 'from-cyan-500 to-blue-600', bgColor: 'from-cyan-600/10 to-blue-600/5',
    desc: 'Beta users get first access to every Guranda service. Download the Android app and be among the first in.',
    attendees: '10K spots', prize: 'Beta Badge', featured: false,
    href: '/download',
  },
  {
    id: 5, title: 'Card Royale Tournament',
    date: '2026-09-01T12:00:00', type: 'Tournament', icon: '🃏',
    color: 'from-pink-500 to-rose-600', bgColor: 'from-pink-600/10 to-rose-600/5',
    desc: '64 elite card players. Five Cards & Cassino with real MSH on every match. Double-elimination format.',
    attendees: '1.2K', prize: '300K MSH', featured: false,
    href: '/tournaments/card-royale',
  },
  {
    id: 6, title: 'Creator Live Showcase',
    date: '2026-09-05T20:00:00', type: 'Live Event', icon: '📡',
    color: 'from-red-500 to-pink-600', bgColor: 'from-red-600/10 to-pink-600/5',
    desc: 'Top Guranda creators go live together. Watch, interact, earn rewards and discover new content.',
    attendees: '15K+', prize: 'Creator Rewards', featured: false,
    href: '/events',
  },
]

function useCountdown(dateStr: string) {
  const calc = useCallback(() => {
    const diff = new Date(dateStr).getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      done: false,
    }
  }, [dateStr])
  const [t, setT] = useState(calc)
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id) }, [calc])
  return t
}

function CountUnit({ v, l }: { v: number; l: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center">
        <span className="text-sm font-black text-white tabular-nums" suppressHydrationWarning>{String(v).padStart(2, '0')}</span>
      </div>
      <span className="text-[9px] text-gray-600 mt-1 font-bold uppercase tracking-widest">{l}</span>
    </div>
  )
}

function EventCard({ ev, idx }: { ev: typeof EVENTS[0]; idx: number }) {
  const t = useCountdown(ev.date)
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: idx * 0.07 }} viewport={{ once: true }}
      whileHover={{ y: -7 }} className="group relative h-full"
    >
      <div className={`absolute -inset-px rounded-3xl bg-gradient-to-br ${ev.color} opacity-0 group-hover:opacity-20 blur-sm transition-opacity`} />
      <div className="relative glass-frosted rounded-3xl border-white/10 group-hover:border-white/25 transition-all overflow-hidden h-full flex flex-col">
        {/* Gradient header */}
        <div className={`relative h-32 bg-gradient-to-r ${ev.color} overflow-hidden shrink-0`}>
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute top-3 left-4 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur text-xs font-bold text-white">
            {ev.type}
          </div>
          <motion.div className="absolute bottom-3 right-4 text-4xl"
            animate={{ scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            {ev.icon}
          </motion.div>
          {/* Countdown overlay */}
          <div className="absolute bottom-3 left-4">
            {t.done ? (
              <span className="text-xs font-bold text-green-400 bg-green-500/20 px-2.5 py-1 rounded-full border border-green-500/30">Live Now</span>
            ) : (
              <div className="flex gap-1.5">
                <CountUnit v={t.days} l="d" />
                <CountUnit v={t.hours} l="h" />
                <CountUnit v={t.minutes} l="m" />
                <CountUnit v={t.seconds} l="s" />
              </div>
            )}
          </div>
        </div>

        <div className="p-6 flex flex-col flex-1">
          <h3 className="text-lg font-black text-white mb-2 leading-tight">{ev.title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">{ev.desc}</p>

          {/* Meta row */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5 text-xs text-gray-500 gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <FaCalendarAlt /> {new Date(ev.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5"><FaUsers /> {ev.attendees}</span>
            <span className={`font-bold bg-gradient-to-r ${ev.color} bg-clip-text text-transparent`}>{ev.prize}</span>
          </div>

          <Link href={ev.href}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className={`w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${ev.color} flex items-center justify-center gap-2 text-sm shadow-lg`}>
              Learn More <FaArrowRight className="text-xs" />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export default function UpcomingEventsSection() {
  const featured = EVENTS.filter(e => e.featured)
  const rest = EVENTS.filter(e => !e.featured)

  return (
    <section className="section-container max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}
        className="text-center mb-16">
        <motion.div className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-full bg-orange-500/10 border border-orange-500/30"
          initial={{ scale: 0.8 }} whileInView={{ scale: 1 }} viewport={{ once: true }}>
          <span className="text-sm font-semibold text-orange-300">🎉 Coming Up</span>
        </motion.div>
        <h2 className="text-5xl sm:text-6xl font-black gradient-text mb-4">Upcoming Events</h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">Tournaments, launches, live events and community moments — live countdowns to everything happening on Guranda.</p>
      </motion.div>

      {/* Featured 2-col */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {featured.map((ev, i) => <EventCard key={ev.id} ev={ev} idx={i} />)}
      </div>

      {/* Rest 4-col */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {rest.map((ev, i) => <EventCard key={ev.id} ev={ev} idx={i + 2} />)}
      </div>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center">
        <Link href="/events">
          <motion.button whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}
            className="button-secondary inline-flex items-center gap-2.5 px-8 py-4 text-sm font-bold">
            View All Events <FaArrowRight className="text-xs" />
          </motion.button>
        </Link>
      </motion.div>
    </section>
  )
}
