'use client'

import { motion } from 'framer-motion'
import { FaUser, FaWallet, FaStar, FaUsers, FaCoins, FaGlobe } from 'react-icons/fa'

const BENEFITS = [
  { num: '01', icon: FaUser,   title: 'One Identity',   desc: 'Your single account across the entire Guranda ecosystem. No more juggling multiple profiles.',   grad: 'from-violet-500 to-purple-600' },
  { num: '02', icon: FaWallet, title: 'One Wallet',     desc: 'Unified finances across every service. Buy, sell, pay and earn in one place.',                 grad: 'from-green-500 to-emerald-600' },
  { num: '03', icon: FaStar,   title: 'One Reputation', desc: 'Build cross-service trust. Your reputation carries weight in every Guranda interaction.',          grad: 'from-amber-500 to-orange-500' },
  { num: '04', icon: FaUsers,  title: 'One Community',  desc: 'Connect with millions in a thriving, interconnected community. Your network spans every service.', grad: 'from-pink-500 to-rose-600' },
  { num: '05', icon: FaCoins,  title: 'One Economy',    desc: 'Participate in a unified digital economy. Earn, trade, and grow wealth seamlessly.',               grad: 'from-cyan-500 to-blue-600' },
  { num: '06', icon: FaGlobe,  title: 'One Platform',   desc: 'Everything you need, perfectly integrated. No app-switching, no context-switching.',               grad: 'from-indigo-500 to-violet-600' },
]

export default function BenefitsSection() {
  return (
    <section className="section-container max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <motion.div
          className="inline-block mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30"
          initial={{ scale: 0.8 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
        >
          <span className="text-sm font-semibold gradient-text">💎 The Guranda Philosophy</span>
        </motion.div>
        <h2 className="text-5xl sm:text-6xl font-black gradient-text mb-4">Why Guranda?</h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Six principles that make Guranda different from everything else.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {BENEFITS.map((b, idx) => {
          const Icon = b.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.08 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="group relative overflow-hidden rounded-3xl cursor-default"
            >
              {/* Gradient border */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${b.grad} opacity-0 group-hover:opacity-20 transition-all duration-500 blur-sm`} />
              <div className="relative glass-frosted rounded-3xl p-8 border-white/10 group-hover:border-white/25 transition-all h-full">
                {/* Number */}
                <div className="flex items-start justify-between mb-5">
                  <span className={`text-4xl font-black bg-gradient-to-r ${b.grad} bg-clip-text text-transparent opacity-30`}>
                    {b.num}
                  </span>
                  <motion.div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${b.grad} flex items-center justify-center text-white shadow-lg`}
                    whileHover={{ rotate: 15, scale: 1.15 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Icon className="text-lg" />
                  </motion.div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{b.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
                {/* Accent line */}
                <motion.div
                  className={`h-0.5 mt-6 rounded-full bg-gradient-to-r ${b.grad}`}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ delay: 0.3 + idx * 0.08, duration: 0.6 }}
                  viewport={{ once: true }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
