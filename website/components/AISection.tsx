'use client'

import { motion } from 'framer-motion'
import {
  FaRobot, FaComments, FaGamepad, FaShoppingCart, FaCar,
  FaUtensils, FaPlane, FaBook, FaBriefcase, FaHospital,
  FaWallet, FaShieldAlt, FaArrowRight, FaBolt,
} from 'react-icons/fa'

// The services the AI can reach into
const CONNECTIONS = [
  { icon: FaComments,     label: 'Chat',        color: 'from-cyan-500 to-blue-600',     angle: 0   },
  { icon: FaGamepad,      label: 'Games',       color: 'from-violet-500 to-purple-600', angle: 40  },
  { icon: FaShoppingCart, label: 'Marketplace', color: 'from-amber-500 to-orange-600',  angle: 80  },
  { icon: FaCar,          label: 'Ride',        color: 'from-purple-500 to-pink-600',   angle: 120 },
  { icon: FaUtensils,     label: 'Eat',         color: 'from-red-500 to-orange-600',    angle: 160 },
  { icon: FaWallet,       label: 'Wallet',      color: 'from-green-500 to-emerald-600', angle: 200 },
  { icon: FaPlane,        label: 'Travel',      color: 'from-sky-500 to-indigo-600',    angle: 240 },
  { icon: FaBook,         label: 'Learning',    color: 'from-indigo-500 to-purple-600', angle: 280 },
  { icon: FaBriefcase,    label: 'Work',        color: 'from-orange-500 to-amber-600',  angle: 320 },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'You give it a task',
    desc: 'Tell your AI companion what you need in plain language. "Book me a ride to the airport" or "find me a chess game" or "send 50 MSH to Thabo".',
    icon: FaComments,
    color: 'from-cyan-500 to-blue-600',
  },
  {
    step: '02',
    title: 'It plans across every service',
    desc: 'The AI understands your full context: your wallet balance, your location, your schedule, your preferences. It picks the right mini-app or feature to execute.',
    icon: FaRobot,
    color: 'from-violet-500 to-purple-600',
  },
  {
    step: '03',
    title: 'You approve anything that matters',
    desc: 'For anything that moves money, books something, or sends a message, the AI shows you exactly what it\'s about to do and waits for your tap. No surprises.',
    icon: FaShieldAlt,
    color: 'from-green-500 to-emerald-600',
  },
  {
    step: '04',
    title: 'It learns your world',
    desc: 'Over time it knows your favourite restaurant, your regular routes, the games you play, and the people you talk to most. It gets faster and more useful every day.',
    icon: FaBolt,
    color: 'from-amber-500 to-orange-500',
  },
]

const EXAMPLES = [
  { prompt: '"Order my usual from the café near work"',      result: 'Opens Eat → finds nearby café → places last order → waits for your confirm',   icon: FaUtensils,  color: 'from-red-500 to-orange-600' },
  { prompt: '"Challenge Sipho to a game of chess"',          result: 'Opens Games → finds Sipho in your contacts → sends a Chess invite',             icon: FaGamepad,   color: 'from-violet-500 to-purple-600' },
  { prompt: '"Book a ride to the airport at 6am tomorrow"',  result: 'Opens Ride → sets pickup address → schedules for 06:00 → shows you the price',   icon: FaCar,       color: 'from-purple-500 to-pink-600' },
  { prompt: '"Send my sister 200 MSH for her birthday"',     result: 'Opens Wallet → finds your sister in contacts → queues the transfer → asks you to confirm', icon: FaWallet, color: 'from-green-500 to-emerald-600' },
  { prompt: '"Find me a course on web development"',         result: 'Opens Learning → searches courses → shows top results by rating',                icon: FaBook,      color: 'from-indigo-500 to-purple-600' },
  { prompt: '"What\'s the weather like in Cape Town today?"', result: 'Uses Travel context → gives you a live answer + suggests packing list',          icon: FaPlane,     color: 'from-sky-500 to-indigo-600' },
]

