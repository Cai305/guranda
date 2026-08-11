'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaAndroid, FaApple, FaArrowRight, FaQrcode, FaEnvelope } from 'react-icons/fa'

const FEATURES = ['Free to download', 'No ads', 'One identity', 'All services included']

export default function DownloadCTA() {
  return (
    <section className="section-container max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        viewport={{ once: true }}
        className="relative overflow-hidden"
      >
        {/* Ambient glow — content floats directly on the page background,
            no enclosing card, matching AISection's treatment. Clipped by
            the parent's overflow-hidden so the -top/-bottom/-left/-right
            offsets on these fixed 384px blobs can't push the page wider
            than the viewport on small screens. */}
        <div className="absolute -top-16 -left-16 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-16 -right-16 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl -z-10" />

        <div className="relative z-10 py-10 sm:py-16 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md"
          >
            <motion.span
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-green-400"
            />
            <span className="text-sm font-semibold text-white">Available now on Android</span>
          </motion.div>

          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="gradient-text">Ready to Join</span>
            <br />
            <span className="text-white">Guranda?</span>
          </h2>
          <p className="text-gray-300 text-xl mb-10 max-w-2xl mx-auto">
            One app. Every service. Your entire digital life, connected.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white backdrop-blur-md"
              >
                <span className="text-green-400">✓</span> {f}
              </motion.div>
            ))}
          </div>

          {/* Buttons */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto mb-5">
            <motion.div whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
              <Link href="/download" className="button-primary flex items-center justify-center gap-2.5 py-4 shadow-[0_0_40px_rgba(124,58,237,0.5)] w-full">
                <FaAndroid className="text-lg" /> Android APK
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
              <button className="button-secondary flex items-center justify-center gap-2.5 py-4 w-full">
                <FaApple className="text-lg" /> iOS Coming Soon
              </button>
            </motion.div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <button className="button-secondary flex items-center justify-center gap-2.5 py-3.5 w-full text-sm">
                <FaQrcode /> Scan QR Code
              </button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <button className="button-secondary flex items-center justify-center gap-2.5 py-3.5 w-full text-sm">
                <FaEnvelope /> Email Link
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            viewport={{ once: true }}
            className="mt-10 flex items-center justify-center gap-2 text-gray-500 text-sm"
          >
            <Link href="/download" className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition font-medium">
              See all download options <FaArrowRight className="text-xs" />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
