'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaChevronLeft, FaChevronRight, FaCheck } from 'react-icons/fa'

const SCREENS = [
  {
    title: 'Home Hub', emoji: '🏠', color: 'from-violet-500 to-purple-600',
    desc: 'Your personalised command centre. Every service, message, and notification — one glance.',
    features: [
      { icon: '⚡', text: 'Smart quick-launch tiles' },
      { icon: '🔔', text: 'Unified notification feed' },
      { icon: '🤖', text: 'AI companion shortcut' },
      { icon: '💰', text: 'MSH wallet balance at a glance' },
    ],
  },
  {
    title: 'Messaging', emoji: '💬', color: 'from-cyan-500 to-blue-600',
    desc: 'DMs, groups, communities, voice and video calls — all in one place with end-to-end privacy.',
    features: [
      { icon: '📨', text: 'Instant DMs & group chats' },
      { icon: '📞', text: 'Voice & video calls' },
      { icon: '👥', text: 'Community spaces with roles' },
      { icon: '🔒', text: 'Private encrypted threads' },
    ],
  },
  {
    title: 'Games Hub', emoji: '🎮', color: 'from-amber-500 to-orange-600',
    desc: 'Chess, Ludo, Pool, Cards, Turbo Racing, Word Battle — 10+ games with AI opponents and MSH wagers.',
    features: [
      { icon: '♟️', text: 'Chess with ELO rating system' },
      { icon: '🎲', text: 'Ludo with up to 4 players' },
      { icon: '🃏', text: 'Five Cards & Cassino wagers' },
      { icon: '🏆', text: 'Tournaments & seasonal leagues' },
    ],
  },
  {
    title: 'Live Platform', emoji: '📡', color: 'from-red-500 to-pink-600',
    desc: 'Go live to thousands. Stream gameplay, sell products, teach, host events — 8 live categories.',
    features: [
      { icon: '🎙️', text: 'One-tap broadcast to all followers' },
      { icon: '🛍️', text: 'Sell products live in real time' },
      { icon: '🎓', text: 'Education & tutoring streams' },
      { icon: '💸', text: 'Monetise via tips & subscriptions' },
    ],
  },
  {
    title: 'MSH Wallet', emoji: '💰', color: 'from-green-500 to-emerald-600',
    desc: 'Your unified digital wallet. Send MSH, receive payments, pay for any Guranda service instantly.',
    features: [
      { icon: '📤', text: 'Send & receive MSH instantly' },
      { icon: '💳', text: 'Deposit via PayShap' },
      { icon: '📊', text: 'Full transaction history' },
      { icon: '🎯', text: 'Earn through games, live & stories' },
    ],
  },
  {
    title: 'AI Companion', emoji: '🤖', color: 'from-violet-500 to-indigo-600',
    desc: 'Your personal AI that acts across every Guranda service — with your approval every time.',
    features: [
      { icon: '🗣️', text: 'Plain-language task instructions' },
      { icon: '🔗', text: 'Connected to all mini-apps' },
      { icon: '🛡️', text: 'You approve every action' },
      { icon: '📈', text: 'Learns your habits over time' },
    ],
  },
  {
    title: 'Stories', emoji: '👗', color: 'from-pink-500 to-rose-600',
    desc: 'OOTD, COTD, FOTD and more — a daily labeled story feed where your content earns you MSH.',
    features: [
      { icon: '🏷️', text: 'Daily challenge labels (OOTD etc.)' },
      { icon: '⭐', text: 'Community ranking & voting' },
      { icon: '🏪', text: 'Sell story items to viewers' },
      { icon: '💵', text: 'Creator Fund weekly payouts' },
    ],
  },
  {
    title: 'Ride & Eat', emoji: '🚗', color: 'from-purple-500 to-pink-600',
    desc: 'Request a ride, go online as a driver, or order food with live tracking — all without leaving Guranda.',
    features: [
      { icon: '📍', text: 'Real-time driver tracking' },
      { icon: '🍕', text: 'Food delivery with live ETA' },
      { icon: '🚕', text: 'Driver mode to earn MSH' },
      { icon: '🧾', text: 'Receipts tied to MSH wallet' },
    ],
  },
  {
    title: 'Discover', emoji: '▶️', color: 'from-indigo-500 to-violet-600',
    desc: 'A personalised video feed curated by your interests. Watch, follow creators, subscribe and earn.',
    features: [
      { icon: '🎬', text: 'Short and long-form video' },
      { icon: '❤️', text: 'Like, comment, share' },
      { icon: '🔔', text: 'Creator subscriptions' },
      { icon: '📋', text: 'Build and share playlists' },
    ],
  },
]

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 500 : -500, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 500 : -500, opacity: 0, scale: 0.95 }),
}