export default function AISection() {
  return (
    <section className="section-container max-w-7xl mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-center mb-20"
      >
        <motion.div
          className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-full bg-violet-500/10 border border-violet-500/30"
          initial={{ scale: 0.8 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
        >
          <motion.span
            animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-lg"
          >🤖</motion.span>
          <span className="text-sm font-semibold text-violet-300">AI-Powered, Human-Approved</span>
        </motion.div>

        <h2 className="text-5xl sm:text-6xl font-black mb-5 leading-tight">
          <span className="gradient-text">One AI</span>
          <br />
          <span className="text-white">Connected to Everything</span>
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
          Your Guranda AI Companion doesn't just answer questions. It acts across every service, game, chat and payment on the platform. One instruction, everything done.
        </p>
      </motion.div>

      {/* Orbit visual + how it works side by side */}
      <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">

        {/* Orbit diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true }}
          className="relative flex items-center justify-center"
        >
          {/* Outer orbit ring */}
          <div className="relative w-72 h-72 sm:w-80 sm:h-80">
            {/* Orbit circle */}
            <motion.div
              className="absolute inset-0 rounded-full border border-white/5"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-6 rounded-full border border-violet-500/10"
              animate={{ rotate: -360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />

            {/* Center AI core */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-[0_0_60px_rgba(124,58,237,0.5)]"
                animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <FaRobot className="text-white text-4xl" />
                {/* Pulse rings */}
                {[1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-3xl border-2 border-violet-500/40"
                    animate={{ scale: [1, 1.8 + i * 0.4], opacity: [0.6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
                  />
                ))}
              </motion.div>
            </div>

            {/* Service icons orbiting */}
            {CONNECTIONS.map((c, i) => {
              const Icon = c.icon
              const rad = (c.angle * Math.PI) / 180
              const r = 130
              const x = Math.cos(rad) * r
              const y = Math.sin(rad) * r
              return (
                <motion.div
                  key={c.label}
                  className="absolute"
                  style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: 'backOut' }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.3 }}
                >
                  {/* Connection line */}
                  <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible', left: '50%', top: '50%' }}>
                    <motion.line
                      x1="0" y1="0" x2={Math.round(-x * 0.75 * 100) / 100} y2={Math.round(-y * 0.75 * 100) / 100}
                      stroke="rgba(124,58,237,0.2)" strokeWidth="1" strokeDasharray="3 3"
                      initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                      transition={{ delay: i * 0.08 + 0.3, duration: 0.5 }}
                      viewport={{ once: true }}
                    />
                  </svg>
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white text-base shadow-lg border border-white/10`}>
                    <Icon />
                  </div>
                  <p className="text-center text-[9px] text-gray-500 mt-1 font-semibold">{c.label}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* How it works steps */}
        <div className="space-y-5">
          {HOW_IT_WORKS.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ x: 6 }}
                className="group flex gap-5 glass-frosted rounded-2xl p-5 border-white/10 hover:border-violet-500/25 transition-all cursor-default"
              >
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="text-lg" />
                  </div>
                  <span className={`text-xs font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.step}</span>
                </div>
                <div>
                  <h3 className="font-black text-white mb-1">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Example prompts */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="mb-12"
      >
        <h3 className="text-3xl font-black text-white text-center mb-3">Try Saying…</h3>
        <p className="text-gray-500 text-center text-sm mb-10">Real examples of what your AI companion can do right now</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXAMPLES.map((ex, i) => {
            const Icon = ex.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                viewport={{ once: true }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group glass-frosted rounded-2xl p-5 border-white/10 hover:border-violet-500/25 transition-all cursor-default"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ex.color} flex items-center justify-center text-white text-sm shrink-0`}>
                    <Icon />
                  </div>
                  <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shrink-0" />
                  <span className="text-xs text-violet-400 font-semibold">AI Active</span>
                </div>
                <p className="text-sm text-white font-semibold mb-3 italic leading-relaxed">{ex.prompt}</p>
                <div className="flex items-start gap-2 pt-3 border-t border-white/5">
                  <FaArrowRight className="text-violet-400 text-xs mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">{ex.result}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Trust bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
        className="relative overflow-hidden glass-frosted rounded-3xl p-8 border-violet-500/20 text-center"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 via-transparent to-pink-600/5" />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaShieldAlt className="text-green-400 text-xl" />
            <h3 className="text-xl font-black text-white">Your AI Never Acts Without Permission</h3>
          </div>
          <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
            Every payment, booking, and message the AI wants to send requires your explicit approval first. It can suggest, plan, and prepare. It only executes when you say go.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-6">
            {[
              { icon: '✅', label: 'Reads & suggests — always' },
              { icon: '🔐', label: 'Payments need your tap' },
              { icon: '👁️', label: 'Full action log visible' },
              { icon: '🚫', label: 'Disable anytime' },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                <span>{t.icon}</span> {t.label}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

    </section>
  )
}
