'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import {
  FaAndroid, FaApple, FaQrcode, FaEnvelope, FaDownload,
  FaCheckCircle, FaArrowRight, FaShieldAlt, FaBolt, FaStar,
  FaGamepad, FaComments, FaWallet, FaRocket,
} from 'react-icons/fa'

const FEATURES = [
  { icon: FaComments, label: 'Messaging & Calls',   desc: 'DMs, groups, voice & video',      color: 'from-cyan-500 to-blue-600' },
  { icon: FaGamepad,  label: '20+ Games',            desc: 'Chess, Ludo, Pool & more',         color: 'from-violet-500 to-purple-600' },
  { icon: FaWallet,   label: 'MSH Wallet',           desc: 'Send, receive & earn',             color: 'from-amber-500 to-orange-500' },
  { icon: FaRocket,   label: 'Every Service',        desc: 'Ride, Eat, Travel & 15 more',      color: 'from-pink-500 to-rose-600' },
]

const REQUIREMENTS = [
  'Android 8.0 or higher',
  'Minimum 2 GB RAM',
  '150 MB free storage',
  'Stable internet connection',
]

const CHANGELOG = [
  { version: 'v1.0.0 (Beta)', date: 'Aug 2026', changes: ['Initial beta release', 'Full service suite live', 'MSH wallet & payments', 'AI Companion onboarding'] },
]

export default function DownloadPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24">
        <section className="section-container max-w-6xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
            <motion.div className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-full bg-green-500/10 border border-green-500/30" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-semibold text-green-300">Beta available now</span>
            </motion.div>
            <h1 className="text-6xl sm:text-7xl font-black gradient-text mb-4">Download Guranda</h1>
            <p className="text-gray-400 text-xl max-w-xl mx-auto">One app. Every service. Your entire digital life — connected.</p>
          </motion.div>

          {/* Platform cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            {/* Android */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="relative group">
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-green-600/30 to-cyan-600/20 blur-sm opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="relative glass-frosted rounded-3xl p-8 border-white/10">
                <div className="flex items-center gap-4 mb-6">
                  <motion.div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-3xl shadow-xl"
                    animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                    <FaAndroid />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Android</h2>
                    <p className="text-green-400 text-sm font-semibold">Available now</p>
                  </div>
                </div>
                <p className="text-gray-400 mb-7 leading-relaxed">Download the beta and get full access to every Guranda service today. No waitlist.</p>
                <div className="space-y-3 mb-7">
                  <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Link href="#" className="button-primary flex items-center justify-center gap-2.5 py-4 w-full shadow-[0_0_30px_rgba(34,197,94,0.25)]">
                      <FaDownload /> Download APK <FaArrowRight className="text-sm ml-auto" />
                    </Link>
                  </motion.div>
                  <motion.button whileHover={{ scale: 1.02 }} className="button-secondary flex items-center justify-center gap-2.5 py-3.5 w-full">
                    <FaQrcode /> Scan QR Code
                  </motion.button>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><FaShieldAlt className="text-green-400" /> Verified safe</span>
                  <span>•</span>
                  <span>v1.0.0 Beta</span>
                  <span>•</span>
                  <span>~125 MB</span>
                </div>
              </div>
            </motion.div>

            {/* iOS */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="relative group">
              <div className="relative glass-frosted rounded-3xl p-8 border-white/10 opacity-70">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 text-3xl">
                    <FaApple />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">iOS</h2>
                    <p className="text-amber-400 text-sm font-semibold">Coming January 2027</p>
                  </div>
                </div>
                <p className="text-gray-400 mb-7 leading-relaxed">iOS build is in progress — be first in line when it hits the App Store.</p>
                <motion.button whileHover={{ scale: 1.02 }} className="button-secondary flex items-center justify-center gap-2.5 py-4 w-full mb-5">
                  <FaEnvelope /> Notify me when live
                </motion.button>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>App Store listing</span><span>•</span><span>Jan 2027 target</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature highlights */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-14">
            <h2 className="text-2xl font-black text-white mb-6 text-center">What's Inside</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.07 }}
                    whileHover={{ y: -5 }}
                    className="glass-frosted rounded-2xl p-5 border-white/10 hover:border-white/20 transition-all group">
                    <motion.div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 shadow-lg`}
                      whileHover={{ rotate: 10, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Icon className="text-lg" />
                    </motion.div>
                    <h3 className="font-bold text-white text-sm mb-1">{f.label}</h3>
                    <p className="text-gray-500 text-xs">{f.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Requirements + Changelog */}
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="glass-frosted rounded-2xl p-7 border-white/10">
              <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2"><FaBolt className="text-amber-400" /> Requirements</h2>
              <ul className="space-y-3">
                {REQUIREMENTS.map((r, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.06 }}
                    className="flex items-center gap-3 text-gray-300 text-sm">
                    <FaCheckCircle className="text-green-400 shrink-0" /> {r}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="glass-frosted rounded-2xl p-7 border-white/10">
              <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2"><FaStar className="text-violet-400" /> Changelog</h2>
              {CHANGELOG.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-violet-300">{c.version}</span>
                    <span className="text-xs text-gray-500">{c.date}</span>
                  </div>
                  <ul className="space-y-2">
                    {c.changes.map((ch, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-gray-400 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" /> {ch}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Alt downloads */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="glass-frosted rounded-2xl p-7 border-white/10 mb-10 text-center">
            <h2 className="text-xl font-black text-white mb-5">Other Download Options</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {['Email Download Link', 'Direct APK', 'Web Install (Beta)'].map((opt, i) => (
                <motion.button key={i} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="button-secondary px-6 py-2.5 text-sm">{opt}</motion.button>
              ))}
            </div>
          </motion.div>

          <div className="text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-violet-400 transition">← Back to Home</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