export default function ScreenshotsCarousel() {
  const [cur, setCur] = useState(0)
  const [dir, setDir] = useState(1)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => { setDir(1); setCur(c => (c + 1) % SCREENS.length) }, 4000)
    return () => clearInterval(id)
  }, [auto])

  const go = (d: number) => {
    setAuto(false)
    setDir(d)
    setCur(c => (c + d + SCREENS.length) % SCREENS.length)
  }

  const s = SCREENS[cur]

  return (
    <section className="section-container max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}
        className="text-center mb-16">
        <motion.div className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/30"
          initial={{ scale: 0.8 }} whileInView={{ scale: 1 }} viewport={{ once: true }}>
          <span className="text-sm font-semibold text-blue-300">✨ Visual Tour</span>
        </motion.div>
        <h2 className="text-5xl sm:text-6xl font-black gradient-text mb-4">Experience Guranda</h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">A walkthrough of every major screen and feature inside the app.</p>
      </motion.div>

      {/* Carousel */}
      <div className="relative" onMouseEnter={() => setAuto(false)} onMouseLeave={() => setAuto(true)}>
        <AnimatePresence initial={false} custom={dir} mode="wait">
          <motion.div key={cur} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ x: { type: 'spring', stiffness: 280, damping: 28 }, opacity: { duration: 0.25 } }}>

            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

              {/* Phone mockup */}
              <div className="relative w-full max-w-xs mx-auto lg:mx-0 shrink-0">
                {/* Glow */}
                <div className={`absolute inset-0 rounded-[2.5rem] bg-gradient-to-br ${s.color} opacity-30 blur-2xl scale-110`} />
                {/* Frame */}
                <div className="relative bg-gray-950 rounded-[2.5rem] border-4 border-gray-800 shadow-2xl overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-950 rounded-b-2xl z-20" />
                  {/* Screen */}
                  <div className={`aspect-[9/19] w-full bg-gradient-to-br ${s.color} flex flex-col items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/30" />
                    <motion.div className="relative z-10 text-center px-6"
                      key={cur} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, duration: 0.5 }}>
                      <motion.div className="text-7xl mb-4"
                        animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                        {s.emoji}
                      </motion.div>
                      <h3 className="text-2xl font-black text-white mb-1">{s.title}</h3>
                      <p className="text-white/70 text-xs leading-relaxed">{s.desc}</p>
                    </motion.div>
                    {/* Status bar */}
                    <div className="absolute top-7 left-0 right-0 flex justify-between px-5 text-[10px] text-white/60 font-semibold">
                      <span>9:41</span><span>●●●</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature bullets */}
              <div className="flex-1 w-full">
                <motion.div key={`title-${cur}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <h3 className={`text-4xl sm:text-5xl font-black mb-3 bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.title}</h3>
                  <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-lg">{s.desc}</p>
                </motion.div>
                <div className="space-y-4">
                  {s.features.map((f, i) => (
                    <motion.div key={`${cur}-${i}`} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.09 }}
                      whileHover={{ x: 6 }}
                      className="flex items-center gap-4 glass-frosted rounded-2xl p-4 border-white/10 hover:border-white/20 transition-all cursor-default">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl shrink-0 shadow-lg`}>{f.icon}</div>
                      <span className="font-semibold text-white">{f.text}</span>
                    </motion.div>
                  ))}
                </div>
                {/* Screen counter */}
                <div className="mt-8 text-xs text-gray-600 font-semibold">
                  {cur + 1} / {SCREENS.length} — {s.title}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Arrows */}
        <button onClick={() => go(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 sm:-translate-x-10 hidden lg:flex w-10 h-10 rounded-full glass-frosted border-white/10 items-center justify-center text-gray-400 hover:text-white transition-colors">
          <FaChevronLeft />
        </button>
        <button onClick={() => go(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 sm:translate-x-10 hidden lg:flex w-10 h-10 rounded-full glass-frosted border-white/10 items-center justify-center text-gray-400 hover:text-white transition-colors">
          <FaChevronRight />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-10 flex-wrap">
        {SCREENS.map((sc, i) => (
          <motion.button key={i} onClick={() => { setAuto(false); setDir(i > cur ? 1 : -1); setCur(i) }}
            whileHover={{ scale: 1.3 }}
            className={`rounded-full transition-all duration-300 ${
              cur === i
                ? `w-8 h-2.5 bg-gradient-to-r ${sc.color}`
                : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Mobile swipe buttons */}
      <div className="flex justify-center gap-4 mt-6 lg:hidden">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => go(-1)}
          className="w-12 h-12 rounded-full glass-frosted border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <FaChevronLeft />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => go(1)}
          className="w-12 h-12 rounded-full glass-frosted border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <FaChevronRight />
        </motion.button>
      </div>
    </section>
  )
}
