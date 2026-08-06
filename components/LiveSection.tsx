'use client'

import { motion } from 'framer-motion'
import { FaVideo, FaShoppingCart, FaGamepad, FaBriefcase, FaGraduationCap, FaFilm, FaFutbol, FaMusic } from 'react-icons/fa'

const CATEGORIES = [
  { icon: FaVideo,        label: 'Social Live',       color: 'from-pink-500 to-rose-600',     desc: 'Connect live with your audience' },
  { icon: FaShoppingCart, label: 'Shopping Live',      color: 'from-amber-500 to-orange-600',  desc: 'Sell products in real time' },
  { icon: FaGamepad,      label: 'Gaming Live',        color: 'from-violet-500 to-purple-600', desc: 'Stream your gameplay live' },
  { icon: FaBriefcase,    label: 'Business Live',      color: 'from-cyan-500 to-blue-600',     desc: 'Pitch, launch and grow' },
  { icon: FaGraduationCap,label: 'Education Live',     color: 'from-green-500 to-emerald-600', desc: 'Teach and learn together' },
  { icon: FaFilm,         label: 'Entertainment Live', color: 'from-red-500 to-pink-600',      desc: 'Comedy, drama and more' },
  { icon: FaFutbol,       label: 'Sports Live',        color: 'from-blue-500 to-indigo-600',   desc: 'Watch and discuss live sport' },
  { icon: FaMusic,        label: 'Music Live',         color: 'from-fuchsia-500 to-pink-600',  desc: 'Perform for thousands' },
]

export default function LiveSection() {
  return (
    <section className="section-container max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <motion.div
          className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-full bg-red-500/10 border border-red-500/30"
          initial={{ scale: 0.8 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
        >
          <motion.span
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="w-2.5 h-2.5 rounded-full bg-red-500"
          />
          <span className="text-sm font-bold text-red-400 uppercase tracking-widest">Live Now</span>
        </motion.div>

        <h2 className="text-5xl sm:text-6xl font-black mb-4">
          <span className="bg-gradient-to-r from-red-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
            Live Platform
          </span>
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Watch, stream, sell, teach, game. Every kind of live content in one place.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORIES.map((cat, idx) => {
          const Icon = cat.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.06 }}
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative overflow-hidden rounded-2xl cursor-pointer"
            >
              {/* Background glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-15 transition-opacity duration-300`} />
              <div className="relative glass-frosted p-6 rounded-2xl border-white/10 group-hover:border-white/25 transition-all h-full">
                {/* Live dot */}
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white text-xl shadow-lg`}
                    whileHover={{ rotate: 15, scale: 1.15 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Icon />
                  </motion.div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25">
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-red-400"
                    />
                    <span className="text-xs font-bold text-red-400">LIVE</span>
                  </div>
                </div>
                <h3 className="text-base font-bold text-white mb-1">{cat.label}</h3>
                <p className="text-xs text-gray-500">{cat.desc}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        viewport={{ once: true }}
        className="mt-10 relative overflow-hidden glass-frosted rounded-3xl p-8 text-center border-white/10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-pink-600/5 to-rose-600/5" />
        <p className="relative text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
          Guranda Live is where <span className="text-white font-semibold">creativity meets opportunity</span>. Broadcast to millions, build your audience, and monetize your content. All in one ecosystem.
        </p>
      </motion.div>
    </section>
  )
}
