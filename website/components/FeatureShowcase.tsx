'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface FeatureShowcaseProps {
  title: string
  description: string
  features: Array<{ icon: ReactNode; label: string }>
  image?: ReactNode
  gradient?: string
  reversed?: boolean
  badge?: string
}

export default function FeatureShowcase({
  title, description, features, image,
  gradient = 'from-violet-600 to-purple-600',
  reversed = false,
  badge,
}: FeatureShowcaseProps) {
  return (
    <section className="section-container max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">

        {/* Text side */}
        <motion.div
          initial={{ opacity: 0, x: reversed ? 60 : -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className={reversed ? 'md:order-2' : ''}
        >
          {badge && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-bold border border-white/10 bg-white/5 text-gray-300"
            >
              {badge}
            </motion.div>
          )}
          <h2 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
            <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{title}</span>
          </h2>
          <p className="text-gray-400 mb-10 text-lg leading-relaxed">{description}</p>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                viewport={{ once: true }}
                whileHover={{ y: -4, scale: 1.03 }}
                className="group glass-frosted p-4 rounded-2xl flex items-center gap-3 cursor-default border-white/10 hover:border-white/25 transition-all"
              >
                <motion.div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm shrink-0 shadow-lg`}
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {feature.icon}
                </motion.div>
                <span className="text-sm font-semibold text-white">{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Visual side — icon floats directly on the page background (no
            enclosing card), matching AISection's orbit treatment */}
        <motion.div
          initial={{ opacity: 0, x: reversed ? -60 : 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className={`relative aspect-square flex items-center justify-center ${reversed ? 'md:order-1' : ''}`}
        >
          {/* Ambient glow */}
          <div className={`absolute inset-8 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-3xl`} />
          <motion.div
            className="relative z-10 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            animate={{ y: [0, -12, 0] }}
            transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut' }, scale: { type: 'spring', stiffness: 200 } }}
          >
            {/* Pulse rings — expand outward from the icon's own shape,
                colored by its gradient, so the motion reads as coming
                from the icon rather than a generic ambient effect. */}
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={`absolute inset-0 rounded-[2.5rem] bg-gradient-to-br ${gradient} -z-10`}
                initial={{ scale: 1, opacity: 0.35 }}
                animate={{ scale: 1.15 + i * 0.22, opacity: 0 }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
              />
            ))}
            {image || <div className="text-8xl">📱</div>}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
