'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { FaCalendarAlt, FaGamepad, FaRocket, FaVideo, FaTrophy, FaChevronRight, FaUsers, FaClock, FaMapMarkerAlt } from 'react-icons/fa'

const ALL_EVENTS = [
  { id: 1, title: 'Summer Gaming Tournament', date: '2026-08-15', time: '6:00 PM UTC', type: 'Tournament',  category: 'gaming',     icon: '🏆', color: 'from-orange-500 to-amber-500',  desc: 'Compete in epic tournaments with massive prize pools. Win prizes, glory, and become a legend!', attendees: '2.5K', duration: '4 hours', location: 'Online', prize: 'R900K MSH' },
  { id: 2, title: 'Guranda 2.0 Launch Event',  date: '2026-09-01', time: '12:00 PM UTC', type: 'App Launch', category: 'general',    icon: '🚀', color: 'from-violet-500 to-purple-600', desc: 'Join us for the biggest app update launch. New features, surprises, and community giveaways.', attendees: '5K+', duration: '3 hours',  location: 'Online', prize: 'Free prizes' },
  { id: 3, title: 'Live Creator Showcase',      date: '2026-08-22', time: '8:00 PM UTC', type: 'Live Event', category: 'livestream', icon: '📡', color: 'from-red-500 to-pink-600',      desc: 'Watch top creators showcase their latest content and connect with millions of viewers live.', attendees: '10K+', duration: '2 hours', location: 'Online', prize: 'Creator rewards' },
  { id: 4, title: 'Gaming League Season 3',     date: '2026-08-28', time: '5:00 PM UTC', type: 'Season',     category: 'gaming',     icon: '🎮', color: 'from-cyan-500 to-blue-600',     desc: 'New season, new games, new challenges. Prove yourself in the most competitive season yet.', attendees: '8K+', duration: '6 weeks',  location: 'Online', prize: 'R500K MSH' },
  { id: 5, title: 'Community Meetup Week',      date: '2026-09-10', time: '4:00 PM UTC', type: 'Community',  category: 'general',    icon: '👥', color: 'from-green-500 to-emerald-600', desc: 'Connect with fellow Guranda users worldwide. Share stories, make friends, grow together.', attendees: '15K+', duration: 'Full week', location: 'Online & SA', prize: 'Community tokens' },
  { id: 6, title: 'Creator Monetisation Workshop', date: '2026-09-05', time: '3:00 PM UTC', type: 'Workshop', category: 'livestream', icon: '💰', color: 'from-pink-500 to-rose-600', desc: 'Learn professional strategies to grow your audience and maximise earnings on Guranda.', attendees: '3K+', duration: '2.5 hours', location: 'Online', prize: 'Free resources' },
]

const CATS = [
  { id: 'all', label: 'All Events' },
  { id: 'gaming', label: '🎮 Gaming' },
  { id: 'livestream', label: '📡 Live' },
  { id: 'general', label: '🌐 General' },
]

function daysAway(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return diff > 0 ? diff : 0
}

export default function EventsPage() {
  const [cat, setCat] = useState('all')
  const filtered = cat === 'all' ? ALL_EVENTS : ALL_EVENTS.filter(e => e.category === cat)

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24">
        <section className="section-container max-w-7xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-14">
            <motion.div className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-full bg-orange-500/10 border border-orange-500/30" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <span className="text-sm font-semibold text-orange-300">🎉 Upcoming Events</span>
            </motion.div>
            <h1 className="text-6xl sm:text-7xl font-black gradient-text mb-4">Guranda Events</h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto">Tournaments, launches, workshops and community gatherings — register and be part of the moment.</p>
          </motion.div>

          {/* Category filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {CATS.map(c => (
              <motion.button key={c.id} onClick={() => setCat(c.id)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                  cat === c.id ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' : 'glass-frosted text-gray-400 hover:text-white border-white/10'
                }`}>{c.label}</motion.button>
            ))}
          </div>

          {/* Events grid */}
          <AnimatePresence mode="popLayout">
            <motion.div layout className="grid lg:grid-cols-2 gap-6 mb-14">
              {filtered.map((ev, idx) => (
                <motion.div key={ev.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }} whileHover={{ y: -6 }} className="group relative">
                  <div className={`absolute -inset-px rounded-3xl bg-gradient-to-br ${ev.color} opacity-0 group-hover:opacity-20 blur-sm transition-opacity`} />
                  <div className="relative glass-frosted rounded-3xl overflow-hidden border-white/10 group-hover:border-white/25 transition-all h-full flex flex-col">
                    {/* Gradient header */}
                    <div className={`relative h-36 bg-gradient-to-r ${ev.color} overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/20" />
                      {/* Countdown pill */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20">
                        <FaClock className="text-white text-xs" />
                        <span className="text-white text-xs font-bold">{daysAway(ev.date)}d away</span>
                      </div>
                      {/* Type badge */}
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md">
                        <span className="text-white text-xs font-bold">{ev.type}</span>
                      </div>
                      {/* Icon */}
                      <motion.div className="absolute bottom-4 right-5 text-5xl"
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                        {ev.icon}
                      </motion.div>
                    </div>

                    <div className="p-7 flex-1 flex flex-col">
                      <h3 className="text-xl font-black text-white mb-2">{ev.title}</h3>
                      <p className="text-gray-400 text-sm mb-5 flex-1 leading-relaxed">{ev.desc}</p>

                      {/* Meta grid */}
                      <div className="grid grid-cols-2 gap-3 mb-6 pb-5 border-b border-white/5">
                        {[
                          { icon: FaCalendarAlt, label: new Date(ev.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' }) },
                          { icon: FaClock,       label: ev.time },
                          { icon: FaUsers,       label: ev.attendees + ' registered' },
                          { icon: FaTrophy,      label: ev.prize },
                        ].map((m, i) => {
                          const Icon = m.icon
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                              <Icon className="shrink-0 text-gray-600" /> {m.label}
                            </div>
                          )
                        })}
                      </div>

                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className={`w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r ${ev.color} flex items-center justify-center gap-2 shadow-lg text-sm`}>
                        Register Now <FaChevronRight className="text-xs" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-violet-400 transition">← Back to Home</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
