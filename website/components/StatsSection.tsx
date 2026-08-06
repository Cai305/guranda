'use client'

import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { FaUsers, FaGamepad, FaLayerGroup, FaInfinity } from 'react-icons/fa'

interface StatProps { target: string; label: string; icon: React.ReactNode; color: string; delay: number }

function AnimatedStat({ target, label, icon, color, delay }: StatProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!inView) return
    if (target === '∞') { setTimeout(() => setDisplay('∞'), delay * 1000 + 400); return }
    const num = parseInt(target.replace(/\D/g, ''))
    const suffix = target.replace(/[\d]/g, '')
    const duration = 1800
    const start = Date.now() + delay * 1000
    const tick = () => {
      const elapsed = Date.now() - start
      if (elapsed < 0) { requestAnimationFrame(tick); return }
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * num) + suffix)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target, delay])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.05, y: -4 }}
      className="group text-center cursor-default"
    >
      <motion.div
        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} mx-auto mb-5 flex items-center justify-center text-white text-2xl shadow-lg`}
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, delay }}
      >
        {icon}
      </motion.div>
      <div className={`text-5xl sm:text-6xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent mb-2 tabular-nums`}>
        {display}
      </div>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
    </motion.div>
  )
}

const STATS = [
  { target: '10M+',  label: 'Target Users',      icon: <FaUsers />,     color: 'from-violet-500 to-purple-600', delay: 0 },
  { target: '20+',   label: 'Games & Counting',  icon: <FaGamepad />,   color: 'from-cyan-500 to-blue-600',    delay: 0.15 },
  { target: '12+',   label: 'Live Services',      icon: <FaLayerGroup />,color: 'from-pink-500 to-rose-600',    delay: 0.3 },
  { target: '∞',     label: 'Possibilities',      icon: <FaInfinity />,  color: 'from-amber-500 to-orange-500', delay: 0.45 },
]

export default function StatsSection() {
  return (
    <section className="section-container max-w-5xl mx-auto">
      <div className="relative overflow-hidden glass-frosted rounded-3xl p-10 sm:p-16 border-white/10">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-cyan-600/5 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-0.5 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl sm:text-5xl font-black gradient-text mb-3">Join the Movement</h2>
          <p className="text-gray-400 text-lg">Building the future of digital life in Africa and beyond.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          {STATS.map((s, i) => <AnimatedStat key={i} {...s} />)}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-12 pt-8 border-t border-white/10 text-center"
        >
          <p className="text-xs text-gray-600">
            * Numbers represent targets and design goals, not current live metrics.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
