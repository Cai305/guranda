'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  FaAndroid, FaApple, FaPlay, FaArrowRight,
  FaUsers, FaGamepad, FaStar, FaShieldAlt,
} from 'react-icons/fa'

const WORDS = ['Messaging', 'Gaming', 'Live Streams', 'Payments', 'Food Delivery', 'Learning', 'Work', 'Everything']

const PILLS = [
  { icon: <FaUsers />,     text: '10M+ Users',       color: 'from-violet-500 to-purple-600', delay: 0.6 },
  { icon: <FaGamepad />,   text: '20+ Games',         color: 'from-cyan-500 to-blue-600',    delay: 0.8 },
  { icon: <FaStar />,      text: '4.9★ Rating',       color: 'from-amber-500 to-orange-500', delay: 1.0 },
  { icon: <FaShieldAlt />, text: 'End-to-End Secure', color: 'from-green-500 to-emerald-600', delay: 1.2 },
]

export default function Hero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 800], [0, 120])

  const [wordIdx, setWordIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % WORDS.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">

      {/* Dot grid overlay */}
      <div className="absolute inset-0 bg-dot-pattern opacity-20 pointer-events-none" />

      {/* Dark vignette so text stays readable over the 3D */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, rgba(0,0,0,0.55) 100%)' }}
      />

      <motion.div style={{ y }} className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 text-center">

        {/* Animated badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'backOut' }}
          className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 rounded-full border border-violet-500/40 bg-black/40 backdrop-blur-md"
        >
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-green-400 shrink-0"
          />
          <span className="text-sm font-semibold text-violet-300">Now live. Download today</span>
          <FaArrowRight className="text-violet-400 text-xs" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="text-5xl sm:text-7xl lg:text-8xl font-black mb-4 leading-[0.9] tracking-tight"
        >
          <span className="gradient-text block">One App</span>
          <span className="text-white block mt-2">for</span>
        </motion.h1>

        {/* Typewriter word */}
        <div className="h-20 sm:h-24 flex items-center justify-center mb-6 overflow-hidden">
          <motion.div
            key={wordIdx}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent leading-none"
          >
            {WORDS[wordIdx]}
          </motion.div>
        </div>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Guranda is the digital operating system for everyday African life. One identity, one wallet, one connected world.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-14"
        >
          <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.97 }}>
            <Link href="/download"
              className="button-primary inline-flex items-center gap-2.5 text-base px-8 py-4 shadow-[0_0_40px_rgba(124,58,237,0.5)]">
              <FaAndroid className="text-lg" /> Download for Android
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.97 }}>
            <button className="button-secondary inline-flex items-center gap-2.5 text-base px-8 py-4 backdrop-blur-md">
              <FaApple className="text-lg" /> Coming to iOS
            </button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.97 }}>
            <button className="button-secondary inline-flex items-center gap-2.5 text-base px-8 py-4 backdrop-blur-md">
              <FaPlay className="text-sm" /> Watch Demo
            </button>
          </motion.div>
        </motion.div>

        {/* Floating stat pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap justify-center gap-3 mb-14"
        >
          {PILLS.map((pill, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: pill.delay, duration: 0.5, ease: 'backOut' }}
              whileHover={{ y: -4, scale: 1.05 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md text-sm font-medium text-white cursor-default"
            >
              <span className={`bg-gradient-to-r ${pill.color} bg-clip-text text-transparent`}>{pill.icon}</span>
              {pill.text}
            </motion.div>
          ))}
        </motion.div>

        {/* Hero visual — icon grid floats directly on the page background,
            no enclosing card, matching AISection's orbit treatment */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
          className="relative mx-auto max-w-3xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-600/10 blur-3xl -z-10" />
          <div className="relative grid grid-cols-3 sm:grid-cols-4 gap-5 sm:gap-8 p-6 sm:p-10 w-full">
            {['💬','🎮','📡','💰','🚗','🍽️','✈️','🤖','📚','💼','🏠','🎭'].map((e, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3 + (i % 3) * 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl backdrop-blur-md shadow-lg">
                  {e}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </section>
  )
}
