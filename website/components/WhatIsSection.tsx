'use client'

import { motion } from 'framer-motion'
import { FaTimes, FaCheck, FaMobileAlt, FaGlobe, FaUsers, FaWallet } from 'react-icons/fa'

const NOT_LIST = [
  { icon: '📱', text: 'Another social network' },
  { icon: '💬', text: 'Another messaging app' },
  { icon: '🌐', text: 'Another metaverse' },
  { icon: '🛒', text: 'Another e-commerce site' },
]

const IS_LIST = [
  { icon: <FaMobileAlt />, text: 'Your complete digital operating system', color: 'from-violet-500 to-purple-600' },
  { icon: <FaWallet />,    text: 'One wallet for every service', color: 'from-green-500 to-emerald-600' },
  { icon: <FaUsers />,     text: 'One identity across all of Guranda', color: 'from-cyan-500 to-blue-600' },
  { icon: <FaGlobe />,     text: 'One economy. Earn and spend anywhere', color: 'from-pink-500 to-rose-600' },
]

export default function WhatIsSection() {
  return (
    <section className="section-container max-w-6xl mx-auto relative">
      <div className="absolute inset-0 gradient-mesh opacity-10 blur-3xl -z-10 rounded-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <motion.div
          className="inline-block mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-500/30"
          initial={{ scale: 0.8 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
        >
          <span className="text-sm font-semibold gradient-text">🤔 What exactly is Guranda?</span>
        </motion.div>
        <h2 className="text-5xl sm:text-6xl font-black gradient-text mb-4">Redefining the App</h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">Not one more app. One app to replace them all.</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* NOT card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative group"
        >
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-red-600/30 to-pink-600/20 opacity-60 group-hover:opacity-100 transition-opacity blur-sm" />
          <div className="relative glass-frosted rounded-3xl p-8 h-full">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <FaTimes className="text-red-400 text-lg" />
              </div>
              <h3 className="text-2xl font-bold text-white">Guranda is <span className="text-red-400">NOT</span></h3>
            </div>
            <div className="space-y-4">
              {NOT_LIST.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-red-500/20 transition-colors group/item"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-gray-300 font-medium">{item.text}</span>
                  <FaTimes className="ml-auto text-red-400/60 text-sm" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* IS card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative group"
        >
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-violet-600/30 to-cyan-600/20 opacity-60 group-hover:opacity-100 transition-opacity blur-sm" />
          <div className="relative glass-frosted rounded-3xl p-8 h-full">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <FaCheck className="text-violet-400 text-lg" />
              </div>
              <h3 className="text-2xl font-bold text-white">Guranda <span className="gradient-text">IS</span></h3>
            </div>
            <div className="space-y-4">
              {IS_LIST.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all group/item cursor-default"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0`}>
                    {item.icon}
                  </div>
                  <span className="text-white font-medium">{item.text}</span>
                  <FaCheck className="ml-auto text-green-400 text-sm" />
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              viewport={{ once: true }}
              className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 to-cyan-600/10 border border-violet-500/20"
            >
              <p className="text-gray-300 text-sm leading-relaxed text-center font-medium">
                The digital operating system for everyday life. One account connects everything.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
